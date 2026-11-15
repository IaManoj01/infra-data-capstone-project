# 7. Frontend Application

## 7.1 Introduction

The frontend of the Solar Farm Platform is developed using React and Vite.

It provides the presentation layer through which users can interact with the application and view solar farm information retrieved from the backend.

The frontend communicates with the Spring Boot REST APIs and displays the returned data through the application's user interface.

## 7.2 Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| Vite | Frontend development server and build tool |
| JavaScript | Application logic |
| Nginx | Production frontend web server and reverse proxy |
| REST APIs | Communication with the Spring Boot backend |

The exact frontend libraries used for charts, routing, and styling should be listed after checking `frontend/package.json`.

## 7.3 Frontend Responsibilities

The frontend is responsible for:

- Displaying application information.
- Requesting data from the backend.
- Presenting solar generation information.
- Presenting weather observations.
- Displaying relevant operational records.
- Supporting user interactions for the features implemented in the application.

The actual page names, navigation structure, filters, and dashboard components should be documented according to the final frontend implementation.

## 7.4 Backend Communication

The frontend communicates with the backend through HTTP requests.

The main API groups include:

- `/api/generation`
- `/api/weather`
- `/api/fault-tickets`
- `/api/etl`

In production, Nginx serves the React application and routes requests beginning with `/api/` to the Spring Boot container through the internal Docker network.

This allows the browser to access the frontend and backend through the same public entry point.

## 7.5 Production Deployment

The frontend is packaged into a Docker image using the frontend Dockerfile.

Nginx serves the built frontend assets.

The production Docker Compose configuration publishes the frontend service on:

```text
80:80
```

The backend service remains internal to the Docker network and is not directly published as a public host port.

## 7.6 Build and Run

Move into the frontend directory:

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

Create a production build:

```bash
npm run build
```

The production Docker image uses the frontend build and Nginx configuration.

## 7.7 Frontend Validation

The frontend is validated in the GitHub Actions workflow by:

1. Checking out the source code.
2. Setting up Node.js 20.
3. Installing dependencies using `npm ci`.
4. Running `npm run build`.

A successful build verifies that the frontend can be compiled in the CI environment. It does not, by itself, replace browser-based functional testing.


