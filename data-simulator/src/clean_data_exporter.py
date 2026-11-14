from pathlib import Path
from datetime import datetime, timezone
import io
import json
import os
import urllib.parse

import boto3
import pandas as pd

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


# ---------------- PROJECT CONFIGURATION ----------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

STATE_FILE = PROJECT_ROOT / "data" / "s3_sync_state.json"

load_dotenv(PROJECT_ROOT / ".env")


# Each table has its own primary-key checkpoint and S3 prefix.
TABLE_CONFIG = {
    "clean_weather": {"primary_key": "id", "s3_prefix": "clean/weather"},
    "clean_generation": {"primary_key": "id", "s3_prefix": "clean/generation"},
    "fault_tickets": {"primary_key": "ticket_id", "s3_prefix": "clean/fault_tickets"},
}


# ---------------- MYSQL CONNECTION ----------------


def create_mysql_engine():

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


# ---------------- S3 STATE MANAGEMENT ----------------


def load_sync_state():

    if STATE_FILE.exists():

        with open(STATE_FILE, "r") as file:
            return json.load(file)

    return {}


def save_sync_state(state):

    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

    temp_file = STATE_FILE.with_suffix(".tmp")

    with open(temp_file, "w") as file:

        json.dump(state, file, indent=4)

    temp_file.replace(STATE_FILE)


# ---------------- AWS CONNECTION ----------------


def create_s3_client():

    bucket = os.getenv("S3_BUCKET_NAME")

    if not bucket:
        raise EnvironmentError("S3_BUCKET_NAME is missing.")

    region = os.getenv("AWS_REGION", "ap-south-1")

    s3_client = boto3.client("s3", region_name=region)

    return s3_client, bucket


# ---------------- CLEAN MYSQL TO S3 ----------------


def export_table_to_s3(engine, s3_client, bucket, table_name, state):

    config = TABLE_CONFIG[table_name]

    primary_key = config["primary_key"]

    s3_prefix = config["s3_prefix"]

    state_key = f"{table_name}_last_id"

    last_id = int(state.get(state_key, 0))

    print(f"\n-> Preparing to export {table_name}...")

    print(f"   Last exported {primary_key}: {last_id}")

    # Fetch only records not exported previously.
    query = text(
        f"""
        SELECT *
        FROM `{table_name}`
        WHERE `{primary_key}` > :last_id
        ORDER BY `{primary_key}`
        """
    )

    with engine.connect() as connection:

        data_df = pd.read_sql_query(query, connection, params={"last_id": last_id})

    if data_df.empty:

        print(f"   No new records in {table_name}.")

        return 0

    print(f"   Found {len(data_df)} new records.")

    # Normalize column names.
    data_df.columns = data_df.columns.str.strip().str.lower()

    if primary_key not in data_df.columns:
        raise ValueError(f"Primary key {primary_key} missing from {table_name}.")

    # Identify the exported ID range.
    min_id = int(data_df[primary_key].min())
    max_id = int(data_df[primary_key].max())

    # Create CSV in memory.
    csv_buffer = io.StringIO()

    data_df.to_csv(csv_buffer, index=False)

    # Use a deterministic key based on the starting ID.
    # If an upload succeeds but checkpoint saving fails,
    # retrying overwrites the same S3 object.
    s3_key = f"{s3_prefix}/" f"{table_name}_from_id_{min_id:010d}.csv"

    # Upload to S3.
    s3_client.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=csv_buffer.getvalue().encode("utf-8"),
        ContentType="text/csv",
    )

    # Update checkpoint only after successful upload.
    state[state_key] = max_id

    save_sync_state(state)

    print(f"   Successfully exported {len(data_df)} records!")

    print(f"   Exported ID range: {min_id} to {max_id}")

    print(f"   S3 Location: s3://{bucket}/{s3_key}")

    return len(data_df)


# ---------------- MAIN ----------------


def main():

    print("\nStarting Clean MySQL to AWS S3 Export...")

    engine = create_mysql_engine()

    try:

        s3_client, bucket = create_s3_client()

        state = load_sync_state()

        total_exported = 0

        export_counts = {}

        for table_name in TABLE_CONFIG:

            count = export_table_to_s3(engine, s3_client, bucket, table_name, state)

            export_counts[table_name] = count

            total_exported += count

        print("\n========== CLEAN S3 EXPORT SUMMARY ==========")

        for table_name, count in export_counts.items():

            print(f"{table_name}: {count} records exported")

        print(f"Total records exported: {total_exported}")

        print("==============================================")

    finally:

        engine.dispose()


if __name__ == "__main__":
    main()
