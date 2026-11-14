import argparse
from sqlalchemy import text

from src.pipeline_tracker import create_mysql_engine, PipelineTracker

from src.data_simulator import (
    load_manifest,
    verify_batch_files,
    read_and_validate_batch,
    validate_staging_tables,
    register_batch,
    append_new_rows,
    mark_batch_failed,
    update_manifest_status,
    WEATHER_TABLE,
    GENERATION_TABLE,
)


def get_table_count(engine, table_name):

    with engine.connect() as connection:
        return connection.execute(
            text(f"SELECT COUNT(*) FROM `{table_name}`")
        ).scalar_one()


def main(batch_id, run_id):

    engine = create_mysql_engine()
    tracker = PipelineTracker(engine)

    manifest_file = None
    manifest = None

    try:

        print(f"\nTesting rollback for batch: {batch_id}")

        # 1. Read and verify the immutable batch.
        batch_directory, manifest_file, manifest = load_manifest(batch_id)

        verify_batch_files(batch_directory, manifest)

        weather_df, generation_df = read_and_validate_batch(batch_directory, manifest)

        validate_staging_tables(engine, weather_df, generation_df)

        # 2. Register the batch in MySQL.
        status = register_batch(
            engine, batch_id, run_id, len(weather_df) + len(generation_df)
        )

        if status == "SUCCESS":
            raise RuntimeError(
                "This batch already succeeded. "
                "Choose a fresh batch for the rollback test."
            )

        # 3. Capture counts before the transaction.
        weather_before = get_table_count(engine, WEATHER_TABLE)

        generation_before = get_table_count(engine, GENERATION_TABLE)

        print("\nCounts before failure simulation:")
        print("Weather:", weather_before)
        print("Generation:", generation_before)

        # 4. Start a transaction and deliberately fail.
        try:

            with engine.begin() as connection:

                connection.execute(
                    text(
                        """
                        UPDATE pipeline_batches
                        SET status = 'RUNNING',
                            error_message = NULL
                        WHERE batch_id = :batch_id
                        """
                    ),
                    {"batch_id": batch_id},
                )

                print("\n-> Inserting weather records...")

                weather_inserted = append_new_rows(
                    connection, WEATHER_TABLE, weather_df, ["TIMESTAMP", "SITE_ID"]
                )

                print(f"-> Weather inserted inside transaction: " f"{weather_inserted}")

                # Intentional failure before generation insertion.
                raise RuntimeError(
                    "INTENTIONAL TEST FAILURE: "
                    "Simulating failure after weather insertion."
                )

        except RuntimeError as error:

            print(f"\nExpected failure caught: {error}")

            # The transaction has already rolled back here.
            mark_batch_failed(engine, batch_id, str(error))

            update_manifest_status(manifest_file, manifest, "FAILED", str(error))

        # 5. Verify counts after rollback.
        weather_after = get_table_count(engine, WEATHER_TABLE)

        generation_after = get_table_count(engine, GENERATION_TABLE)

        with engine.connect() as connection:
            batch_status = connection.execute(
                text(
                    """
                    SELECT status
                    FROM pipeline_batches
                    WHERE batch_id = :batch_id
                    """
                ),
                {"batch_id": batch_id},
            ).scalar_one()

        print("\nCounts after rollback:")
        print("Weather:", weather_after)
        print("Generation:", generation_after)
        print("Batch status:", batch_status)

        # 6. Assert that nothing was partially inserted.
        if weather_before != weather_after:
            raise AssertionError("Weather rows were not rolled back!")

        if generation_before != generation_after:
            raise AssertionError("Generation row count changed unexpectedly!")

        if batch_status != "FAILED":
            raise AssertionError(f"Expected FAILED, got {batch_status}")

        print("\nROLLBACK TEST PASSED: " "No partial records were committed.")

    except Exception as error:

        tracker.fail_run(run_id, str(error))

        raise

    else:

        tracker.fail_run(run_id, "Completed intentional rollback test.")

    finally:
        engine.dispose()


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument("--batch-id", required=True)

    parser.add_argument("--run-id", required=True)

    args = parser.parse_args()

    main(args.batch_id, args.run_id)
