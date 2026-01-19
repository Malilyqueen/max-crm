/**
 * App.tsx
 * Point d'entrée de l'application avec routing
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
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
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load Phase 2 pages to avoid circular dependencies
// Note: Using named exports, need to destructure
const ActivityDashboardPage = lazy(() => import('./pages/ActivityDashboardPage').then(m => ({ default: m.ActivityDashboardPage })));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage').then(m => ({ default: m.AdminSupportPage })));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage').then(m => ({ default: m.CampaignDetailPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

export default function App() {
  const { toasts, removeToast } = useToastStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Routes protégées */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppShell />}>
            {/* Redirect root vers dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Pages principales MVP1 - Phase 1 */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/max" element={<MaxPage />} />

            {/* Phase 2 pages - Lazy loaded */}
            <Route path="/activite" element={
              <Suspense fallback={<PageLoader />}>
                <ActivityDashboardPage />
              </Suspense>
            } />
            <Route path="/campagnes" element={
              <Suspense fallback={<PageLoader />}>
                <CampaignsPage />
              </Suspense>
            } />
            <Route path="/campagnes/:id" element={
              <Suspense fallback={<PageLoader />}>
                <CampaignDetailPage />
              </Suspense>
            } />
            <Route path="/campaigns/:id" element={
              <Suspense fallback={<PageLoader />}>
                <CampaignDetailPage />
              </Suspense>
            } />
            <Route path="/settings/integrations" element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            } />
            <Route path="/support" element={
              <Suspense fallback={<PageLoader />}>
                <SupportPage />
              </Suspense>
            } />
            <Route path="/support/:id" element={
              <Suspense fallback={<PageLoader />}>
                <TicketDetailPage />
              </Suspense>
            } />
            <Route path="/admin/support" element={
              <Suspense fallback={<PageLoader />}>
                <AdminSupportPage />
              </Suspense>
            } />
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
