/**
 * components/SettingsModal.tsx
 * Modal de paramètres avec identité M.A.X.
 */

import React from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Language, Theme } from '../stores/useSettingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { language, theme, notifications, setLanguage, setTheme, setNotifications } = useSettingsStore();

  if (!isOpen) return null;

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications({ [key]: !notifications[key] });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 145, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 145, 255, 0.2)'
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'rgba(0, 145, 255, 0.15)' }}
          >
            <h2 className="text-xl font-bold" style={{ color: '#1e293b' }}>
              Paramètres
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Langue */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#1e293b' }}>
                Langue
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleLanguageChange('fr')}
                  className="flex-1 px-4 py-3 rounded-lg border-2 transition-all"
                  style={
                    language === 'fr'
                      ? {
                          borderColor: '#0091ff',
                          background: 'rgba(0, 145, 255, 0.08)',
                          color: '#0091ff'
                        }
                      : {
                          borderColor: 'rgba(0, 145, 255, 0.15)',
                          color: '#64748b'
                        }
                  }
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="font-medium">Français</span>
                  </div>
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className="flex-1 px-4 py-3 rounded-lg border-2 transition-all"
                  style={
                    language === 'en'
                      ? {
                          borderColor: '#0091ff',
                          background: 'rgba(0, 145, 255, 0.08)',
                          color: '#0091ff'
                        }
                      : {
                          borderColor: 'rgba(0, 145, 255, 0.15)',
                          color: '#64748b'
                        }
                  }
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="font-medium">English</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Thème */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#1e293b' }}>
                Thème
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className="flex-1 px-4 py-3 rounded-lg border-2 transition-all"
                  style={
                    theme === 'light'
                      ? {
                          borderColor: '#0091ff',
                          background: 'rgba(0, 145, 255, 0.08)',
                          color: '#0091ff'
                        }
                      : {
                          borderColor: 'rgba(0, 145, 255, 0.15)',
                          color: '#64748b'
                        }
                  }
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">Clair</span>
                  </div>
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className="flex-1 px-4 py-3 rounded-lg border-2 transition-all"
                  style={
                    theme === 'dark'
                      ? {
                          borderColor: '#0091ff',
                          background: 'rgba(0, 145, 255, 0.08)',
                          color: '#0091ff'
                        }
                      : {
                          borderColor: 'rgba(0, 145, 255, 0.15)',
                          color: '#64748b'
                        }
                  }
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="font-medium">Sombre</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#1e293b' }}>
                Notifications
              </h3>
              <div className="space-y-3">
                {/* Email */}
                <label
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 145, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="#64748b"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#64748b' }}>
                      Email
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={() => handleNotificationToggle('email')}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#0091ff' }}
                  />
                </label>

                {/* WhatsApp */}
                <label
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 145, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="#64748b"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#64748b' }}>
                      WhatsApp
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.whatsapp}
                    onChange={() => handleNotificationToggle('whatsapp')}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#0091ff' }}
                  />
                </label>

                {/* Push */}
                <label
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 145, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="#64748b"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#64748b' }}>
                      Notifications push
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={() => handleNotificationToggle('push')}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#0091ff' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t flex justify-end"
            style={{ borderColor: 'rgba(0, 145, 255, 0.15)' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #0091ff 0%, #00cfff 100%)',
                boxShadow: '0 0 15px rgba(0, 207, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 207, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 207, 255, 0.3)';
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
