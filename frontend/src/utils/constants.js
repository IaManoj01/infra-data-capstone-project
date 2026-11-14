export const FAULT_TYPES = {
  COMMS_OFFLINE: {
    key: "COMMS_OFFLINE",
    label: "Communication Offline",
    severity: "CRITICAL",
    category: "Communication",
    description:
      "Inverter telemetry lost. Zero DC/AC power with no voltage telemetry under sunlight (>200 W/m²).",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    pillColor: "bg-rose-500",
  },
  INVERTER_TRIP: {
    key: "INVERTER_TRIP",
    label: "Inverter Trip",
    severity: "HIGH",
    category: "Operational",
    description:
      "Inverter is producing zero power despite sufficient solar irradiance (>200 W/m²).",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    pillColor: "bg-amber-500",
  },
  VOLTAGE_SPIKE: {
    key: "VOLTAGE_SPIKE",
    label: "Grid Voltage Spike",
    severity: "CRITICAL",
    category: "Grid & Electrical",
    description: "Grid voltage exceeded safety tolerance limit (>450 V).",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    pillColor: "bg-purple-500",
  },
  THERMAL_WARNING: {
    key: "THERMAL_WARNING",
    label: "Module Thermal Warning",
    severity: "MEDIUM",
    category: "Thermal",
    description:
      "Photovoltaic module temperature exceeded operating threshold (>65 °C).",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
    pillColor: "bg-orange-500",
  },
};

export const TICKET_STATUSES = {
  OPEN: {
    key: "OPEN",
    label: "Open",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    dotColor: "bg-rose-500",
    description: "Awaiting triage and technician dispatch.",
  },
  IN_PROGRESS: {
    key: "IN_PROGRESS",
    label: "In Progress",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    dotColor: "bg-blue-500",
    description: "Investigation or field repair currently underway.",
  },
  CLOSED: {
    key: "CLOSED",
    label: "Closed",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dotColor: "bg-emerald-500",
    description: "Fault verified resolved and verified against telemetry.",
  },
};

export const SEVERITY_LEVELS = {
  CRITICAL: {
    label: "Critical",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    dotColor: "bg-rose-500",
  },
  HIGH: {
    label: "High",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    dotColor: "bg-amber-500",
  },
  MEDIUM: {
    label: "Medium",
    badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dotColor: "bg-yellow-500",
  },
  LOW: {
    label: "Low",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    dotColor: "bg-slate-500",
  },
};
