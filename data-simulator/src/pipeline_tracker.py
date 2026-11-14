import os
import urllib.parse
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def create_mysql_engine():
    """Create a SQLAlchemy connection to the pipeline metadata database."""

    user = urllib.parse.quote_plus(os.environ["MYSQL_USER"])
    password = urllib.parse.quote_plus(os.environ["MYSQL_PASSWORD"])
    host = os.environ["MYSQL_HOST"]
    port = os.getenv("MYSQL_PORT", "3306")
    database = os.environ["MYSQL_DB"]

    connection_url = (
        f"mysql+pymysql://{user}:{password}"
        f"@{host}:{port}/{database}"
        "?charset=utf8mb4"
    )

    return create_engine(connection_url, pool_pre_ping=True)


class PipelineTracker:

    def __init__(self, engine):
        self.engine = engine

    def create_run(self):
        """Create a new pipeline run and return its unique ID."""

        run_id = f"RUN_{uuid4().hex}"

        query = text(
            """
            INSERT INTO pipeline_runs (
                run_id,
                status,
                trigger_type
            )
            VALUES (
                :run_id,
                'RUNNING',
                'SCHEDULED'
            )
        """
        )

        with self.engine.begin() as connection:
            connection.execute(query, {"run_id": run_id})

        print(f"\nPipeline run created: {run_id}", flush=True)

        return run_id

    def start_stage(self, run_id, stage_name, attempt_no=1):
        """Record the beginning of a stage attempt."""

        query = text(
            """
            INSERT INTO pipeline_stage_runs (
                run_id,
                stage_name,
                attempt_no,
                status
            )
            VALUES (
                :run_id,
                :stage_name,
                :attempt_no,
                'RUNNING'
            )
        """
        )

        with self.engine.begin() as connection:
            result = connection.execute(
                query,
                {"run_id": run_id, "stage_name": stage_name, "attempt_no": attempt_no},
            )

            stage_run_id = result.lastrowid

        print(f"Stage started: {stage_name} " f"(attempt {attempt_no})", flush=True)

        return stage_run_id

    def complete_stage(self, stage_run_id, records_read=0, records_written=0):
        """Mark a stage attempt as successful."""

        query = text(
            """
            UPDATE pipeline_stage_runs
            SET
                status = 'SUCCESS',
                records_read = :records_read,
                records_written = :records_written,
                completed_at = CURRENT_TIMESTAMP(6)
            WHERE stage_run_id = :stage_run_id
        """
        )

        with self.engine.begin() as connection:
            connection.execute(
                query,
                {
                    "stage_run_id": stage_run_id,
                    "records_read": records_read,
                    "records_written": records_written,
                },
            )

        print("Stage completed successfully.", flush=True)

    def fail_stage(self, stage_run_id, error_message):
        """Record a stage failure."""

        query = text(
            """
            UPDATE pipeline_stage_runs
            SET
                status = 'FAILED',
                error_message = :error_message,
                completed_at = CURRENT_TIMESTAMP(6)
            WHERE stage_run_id = :stage_run_id
        """
        )

        with self.engine.begin() as connection:
            connection.execute(
                query,
                {
                    "stage_run_id": stage_run_id,
                    "error_message": str(error_message)[:60000],
                },
            )

        print("Stage marked as FAILED.", flush=True)

    def complete_run(self, run_id):
        """Mark the complete pipeline run as successful."""

        query = text(
            """
            UPDATE pipeline_runs
            SET
                status = 'SUCCESS',
                completed_at = CURRENT_TIMESTAMP(6)
            WHERE run_id = :run_id
        """
        )

        with self.engine.begin() as connection:
            connection.execute(query, {"run_id": run_id})

        print(f"Pipeline run completed: {run_id}", flush=True)

    def fail_run(self, run_id, error_message):
        """Mark the complete pipeline run as failed."""

        query = text(
            """
            UPDATE pipeline_runs
            SET
                status = 'FAILED',
                error_message = :error_message,
                completed_at = CURRENT_TIMESTAMP(6)
            WHERE run_id = :run_id
        """
        )

        with self.engine.begin() as connection:
            connection.execute(
                query, {"run_id": run_id, "error_message": str(error_message)[:60000]}
            )

        print(f"Pipeline run failed: {run_id}", flush=True)

    def acquire_scheduler_lock(self):
        """
        Acquire a MySQL advisory lock.

        Keep the returned connection open while the scheduler runs.
        """

        lock_name = "solar_farm_pipeline_scheduler"

        connection = self.engine.connect()

        try:
            result = connection.execute(
                text("SELECT GET_LOCK(:lock_name, 0)"), {"lock_name": lock_name}
            ).scalar()

            if result != 1:
                connection.close()
                print("Another scheduler instance is already running.", flush=True)
                return None

            print("Scheduler lock acquired successfully.", flush=True)

            return connection

        except Exception:
            connection.close()
            raise

    def release_scheduler_lock(self, connection):
        """Release the advisory lock and close its connection."""

        if connection is None:
            return

        try:
            connection.execute(
                text("SELECT RELEASE_LOCK(" "'solar_farm_pipeline_scheduler')")
            )

            print("Scheduler lock released.", flush=True)

        finally:
            connection.close()

    def mark_interrupted_runs(self):
        """
        Mark unfinished runs from previous scheduler executions
        as FAILED after obtaining the exclusive scheduler lock.
        """

        error_message = (
            "Scheduler restarted. Previous pipeline execution "
            "was interrupted or left incomplete."
        )

        with self.engine.begin() as connection:

            # First, mark unfinished stages as FAILED.
            connection.execute(
                text(
                    """
                    UPDATE pipeline_stage_runs AS stage
                    INNER JOIN pipeline_runs AS run
                        ON stage.run_id = run.run_id
                    SET
                        stage.status = 'FAILED',
                        stage.error_message = :error_message,
                        stage.completed_at = CURRENT_TIMESTAMP(6)
                    WHERE
                        run.status = 'RUNNING'
                        AND stage.status = 'RUNNING'
                """
                ),
                {"error_message": error_message},
            )

            # Then mark the incomplete pipeline runs as FAILED.
            result = connection.execute(
                text(
                    """
                    UPDATE pipeline_runs
                    SET
                        status = 'FAILED',
                        error_message = :error_message,
                        completed_at = CURRENT_TIMESTAMP(6)
                    WHERE status = 'RUNNING'
                """
                ),
                {"error_message": error_message},
            )

            interrupted_count = result.rowcount

        print(
            f"Interrupted pipeline runs recovered: " f"{interrupted_count}", flush=True
        )

        return interrupted_count
