import React, { useState } from "react";
import { X, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { TICKET_STATUSES } from "../../utils/constants";

export default function StatusModal({
  isOpen,
  onClose,
  ticket,
  onUpdateStatus,
}) {
  if (!isOpen || !ticket) return null;

  const [selectedStatus, setSelectedStatus] = useState(ticket.status || "OPEN");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await onUpdateStatus(ticket.ticketId, selectedStatus, resolutionNotes);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update ticket status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Update Fault Ticket #{ticket.ticketId}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Site:{" "}
              <span className="font-semibold text-slate-700">
                {ticket.siteId}
              </span>{" "}
              &bull; Inverter:{" "}
              <span className="font-semibold text-slate-700">
                {ticket.inverterId}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Ticket Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(TICKET_STATUSES).map((status) => {
                const isSelected = selectedStatus === status.key;
                return (
                  <button
                    key={status.key}
                    type="button"
                    onClick={() => setSelectedStatus(status.key)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {status.label}
                    </span>
                    <span
                      className={`text-[10px] mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}
                    >
                      {status.key === "CLOSED"
                        ? "Resolved"
                        : status.key === "IN_PROGRESS"
                          ? "Active"
                          : "Pending"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Engineer Resolution Notes
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Inverter AC breaker reset. Power output verified normal (28 kW at 420V). Modbus line reconnected."
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Document root cause, field actions, and verification measurements.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>Updating...</>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Status
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
