import React, { useState, useEffect, useMemo } from "react";
import {
  useNavigate,
  useSearchParams,
  useOutletContext,
} from "react-router-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  RotateCw,
  Plus,
  SlidersHorizontal,
  X,
  Sun,
  Cpu,
} from "lucide-react";
import {
  StatusBadge,
  SeverityBadge,
  FaultTypeBadge,
} from "../components/common/Badge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import StatusModal from "../components/common/StatusModal";
import faultTicketApi from "../services/api/faultTicketApi";
import { FAULT_TYPES, TICKET_STATUSES } from "../utils/constants";
import { formatDateTime } from "../utils/formatters";

const ITEMS_PER_PAGE = 10;

export default function FaultTicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const context = useOutletContext();
  const refreshTrigger = context?.refreshTrigger ?? 0;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");

  // Active Filters & Search State
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [siteFilter, setSiteFilter] = useState(
    searchParams.get("siteId") || "ALL",
  );
  const [inverterFilter, setInverterFilter] = useState(
    searchParams.get("inverterId") || "ALL",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "ALL",
  );
  const [typeFilter, setTypeFilter] = useState(
    searchParams.get("faultType") || "ALL",
  );
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Status Update Modal State
  const [activeModalTicket, setActiveModalTicket] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await faultTicketApi.getAllTickets({
        siteId: siteFilter !== "ALL" ? siteFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setTickets(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [refreshTrigger, siteFilter, statusFilter]);

  // Sync state when URL params change
  useEffect(() => {
    const siteParam = searchParams.get("siteId");
    const invParam = searchParams.get("inverterId");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("faultType");

    if (siteParam) setSiteFilter(siteParam);
    if (invParam) setInverterFilter(invParam);
    if (statusParam) setStatusFilter(statusParam);
    if (typeParam) setTypeFilter(typeParam);
  }, [searchParams]);

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        // Site filter
        if (siteFilter !== "ALL" && t.siteId !== siteFilter) {
          return false;
        }

        // Inverter filter
        if (inverterFilter !== "ALL" && t.inverterId !== inverterFilter) {
          return false;
        }

        // Search filter (Ticket ID, Site ID, Inverter ID, or Notes)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchId = String(t.ticketId).toLowerCase().includes(term);
          const matchSite = (t.siteId || "").toLowerCase().includes(term);
          const matchInv = (t.inverterId || "").toLowerCase().includes(term);
          const matchNotes = (t.notes || "").toLowerCase().includes(term);
          if (!matchId && !matchSite && !matchInv && !matchNotes) return false;
        }

        // Status Filter
        if (statusFilter !== "ALL" && t.status !== statusFilter) {
          return false;
        }

        // Fault Type Filter
        if (typeFilter !== "ALL" && t.faultType !== typeFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [
    tickets,
    siteFilter,
    inverterFilter,
    searchTerm,
    statusFilter,
    typeFilter,
    sortOrder,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  const handleUpdateStatus = async (ticketId, newStatus, notes) => {
    await faultTicketApi.updateTicketStatus(ticketId, newStatus, notes);
    await fetchTickets();
    if (context?.onRefreshGlobal) {
      context.onRefreshGlobal();
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSiteFilter("ALL");
    setInverterFilter("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setSearchParams({});
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingSpinner message="Loading fault management tickets..." />;
  }

  return (
    <div className="space-y-5">
      {/* Search and Filter Controls Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Ticket #, Site ID (SITE_001 / SITE_002), Inverter ID (INV_01)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Site Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Site:
              </span>
              <select
                value={siteFilter}
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-700 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Sites</option>
                <option value="SITE_001">SITE_001 (Alpha)</option>
                <option value="SITE_002">SITE_002 (Beta)</option>
              </select>
            </div>

            {/* Inverter Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Inverter:
              </span>
              <select
                value={inverterFilter}
                onChange={(e) => {
                  setInverterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-700 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Inverters</option>
                <option value="INV_01">INV_01</option>
                <option value="INV_02">INV_02</option>
                <option value="INV_03">INV_03</option>
                <option value="INV_04">INV_04</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-700 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Fault Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Fault:
              </span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-700 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Types</option>
                {Object.values(FAULT_TYPES).map((ft) => (
                  <option key={ft.key} value={ft.key}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              title={`Sorting ${sortOrder === "desc" ? "Newest First" : "Oldest First"}`}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase font-bold">
                {sortOrder}
              </span>
            </button>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Showing{" "}
            <strong className="text-slate-900 font-mono">
              {filteredTickets.length}
            </strong>{" "}
            of{" "}
            <strong className="text-slate-900 font-mono">
              {tickets.length}
            </strong>{" "}
            tickets
            {siteFilter !== "ALL" && (
              <span className="ml-2 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Site: {siteFilter}
              </span>
            )}
            {inverterFilter !== "ALL" && (
              <span className="ml-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Inv: {inverterFilter}
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="ml-1.5 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Status: {statusFilter}
              </span>
            )}
          </div>

          {(searchTerm ||
            siteFilter !== "ALL" ||
            inverterFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            typeFilter !== "ALL") && (
            <button
              onClick={clearFilters}
              className="text-amber-600 hover:text-amber-700 font-semibold text-xs flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Tickets Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredTickets.length === 0 ? (
          <EmptyState
            title="No Fault Tickets Found"
            description="No tickets match the selected filters across SITE_001 and SITE_002."
            actionLabel="Reset Filters"
            onAction={clearFilters}
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
                  <th className="py-3 px-4">Diagnostic Summary</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {paginatedTickets.map((t) => {
                  const severity =
                    FAULT_TYPES[t.faultType]?.severity || "MEDIUM";
                  const isSite1 = t.siteId === "SITE_001";

                  return (
                    <tr
                      key={t.ticketId}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                      onClick={() => navigate(`/tickets/${t.ticketId}`)}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900 group-hover:text-amber-600 transition">
                        #{t.ticketId}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                            isSite1
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          }`}
                        >
                          {t.siteId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {t.inverterId}
                      </td>
                      <td className="py-3.5 px-4">
                        <FaultTypeBadge faultType={t.faultType} />
                      </td>
                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={severity} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateTime(t.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td
                        className="py-3.5 px-4 text-slate-600 max-w-xs truncate"
                        title={t.notes}
                      >
                        {t.notes || "Automated candidate triage"}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2 whitespace-nowrap">
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page <strong className="text-slate-900">{currentPage}</strong> of{" "}
              <strong className="text-slate-900">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
