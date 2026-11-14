import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Bell,
  Play,
  RotateCw,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import etlApi from "../../services/api/etlApi";

export default function Topbar({ onRefresh, isRefreshing, dataSourceNotice }) {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [etlModalOpen, setEtlModalOpen] = useState(false);
  const [etlLoading, setEtlLoading] = useState(false);
  const [etlResult, setEtlResult] = useState(null);
  const [etlError, setEtlError] = useState("");

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute breadcrumbs and title
  const path = location.pathname;
  let pageTitle = "Fault Overview";
  let breadcrumbs = [{ label: "Overview", to: "/" }];

  if (path.startsWith("/tickets/")) {
    const id = path.split("/")[2];
    pageTitle = `Fault Investigation #${id}`;
    breadcrumbs = [
      { label: "Overview", to: "/" },
      { label: "Fault Tickets", to: "/tickets" },
      { label: `Ticket #${id}`, to: path },
    ];
  } else if (path === "/tickets") {
    pageTitle = "Fault Ticket Management";
    breadcrumbs = [
      { label: "Overview", to: "/" },
      { label: "Fault Tickets", to: "/tickets" },
    ];
  } else if (path === "/sites") {
    pageTitle = "Sites & Inverter Monitoring";
    breadcrumbs = [
      { label: "Overview", to: "/" },
      { label: "Sites & Inverters", to: "/sites" },
    ];
  } else if (path === "/analytics") {
    pageTitle = "Operational Health & Analytics";
    breadcrumbs = [
      { label: "Overview", to: "/" },
      { label: "Analytics", to: "/analytics" },
    ];
  }

  const handleRunEtl = async () => {
    setEtlLoading(true);
    setEtlError("");
    setEtlResult(null);

    const now = new Date();
    const runId = `RUN_${now.getTime()}`;
    const batchId = `BATCH_UI_${Math.floor(Math.random() * 9000 + 1000)}`;

    try {
      const res = await etlApi.runEtl({
        runId,
        batchId,
        startTimestamp: "2026-10-01T00:00:00",
        endTimestamp: "2026-10-04T00:00:00",
      });
      setEtlResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setEtlError(
        err.message || "ETL Execution failed. Verify Spring Boot is running.",
      );
    } finally {
      setEtlLoading(false);
    }
  };

  return (
    <>
      <header className="h-16 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Left: Title & Breadcrumbs */}
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-0.5">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.to}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                )}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-slate-600 font-semibold">
                    {b.label}
                  </span>
                ) : (
                  <Link to={b.to} className="hover:text-slate-700 transition">
                    {b.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
            {pageTitle}
          </h1>
        </div>

        {/* Right: Actions, Clock, User Profile */}
        <div className="flex items-center gap-4">
          {/* Live System Time */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {currentTime.toISOString().replace("T", " ").substring(0, 19)} UTC
            </span>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Telemetry"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
            >
              <RotateCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`}
              />
            </button>
          )}

          {/* Trigger Ingestion / ETL Button */}
          <button
            onClick={() => setEtlModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Trigger ETL</span>
          </button>

          {/* Notification Placeholder */}
          <div className="relative">
            <button className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 font-semibold text-xs flex items-center justify-center">
              OP
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                Solar Operator
              </p>
              <p className="text-[10px] text-slate-400">Operations Engineer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Data Source Notification Banner if applicable */}
      {dataSourceNotice && (
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-8 py-2 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{dataSourceNotice}</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
            Spring Boot ETL Synced
          </span>
        </div>
      )}

      {/* ETL Ingestion Trigger Modal */}
      {etlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Trigger ETL Pipeline Batch
                </h3>
              </div>
              <button
                onClick={() => setEtlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p>
                Triggers the backend Spring Boot endpoint{" "}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                  POST /api/etl/run
                </code>{" "}
                to clean raw weather and generation staging records, evaluate
                variance rules, and generate candidate fault tickets.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Endpoint:</span>
                  <span className="text-slate-800 font-semibold">
                    /api/etl/run
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Staged Range:</span>
                  <span className="text-slate-800">
                    2026-10-01 to 2026-10-04
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Sites:</span>
                  <span className="text-slate-800 font-semibold">
                    SITE_001 &amp; SITE_002 (Both Sites)
                  </span>
                </div>
              </div>

              {etlError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{etlError}</span>
                </div>
              )}

              {etlResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{etlResult.status || "ETL Process Completed"}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Weather: {etlResult.weatherInserted ?? 0} inserted &bull;
                    Generation: {etlResult.generationInserted ?? 0} inserted
                    &bull; Fault tickets created:{" "}
                    {etlResult.ticketsCreated ??
                      etlResult.faultTicketsCreated ??
                      0}
                  </p>
                  {etlResult.message && (
                    <p className="text-[10px] text-emerald-600 font-mono">
                      {etlResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEtlModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-lg transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRunEtl}
                disabled={etlLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                {etlLoading ? "Executing Ingestion..." : "Execute Run"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
