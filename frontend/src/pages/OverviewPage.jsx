import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  Sun,
  MapPin,
  SlidersHorizontal,
  CheckCircle,
} from "lucide-react";
import StatCard from "../components/common/StatCard";
import {
  StatusBadge,
  SeverityBadge,
  FaultTypeBadge,
} from "../components/common/Badge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import StatusModal from "../components/common/StatusModal";
import FaultsOverTimeChart from "../components/charts/FaultsOverTimeChart";
import FaultDistributionPieChart from "../components/charts/FaultDistributionPieChart";
import InverterFaultBarChart from "../components/charts/InverterFaultBarChart";
import StatusDistributionChart from "../components/charts/StatusDistributionChart";
import faultTicketApi from "../services/api/faultTicketApi";
import siteApi from "../services/api/siteApi";
import generationApi from "../services/api/generationApi";
import { FAULT_TYPES } from "../utils/constants";
import { formatDateTime, formatPower, formatEnergy } from "../utils/formatters";

export default function OverviewPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const refreshTrigger = context?.refreshTrigger ?? 0;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [activeSiteFilter, setActiveSiteFilter] = useState("ALL"); // 'ALL' | 'SITE_001' | 'SITE_002'
  const [activeModalTicket, setActiveModalTicket] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ticketRes, siteList] = await Promise.all([
        faultTicketApi.getAllTickets(),
        siteApi.getSitesOverview(),
      ]);
      setTickets(ticketRes.data || []);
      setSites(siteList || []);
    } catch (err) {
      setError(err.message || "Unable to retrieve fault statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleUpdateStatus = async (ticketId, status, notes) => {
    await faultTicketApi.updateTicketStatus(ticketId, status, notes);
    await loadData();
    if (context?.onRefreshGlobal) context.onRefreshGlobal();
  };

  // Filtered tickets based on active site tab
  const displayedTickets = useMemo(() => {
    if (activeSiteFilter === "ALL") return tickets;
    return tickets.filter((t) => t.siteId === activeSiteFilter);
  }, [tickets, activeSiteFilter]);

  // Derived metrics for currently selected scope
  const totalCount = displayedTickets.length;
  const openCount = displayedTickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = displayedTickets.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const closedCount = displayedTickets.filter(
    (t) => t.status === "CLOSED",
  ).length;
  const criticalCount = displayedTickets.filter((t) => {
    const meta = FAULT_TYPES[t.faultType];
    return meta?.severity === "CRITICAL";
  }).length;

  // Chart data 1: Faults over time
  const timelineMap = {};
  displayedTickets.forEach((t) => {
    const d = t.timestamp ? t.timestamp.substring(0, 10) : "Unknown";
    timelineMap[d] = (timelineMap[d] || 0) + 1;
  });
  const timeData = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, faults]) => ({ date, faults }));

  // Chart data 2: Fault distribution by type
  const typeMap = {};
  displayedTickets.forEach((t) => {
    typeMap[t.faultType] = (typeMap[t.faultType] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([type, count]) => ({
    type,
    count,
  }));

  // Chart data 3: Fault distribution by inverter
  const invMap = {};
  displayedTickets.forEach((t) => {
    const inv = t.inverterId || "Array-Wide";
    invMap[inv] = (invMap[inv] || 0) + 1;
  });
  const inverterData = ["INV_01", "INV_02", "INV_03", "INV_04"].map((inv) => ({
    inverterId: inv,
    faults: invMap[inv] || 0,
  }));

  // Chart data 4: Open vs Closed
  const statusData = [
    { name: "Open", status: "OPEN", value: openCount },
    { name: "In Progress", status: "IN_PROGRESS", value: inProgressCount },
    { name: "Closed", status: "CLOSED", value: closedCount },
  ];

  // Recent Faults
  const recentFaults = [...displayedTickets]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 8);

  if (loading) {
    return (
      <LoadingSpinner message="Calculating solar farm multi-site health metrics..." />
    );
  }

  // Pre-calculate per-site ticket stats for the top site cards
  const site1Tickets = tickets.filter((t) => t.siteId === "SITE_001");
  const site1Open = site1Tickets.filter((t) => t.status === "OPEN").length;

  const site2Tickets = tickets.filter((t) => t.siteId === "SITE_002");
  const site2Open = site2Tickets.filter((t) => t.status === "OPEN").length;

  const site1Data = sites.find((s) => s.siteId === "SITE_001");
  const site2Data = sites.find((s) => s.siteId === "SITE_002");

  return (
    <div className="space-y-6">
      {/* SECTION 1: Two Solar Sites Portfolio Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Solar Farm Infrastructure Portfolio (2 Active Sites)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Real-time operational status, capacity, and active ticket metrics
              across monitored facilities
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
            Total Capacity:{" "}
            <span className="font-bold text-slate-900">1,250 kW</span> (8
            Inverters)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Site 1 Card */}
          <div
            className={`bg-white rounded-xl border p-5 transition-all shadow-sm relative overflow-hidden ${
              activeSiteFilter === "SITE_001"
                ? "border-amber-500 ring-2 ring-amber-500/20"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
                    SITE_001
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Grid Connected
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Solar Plant Alpha
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Bhadla Solar Park, Rajasthan
                </p>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold font-mono text-slate-900">
                  500.0 kW
                </div>
                <div className="text-[11px] text-slate-400">
                  4 Inverters &bull; 125 kW ea.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Open Faults
                </div>
                <div
                  className={`text-sm font-bold font-mono mt-0.5 ${site1Open > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {site1Open} Open
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Total Tickets
                </div>
                <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                  {site1Tickets.length} Total
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Tracking Tech
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                  Dual-Axis
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() =>
                  setActiveSiteFilter(
                    activeSiteFilter === "SITE_001" ? "ALL" : "SITE_001",
                  )
                }
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  activeSiteFilter === "SITE_001"
                    ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                    : "text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {activeSiteFilter === "SITE_001"
                  ? "Filtering Dashboard"
                  : "Filter by Site 1"}
              </button>

              <button
                onClick={() => navigate("/sites?site=SITE_001")}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
              >
                <span>Telemetry & Inverters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Site 2 Card */}
          <div
            className={`bg-white rounded-xl border p-5 transition-all shadow-sm relative overflow-hidden ${
              activeSiteFilter === "SITE_002"
                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-50 text-indigo-800 border border-indigo-200">
                    SITE_002
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Grid Connected
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Solar Plant Beta
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Charanka Solar Park, Gujarat
                </p>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold font-mono text-slate-900">
                  750.0 kW
                </div>
                <div className="text-[11px] text-slate-400">
                  4 Inverters &bull; 187.5 kW ea.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Open Faults
                </div>
                <div
                  className={`text-sm font-bold font-mono mt-0.5 ${site2Open > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {site2Open} Open
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Total Tickets
                </div>
                <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                  {site2Tickets.length} Total
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  Tracking Tech
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                  Bifacial Single-Axis
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() =>
                  setActiveSiteFilter(
                    activeSiteFilter === "SITE_002" ? "ALL" : "SITE_002",
                  )
                }
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  activeSiteFilter === "SITE_002"
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                    : "text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {activeSiteFilter === "SITE_002"
                  ? "Filtering Dashboard"
                  : "Filter by Site 2"}
              </button>

              <button
                onClick={() => navigate("/sites?site=SITE_002")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
              >
                <span>Telemetry & Inverters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Site Filter Tabs */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl border border-slate-300/60">
          <button
            onClick={() => setActiveSiteFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSiteFilter === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Sites (Combined Portfolio)
          </button>
          <button
            onClick={() => setActiveSiteFilter("SITE_001")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSiteFilter === "SITE_001"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SITE_001 &bull; Solar Plant Alpha
          </button>
          <button
            onClick={() => setActiveSiteFilter("SITE_002")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSiteFilter === "SITE_002"
                ? "bg-white text-indigo-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SITE_002 &bull; Solar Plant Beta
          </button>
        </div>

        {activeSiteFilter !== "ALL" && (
          <button
            onClick={() => setActiveSiteFilter("ALL")}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Clear Site Filter
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Fault Tickets"
          value={totalCount}
          subtitle={
            activeSiteFilter === "ALL"
              ? "Combined across both sites"
              : `Scoped to ${activeSiteFilter}`
          }
          icon={AlertTriangle}
          colorScheme="slate"
          onClick={() =>
            navigate(
              activeSiteFilter === "ALL"
                ? "/tickets"
                : `/tickets?siteId=${activeSiteFilter}`,
            )
          }
        />
        <StatCard
          title="Open Faults"
          value={openCount}
          subtitle="Requires technician triage"
          icon={ShieldAlert}
          colorScheme="rose"
          onClick={() =>
            navigate(
              activeSiteFilter === "ALL"
                ? "/tickets?status=OPEN"
                : `/tickets?status=OPEN&siteId=${activeSiteFilter}`,
            )
          }
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Field investigation active"
          icon={Clock}
          colorScheme="blue"
          onClick={() =>
            navigate(
              activeSiteFilter === "ALL"
                ? "/tickets?status=IN_PROGRESS"
                : `/tickets?status=IN_PROGRESS&siteId=${activeSiteFilter}`,
            )
          }
        />
        <StatCard
          title="Resolved & Closed"
          value={closedCount}
          subtitle="Verified operational"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() =>
            navigate(
              activeSiteFilter === "ALL"
                ? "/tickets?status=CLOSED"
                : `/tickets?status=CLOSED&siteId=${activeSiteFilter}`,
            )
          }
        />
        <StatCard
          title="Critical Faults"
          value={criticalCount}
          subtitle="Comms offline or voltage spike"
          icon={Zap}
          colorScheme="purple"
          onClick={() =>
            navigate(
              activeSiteFilter === "ALL"
                ? "/tickets?faultType=COMMS_OFFLINE"
                : `/tickets?faultType=COMMS_OFFLINE&siteId=${activeSiteFilter}`,
            )
          }
        />
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faults Over Time (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Fault Incidents Over Time
              </h2>
              <p className="text-xs text-slate-500">
                Historical fault cadence{" "}
                {activeSiteFilter === "ALL"
                  ? "across all solar sites"
                  : `for ${activeSiteFilter}`}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              Daily Cadence
            </span>
          </div>
          <FaultsOverTimeChart data={timeData} />
        </div>

        {/* Fault Distribution by Type (1 col) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Distribution by Fault Type
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of operational vs electrical faults
              </p>
            </div>
          </div>
          <FaultDistributionPieChart data={typeData} />
        </div>
      </div>

      {/* Second Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inverter Fault Comparison */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Fault Frequency by Inverter
              </h2>
              <p className="text-xs text-slate-500">
                {activeSiteFilter === "ALL"
                  ? "Comparative fault incidence across all 4 inverters"
                  : `Inverter breakdown for ${activeSiteFilter}`}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
              Scope:{" "}
              {activeSiteFilter === "ALL" ? "Both Sites" : activeSiteFilter}
            </span>
          </div>
          <InverterFaultBarChart data={inverterData} />
        </div>

        {/* Open vs Closed Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Ticket Resolution Status
              </h2>
              <p className="text-xs text-slate-500">
                Operational resolution backlog breakdown
              </p>
            </div>
          </div>
          <StatusDistributionChart data={statusData} />
        </div>
      </div>

      {/* Recent Faults Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Operational Fault Tickets</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {totalCount} Total
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {activeSiteFilter === "ALL"
                ? "Latest anomalies captured from SITE_001 and SITE_002"
                : `Filtered tickets for ${activeSiteFilter}`}
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                activeSiteFilter === "ALL"
                  ? "/tickets"
                  : `/tickets?siteId=${activeSiteFilter}`,
              )
            }
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
          >
            <span>Manage All Tickets ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentFaults.length === 0 ? (
          <EmptyState
            title="No Faults Detected"
            description="All inverters operating within normal generation thresholds."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Ticket ID</th>
                  <th className="py-3 px-4">Site</th>
                  <th className="py-3 px-4">Inverter</th>
                  <th className="py-3 px-4">Fault Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Detection Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {recentFaults.map((f) => {
                  const severity =
                    FAULT_TYPES[f.faultType]?.severity || "MEDIUM";
                  const isSite1 = f.siteId === "SITE_001";
                  return (
                    <tr
                      key={f.ticketId}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/tickets/${f.ticketId}`)}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900 group-hover:text-amber-600 transition">
                        #{f.ticketId}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                            isSite1
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          }`}
                        >
                          {f.siteId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {f.inverterId}
                      </td>
                      <td className="py-3.5 px-4">
                        <FaultTypeBadge faultType={f.faultType} />
                      </td>
                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={severity} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {formatDateTime(f.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={f.status} />
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalTicket(f);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                        >
                          Triage
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${f.ticketId}`);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Status Triage Modal */}
      {activeModalTicket && (
        <StatusModal
          isOpen={!!activeModalTicket}
          onClose={() => setActiveModalTicket(null)}
          ticket={activeModalTicket}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
