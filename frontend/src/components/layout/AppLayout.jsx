import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import faultTicketApi from "../../services/api/faultTicketApi";

export default function AppLayout() {
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [dataSourceNotice, setDataSourceNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchGlobalStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await faultTicketApi.getAllTickets();
      const openCount = (res.data || []).filter(
        (t) => t.status === "OPEN",
      ).length;
      setOpenTicketCount(openCount);
      if (res.notice) {
        setDataSourceNotice(res.notice);
      } else {
        setDataSourceNotice("");
      }
    } catch {
      // Handled silently for layout count
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, [refreshTrigger]);

  const handleManualRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Dark Sidebar */}
      <Sidebar openTicketCount={openTicketCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          dataSourceNotice={dataSourceNotice}
        />

        {/* Page Outlet */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet
            context={{ refreshTrigger, onRefreshGlobal: handleManualRefresh }}
          />
        </main>
      </div>
    </div>
  );
}
