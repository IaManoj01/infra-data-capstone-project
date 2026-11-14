from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import uuid

import pandas as pd

from src.generators.weather_generator import generate_weather_data
from src.generators.generation_generator import generate_generation_data
from src.generators.anomaly_generator import inject_anomalies
from src.validators.data_validator import validate_dataset


# ---------------- CONFIGURATION ----------------

BATCH_SIZE = 200
INTERVAL_MINUTES = 15

SITE_IDS = ("SITE_001", "SITE_002")

INVERTERS_PER_SITE = {
    "SITE_001": ["INV_01", "INV_02", "INV_03", "INV_04"],
    "SITE_002": ["INV_01", "INV_02", "INV_03", "INV_04"],
}

SITE_CAPACITIES_KW = {"SITE_001": 500.0, "SITE_002": 750.0}

ANOMALY_RATE = 0.005

INITIAL_TIMESTAMP = "2026-10-01T00:00:00Z"


# ---------------- PATH CONFIGURATION ----------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / "data"

WEATHER_DIR = DATA_DIR / "weather"
GENERATION_DIR = DATA_DIR / "generation"
BATCH_DIR = DATA_DIR / "batches"

WEATHER_FILE = WEATHER_DIR / "weather_data.csv"
GENERATION_FILE = GENERATION_DIR / "generation_data.csv"


# ---------------- FILE UTILITIES ----------------


def calculate_sha256(file_path):
    """Calculate the SHA-256 checksum of a file."""

    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            sha256.update(chunk)

    return sha256.hexdigest()


def write_json_atomically(file_path, data):
    """Write JSON through a temporary file to avoid partial manifests."""

    temporary_file = file_path.with_suffix(".tmp")

    with temporary_file.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)

    temporary_file.replace(file_path)


# ---------------- TIMESTAMP MANAGEMENT ----------------


def get_latest_timestamp(file_path):
    """
    Find the latest timestamp from the historical weather CSV
    and existing immutable batch manifests.

    This prevents timestamp reuse if historical CSV updating
    failed after a batch was already saved.
    """

    latest_timestamp = None

    # 1. Check historical weather CSV.
    if file_path.exists() and file_path.stat().st_size > 0:

        df = pd.read_csv(file_path, usecols=["timestamp"])

        if not df.empty:

            historical_latest = pd.to_datetime(df["timestamp"], utc=True).max()

            latest_timestamp = historical_latest

    # 2. Check immutable batch manifests.
    if BATCH_DIR.exists():

        for batch_directory in BATCH_DIR.iterdir():

            if not batch_directory.is_dir():
                continue

            manifest_file = batch_directory / "manifest.json"

            if not manifest_file.exists():
                continue

            try:
                with manifest_file.open("r", encoding="utf-8") as file:
                    manifest = json.load(file)

                batch_latest = pd.to_datetime(manifest["last_timestamp"], utc=True)

                if latest_timestamp is None or batch_latest > latest_timestamp:
                    latest_timestamp = batch_latest

            except (KeyError, ValueError, OSError, json.JSONDecodeError):
                print(
                    f"WARNING: Could not read timestamp from "
                    f"{manifest_file}. Skipping this manifest."
                )

    if latest_timestamp is None:
        return INITIAL_TIMESTAMP

    next_timestamp = latest_timestamp + pd.Timedelta(minutes=INTERVAL_MINUTES)

    return next_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------- CSV APPENDING ----------------


def append_unique_rows(file_path, batch, key_columns):

    batch = batch.copy()

    batch["timestamp"] = pd.to_datetime(batch["timestamp"], utc=True)

    batch = batch.drop_duplicates(subset=key_columns, keep="last")

    if file_path.exists() and file_path.stat().st_size > 0:

        existing = pd.read_csv(file_path, usecols=key_columns)

        existing["timestamp"] = pd.to_datetime(existing["timestamp"], utc=True)

        batch_index = pd.MultiIndex.from_frame(batch[key_columns])

        existing_index = pd.MultiIndex.from_frame(existing[key_columns])

        batch = batch.loc[~batch_index.isin(existing_index)]

    if batch.empty:
        return 0

    file_exists = file_path.exists() and file_path.stat().st_size > 0

    batch.to_csv(
        file_path,
        mode="a",
        header=not file_exists,
        index=False,
        date_format="%Y-%m-%dT%H:%M:%SZ",
    )

    return len(batch)


# ---------------- DATA ALIGNMENT VALIDATION ----------------


def validate_weather_generation_alignment(weather_df, generation_df):

    weather_keys = set(zip(weather_df["timestamp"], weather_df["site_id"]))

    generation_keys = set(zip(generation_df["timestamp"], generation_df["site_id"]))

    unmatched_records = generation_keys - weather_keys

    if unmatched_records:
        raise RuntimeError(
            f"Found {len(unmatched_records)} generation "
            "timestamp/site combinations without matching weather data."
        )

    print("-> Weather-generation alignment: PASSED")


# ---------------- IMMUTABLE BATCH CREATION ----------------


def save_immutable_batch(batch_id, weather_df, generation_df):
    """
    Save both CSVs and their manifest in a temporary directory.
    Rename the directory only after all files are written.

    The final batch directory is never overwritten.
    """

    final_directory = BATCH_DIR / batch_id
    temporary_directory = BATCH_DIR / f".{batch_id}.tmp"

    if final_directory.exists():
        raise FileExistsError(f"Batch already exists: {final_directory}")

    if temporary_directory.exists():
        raise FileExistsError(
            f"Temporary batch directory already exists: " f"{temporary_directory}"
        )

    temporary_directory.mkdir(parents=True, exist_ok=False)

    weather_file = temporary_directory / "weather.csv"
    generation_file = temporary_directory / "generation.csv"

    # Save the actual batch data.
    weather_df.to_csv(weather_file, index=False, date_format="%Y-%m-%dT%H:%M:%SZ")

    generation_df.to_csv(generation_file, index=False, date_format="%Y-%m-%dT%H:%M:%SZ")

    # Calculate checksums after writing.
    weather_checksum = calculate_sha256(weather_file)
    generation_checksum = calculate_sha256(generation_file)

    # Construct manifest.
    manifest = {
        "batch_id": batch_id,
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "first_timestamp": pd.to_datetime(weather_df["timestamp"], utc=True)
        .min()
        .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "last_timestamp": pd.to_datetime(weather_df["timestamp"], utc=True)
        .max()
        .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "weather_file": "weather.csv",
        "generation_file": "generation.csv",
        "weather_records": len(weather_df),
        "generation_records": len(generation_df),
        "checksums": {
            "weather.csv": weather_checksum,
            "generation.csv": generation_checksum,
        },
    }

    write_json_atomically(temporary_directory / "manifest.json", manifest)

    # Publish the batch only after all three files exist.
    temporary_directory.rename(final_directory)

    print(f"-> Immutable batch saved: {batch_id}")

    print(f"-> Batch directory: {final_directory}")

    return final_directory


# ---------------- MAIN PIPELINE ----------------


def main():

    print("Starting Solar Data Simulation Pipeline...")

    # Create required directories.
    for directory in [WEATHER_DIR, GENERATION_DIR, BATCH_DIR]:

        directory.mkdir(parents=True, exist_ok=True)

    # Calculate total inverter count.
    total_inverters = sum(len(inverters) for inverters in INVERTERS_PER_SITE.values())

    if BATCH_SIZE <= 0 or total_inverters <= 0 or BATCH_SIZE % total_inverters != 0:

        raise ValueError(
            "BATCH_SIZE must be positive and divisible " "by the total inverter count."
        )

    timestamps_per_site = BATCH_SIZE // total_inverters

    # Generate a unique identity for this batch.
    batch_id = f"BATCH_{uuid.uuid4().hex}"

    # Determine the next timestamp.
    start_time = get_latest_timestamp(WEATHER_FILE)

    print(f"-> Batch ID: {batch_id}")

    print(f"-> Next batch starts from: {start_time}")

    print(f"-> Generation records requested: {BATCH_SIZE}")

    print(f"-> Timestamps per site: {timestamps_per_site}")

    seed = pd.Timestamp(start_time).value // 1_000_000_000

    # 1. Generate weather data.
    weather_df = generate_weather_data(
        start_time=start_time,
        site_ids=SITE_IDS,
        periods=timestamps_per_site,
        interval_minutes=INTERVAL_MINUTES,
        seed=seed,
    )

    print(f"-> Weather records generated: {len(weather_df)}")

    # 2. Validate weather data.
    weather_report = validate_dataset(weather_df, dataset_type="weather")

    if not weather_report["passed"]:

        raise RuntimeError("Generated weather batch failed validation.")

    print("-> Weather validation: PASSED")

    # 3. Generate inverter-level generation data.
    generation_df = generate_generation_data(
        weather_df=weather_df,
        inverter_ids=INVERTERS_PER_SITE,
        site_capacities=SITE_CAPACITIES_KW,
        seed=seed + 1,
        interval_minutes=INTERVAL_MINUTES,
    )

    if len(generation_df) != BATCH_SIZE:

        raise RuntimeError(
            f"Expected {BATCH_SIZE} generation rows, " f"got {len(generation_df)}."
        )

    print(f"-> Generation records generated: {len(generation_df)}")

    # 4. Validate weather-generation alignment.
    validate_weather_generation_alignment(weather_df, generation_df)

    # 5. Inject anomalies.
    anomalous_generation_df = inject_anomalies(
        generation_df, anomaly_rate=ANOMALY_RATE, seed=seed + 2
    )

    print(f"-> Anomaly injection completed " f"(rate: {ANOMALY_RATE * 100}%).")

    # 6. Validate generation data after anomaly injection.
    report = validate_dataset(anomalous_generation_df, dataset_type="anomalies")

    print(
        f"Generation Validation Report: "
        f"Passed={report['passed']}, "
        f"Total Records={report['total_records']}"
    )

    if not report["passed"]:

        raise RuntimeError("Generated generation batch failed validation.")

    # 7. Save immutable batch FIRST.
    # From this point, the generated data has a durable local copy.
    batch_directory = save_immutable_batch(
        batch_id=batch_id, weather_df=weather_df, generation_df=anomalous_generation_df
    )

    # 8. Update historical CSVs.
    # These are convenience/history files, not the retry source.
    weather_rows = append_unique_rows(
        WEATHER_FILE, weather_df, ["timestamp", "site_id"]
    )

    generation_rows = append_unique_rows(
        GENERATION_FILE,
        anomalous_generation_df,
        ["timestamp", "site_id", "inverter_id"],
    )

    print(f"-> Appended {weather_rows} weather records " "to historical CSV.")

    print(f"-> Appended {generation_rows} generation records " "to historical CSV.")

    print("\nBatch generation completed successfully!")

    print(f"BATCH_ID={batch_id}")

    print(f"BATCH_DIRECTORY={batch_directory}")

    return batch_id


if __name__ == "__main__":

    main()
