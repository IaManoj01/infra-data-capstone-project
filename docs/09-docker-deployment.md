# 9. Docker and Application Deployment

## 9.1 Introduction

Docker is used to package and run the application components in consistent container environments.

Docker Compose is used to define and manage the services required by the local and production environments.

The project maintains separate Compose configurations for local development and production deployment.

## 9.2 Docker Components

The project uses:

- Dockerfiles to define container images.
- Docker Compose to manage multiple services.
- Container networks for service-to-service communication.
- Named volumes for persistent local database storage.
- Bind mounts for the simulator data directory.
- Environment variables for runtime configuration.

## 9.3 Local Docker Compose Configuration

The local configuration is defined in:

```text
docker-compose.yml
```

The active services are:

| Service | Container | Purpose |
|---|---|---|
| `mysql-db` | `solarfarm-mysql` | Local MySQL database |
| `python-scheduler` | `solarfarm-python` | Python simulator and scheduled pipeline service |

The local database uses a named volume called `mysql_data`.

The simulator uses a bind mount for its data directory.

The local Compose file also contains commented-out configuration. Commented services are not active services and should not be represented as part of the running local stack.

## 9.4 Start Local Services

From the project root:

```bash
docker compose up -d mysql-db
```

To start all active local services:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

View logs for one service:

```bash
docker compose logs -f mysql-db
```

Stop services:

```bash
docker compose down
```

The named MySQL volume is retained when using the normal `down` command.

## 9.5 Production Docker Compose Configuration

The production configuration is defined in:

```text
docker-compose.prod.yml
```

It defines the following services:

| Service | Container | Purpose |
|---|---|---|
| `spring-boot` | `solarfarm-springboot` | Backend REST API |
| `python-scheduler` | `solarfarm-python` | Simulator and ETL scheduling |
| `frontend` | `solarfarm-frontend` | React application served through Nginx |

The production database is AWS RDS, not a MySQL container in the production Compose file.

## 9.6 Production Network Design

The frontend publishes port 80:

```text
80:80
```

The Spring Boot service exposes port 8080 internally to the Docker network.

The backend is not directly published as a public host port.

Nginx acts as the public entry point and forwards `/api/` requests to the Spring Boot service.

The Python scheduler communicates with the backend using the internal Docker service address:

```text
http://spring-boot:8080/api/etl/run
```

This reduces the need to expose internal application services directly to the internet.

## 9.7 Health Checks

The production Spring Boot service includes a Docker health check that calls:

```text
http://localhost:8080/actuator/health
```

The Compose configuration uses health-check status to control service startup dependencies.

The health endpoint can also be checked from inside the backend container:

```bash
docker exec solarfarm-springboot \
  sh -c 'wget -qO- http://localhost:8080/actuator/health'
```

An operational application returns a response indicating that its status is `UP`.

## 9.8 Production Deployment Command

The production stack is deployed using the production environment file and Compose configuration.

The general command is:

```bash
docker compose \
  --env-file /path/to/.env.production \
  -f docker-compose.prod.yml \
  up -d --build
```

The actual deployment workflow uses the project directory and the production environment file stored separately on EC2.

Never commit or share the production environment file.

## 9.9 Useful Production Commands

Check container status:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs -f
```

Check backend logs:

```bash
docker logs -f solarfarm-springboot
```

Check frontend logs:

```bash
docker logs -f solarfarm-frontend
```

Check simulator logs:

```bash
docker logs -f solarfarm-python
```

Check available Docker images:

```bash
docker images
```

## 9.10 Deployment Design

The project uses GitHub Actions to deploy successful changes to the production EC2 environment.

The deployment process:

1. Connects to the EC2 instance using SSH.
2. Fetches the latest code from the GitHub repository.
3. Updates the production repository to the latest `main` branch commit.
4. Checks that the production environment file exists.
5. Checks the required production project files and simulator data directory.
6. Rebuilds and starts the production Docker Compose services.
7. Displays the resulting service status.

The deployment process preserves the production environment file outside the tracked repository.


