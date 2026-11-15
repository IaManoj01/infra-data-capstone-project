# 4. Prerequisites and Local Setup

## 4.1 Introduction

This document explains the software requirements and steps required to set up the Solar Farm Platform in a local development environment.

The instructions cover the project repository, database container, backend, frontend, and Python simulator.

## 4.2 Prerequisites

Install the following tools before starting development.

| Tool | Purpose |
|---|---|
| Git | Source code version control |
| Docker Desktop | Run containers locally |
| Java Development Kit 21 | Run and build the Spring Boot backend |
| Maven Wrapper | Build the Java application |
| Python 3.11 | Run the data simulator and tests |
| Node.js 20 | Run and build the React frontend |
| npm | Install frontend dependencies |
| VS Code or IntelliJ IDEA | Development environment |
| MySQL client (optional) | Inspect database records |

The project uses Maven Wrapper, so a separate Maven installation is not necessarily required.

## 4.3 Clone the Repository

Open Windows CMD or a terminal and run:

```bash
git clone https://github.com/IaManoj01/infra-data-capstone-project.git
```

Move into the project directory:

```bash
cd infra-data-capstone-project
```

## 4.4 Project Directory Structure

```text
solar-farm-project/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── backend/
│   └── solar-farm-service/
│       ├── src/
│       ├── pom.xml
│       ├── mvnw
│       └── mvnw.cmd
│
├── data-simulator/
│   ├── src/
│   ├── tests/
│   ├── data/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/
├── .gitignore
├── docker-compose.yml
└── docker-compose.prod.yml
```

## 4.5 Environment Configuration

The project uses environment variables to configure database connectivity and cloud integration.

Create the required local environment configuration based on the variables referenced in the Docker Compose and application configuration files.

Typical configuration categories include:

- MySQL database name.
- MySQL username and password.
- Database host and port.
- AWS region.
- S3 bucket name.
- Simulator execution interval.

Do not commit environment files containing passwords, access keys, tokens, or other credentials.

Use `.env.example` to document variable names and safe example values without exposing real credentials.

Production configuration is maintained separately on the EC2 instance.

## 4.6 Start the Local MySQL Container

From the project root, run:

```bash
docker compose up -d mysql-db
```

Check the running container:

```bash
docker ps
```

Check the container logs:

```bash
docker logs solarfarm-mysql
```

The local MySQL service uses a named Docker volume to preserve database data across container restarts.

## 4.7 Run the Python Simulator

Move into the simulator directory:

```bash
cd data-simulator
```

Create and activate a Python virtual environment if running the simulator outside Docker.

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the test suite:

```bash
PYTHONPATH=src python -m pytest tests/ -v
```

On Windows, use the appropriate environment-variable syntax for CMD or PowerShell if running the command directly outside Git Bash.

Return to the project root after testing.

## 4.8 Run the Spring Boot Backend

Open another terminal and navigate to:

```bash
cd backend/solar-farm-service
```

On Windows CMD, run:

```cmd
mvnw.cmd spring-boot:run
```

Alternatively, build and test the application:

```cmd
mvnw.cmd clean verify
```

The backend's local port and database configuration must match the application configuration.

## 4.9 Run the React Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

The frontend development server normally prints the local URL in the terminal.

## 4.10 Verify the Application

Verify the following components individually:

1. MySQL container is running.
2. Backend starts successfully and connects to the database.
3. Backend health endpoint reports an operational status.
4. REST endpoints return expected responses.
5. Frontend starts and can communicate with the backend.
6. Python tests pass.
7. Frontend production build succeeds.

For Spring Boot Actuator, the health endpoint is:

```text
/actuator/health
```

For the OpenAPI specification:

```text
/v3/api-docs
```

For Swagger UI:

```text
/swagger-ui/index.html
```

The exact host and port depend on how the backend is running.

## 4.11 Security Notes

- Never commit `.env` or `.env.production`.
- Do not place AWS credentials directly in source code.
- Do not publish database credentials in screenshots.
- Use separate configuration for local development and production.
- Restrict access to production infrastructure.


