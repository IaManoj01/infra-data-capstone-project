import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  COMMS_OFFLINE: "#f43f5e", // Rose
  INVERTER_TRIP: "#f59e0b", // Amber
  VOLTAGE_SPIKE: "#a855f7", // Purple
  THERMAL_WARNING: "#f97316", // Orange
};

const LABELS = {
  COMMS_OFFLINE: "Comms Offline",
  INVERTER_TRIP: "Inverter Trip",
  VOLTAGE_SPIKE: "Voltage Spike",
  THERMAL_WARNING: "Thermal Warning",
};

export default function FaultDistributionPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No fault distribution data.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: LABELS[d.type] || d.type,
    value: d.count,
    rawType: d.type,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.rawType] || "#64748b"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "none",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
