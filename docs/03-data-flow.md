# 3. End-to-End Data Flow

## 3.1 Introduction

This document explains how data moves through the Solar Farm Platform, starting from simulation and ending with analytical reporting.

The data pipeline connects the operational application with cloud storage and the data warehouse.

## 3.2 Data Flow Summary

```text
Python Simulator
       |
       v
MySQL / AWS RDS
       |
       v
Spring Boot ETL API
       |
       v
ETL Extraction and File Generation
       |
       v
Amazon S3
       |
       v
Amazon SQS Integration
       |
       v
Snowpipe
       |
       v
Snowflake
       |
       v
Power BI
```

## 3.3 Step-by-Step Data Flow

### Step 1: Data Simulation

The Python simulator generates simulated solar farm observations.

The generated data represents operational measurements such as:

- Site identifiers.
- Inverter identifiers.
- Observation timestamps.
- DC and AC power.
- Energy generation.
- Grid voltage.
- Power factor.
- Irradiance.
- Ambient temperature.
- Module temperature.
- Cloud cover.

The exact generation rules and record structure are defined in the simulator implementation.

### Step 2: Operational Database Storage

The generated records are stored in MySQL.

The database acts as the operational data store for the application.

In local development, MySQL runs in a Docker container.

In production, the application connects to AWS RDS MySQL.

### Step 3: Backend API Access

The Spring Boot backend accesses the database through Spring Data JPA.

The REST API exposes endpoints for retrieving generation and weather information, filtering records, and managing fault tickets.

The frontend uses these APIs to retrieve information for display.

### Step 4: ETL Execution

The ETL workflow is triggered through the backend endpoint:

`POST /api/etl/run`

The Python scheduler is configured to call the endpoint in the production environment.

The configured production interval is 300 seconds.

The ETL process extracts the relevant records and prepares files for cloud storage.

### Step 5: Amazon S3 Storage

The exported data files are uploaded to the configured Amazon S3 bucket.

S3 provides durable object storage for the data files used in the downstream analytics pipeline.

The production Python container uses the EC2 instance's IAM role rather than requiring static AWS access keys inside the production container.

### Step 6: Messaging and Snowflake Ingestion

Amazon SQS is part of the configured downstream integration.

The S3 and messaging integration supports the Snowflake ingestion workflow.

Snowpipe is used to load supported files into Snowflake automatically, based on the configured notification and storage integration.

The exact queue notification configuration, Snowpipe definition, file formats, and target tables should be documented using the actual AWS and Snowflake configuration.

### Step 7: Analytical Storage

Snowflake stores the ingested data for analytical queries and reporting.

The warehouse provides a platform for querying and aggregating operational data without relying exclusively on the application's operational database.

### Step 8: Power BI Reporting

Power BI connects to the analytical data in Snowflake.

Reports can be designed to display relevant information such as:

- Solar generation trends.
- Site-level generation comparisons.
- Inverter-level performance.
- Environmental conditions.
- Operational anomalies.
- Fault-ticket information, if included in the analytical model.

The exact metrics and visuals should match the implemented Power BI report.

## 3.4 Operational Flow vs Analytical Flow

The project has two related flows.

### Operational Application Flow

```text
Simulator → MySQL / RDS → Spring Boot → React UI
```

This flow supports application functionality and operational data access.

### Analytics Pipeline Flow

```text
MySQL / RDS → ETL → S3 → SQS / Snowpipe → Snowflake → Power BI
```

This flow transfers data into the analytical environment.

## 3.5 Data Pipeline Reliability Considerations

The following areas should be considered when operating the pipeline:

- Database connectivity.
- Duplicate data prevention.
- ETL execution failures.
- S3 upload failures.
- Queue notification failures.
- Snowpipe ingestion errors.
- Data quality validation.
- Monitoring of pipeline execution status.

The implementation details of retry handling, duplicate prevention, and error recovery should be verified against the actual source code and cloud configuration before describing them as completed features.


