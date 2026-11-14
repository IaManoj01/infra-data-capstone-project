import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  Cpu,
  BarChart3,
  Sun,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    path: "/tickets",
    label: "Fault Tickets",
    icon: AlertTriangle,
  },
  {
    path: "/sites",
    label: "Sites & Inverters",
    icon: Cpu,
  },
  {
    path: "/analytics",
    label: "Fault Analytics",
    icon: BarChart3,
  },
];

export default function Sidebar({ openTicketCount = 0 }) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand & Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
          <Zap className="w-5 h-5 fill-slate-950 stroke-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight text-sm">
              SolarPulse
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Ops
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Fault Management System
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Operational Console
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.path === "/tickets" && openTicketCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shadow-sm">
                  {openTicketCount}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Plant Infrastructure
        </div>
        <div className="px-3.5 py-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Total Sites:</span>
            <span className="font-semibold text-amber-400">2 Solar Plants</span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">
                SITE_001 (Alpha)
              </span>
              <span className="text-slate-400 font-mono">
                500 kW &bull; 4 Inv
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">
                SITE_002 (Beta)
              </span>
              <span className="text-slate-400 font-mono">
                750 kW &bull; 4 Inv
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">Total Inverters:</span>
            <span className="font-semibold text-slate-200">
              8 Units (4 per site)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Combined Capacity:
            </span>
            <span className="font-semibold text-emerald-400 font-mono">
              1,250 kW
            </span>
          </div>
        </div>
      </div>

      {/* Backend Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              Telemetry Daemon
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Spring Boot :8080
            </p>
          </div>
          <Server className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </aside>
  );
}
