/**
 * pages/AppShellSimple.tsx
 * Shell M.A.X. avec identité visuelle
 */

import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { SettingsModal } from '../components/SettingsModal';
import { clsx } from 'clsx';

export const AppShellSimple = () => {
  const { user, logout } = useAuthStore();
  const { language, theme, tenant, setLanguage, setTenant, loadTokenUsage, tokenUsage } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Charger l'utilisation des tokens au mount
  useEffect(() => {
    loadTokenUsage();
  }, [loadTokenUsage]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  // Couleurs en fonction du thème - version plus légère pour le sombre
  const colors = {
    background: theme === 'dark' ? '#1e293b' : '#ffffff',
    sidebarBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.95)' : 'rgba(248, 250, 252, 0.95)',
    topbarBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    textPrimary: theme === 'dark' ? '#ffffff' : '#1e293b',
    textSecondary: theme === 'dark' ? '#e2e8f0' : '#64748b',
    border: theme === 'dark' ? 'rgba(0, 145, 255, 0.2)' : 'rgba(0, 145, 255, 0.15)',
    gradientStart: theme === 'dark' ? 'rgba(0, 145, 255, 0.06)' : 'rgba(0, 145, 255, 0.04)',
    gradientEnd: theme === 'dark' ? 'rgba(0, 207, 255, 0.04)' : 'rgba(0, 207, 255, 0.03)'
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: colors.background }}>
      {/* Neural background gradients */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, ${colors.gradientStart} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, ${colors.gradientEnd} 0%, transparent 50%)
          `,
          zIndex: 0
        }}
      />

      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col py-6"
        style={{
          background: colors.sidebarBg,
          backdropFilter: 'blur(20px)',
          borderRight: `1px solid ${colors.border}`,
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Logo MAX */}
        <div className="px-6 pb-8 flex items-center gap-3">
          <img
            src="/images/Max_avatar.png"
            alt="M.A.X. Avatar"
            className="w-9 h-9 rounded-full"
            style={{
              boxShadow: '0 0 20px rgba(0, 207, 255, 0.4)'
            }}
          />
          <span
            className="text-lg font-bold"
            style={{
              color: '#00cfff',
              letterSpacing: '0.5px'
            }}
          >
            M.A.X.
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {[
            { to: '/dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
            { to: '/chat', label: 'Cockpit', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
            { to: '/crm', label: 'Tour de Contrôle', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
            { to: '/automation', label: 'Pilote Automatique', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
            { to: '/max', label: 'M.A.X. IA', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
            { to: '/reporting', label: 'Boîte Noire', icon: 'M18 20V10M12 20V4M6 20v-6' }
          ].map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium"
              style={
                location.pathname === to
                  ? {
                      color: '#0091ff',
                      background: 'rgba(0, 145, 255, 0.12)',
                      boxShadow: '0 0 20px rgba(0, 207, 255, 0.15)'
                    }
                  : {
                      color: colors.textSecondary
                    }
              }
              onMouseEnter={(e) => {
                if (location.pathname !== to) {
                  e.currentTarget.style.background = 'rgba(0, 145, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 207, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== to) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{label}</span>
            </Link>
          ))}

          {/* Settings at bottom */}
          <div className="pt-8">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium w-full"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 145, 255, 0.08)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 207, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Paramètres</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 10 }}>
        {/* Top bar */}
        <header
          className="flex-shrink-0 h-18 flex items-center justify-between px-8 border-b"
          style={{
            background: colors.topbarBg,
            backdropFilter: 'blur(20px)',
            borderColor: colors.border,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Left: MAX avatar + Token bar */}
          <div className="flex items-center gap-6">
            {/* Mini MAX avatar */}
            <img
              src="/images/Max_avatar.png"
              alt="M.A.X."
              className="w-8 h-8 rounded-full"
              style={{
                boxShadow: '0 0 15px rgba(0, 207, 255, 0.3)'
              }}
            />

            {/* Token bar */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: 'rgba(0, 145, 255, 0.08)',
                border: '1px solid rgba(0, 145, 255, 0.2)'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="#00cfff" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className="text-xs font-semibold"
                style={{ color: '#00cfff' }}
              >
                {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
              </span>
            </div>

            {/* Tenant selector */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: colors.textSecondary }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                className="text-xs font-medium px-2 py-1 rounded border-0 outline-none transition-colors"
                style={{
                  background: 'rgba(0, 145, 255, 0.08)',
                  color: colors.textPrimary,
                  cursor: 'pointer'
                }}
              >
                <option value="default">Default</option>
                <option value="tenant1">Tenant 1</option>
                <option value="tenant2">Tenant 2</option>
              </select>
            </div>
          </div>

          {/* Right: Language + User + Logout */}
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: colors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="font-medium">{language.toUpperCase()}</span>
            </button>

            {/* User info */}
            <div className="border-l pl-4" style={{ borderColor: colors.border }}>
              <div className="text-sm">
                <p className="font-medium" style={{ color: colors.textPrimary }}>{user?.name}</p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>{user?.email}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content area */}
        <main
          className={clsx(
            "flex-1",
            location.pathname === '/chat' ? 'overflow-hidden' : 'overflow-y-auto p-8'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default AppShellSimple;
