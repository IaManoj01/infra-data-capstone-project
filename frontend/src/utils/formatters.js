/**
 * Utility functions for formatting solar telemetry and timestamps.
 */

export function formatDateTime(isoString) {
  if (!isoString) return "--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return String(isoString);
  }
}

export function formatDate(isoString) {
  if (!isoString) return "--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(isoString);
  }
}

export function formatTime(isoString) {
  if (!isoString) return "--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return String(isoString);
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return "--";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return formatDateTime(isoString);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return formatDate(isoString);
  } catch {
    return String(isoString);
  }
}

export function formatPower(val) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return `${Number(val).toFixed(2)} kW`;
}

export function formatEnergy(val) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return `${Number(val).toFixed(2)} kWh`;
}

export function formatVoltage(val) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return `${Number(val).toFixed(1)} V`;
}

export function formatTemperature(val) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return `${Number(val).toFixed(1)} °C`;
}

export function formatIrradiance(val) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return `${Number(val).toFixed(1)} W/m²`;
}
