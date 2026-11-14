import argparse
import logging
import time
import os

import requests


# --------------------------------------------------
# Configuration
# --------------------------------------------------

ETL_API_URL = os.getenv("ETL_API_URL", "http://localhost:8080/api/etl/run")

# Wait 5 minutes between completed attempts.
ETL_INTERVAL_SECONDS = 300

# Allow Spring Boot up to 10 minutes to respond.
REQUEST_TIMEOUT_SECONDS = 600


# --------------------------------------------------
# Logging configuration
# --------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


# --------------------------------------------------
# ETL API trigger
# --------------------------------------------------


def trigger_etl():
    logger.info("Triggering Spring Boot ETL...")

    try:
        response = requests.post(
            ETL_API_URL,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

        # Raises an exception for HTTP errors such as 404 or 500.
        response.raise_for_status()

        result = response.json()

        if not isinstance(result, dict):
            logger.error("Unexpected API response format: %s", result)
            return False

        status = result.get("status")

        if status != "SUCCESS":
            logger.error(
                "ETL did not complete successfully. Response: %s",
                result,
            )
            return False

        logger.info("ETL completed successfully.")
        logger.info("Weather records read: %s", result.get("weatherRead", 0))
        logger.info("Weather records inserted: %s", result.get("weatherInserted", 0))
        logger.info("Generation records read: %s", result.get("generationRead", 0))
        logger.info(
            "Generation records inserted: %s", result.get("generationInserted", 0)
        )
        logger.info("Fault tickets created: %s", result.get("ticketsCreated", 0))
        logger.info("Message: %s", result.get("message", ""))

        return True

    except requests.exceptions.Timeout:
        logger.error(
            "ETL API request timed out after %s seconds.",
            REQUEST_TIMEOUT_SECONDS,
        )
        return False

    except requests.exceptions.RequestException as error:
        logger.error("Could not reach ETL API: %s", error)
        return False

    except ValueError:
        logger.error("Spring Boot returned an invalid JSON response.")
        return False


# --------------------------------------------------
# Worker
# --------------------------------------------------


def run_worker(once=False):

    logger.info("Clean ETL Trigger Worker started.")
    logger.info("API URL: %s", ETL_API_URL)

    if once:
        return 0 if trigger_etl() else 1

    while True:
        try:
            trigger_etl()

            logger.info(
                "Next ETL attempt in %s seconds.",
                ETL_INTERVAL_SECONDS,
            )

            time.sleep(ETL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            logger.info("Worker stopped by user.")
            break


# --------------------------------------------------
# Entry point
# --------------------------------------------------

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="Periodically trigger the Spring Boot clean ETL."
    )

    parser.add_argument(
        "--once",
        action="store_true",
        help="Trigger ETL only once and exit.",
    )

    args = parser.parse_args()

    raise SystemExit(run_worker(once=args.once))
