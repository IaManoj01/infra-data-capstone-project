import React from "react";
import {
  TICKET_STATUSES,
  FAULT_TYPES,
  SEVERITY_LEVELS,
} from "../../utils/constants";

export function StatusBadge({ status }) {
  const meta = TICKET_STATUSES[status] || {
    label: status || "UNKNOWN",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const meta = SEVERITY_LEVELS[severity] || {
    label: severity || "NORMAL",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${meta.badgeColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
}

export function FaultTypeBadge({ faultType }) {
  const meta = FAULT_TYPES[faultType] || {
    label: faultType || "UNKNOWN_FAULT",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${meta.badgeColor}`}
    >
      {meta.label}
    </span>
  );
}
