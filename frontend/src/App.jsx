import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import OverviewPage from "./pages/OverviewPage";
import FaultTicketsPage from "./pages/FaultTicketsPage";
import FaultDetailPage from "./pages/FaultDetailPage";
import SiteMonitoringPage from "./pages/SiteMonitoringPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="tickets" element={<FaultTicketsPage />} />
          <Route path="tickets/:id" element={<FaultDetailPage />} />
          <Route path="sites" element={<SiteMonitoringPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
