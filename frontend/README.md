# SolarPulse - Solar Farm Fault Management & Monitoring Dashboard

A modern, responsive, industrial-grade web application for solar farm operators to monitor inverter generation variance, triage equipment anomalies, and manage the complete fault ticket lifecycle.

---

## Architecture & Technology Stack

- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS (Enterprise industrial slate-navy `#0F172A` / `#1E293B` palette with amber accents)
- **Icons**: Lucide React
- **Charts & Visualizations**: Recharts
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with centralized error normalization and loading interceptors

---

## Key Features & Pages

### 1. Overview Dashboard (`/`)
- **Real-Time KPIs**: Total Tickets, Open Faults, In-Progress Faults, Resolved/Closed Faults, Critical Alerts.
- **Visual Analytics**:
  - Daily Fault Incidents over time (15-minute interval aggregation)
  - Fault distribution by fault type (`COMMS_OFFLINE`, `INVERTER_TRIP`, `VOLTAGE_SPIKE`, `THERMAL_WARNING`)
  - Comparative fault frequency across inverters (`INV_01`, `INV_02`, `INV_03`, `INV_04`)
  - Ticket resolution backlog breakdown
- **Recent Fault Queue**: Live summary table with direct inspection links.

### 2. Fault Ticket Management (`/tickets`)
- **Search**: By Ticket ID, Site ID, Inverter ID, or diagnosis keywords.
- **Filters**: By ticket status (`OPEN`, `IN_PROGRESS`, `CLOSED`) and fault category.
- **Sorting**: Toggle between newest and oldest timestamps.
- **Pagination**: Structured multi-page navigation.
- **Status Transition**: Built-in modal to advance ticket status (`OPEN` → `IN_PROGRESS` → `CLOSED`) and document technician resolution notes.

### 3. Fault Diagnostic Investigation (`/tickets/:id`)
- **Hero Diagnostic Banner**: Incident details, site, inverter, and automated root-cause explanation.
- **Dual Telemetry Panels**:
  - Inverter generation readings: AC Power, DC Power, Grid Voltage, Power Factor.
  - Concurrent weather observations: Solar Irradiance ($W/m^2$), Module Temp, Ambient Temp, Cloud Cover.
- **Context Correlation Chart**: Multi-axis visualization correlating irradiance, AC power, and grid voltage around the incident timestamp.
- **Fault Investigation Lifecycle**: Step-by-step audit trail from detection through technician triage to closure.

### 4. Site & Inverter Monitoring (`/sites`)
- **Site Switcher**: Overview of solar farm facilities (`SITE_001` - Bhadla Solar Park).
- **Inverter Health Cards**: Status indicator (`HEALTHY`, `DEGRADED`, `FAULT`) and open fault counts per inverter.
- **Inverter Telemetry**: Live electrical parameters.
- **Historical Inverter Faults**: Filtered ticket history per inverter unit.

### 5. Operational Health & Yield Analytics (`/analytics`)
- Plant health metrics, resolution velocity, inverter trips vs telemetry dropouts.
- Direct table view of anomalies retrieved from Spring Boot `/api/generation/anomalies`.

---

## Backend Integration Details

- **Axios Configuration**: Configured in `src/services/axiosInstance.js` reading `VITE_API_BASE_URL` (default: `http://localhost:8080`).
- **Live Spring Boot Endpoints Utilized**:
  - `GET /api/generation`: All clean generation telemetry.
  - `GET /api/generation/{inverterId}`: Telemetry for specific inverter.
  - `GET /api/generation/{inverterId}/timeframe`: Interval generation telemetry.
  - `GET /api/generation/anomalies`: Flagged inverter trips and dropouts.
  - `GET /api/weather`: Meteorological observations.
  - `GET /api/weather/timeframe`: Interval weather observations.
  - `POST /api/etl/run`: Triggered directly via topbar "Trigger ETL" modal.
- **Fault Ticket Endpoint**: Targets `/api/fault-tickets`. If the backend ticket controller is not yet deployed, the frontend evaluates real generation anomalies and pyranometer readings using the backend's exact `DataTransformationService` rules.

---

## Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```
