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


PROJECT_ROOT = Path(__file__).resolve().parent.parent

STATE_FILE = PROJECT_ROOT / "data" / "s3_sync_state.json"

load_dotenv(PROJECT_ROOT / ".env")


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

    # boto3 uses the standard AWS credential chain.
    s3_client = boto3.client("s3", region_name=region)

    return s3_client, bucket


# ---------------- MYSQL TO S3 ----------------


def sync_table_to_s3(engine, s3_client, bucket, table_name, state):

    print(f"\n-> Preparing to sync {table_name} to S3...")

    last_sync_time = state.get(table_name, "2000-01-01 00:00:00")

    print(f"   Last synced timestamp: {last_sync_time}")

    # Fetch only records newer than the watermark
    query = text(
        f"""
        SELECT *
        FROM `{table_name}`
        WHERE TIMESTAMP > :last_sync
        ORDER BY TIMESTAMP
        """
    )

    with engine.connect() as connection:

        new_data_df = pd.read_sql(
            query, connection, params={"last_sync": last_sync_time}
        )

    if new_data_df.empty:

        print(f"   No new records in {table_name}.")

        return 0

    print(f"   Found {len(new_data_df)} new records.")

    # Normalize column names for S3 CSV
    new_data_df.columns = new_data_df.columns.str.strip().str.lower()

    # Prepare S3 path
    folder_name = table_name.replace("stg_", "")

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")

    s3_key = f"{folder_name}/" f"{table_name}_{timestamp_str}.csv"

    # Convert DataFrame to CSV in memory
    csv_buffer = io.StringIO()

    new_data_df.to_csv(csv_buffer, index=False)

    # Upload to S3
    s3_client.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=csv_buffer.getvalue().encode("utf-8"),
        ContentType="text/csv",
    )

    # Update state only after successful upload
    max_timestamp = pd.to_datetime(new_data_df["timestamp"], utc=True).max()

    state[table_name] = max_timestamp.strftime("%Y-%m-%d %H:%M:%S")

    save_sync_state(state)

    print(f"   Successfully uploaded {len(new_data_df)} records!")

    print(f"   S3 Location: s3://{bucket}/{s3_key}")

    return len(new_data_df)


# ---------------- MAIN ----------------


def main():

    print("Starting MySQL to AWS S3 synchronization...")

    engine = create_mysql_engine()

    s3_client, bucket = create_s3_client()

    state = load_sync_state()

    try:

        weather_count = sync_table_to_s3(
            engine, s3_client, bucket, "stg_weather", state
        )

        generation_count = sync_table_to_s3(
            engine, s3_client, bucket, "stg_generation", state
        )

        print("\nS3 synchronization completed!")

        print(f"Weather uploaded: {weather_count}")

        print(f"Generation uploaded: {generation_count}")

    finally:

        engine.dispose()


if __name__ == "__main__":
    main()
