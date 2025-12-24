/**
 * App.tsx
 * Point d'entrée de l'application avec routing
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShellSimple as AppShell } from './pages/AppShellSimple';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { CrmPage } from './pages/CrmPage';
import { AutomationPage } from './pages/AutomationPage';
import { ReportingPage } from './pages/ReportingPage';
import { MaxPage } from './pages/MaxPage';
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
          <Route element={<AppShell />}>
            {/* Redirect / vers /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Pages principales MVP1 - Phase 1 complète */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/max" element={<MaxPage />} />
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
