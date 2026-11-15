# 5. Python Data Simulator

## 5.1 Introduction

The Python Data Simulator is responsible for generating simulated solar farm operational data.

It provides sample generation and environmental observations that can be stored in the operational database and processed by the downstream data pipeline.

## 5.2 Responsibilities

The simulator supports the following responsibilities:

- Generate inverter generation observations.
- Generate weather observations.
- Represent multiple sites and inverters.
- Produce timestamped operational records.
- Write or transfer generated records to the configured database.
- Participate in the scheduled ETL workflow.
- Support automated testing of simulator functionality.

The exact simulation formulas, number of sites, inverter counts, and record-generation rules should be described using the actual implementation.

## 5.3 Types of Simulated Data

### A. Inverter Generation Data

Generation records represent the electrical output of solar inverters.

The backend's generation model exposes fields including:

| Field | Description |
|---|---|
| `id` | Record identifier |
| `siteId` | Site associated with the observation |
| `inverterId` | Inverter associated with the observation |
| `timestamp` | Observation timestamp |
| `dcPowerKw` | DC power measurement in kilowatts |
| `acPowerKw` | AC power measurement in kilowatts |
| `intervalEnergyKwh` | Energy generated during the interval |
| `gridVoltageV` | Grid voltage measurement |
| `powerFactor` | Power factor measurement |
| `statusFlag` | Operational status indicator |

### B. Weather Data

Weather observations represent environmental conditions that may influence solar generation.

| Field | Description |
|---|---|
| `id` | Record identifier |
| `siteId` | Site associated with the observation |
| `timestamp` | Observation timestamp |
| `irradianceWM2` | Solar irradiance in watts per square metre |
| `ambientTempC` | Ambient temperature in Celsius |
| `moduleTempC` | Solar module temperature in Celsius |
| `cloudCoverPct` | Cloud cover percentage |

These field names are taken from the backend's generated API schema.

## 5.4 Simulator Execution

The simulator can be run as part of the local development environment or as a Docker container.

In production, the `python-scheduler` service is configured through Docker Compose.

The production configuration includes:

- Database connection information.
- ETL API URL.
- AWS region.
- S3 bucket name.
- Pipeline interval.
- Persistent data directory mount.

The configured production pipeline interval is 300 seconds.

## 5.5 Database Integration

The simulator connects to the configured MySQL database.

In local development, the database hostname is the Docker Compose service name:

```text
mysql-db
```

In production, the database host is supplied through the production environment configuration and points to AWS RDS.

The simulator's database connection settings are supplied through environment variables rather than being hardcoded in the source.

## 5.6 ETL Integration

The production simulator is configured to call the backend ETL endpoint:

```http
POST /api/etl/run
```

The endpoint is addressed internally through the Docker network:

```text
http://spring-boot:8080/api/etl/run
```

This allows the simulator container to trigger the backend ETL operation without exposing the backend port directly to the public internet.

## 5.7 Testing

The project includes Python tests under:

```text
data-simulator/tests/
```

The tests are executed using pytest.

Command:

```bash
PYTHONPATH=src python -m pytest tests/ -v
```

The CI workflow installs the simulator requirements and runs the test suite automatically.

## 5.8 Reliability and Data Quality

Important data-simulation considerations include:

- Valid timestamps.
- Consistent site and inverter identifiers.
- Reasonable generation values.
- Appropriate handling of night-time generation.
- Prevention of invalid or unexpected measurements.
- Consistent database insertion behavior.

Only data validation rules that are implemented in the simulator should be described as completed functionality.


