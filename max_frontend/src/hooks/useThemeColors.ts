/**
 * hooks/useThemeColors.ts
 * Hook pour obtenir les couleurs selon le thème
 */

import { useSettingsStore } from '../stores/useSettingsStore';

export function useThemeColors() {
  const { theme } = useSettingsStore();

  return {
    // Backgrounds
    background: theme === 'dark' ? '#1e293b' : '#ffffff',
    cardBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    sidebarBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.95)' : 'rgba(248, 250, 252, 0.95)',
    topbarBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.9)' : 'rgba(255, 255, 255, 0.9)',

    // Textes - Amélioration du contraste en mode clair
    textPrimary: theme === 'dark' ? '#ffffff' : '#0f172a',
    textSecondary: theme === 'dark' ? '#e2e8f0' : '#1e293b',
    textTertiary: theme === 'dark' ? '#cbd5e1' : '#334155',

    // Bordures - Plus visibles en mode clair
    border: theme === 'dark' ? 'rgba(0, 145, 255, 0.2)' : 'rgba(0, 145, 255, 0.3)',
    borderLight: theme === 'dark' ? 'rgba(0, 145, 255, 0.1)' : 'rgba(0, 145, 255, 0.2)',

    // Gradients - Plus visibles en mode clair
    gradientStart: theme === 'dark' ? 'rgba(0, 145, 255, 0.06)' : 'rgba(0, 145, 255, 0.08)',
    gradientEnd: theme === 'dark' ? 'rgba(0, 207, 255, 0.04)' : 'rgba(0, 207, 255, 0.06)',

    // Hover states
    hoverBg: theme === 'dark' ? 'rgba(0, 145, 255, 0.08)' : 'rgba(0, 145, 255, 0.1)',

    // Messages chat
    messageBg: theme === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(243, 244, 246, 1)',
    messageText: theme === 'dark' ? '#f1f5f9' : '#0f172a'
  };
}
