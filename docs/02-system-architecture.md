# 2. System Architecture

## 2.1 Architecture Overview

The Solar Farm Platform follows a multi-layer architecture. Each component is responsible for a specific part of the application and data pipeline.

The architecture separates data generation, application processing, storage, cloud integration, and analytics.

## 2.2 Architectural Layers

### A. Data Generation Layer

The Python simulator generates simulated solar farm data, including:

- Inverter generation observations.
- Weather observations.
- Operational measurements.
- Simulated fault-related information, where configured.

The simulator communicates with the MySQL database and participates in the automated ETL workflow.

### B. Application Layer

The backend is developed using Java 21 and Spring Boot.

It provides REST endpoints for:

- Retrieving inverter generation data.
- Filtering generation data by site, inverter, and time range.
- Retrieving weather observations.
- Filtering weather observations by site and time range.
- Identifying generation anomalies.
- Creating and managing fault tickets.
- Triggering the ETL process.

Spring Data JPA is used for database interaction.

### C. Presentation Layer

The frontend is developed using React and Vite.

It provides the user interface for displaying information retrieved from the backend APIs.

Nginx serves the frontend application in the production Docker environment and acts as a reverse proxy for API requests.

### D. Operational Database Layer

MySQL stores the application's operational data.

In the local Docker environment, MySQL runs as a container using a persistent Docker volume.

In production, the backend and simulator connect to AWS RDS MySQL.

### E. Cloud Integration Layer

AWS services support the production deployment and data transfer process.

The project uses:

- Amazon EC2 for application hosting.
- Amazon RDS for managed MySQL database hosting.
- Amazon S3 for storing exported data files.
- Amazon SQS for messaging in the downstream ingestion workflow.
- IAM roles and permissions for AWS service access.

### F. Analytics Layer

Snowflake is used as the analytical data warehouse.

Snowpipe supports automated data ingestion from the configured cloud storage integration.

Power BI is used to build visual reports and dashboards using the analytical data.

## 2.3 Logical Architecture

```text
                 DATA GENERATION
                       |
                Python Simulator
                       |
                       v
                MySQL / AWS RDS
                       |
                       v
                Spring Boot API
                       |
             +---------+---------+
             |                   |
             v                   v
       React Frontend        ETL Process
             |                   |
             v                   v
           Nginx             Amazon S3
             |                   |
             v                   v
          End User            Amazon SQS
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

The diagram represents the logical data and application flow. Actual network connections and service configurations are defined by the Docker Compose and AWS configurations.

## 2.4 Local and Production Architecture

### Local Development Environment

The local environment uses Docker Compose to run:

- MySQL database container.
- Python simulator container.

The Spring Boot backend and React frontend can be developed and tested separately using their respective development tools.

The local MySQL container uses a named Docker volume for persistent database storage.

### Production Environment

The production environment runs on AWS EC2 using Docker Compose.

The production stack contains:

- Spring Boot backend container.
- Python scheduler container.
- React frontend served through Nginx.
- External AWS RDS MySQL database.

The frontend is published on port 80. The Spring Boot service is exposed internally to the Docker network rather than directly publishing port 8080 to the internet.

## 2.5 Communication Between Components

| Source | Destination | Purpose |
|---|---|---|
| Python simulator | MySQL / RDS | Store generated operational data |
| React frontend | Nginx | Load the frontend application |
| React frontend | Spring Boot API | Retrieve and manage application data through `/api/` |
| Spring Boot | MySQL / RDS | Read and write application records |
| Python scheduler | Spring Boot | Trigger the ETL API |
| ETL process | Amazon S3 | Store exported data files |
| Amazon S3 / SQS integration | Snowflake ingestion | Support automated ingestion |
| Snowflake | Power BI | Supply analytical data for reports |

## 2.6 Architecture Benefits

- **Separation of concerns:** Each component has a clear responsibility.
- **Independent development:** Backend, frontend, and simulator can be developed separately.
- **Containerization:** Docker provides consistent runtime environments.
- **Scalability:** Cloud services provide a foundation for scaling individual components.
- **Maintainability:** REST APIs separate the frontend from backend implementation details.
- **Analytics integration:** Operational data can be transferred to a dedicated analytical platform.

