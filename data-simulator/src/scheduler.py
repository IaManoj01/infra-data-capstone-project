import argparse
import json
import logging
import re
import subprocess
import sys
import time

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

from src.pipeline_tracker import PipelineTracker, create_mysql_engine


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BATCH_DIR = PROJECT_ROOT / "data" / "batches"

GENERATION_STAGE = "DATA_GENERATION"
LOADING_STAGE = "MYSQL_LOADING"

S3_EXPORT_STAGE = "RAW_S3_EXPORT"

CLEAN_ETL_STAGE = "CLEAN_ETL"
CLEAN_S3_EXPORT_STAGE = "CLEAN_S3_EXPORT"

INCOMPLETE_STATUSES = ("PENDING", "RUNNING", "FAILED")

logger = logging.getLogger("solar_farm_scheduler")


# ---------------------------------------------------------
# Manifest helpers
# ---------------------------------------------------------


def read_manifest(batch_directory):
    manifest_file = batch_directory / "manifest.json"

    if not manifest_file.exists():
        raise FileNotFoundError(
            f"Manifest not found for batch directory: {batch_directory}"
        )

    with manifest_file.open("r", encoding="utf-8") as file:
        manifest = json.load(file)

    batch_id = manifest.get("batch_id")

    if not batch_id:
        raise ValueError(f"batch_id is missing in manifest: {manifest_file}")

    if batch_id != batch_directory.name:
        raise ValueError(
            f"Batch ID mismatch. Directory={batch_directory.name}, "
            f"manifest={batch_id}"
        )

    return manifest


def update_manifest_status(batch_directory, manifest, status):
    """
    Atomically update the local manifest.

    MySQL remains the authoritative source for batch status.
    This function only synchronizes the local copy.
    """

    manifest_file = batch_directory / "manifest.json"
    temp_file = batch_directory / "manifest.json.tmp"

    manifest["status"] = status

    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=4)

    temp_file.replace(manifest_file)


def get_record_count(manifest):
    weather_count = manifest.get("weather_records", 0)
    generation_count = manifest.get("generation_records", 0)

    return int(weather_count) + int(generation_count)


def parse_created_at(value, fallback):
    """
    Convert an ISO timestamp or datetime into a sortable UTC timestamp.
    """

    if not value:
        return fallback

    try:
        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.timestamp()

    except (ValueError, TypeError):
        return fallback


# ---------------------------------------------------------
# Find incomplete batches
# ---------------------------------------------------------


def find_oldest_incomplete_batch(engine):
    """
    Find the oldest batch that has not completed successfully.

    We check both:
      1. MySQL pipeline_batches
      2. Local immutable batch directories

    This handles crashes that happen before a batch is registered
    in MySQL.
    """

    database_batches = {}

    query = text(
        """
        SELECT batch_id, status, created_at
        FROM pipeline_batches
        WHERE status IN ('PENDING', 'RUNNING', 'FAILED')
        ORDER BY created_at ASC, batch_id ASC
    """
    )

    with engine.connect() as connection:
        rows = connection.execute(query).mappings().all()

    for row in rows:
        database_batches[row["batch_id"]] = {
            "status": row["status"],
            "created_at": row["created_at"],
        }

    candidates = {}

    # First, include incomplete batches already registered in MySQL.
    for batch_id, database_info in database_batches.items():
        batch_directory = BATCH_DIR / batch_id

        if not batch_directory.exists():
            raise FileNotFoundError(
                f"MySQL contains incomplete batch {batch_id}, "
                f"but its local directory is missing: {batch_directory}"
            )

        manifest = read_manifest(batch_directory)

        candidates[batch_id] = {
            "batch_id": batch_id,
            "batch_directory": batch_directory,
            "manifest": manifest,
            "database_status": database_info["status"],
            "sort_time": parse_created_at(
                database_info["created_at"],
                batch_directory.stat().st_mtime,
            ),
        }

    # Next, scan local immutable batches.
    # This finds batches generated before a crash prevented registration.
    if BATCH_DIR.exists():
        for batch_directory in BATCH_DIR.iterdir():

            if not batch_directory.is_dir():
                continue

            # Ignore temporary generation directories.
            if batch_directory.name.endswith(".tmp"):
                continue

            manifest_file = batch_directory / "manifest.json"

            if not manifest_file.exists():
                continue

            manifest = read_manifest(batch_directory)
            batch_id = manifest["batch_id"]

            # Check whether MySQL has a record for this batch.
            database_status = None

            if batch_id in database_batches:
                database_status = database_batches[batch_id]["status"]

            else:
                # Check whether a SUCCESS record exists.
                with engine.connect() as connection:
                    success_row = connection.execute(
                        text(
                            """
                            SELECT status
                            FROM pipeline_batches
                            WHERE batch_id = :batch_id
                        """
                        ),
                        {"batch_id": batch_id},
                    ).fetchone()

                if success_row:
                    database_status = success_row[0]

            # MySQL SUCCESS is authoritative.
            if database_status == "SUCCESS":
                if manifest.get("status") != "SUCCESS":
                    logger.warning(
                        "Reconciling local manifest for %s: " "MySQL says SUCCESS",
                        batch_id,
                    )
                    update_manifest_status(
                        batch_directory,
                        manifest,
                        "SUCCESS",
                    )

                continue

            # If the batch was already included from the DB query,
            # do not add it twice.
            if batch_id in candidates:
                continue

            # A local batch without a DB record is also incomplete.
            # The loader will register it when processing begins.
            candidates[batch_id] = {
                "batch_id": batch_id,
                "batch_directory": batch_directory,
                "manifest": manifest,
                "database_status": database_status,
                "sort_time": parse_created_at(
                    manifest.get("created_at"),
                    batch_directory.stat().st_mtime,
                ),
            }

    if not candidates:
        return None

    oldest = min(
        candidates.values(),
        key=lambda item: (item["sort_time"], item["batch_id"]),
    )

    return oldest


# ---------------------------------------------------------
# Subprocess execution
# ---------------------------------------------------------


def run_subprocess(command):
    """
    Execute a Python module from the project root.

    Captures and prints output so failures are visible in scheduler logs.
    """

    logger.info("Executing: %s", " ".join(command))

    try:
        result = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )

        if result.stdout:
            print(result.stdout, flush=True)

        if result.stderr:
            print(result.stderr, file=sys.stderr, flush=True)

        return result.stdout

    except subprocess.CalledProcessError as error:

        if error.stdout:
            print(error.stdout, flush=True)

        if error.stderr:
            print(error.stderr, file=sys.stderr, flush=True)

        raise


def generate_batch():
    """
    Run the existing immutable batch generator and extract its batch ID.
    """

    output = run_subprocess(
        [
            sys.executable,
            "-m",
            "src.main",
        ]
    )

    match = re.search(
        r"^BATCH_ID=(BATCH_[A-Za-z0-9_-]+)$",
        output,
        re.MULTILINE,
    )

    if not match:
        raise RuntimeError(
            "Batch generation completed, but BATCH_ID was not found "
            "in the generator output."
        )

    batch_id = match.group(1)

    logger.info("Generated batch: %s", batch_id)

    return batch_id


def load_batch(batch_id, run_id):
    """
    Run the existing transactional MySQL loader.
    """

    run_subprocess(
        [
            sys.executable,
            "-m",
            "src.data_simulator",
            "--batch-id",
            batch_id,
            "--run-id",
            run_id,
        ]
    )


# ---------------------------------------------------------
# Stage execution
# ---------------------------------------------------------


def execute_stage(
    tracker,
    run_id,
    stage_name,
    operation,
    records_read=0,
    records_written=0,
):
    """
    Track one operation as a pipeline stage.

    If the operation fails, the stage is marked FAILED
    before the exception is passed back to the caller.
    """

    stage_run_id = tracker.start_stage(
        run_id,
        stage_name,
        attempt_no=1,
    )

    try:
        operation()

        tracker.complete_stage(
            stage_run_id,
            records_read=records_read,
            records_written=records_written,
        )

    except Exception as error:

        try:
            tracker.fail_stage(
                stage_run_id,
                str(error),
            )
        except Exception:
            logger.exception(
                "Could not mark stage %s as FAILED",
                stage_name,
            )

        raise


# ---------------------------------------------------------
# One pipeline cycle
# ---------------------------------------------------------


def run_pipeline_cycle(engine, tracker):
    """
    Execute one complete scheduler cycle.

    Priority:
      1. Retry the oldest incomplete batch.
      2. If none exists, generate a new batch.
      3. Load the selected batch into MySQL.
      4. Export raw MySQL staging data to S3.
      5. Run Spring Boot clean ETL.
      6. Export clean MySQL data to S3.

    Snowpipe automatically ingests the S3 files asynchronously.
    """

    run_id = tracker.create_run()

    logger.info("=" * 65)
    logger.info("Starting pipeline run: %s", run_id)

    try:
        # Look for an existing batch before generating anything new.
        candidate = find_oldest_incomplete_batch(engine)

        if candidate:
            batch_id = candidate["batch_id"]
            batch_directory = candidate["batch_directory"]
            manifest = candidate["manifest"]

            logger.warning(
                "Found incomplete batch %s. Status in MySQL: %s",
                batch_id,
                candidate["database_status"] or "NOT REGISTERED",
            )

        else:
            logger.info("No incomplete batches found. Generating a new batch.")

            generated_batch_id = None

            def generation_operation():
                nonlocal generated_batch_id
                generated_batch_id = generate_batch()

            execute_stage(
                tracker,
                run_id,
                GENERATION_STAGE,
                generation_operation,
            )

            batch_id = generated_batch_id
            batch_directory = BATCH_DIR / batch_id
            manifest = read_manifest(batch_directory)

        # Read record counts from the immutable manifest.
        total_records = get_record_count(manifest)

        logger.info(
            "Loading batch %s (%s records)",
            batch_id,
            total_records,
        )

        # Always use the current pipeline run ID for stage tracking.
        # The loader preserves the original run_id in pipeline_batches
        # when retrying an already registered batch.
        execute_stage(
            tracker,
            run_id,
            LOADING_STAGE,
            lambda: load_batch(batch_id, run_id),
            records_read=total_records,
            records_written=total_records,
        )

        # Export raw staging data from MySQL to S3.
        execute_stage(
            tracker,
            run_id,
            S3_EXPORT_STAGE,
            lambda: run_subprocess(
                [
                    sys.executable,
                    "-m",
                    "src.pipeline_runner",
                ]
            ),
        )

        # Transform raw staging records into clean MySQL tables
        # by invoking the existing Spring Boot ETL API worker.
        execute_stage(
            tracker,
            run_id,
            CLEAN_ETL_STAGE,
            lambda: run_subprocess(
                [
                    sys.executable,
                    "-m",
                    "src.workers.clean_etl_worker",
                    "--once",
                ]
            ),
        )

        # Export newly created clean MySQL records to S3.
        execute_stage(
            tracker,
            run_id,
            CLEAN_S3_EXPORT_STAGE,
            lambda: run_subprocess(
                [
                    sys.executable,
                    "-m",
                    "src.clean_data_exporter",
                ]
            ),
        )

        # The loader commits MySQL SUCCESS before this local update.
        update_manifest_status(
            batch_directory,
            manifest,
            "SUCCESS",
        )

        tracker.complete_run(run_id)

        logger.info(
            "Pipeline run completed successfully: %s",
            run_id,
        )

        return True

    except Exception as error:

        logger.exception(
            "Pipeline run failed: %s",
            run_id,
        )

        try:
            tracker.fail_run(
                run_id,
                str(error),
            )
        except Exception:
            logger.exception(
                "Could not mark pipeline run %s as FAILED",
                run_id,
            )

        return False


# ---------------------------------------------------------
# Scheduler entry point
# ---------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Solar Farm Data Pipeline Scheduler")

    parser.add_argument(
        "--once",
        action="store_true",
        help="Execute one pipeline cycle and exit.",
    )

    parser.add_argument(
        "--interval-minutes",
        type=int,
        default=15,
        help="Minutes between pipeline cycles. Default: 15.",
    )

    args = parser.parse_args()

    if args.interval_minutes <= 0:
        parser.error("--interval-minutes must be greater than zero.")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    engine = create_mysql_engine()
    tracker = PipelineTracker(engine)

    lock_connection = None

    try:
        # Only one scheduler process can own this lock.
        lock_connection = tracker.acquire_scheduler_lock()

        if lock_connection is None:
            logger.error("Another scheduler instance is already running. Exiting.")
            return 2

        logger.info("Scheduler lock acquired.")

        # Any RUNNING records left by a previous crashed process
        # are now safe to mark FAILED because we own the scheduler lock.
        tracker.mark_interrupted_runs()

        logger.info("Interrupted runs reconciled.")

        if args.once:
            success = run_pipeline_cycle(engine, tracker)
            return 0 if success else 1

        logger.info(
            "Continuous scheduler started. Interval: %s minutes.",
            args.interval_minutes,
        )

        while True:
            run_pipeline_cycle(engine, tracker)

            logger.info(
                "Next pipeline cycle in %s minutes.",
                args.interval_minutes,
            )

            time.sleep(args.interval_minutes * 60)

    except KeyboardInterrupt:
        logger.info("Scheduler stopped by user.")

        return 0

    except Exception:
        logger.exception("Scheduler encountered a fatal error.")
        return 1

    finally:
        if lock_connection is not None:
            tracker.release_scheduler_lock(lock_connection)
            logger.info("Scheduler lock released.")

        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
