import React from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TelemetryCorrelationChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-slate-400">
        No correlation telemetry loaded.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          {/* Left Y Axis for Power (kW) and Irradiance (W/m2 scaled) */}
          <YAxis
            yAxisId="power"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            label={{
              value: "kW / W/m²",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
              fill: "#64748b",
            }}
          />
          {/* Right Y Axis for Grid Voltage (V) */}
          <YAxis
            yAxisId="voltage"
            orientation="right"
            stroke="#94a3b8"
            fontSize={11}
            domain={[380, 500]}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Voltage (V)",
              angle: 90,
              position: "insideRight",
              fontSize: 10,
              fill: "#64748b",
            }}
          />
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
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
          />
          <Bar
            yAxisId="power"
            dataKey="acPowerKw"
            name="AC Power (kW)"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="irradianceWM2"
            name="Solar Irradiance (W/m²)"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="voltage"
            type="monotone"
            dataKey="gridVoltageV"
            name="Grid Voltage (V)"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
