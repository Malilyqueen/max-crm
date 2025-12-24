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

// Temporary placeholder pour pages non encore implémentées
const PlaceholderPage = ({ title }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">Cette page sera implémentée dans les prochaines étapes du MVP1.</p>
  </div>
);

export default function App() {
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

            {/* Pages principales MVP1 */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/reporting" element={<PlaceholderPage title="Rapports" />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
