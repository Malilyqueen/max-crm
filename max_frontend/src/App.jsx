/**
 * App.jsx
 * Point d'entrée de l'application avec routing MVP1
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShellSimple as AppShell } from './pages/AppShellSimple';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { CrmPage } from './pages/CrmPage';
import { AutomationPage } from './pages/AutomationPage';
import { ActivityDashboardPage } from './pages/ActivityDashboardPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { ReportingPage } from './pages/ReportingPage';
import { MaxPage } from './pages/MaxPage';
import { SupportPage } from './pages/SupportPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { AdminSupportPage } from './pages/AdminSupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/Toast';
import { useToastStore } from './hooks/useToast';

export default function App() {
  const { toasts, removeToast } = useToastStore();

  return (
    <BrowserRouter>

      <Routes>
        {/* Route publique: Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppShell />}>
            {/* Redirect root vers dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Pages principales MVP1 - Phase 1 complète */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/activite" element={<ActivityDashboardPage />} />
            <Route path="/campagnes" element={<CampaignsPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/max" element={<MaxPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support/:id" element={<TicketDetailPage />} />
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/settings/integrations" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast notifications globales */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </BrowserRouter>
  );
}
