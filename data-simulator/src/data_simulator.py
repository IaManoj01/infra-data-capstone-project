from pathlib import Path
import argparse
import hashlib
import json

import pandas as pd
from sqlalchemy import inspect, text

from src.pipeline_tracker import create_mysql_engine


# ---------------- PATH CONFIGURATION ----------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BATCH_DIR = PROJECT_ROOT / "data" / "batches"

WEATHER_TABLE = "stg_weather"
GENERATION_TABLE = "stg_generation"

STAGE_NAME = "MYSQL_LOADING"


# ---------------- FILE UTILITIES ----------------


def calculate_sha256(file_path):
    """Calculate SHA-256 checksum for a file."""

    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            sha256.update(chunk)

    return sha256.hexdigest()


def update_manifest_status(manifest_file, manifest, status, error=None):
    """Update the local manifest atomically."""

    manifest["status"] = status
    manifest["error"] = error

    temporary_file = manifest_file.with_suffix(".tmp")

    with temporary_file.open("w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=4)

    temporary_file.replace(manifest_file)


# ---------------- BATCH READING ----------------


def load_manifest(batch_id):

    batch_directory = BATCH_DIR / batch_id
    manifest_file = batch_directory / "manifest.json"

    if not batch_directory.is_dir():
        raise FileNotFoundError(f"Batch directory not found: {batch_directory}")

    if not manifest_file.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_file}")

    with manifest_file.open("r", encoding="utf-8") as file:
        manifest = json.load(file)

    if manifest.get("batch_id") != batch_id:
        raise ValueError("Batch ID in manifest does not match directory name.")

    return batch_directory, manifest_file, manifest


def verify_batch_files(batch_directory, manifest):

    required_files = ["weather.csv", "generation.csv"]

    for filename in required_files:

        file_path = batch_directory / filename

        if not file_path.exists():
            raise FileNotFoundError(f"Batch file missing: {file_path}")

        expected_checksum = manifest.get("checksums", {}).get(filename)

        if not expected_checksum:
            raise ValueError(f"Checksum missing from manifest for {filename}")

        actual_checksum = calculate_sha256(file_path)

        if actual_checksum != expected_checksum:
            raise RuntimeError(
                f"Checksum verification failed for {filename}. "
                "The immutable batch may have been modified."
            )

    print("-> Batch file checksum verification: PASSED")


def read_batch(file_path, name):

    df = pd.read_csv(file_path)

    if df.empty:
        raise ValueError(f"{name} batch is empty.")

    df.columns = df.columns.str.strip().str.upper()

    if "TIMESTAMP" not in df.columns:
        raise ValueError(f"{name} is missing TIMESTAMP.")

    # Convert UTC timestamps to naive UTC for MySQL DATETIME.
    df["TIMESTAMP"] = pd.to_datetime(df["TIMESTAMP"], utc=True).dt.tz_convert(None)

    return df


def read_and_validate_batch(batch_directory, manifest):

    weather_file = batch_directory / manifest["weather_file"]

    generation_file = batch_directory / manifest["generation_file"]

    weather_df = read_batch(weather_file, "Weather")

    generation_df = read_batch(generation_file, "Generation")

    required_generation_columns = {"SITE_ID", "INVERTER_ID"}

    if not required_generation_columns.issubset(generation_df.columns):
        raise ValueError("Generation batch must contain SITE_ID and INVERTER_ID.")

    if len(weather_df) != manifest["weather_records"]:
        raise ValueError("Weather record count does not match manifest.")

    if len(generation_df) != manifest["generation_records"]:
        raise ValueError("Generation record count does not match manifest.")

    return weather_df, generation_df


# ---------------- DATABASE VALIDATION ----------------


def validate_staging_tables(engine, weather_df, generation_df):

    inspector = inspect(engine)

    for table_name, batch in [
        (WEATHER_TABLE, weather_df),
        (GENERATION_TABLE, generation_df),
    ]:

        if not inspector.has_table(table_name):
            raise RuntimeError(
                f"Required staging table '{table_name}' does not exist. "
                "Create it through your database schema setup first."
            )

        existing_columns = {
            column["name"].upper() for column in inspector.get_columns(table_name)
        }

        missing_columns = [
            column for column in batch.columns if column not in existing_columns
        ]

        if missing_columns:
            raise RuntimeError(
                f"Table {table_name} is missing columns: " f"{missing_columns}"
            )


# ---------------- IDEMPOTENT INSERTION ----------------


def append_new_rows(connection, table_name, batch, natural_key):
    """
    Insert only records whose natural keys do not already exist.

    This function uses the caller's transaction connection.
    It must not create or commit its own transaction.
    """

    batch = batch.drop_duplicates(subset=natural_key, keep="last").copy()

    start_timestamp = batch["TIMESTAMP"].min()
    end_timestamp = batch["TIMESTAMP"].max()

    key_sql = ", ".join(f"`{column}`" for column in natural_key)

    query = text(
        f"""
        SELECT {key_sql}
        FROM `{table_name}`
        WHERE `TIMESTAMP` BETWEEN :start_ts AND :end_ts
        """
    )

    existing_keys = pd.read_sql(
        query, connection, params={"start_ts": start_timestamp, "end_ts": end_timestamp}
    )

    if existing_keys.empty:

        new_rows = batch

    else:

        existing_keys["TIMESTAMP"] = pd.to_datetime(existing_keys["TIMESTAMP"])

        batch_index = pd.MultiIndex.from_frame(batch[natural_key])

        existing_index = pd.MultiIndex.from_frame(existing_keys[natural_key])

        new_rows = batch.loc[~batch_index.isin(existing_index)]

    if new_rows.empty:

        print(f"-> {table_name}: No new records to insert.")

        return 0

    # IMPORTANT:
    # Pass the active transaction connection, not the engine.
    new_rows.to_sql(
        table_name, con=connection, if_exists="append", index=False, chunksize=1000
    )

    print(f"-> {table_name}: Inserted {len(new_rows)} records.")

    return len(new_rows)


# ---------------- BATCH REGISTRATION ----------------


def register_batch(engine, batch_id, run_id, record_count):
    """
    Register the batch if it has never been seen.

    The first run that registers the batch remains its originating
    run_id, even if a later run retries it.
    """

    with engine.begin() as connection:

        existing = (
            connection.execute(
                text(
                    """
                SELECT status
                FROM pipeline_batches
                WHERE batch_id = :batch_id
                """
                ),
                {"batch_id": batch_id},
            )
            .mappings()
            .first()
        )

        if existing:

            if existing["status"] == "SUCCESS":
                return "SUCCESS"

            return existing["status"]

        connection.execute(
            text(
                """
                INSERT INTO pipeline_batches (
                    batch_id,
                    run_id,
                    stage_name,
                    status,
                    record_count
                )
                VALUES (
                    :batch_id,
                    :run_id,
                    :stage_name,
                    'PENDING',
                    :record_count
                )
                """
            ),
            {
                "batch_id": batch_id,
                "run_id": run_id,
                "stage_name": STAGE_NAME,
                "record_count": record_count,
            },
        )

    print(f"-> Batch registered in MySQL: {batch_id}")

    return "PENDING"


# ---------------- TRANSACTIONAL MYSQL LOAD ----------------


def load_batch_transactionally(engine, batch_id, weather_df, generation_df):
    """
    Load both staging datasets in one database transaction.

    SUCCESS is committed together with the inserted records.
    """

    weather_count = 0
    generation_count = 0

    with engine.begin() as connection:

        # Mark the batch as RUNNING inside this transaction.
        connection.execute(
            text(
                """
                UPDATE pipeline_batches
                SET status = 'RUNNING',
                    error_message = NULL,
                    completed_at = NULL
                WHERE batch_id = :batch_id
                """
            ),
            {"batch_id": batch_id},
        )

        print("-> MySQL transaction started.")

        weather_count = append_new_rows(
            connection, WEATHER_TABLE, weather_df, ["TIMESTAMP", "SITE_ID"]
        )

        generation_count = append_new_rows(
            connection,
            GENERATION_TABLE,
            generation_df,
            ["TIMESTAMP", "SITE_ID", "INVERTER_ID"],
        )

        # This SUCCESS update is part of the same transaction.
        connection.execute(
            text(
                """
                UPDATE pipeline_batches
                SET status = 'SUCCESS',
                    record_count = :record_count,
                    completed_at = CURRENT_TIMESTAMP(6),
                    error_message = NULL
                WHERE batch_id = :batch_id
                """
            ),
            {
                "batch_id": batch_id,
                "record_count": (len(weather_df) + len(generation_df)),
            },
        )

    # The context manager commits only after all operations succeed.
    print("-> MySQL transaction committed successfully.")

    return weather_count, generation_count


def mark_batch_failed(engine, batch_id, error_message):

    try:
        with engine.begin() as connection:

            connection.execute(
                text(
                    """
                    UPDATE pipeline_batches
                    SET status = 'FAILED',
                        completed_at = NULL,
                        error_message = :error_message
                    WHERE batch_id = :batch_id
                    """
                ),
                {"batch_id": batch_id, "error_message": error_message},
            )

        print("-> Batch failure recorded in MySQL.")

    except Exception as tracking_error:

        print("WARNING: Could not record batch failure in MySQL: " f"{tracking_error}")


# ---------------- MAIN ----------------


def main(batch_id, run_id):

    engine = create_mysql_engine()

    manifest_file = None
    manifest = None

    try:

        print(f"Processing batch: {batch_id}")

        batch_directory, manifest_file, manifest = load_manifest(batch_id)

        verify_batch_files(batch_directory, manifest)

        weather_df, generation_df = read_and_validate_batch(batch_directory, manifest)

        print(f"-> Weather records: {len(weather_df)}")

        print(f"-> Generation records: {len(generation_df)}")

        validate_staging_tables(engine, weather_df, generation_df)

        record_count = len(weather_df) + len(generation_df)

        batch_status = register_batch(engine, batch_id, run_id, record_count)

        if batch_status == "SUCCESS":

            print(
                "-> Batch already succeeded in MySQL. " "Skipping duplicate processing."
            )

            update_manifest_status(manifest_file, manifest, "SUCCESS")

            return

        weather_count, generation_count = load_batch_transactionally(
            engine, batch_id, weather_df, generation_df
        )

        # MySQL is authoritative. This local update is a mirror.
        update_manifest_status(manifest_file, manifest, "SUCCESS")

        print("\nMySQL batch loading completed successfully!")

        print(f"Weather newly inserted: {weather_count}")

        print(f"Generation newly inserted: {generation_count}")

        print(f"Batch status: SUCCESS ({batch_id})")

    except Exception as error:

        error_message = str(error)

        print(f"\nBatch processing failed: {error_message}")

        if manifest is not None and manifest_file is not None:

            try:
                update_manifest_status(manifest_file, manifest, "FAILED", error_message)
            except Exception as manifest_error:
                print(f"WARNING: Could not update local manifest: " f"{manifest_error}")

        if manifest is not None:

            mark_batch_failed(engine, batch_id, error_message)

        raise

    finally:
        engine.dispose()


if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="Load an immutable solar data batch into MySQL."
    )

    parser.add_argument(
        "--batch-id", required=True, help="Immutable batch ID to process."
    )

    parser.add_argument(
        "--run-id",
        required=True,
        help="Pipeline run ID associated with the first registration.",
    )

    args = parser.parse_args()

    main(batch_id=args.batch_id, run_id=args.run_id)
