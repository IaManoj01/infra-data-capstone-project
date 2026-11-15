# 6. Backend REST API Documentation

## 6.1 Introduction

The backend service is developed using Java 21 and Spring Boot.

It provides REST APIs for accessing solar generation records, weather observations, fault tickets, and ETL operations.

The application uses Spring Data JPA for database interaction and exposes JSON-based HTTP endpoints for frontend and service-to-service communication.

## 6.2 Backend Responsibilities

- Retrieve inverter generation records.
- Filter generation records by inverter, site, and time range.
- Retrieve weather observations.
- Filter weather observations by site and time range.
- Retrieve generation anomalies.
- Create and manage fault tickets.
- Trigger the ETL process.
- Provide application health information through Spring Boot Actuator.

## 6.3 API Base Path

The API endpoints use the following base paths:

```text
/api/generation
/api/weather
/api/fault-tickets
/api/etl
```

The production frontend is served through Nginx. Requests using `/api/` are routed to the Spring Boot service over the internal Docker network.

## 6.4 API Documentation Using OpenAPI and Swagger

The project includes Springdoc OpenAPI integration.

The generated OpenAPI specification can be accessed at:

```text
/v3/api-docs
```

Swagger UI can be accessed at:

```text
/swagger-ui/index.html
```

Swagger UI provides an interactive interface for exploring API endpoints, viewing request parameters, inspecting response schemas, and executing API requests.

The generated OpenAPI document reports version `3.1.0`.

## 6.5 Generation APIs

Base path:

```text
/api/generation
```

The following endpoints are implemented in `InverterGenerationController`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/generation` | Retrieve all generation records |
| GET | `/api/generation/sites` | Retrieve available site identifiers |
| GET | `/api/generation/site/{siteId}` | Retrieve generation records for a site |
| GET | `/api/generation/site/{siteId}/inverter/{inverterId}` | Retrieve generation records for a site and inverter |
| GET | `/api/generation/site/{siteId}/timeframe` | Retrieve site generation within a time range |
| GET | `/api/generation/{inverterId}` | Retrieve generation records for an inverter |
| GET | `/api/generation/{inverterId}/timeframe` | Retrieve inverter generation within a time range |
| GET | `/api/generation/anomalies` | Retrieve generation anomaly records |

### Time Range Parameters

The time-range endpoints require:

| Parameter | Type | Description |
|---|---|---|
| `start` | ISO date-time | Beginning of the requested time range |
| `end` | ISO date-time | End of the requested time range |

Example request:

```http
GET /api/generation/site/SITE-001/timeframe?start=2026-11-14T00:00:00&end=2026-11-14T23:59:59
```

The example site identifier and date range are illustrative. Use identifiers and timestamps present in the actual database when testing.

## 6.6 Weather APIs

Base path:

```text
/api/weather
```

The following endpoints are implemented in `WeatherObservationController`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/weather` | Retrieve all weather observations |
| GET | `/api/weather/sites` | Retrieve available weather site identifiers |
| GET | `/api/weather/site/{siteId}` | Retrieve observations for a site |
| GET | `/api/weather/site/{siteId}/timeframe` | Retrieve site observations within a time range |
| GET | `/api/weather/timeframe` | Retrieve observations within a time range |

### Time Range Parameters

| Parameter | Type | Description |
|---|---|---|
| `start` | ISO date-time | Beginning of the requested time range |
| `end` | ISO date-time | End of the requested time range |

Example:

```http
GET /api/weather/timeframe?start=2026-11-14T00:00:00&end=2026-11-14T23:59:59
```

## 6.7 Fault Ticket APIs

Base path:

```text
/api/fault-tickets
```

The generated OpenAPI specification identifies the following operations.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/fault-tickets` | Retrieve fault tickets, with optional filters |
| POST | `/api/fault-tickets` | Create a fault ticket |
| GET | `/api/fault-tickets/{ticketId}` | Retrieve a ticket by ID |
| PUT | `/api/fault-tickets/{ticketId}/close` | Close a ticket |
| PATCH | `/api/fault-tickets/{ticketId}/status` | Update ticket status |

The list endpoint supports optional filters identified in the OpenAPI specification:

- `siteId`
- `inverterId`
- `status`
- `faultType`

The documented ticket status values are:

- `OPEN`
- `IN_PROGRESS`
- `CLOSED`

The generated schema also identifies fields such as `ticketId`, `timestamp`, `siteId`, `inverterId`, `faultType`, `status`, and `notes`.

The exact request validation rules and required fields must be verified against the request DTOs and controller implementation.

## 6.8 ETL API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/etl/run` | Trigger the ETL process |

The endpoint is used by the Python scheduler in the production environment.

The generated OpenAPI schema identifies an ETL response containing fields such as:

- `status`
- `weatherRead`
- `weatherInserted`
- `generationRead`
- `generationInserted`
- `ticketsCreated`
- `faultTicketsCreated`
- `message`

The exact response values depend on the ETL execution.

## 6.9 API Response Models

The OpenAPI specification identifies the following response models:

### InverterGeneration

- `id`
- `siteId`
- `inverterId`
- `timestamp`
- `dcPowerKw`
- `acPowerKw`
- `intervalEnergyKwh`
- `gridVoltageV`
- `powerFactor`
- `statusFlag`

### WeatherObservation

- `id`
- `siteId`
- `timestamp`
- `irradianceWM2`
- `ambientTempC`
- `moduleTempC`
- `cloudCoverPct`

### FaultTicket

- `ticketId`
- `timestamp`
- `siteId`
- `inverterId`
- `faultType`
- `status`
- `notes`

### TicketCloseRequest

- `resolutionNotes`

### EtlBatchResponse

- `status`
- `weatherRead`
- `weatherInserted`
- `generationRead`
- `generationInserted`
- `ticketsCreated`
- `message`
- `faultTicketsCreated`

## 6.10 Testing the APIs

The APIs can be tested using Swagger UI or an HTTP client such as Postman.

For production testing through the public Nginx entry point, examples include:

```bash
curl -i http://EC2_PUBLIC_IP/api/generation
```

```bash
curl -i http://EC2_PUBLIC_IP/api/weather
```

Replace `EC2_PUBLIC_IP` with the actual public IP address of the deployed EC2 instance.

A successful request should return an HTTP success status and the expected JSON response, subject to the availability of records.

The following URL is not a defined API endpoint:

```text
/api/
```

A 404 response at that root path does not by itself indicate that the backend is unavailable.

## 6.11 API Design Notes

- The controllers use `@RestController` to expose REST endpoints.
- `@RequestMapping` defines the base path for each controller.
- `@GetMapping` maps HTTP GET requests.
- `@PathVariable` reads values from URL paths.
- `@RequestParam` reads query parameters.
- `@DateTimeFormat` specifies ISO date-time parsing for time-range parameters.
- `@CrossOrigin(origins = "*")` is currently present on the generation and weather controllers.

**Security consideration:** Wildcard CORS is permissive. For production, configure allowed origins to match the actual frontend domain or origin. Also review whether CORS should be configured centrally rather than repeated on individual controllers.


