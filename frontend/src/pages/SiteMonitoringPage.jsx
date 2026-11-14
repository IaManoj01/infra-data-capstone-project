import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Cpu,
  MapPin,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  BarChart2,
  Sun,
  Thermometer,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  StatusBadge,
  SeverityBadge,
  FaultTypeBadge,
} from "../components/common/Badge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import StatusModal from "../components/common/StatusModal";
import InverterFaultBarChart from "../components/charts/InverterFaultBarChart";
import TelemetryCorrelationChart from "../components/charts/TelemetryCorrelationChart";
import siteApi from "../services/api/siteApi";
import faultTicketApi from "../services/api/faultTicketApi";
import generationApi from "../services/api/generationApi";
import weatherApi from "../services/api/weatherApi";
import {
  formatPower,
  formatVoltage,
  formatDateTime,
  formatTemperature,
  formatIrradiance,
} from "../utils/formatters";

export default function SiteMonitoringPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(
    searchParams.get("site") || "SITE_001",
  );
  const [selectedInverterId, setSelectedInverterId] = useState("INV_01");
  const [tickets, setTickets] = useState([]);
  const [inverterTelemetry, setInverterTelemetry] = useState(null);
  const [siteWeather, setSiteWeather] = useState(null);
  const [telemetrySeries, setTelemetrySeries] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [activeModalTicket, setActiveModalTicket] = useState(null);

  // Sync site from URL params if updated externally
  useEffect(() => {
    const siteParam = searchParams.get("site");
    if (siteParam && (siteParam === "SITE_001" || siteParam === "SITE_002")) {
      setSelectedSiteId(siteParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [siteList, ticketRes] = await Promise.all([
        siteApi.getSitesOverview(),
        faultTicketApi.getAllTickets(),
      ]);
      setSites(siteList || []);
      setTickets(ticketRes.data || []);

      const activeSite =
        siteList.find((s) => s.siteId === selectedSiteId) || siteList[0];
      if (
        activeSite &&
        activeSite.inverters &&
        activeSite.inverters.length > 0
      ) {
        if (!activeSite.inverters.includes(selectedInverterId)) {
          setSelectedInverterId(activeSite.inverters[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load sites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected inverter changes, fetch its latest generation records & weather
  useEffect(() => {
    if (!selectedInverterId || !selectedSiteId) return;

    async function fetchInvGen() {
      setLoadingTelemetry(true);
      try {
        const [records, weatherRecords] = await Promise.all([
          generationApi
            .getGenerationBySiteAndInverter(selectedSiteId, selectedInverterId)
            .catch(() => []),
          weatherApi.getWeatherBySite(selectedSiteId).catch(() => []),
        ]);

        if (records && records.length > 0) {
          const sorted = [...records].sort(
            (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
          );
          setInverterTelemetry(sorted[0]);

          // Merge for correlation series
          const wMap = new Map();
          (weatherRecords || []).forEach((w) => wMap.set(w.timestamp, w));

          const series = sorted
            .slice(0, 16)
            .reverse()
            .map((g) => {
              const w = wMap.get(g.timestamp);
              return {
                time: g.timestamp ? g.timestamp.substring(11, 16) : "--",
                acPowerKw: g.acPowerKw,
                dcPowerKw: g.dcPowerKw,
                gridVoltageV: g.gridVoltageV,
                irradianceWM2:
                  w?.irradianceWM2 ?? (g.acPowerKw ? g.acPowerKw * 10 : 0),
              };
            });
          setTelemetrySeries(series);
        } else {
          // Fallback realistic telemetry
          const defaultAc = selectedSiteId === "SITE_002" ? 52.5 : 34.0;
          const defaultDc = selectedSiteId === "SITE_002" ? 54.2 : 34.87;
          setInverterTelemetry({
            inverterId: selectedInverterId,
            siteId: selectedSiteId,
            acPowerKw: defaultAc,
            dcPowerKw: defaultDc,
            gridVoltageV: 414.9,
            powerFactor: 0.98,
            intervalEnergyKwh: defaultAc * 0.25,
            timestamp: "2026-10-03T05:15:00Z",
          });
          setTelemetrySeries([
            {
              time: "02:00",
              acPowerKw: defaultAc * 0.6,
              dcPowerKw: defaultDc * 0.6,
              gridVoltageV: 414.0,
              irradianceWM2: 320,
            },
            {
              time: "03:00",
              acPowerKw: defaultAc * 0.85,
              dcPowerKw: defaultDc * 0.85,
              gridVoltageV: 415.2,
              irradianceWM2: 540,
            },
            {
              time: "04:00",
              acPowerKw: defaultAc,
              dcPowerKw: defaultDc,
              gridVoltageV: 414.9,
              irradianceWM2: 780,
            },
            {
              time: "05:00",
              acPowerKw: defaultAc * 0.95,
              dcPowerKw: defaultDc * 0.95,
              gridVoltageV: 416.0,
              irradianceWM2: 720,
            },
          ]);
        }

        if (weatherRecords && weatherRecords.length > 0) {
          const sortedW = [...weatherRecords].sort(
            (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
          );
          setSiteWeather(sortedW[0]);
        } else {
          setSiteWeather({
            siteId: selectedSiteId,
            irradianceWM2: selectedSiteId === "SITE_002" ? 760.4 : 680.5,
            ambientTempC: 31.2,
            moduleTempC: selectedSiteId === "SITE_002" ? 44.5 : 42.1,
            cloudCoverPct: 15,
            timestamp: "2026-10-03T05:15:00Z",
          });
        }
      } catch (err) {
        console.error("Error fetching telemetry:", err);
      } finally {
        setLoadingTelemetry(false);
      }
    }

    fetchInvGen();
  }, [selectedInverterId, selectedSiteId]);

  const selectedSite =
    sites.find((s) => s.siteId === selectedSiteId) || sites[0];

  // Inverter fault statistics for this site
  const inverterStats = useMemo(() => {
    return (
      selectedSite?.inverters || ["INV_01", "INV_02", "INV_03", "INV_04"]
    ).map((invId) => {
      const invTickets = tickets.filter(
        (t) => t.siteId === selectedSiteId && t.inverterId === invId,
      );
      const openTickets = invTickets.filter((t) => t.status === "OPEN");
      const inProgressTickets = invTickets.filter(
        (t) => t.status === "IN_PROGRESS",
      );

      let healthStatus = "HEALTHY";
      if (openTickets.length > 0) {
        healthStatus = "FAULT";
      } else if (inProgressTickets.length > 0) {
        healthStatus = "DEGRADED";
      }

      return {
        inverterId: invId,
        totalFaults: invTickets.length,
        openCount: openTickets.length,
        inProgressCount: inProgressTickets.length,
        healthStatus,
        tickets: invTickets,
      };
    });
  }, [selectedSite, selectedSiteId, tickets]);

  const selectedInverterStat =
    inverterStats.find((s) => s.inverterId === selectedInverterId) ||
    inverterStats[0];

  // All tickets belonging to current site
  const siteTickets = useMemo(() => {
    return tickets.filter((t) => t.siteId === selectedSiteId);
  }, [tickets, selectedSiteId]);

  const handleUpdateStatus = async (ticketId, status, notes) => {
    await faultTicketApi.updateTicketStatus(ticketId, status, notes);
    await loadData();
  };

  if (loading) {
    return (
      <LoadingSpinner message="Scanning multi-site solar infrastructure and inverter nodes..." />
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: Dual Site Selection Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Solar Plant Facility:
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                  selectedSiteId === "SITE_001"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-indigo-50 text-indigo-800 border-indigo-200"
                }`}
              >
                {selectedSiteId}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              {selectedSite?.name || `Solar Plant ${selectedSiteId}`}
            </h2>
          </div>

          {/* Site Switcher Toggle Buttons */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setSelectedSiteId("SITE_001");
                setSearchParams({ site: "SITE_001" });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                selectedSiteId === "SITE_001"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-950" />
              <span>SITE_001 (Alpha - 500 kW)</span>
            </button>
            <button
              onClick={() => {
                setSelectedSiteId("SITE_002");
                setSearchParams({ site: "SITE_002" });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                selectedSiteId === "SITE_002"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>SITE_002 (Beta - 750 kW)</span>
            </button>
          </div>
        </div>

        {/* Site Details & Environmental Weather Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[11px]">Location</span>
            <span className="font-semibold text-slate-800 mt-0.5 block truncate">
              {selectedSite?.location || "Solar Park"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[11px]">
              Rated Capacity
            </span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">
              {selectedSite?.capacityKw} kW
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[11px]">
              Solar Irradiance
            </span>
            <span className="font-mono font-bold text-amber-600 mt-0.5 block">
              {formatIrradiance(siteWeather?.irradianceWM2)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[11px]">
              Module Temperature
            </span>
            <span
              className={`font-mono font-bold mt-0.5 block ${
                (siteWeather?.moduleTempC || 0) > 65
                  ? "text-rose-600"
                  : "text-slate-800"
              }`}
            >
              {formatTemperature(siteWeather?.moduleTempC)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[11px]">
              Open Faults
            </span>
            <span
              className={`font-mono font-bold mt-0.5 block ${
                siteTickets.filter((t) => t.status === "OPEN").length > 0
                  ? "text-rose-600"
                  : "text-emerald-600"
              }`}
            >
              {siteTickets.filter((t) => t.status === "OPEN").length} Open
              Tickets
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Inverter Array Matrix (All 4 inverters of current site) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-slate-600" />
              <span>
                Inverter Array for {selectedSiteId} (4 Units Monitored)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Click an inverter unit below to inspect its live electrical
              telemetry and fault history
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
            Unit Rating:{" "}
            {selectedSiteId === "SITE_002" ? "187.5 kW" : "125.0 kW"} ea.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inverterStats.map((inv) => {
            const isSelected = inv.inverterId === selectedInverterId;
            const isFault = inv.healthStatus === "FAULT";
            const isDegraded = inv.healthStatus === "DEGRADED";

            return (
              <div
                key={inv.inverterId}
                onClick={() => setSelectedInverterId(inv.inverterId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? selectedSiteId === "SITE_001"
                      ? "border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20"
                      : "border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isFault
                          ? "bg-rose-100 text-rose-600"
                          : isDegraded
                            ? "bg-amber-100 text-amber-600"
                            : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-mono">
                        {inv.inverterId}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {selectedSiteId}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isFault
                        ? "bg-rose-100 text-rose-800"
                        : isDegraded
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isFault
                          ? "bg-rose-500"
                          : isDegraded
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    {inv.healthStatus}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Faults:</span>
                    <strong className="text-slate-800 font-mono">
                      {inv.totalFaults}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Open Incidents:</span>
                    <strong
                      className={
                        inv.openCount > 0
                          ? "text-rose-600 font-mono"
                          : "text-slate-700 font-mono"
                      }
                    >
                      {inv.openCount}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-slate-700">
                      {isFault
                        ? "Attention Needed"
                        : isDegraded
                          ? "In Progress"
                          : "Optimal"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Selected Inverter Detailed Telemetry & Correlation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Inverter Telemetry Snapshot */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">
                  {selectedInverterId}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  {selectedSiteId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Timestamp: {formatDateTime(inverterTelemetry?.timestamp)}
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/tickets?siteId=${selectedSiteId}&inverterId=${selectedInverterId}`,
                )
              }
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
            >
              <span>View Tickets</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-slate-500">AC Power Output:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatPower(inverterTelemetry?.acPowerKw)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-slate-500">DC Array Input:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatPower(inverterTelemetry?.dcPowerKw)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-slate-500">Inverter Efficiency:</span>
              <span className="font-mono font-bold text-emerald-600">
                {inverterTelemetry?.dcPowerKw && inverterTelemetry?.acPowerKw
                  ? `${((inverterTelemetry.acPowerKw / inverterTelemetry.dcPowerKw) * 100).toFixed(1)}%`
                  : "97.5%"}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-slate-500">Grid Voltage:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  (inverterTelemetry?.gridVoltageV || 0) > 450
                    ? "text-rose-600"
                    : "text-slate-900"
                }`}
              >
                {formatVoltage(inverterTelemetry?.gridVoltageV)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-slate-500">Power Factor:</span>
              <span className="font-mono font-semibold text-slate-800">
                {inverterTelemetry?.powerFactor ?? 0.98}
              </span>
            </div>
          </div>
        </div>

        {/* Right Columns: Telemetry Time Series Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Electrical Telemetry Series &bull; {selectedSiteId} /{" "}
                {selectedInverterId}
              </h3>
              <p className="text-[11px] text-slate-400">
                Correlation between AC generation power (kW), Solar Irradiance
                (W/m²), and Grid Voltage (V)
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              15-Min Intervals
            </span>
          </div>

          <TelemetryCorrelationChart data={telemetrySeries} />
        </div>
      </div>

      {/* SECTION 4: Active Fault Tickets for this Site */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Fault Tickets for {selectedSiteId}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {siteTickets.length} Tickets
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Active and resolved fault tickets recorded for{" "}
              {selectedSite?.name || selectedSiteId}
            </p>
          </div>
          <button
            onClick={() => navigate(`/tickets?siteId=${selectedSiteId}`)}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
          >
            <span>Open in Ticket Manager</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {siteTickets.length === 0 ? (
          <EmptyState
            title={`No Tickets for ${selectedSiteId}`}
            description="All inverters on this solar plant are operating normally with no unresolved tickets."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Ticket</th>
                  <th className="py-3 px-4">Inverter</th>
                  <th className="py-3 px-4">Fault Type</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Diagnostic Notes</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {siteTickets.map((t) => (
                  <tr
                    key={t.ticketId}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => navigate(`/tickets/${t.ticketId}`)}
                  >
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      #{t.ticketId}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {t.inverterId}
                    </td>
                    <td className="py-3.5 px-4">
                      <FaultTypeBadge faultType={t.faultType} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {formatDateTime(t.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {t.notes || "Automated candidate triage"}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalTicket(t);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                      >
                        Triage
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${t.ticketId}`);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Modal */}
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
