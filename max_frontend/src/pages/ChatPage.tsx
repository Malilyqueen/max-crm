/**
 * pages/ChatPage.tsx
 * Page Chat M.A.X. - Style futuriste premium
 *
 * Version Premium avec:
 * - Approche émotionnelle (faire connaissance)
 * - Style cyan néon + violet
 * - ActivityPanel rétractable
 * - Scroll indépendant
 * - Quick Cards
 */

import React, { useEffect, useState } from 'react';
import { Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { ModeSelector } from '../components/chat/ModeSelector';
import { TokenDisplay } from '../components/chat/TokenDisplay';
import { ActivityPanel, Activity } from '../components/chat/ActivityPanel';
import { useThemeColors } from '../hooks/useThemeColors';
import { useConsent } from '../hooks/useConsent';
import { ChatMessage } from '../types/chat';
import { API_BASE_URL } from '../config/api';

export function ChatPage() {
  const {
    messages,
    mode,
    isLoading,
    isStreaming,
    totalTokens,
    sessionId,
    sendMessage,
    uploadFile,
    changeMode,
    resetConversation,
    loadHistory,
    injectMessage
  } = useChatStore();
  const colors = useThemeColors();

  // Mode debug activé via ?debug=1
  const [isDebugMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  });

  // État local pour le panneau d'activité
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Hook de consentement
  const { requestConsent, executeConsent, getAuditReport } = useConsent();

  // Fonction utilitaire pour ajouter une activité
  const addActivity = (icon: string, message: string) => {
    const newActivity: Activity = {
      id: `${Date.now()}_${Math.random()}`,
      icon,
      message,
      timestamp: Date.now()
    };
    setActivities(prev => [...prev, newActivity]);
  };

  // Charger l'historique au mount (désactivé temporairement pour debug)
  useEffect(() => {
    // loadHistory().catch((error) => {
    //   console.error('Erreur chargement historique:', error);
    // });
  }, [loadHistory]);

  // Vérifier si un prompt est en attente depuis les templates
  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem('pendingPrompt');
    if (pendingPrompt) {
      // Supprimer le prompt du storage
      sessionStorage.removeItem('pendingPrompt');

      // Envoyer le message automatiquement
      handleSendMessage(pendingPrompt);
    }
  }, []); // Exécuter une seule fois au mount

  // Polling des activités (toutes les 2 secondes)
  useEffect(() => {
    if (!sessionId) return;

    const fetchActivities = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chat/activities?sessionId=${sessionId}`
        );
        const data = await response.json();

        if (data.ok && data.activities) {
          // Transformer les activités backend vers le format frontend
          const formattedActivities: Activity[] = data.activities.map((act: any) => ({
            id: `${act.ts}`,
            icon: act.icon || 'zap',
            message: act.message,
            timestamp: act.ts
          }));
          setActivities(formattedActivities);
        }
      } catch (error) {
        console.error('Erreur récupération activités:', error);
      }
    };

    // Fetch initial
    fetchActivities();

    // Polling toutes les 2 secondes
    const interval = setInterval(fetchActivities, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message, false); // false = pas de streaming (vrai M.A.X. ne supporte pas SSE)
    } catch (error: any) {
      console.error('Erreur envoi message:', error);
      alert(error.message || 'Erreur lors de l\'envoi du message');
    }
  };

  const handleUploadFile = async (file: File) => {
    try {
      await uploadFile(file);
    } catch (error: any) {
      console.error('Erreur upload fichier:', error);
      alert(error.message || 'Erreur lors de l\'upload du fichier');
    }
  };

  const handleChangeMode = async (newMode: typeof mode) => {
    try {
      await changeMode(newMode);
    } catch (error: any) {
      console.error('Erreur changement mode:', error);
      alert(error.message || 'Erreur lors du changement de mode');
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Voulez-vous vraiment réinitialiser la conversation ? Tous les messages seront perdus.'
    );

    if (confirmed) {
      try {
        await resetConversation();
      } catch (error: any) {
        console.error('Erreur reset:', error);
        alert(error.message || 'Erreur lors de la réinitialisation');
      }
    }
  };

  // Handler pour approuver un consentement
  const handleApproveConsent = async (consentId: string) => {
    try {
      // Log: CONSENT_GRANTED
      addActivity('check-circle', `Consentement accordé: ${consentId.substring(0, 20)}...`);

      // Log: EXECUTION_STARTED
      addActivity('refresh-cw', 'Exécution intervention layout...');

      const result = await executeConsent(consentId);

      // Log: EXECUTION_SUCCESS
      addActivity('check', `Opération réussie: ${result.result?.layoutsModified || 0} layout(s) modifié(s)`);

      // Log: AUDIT_AVAILABLE
      if (result.audit?.consentId) {
        addActivity('file-text', `Rapport d'audit disponible: ${result.audit.consentId}`);
      }

      // Mettre à jour le message de consentement dans le store
      // (Le MessageList détectera automatiquement le changement de status)

    } catch (error: any) {
      console.error('[CONSENT] Erreur exécution:', error);
      // Log: EXECUTION_FAILED
      addActivity('alert-triangle', `Échec: ${error.message}`);
      throw error;
    }
  };

  // Handler pour voir le rapport d'audit
  const handleViewAudit = async (consentId: string) => {
    try {
      const auditReport = await getAuditReport(consentId);
      console.log('[CONSENT] Rapport audit:', auditReport);
      // Ici on pourrait ouvrir AuditReportModal si besoin
    } catch (error: any) {
      console.error('[CONSENT] Erreur chargement audit:', error);
    }
  };

  // 🧪 TEST CONSENT - Bouton de test temporaire pour démo
  const testConsentFlow = async () => {
    try {
      console.log('[TEST_CONSENT] Appel endpoint test-consent...');
      addActivity('flask', 'Test consentement démarré');

      const response = await fetch(`${API_BASE_URL}/api/chat/test-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': 'macrea-admin'
        },
        body: JSON.stringify({
          sessionId: sessionId || `demo_${Date.now()}`,
          description: 'Ajouter le champ secteur aux layouts Lead'
        })
      });

      const data = await response.json();
      console.log('[TEST_CONSENT] Réponse:', data);

      if (data.success && data.message) {
        // Injecter le message de consentement dans la conversation
        injectMessage(data.message);
        addActivity('check-circle', `Message consentement injecté: ${data.message.consentId?.substring(0, 20)}...`);
        console.log('[TEST_CONSENT] ✅ ConsentCard devrait s\'afficher maintenant');
      } else {
        throw new Error(data.error || 'Échec test-consent');
      }

    } catch (error: any) {
      console.error('[TEST_CONSENT] ❌ Erreur:', error);
      addActivity('x-circle', `Erreur test: ${error.message}`);
      alert(`Erreur test consentement: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full" style={{ background: colors.background }}>
      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Premium Copilot */}
        <div
          className="flex-shrink-0 px-6 py-4 relative overflow-hidden"
          style={{
            background: colors.cardBg,
            borderBottom: '1px solid rgba(0, 145, 255, 0.2)',
            boxShadow: '0 4px 32px rgba(0, 145, 255, 0.12)'
          }}
        >
          {/* Animated gradient background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at 10% 50%, rgba(0, 145, 255, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 90% 50%, rgba(0, 207, 255, 0.08) 0%, transparent 50%)
              `
            }}
          />

          {/* Top gradient border animation */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #0091ff 30%, #00cfff 50%, #0091ff 70%, transparent 100%)',
              opacity: 0.6
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* M.A.X. Avatar avec glow premium et animation */}
                <div className="relative flex-shrink-0 group">
                  <div className="relative">
                    <img
                      src="/images/max-hero-happy.png"
                      alt="M.A.X."
                      className="h-14 w-14 rounded-full ring-2 ring-offset-2 transition-all duration-300 group-hover:ring-4"
                      style={{
                        filter: 'drop-shadow(0 0 20px rgba(0, 145, 255, 0.6))',
                        ringColor: 'rgba(0, 145, 255, 0.5)',
                        ringOffsetColor: colors.cardBg
                      }}
                    />
                    {/* Animated ring glow */}
                    <div
                      className="absolute inset-0 rounded-full blur-xl -z-10 animate-pulse"
                      style={{
                        background: 'radial-gradient(circle, rgba(0, 145, 255, 0.5) 0%, rgba(0, 207, 255, 0.3) 50%, transparent 70%)'
                      }}
                    />
                  </div>
                </div>

                {/* Title & Badge Section */}
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1
                        className="text-2xl font-bold tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        Cockpit M.A.X.
                      </h1>
                      {/* Status Badge avec animation */}
                      <div
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.15), rgba(0, 207, 255, 0.15))',
                          border: '1px solid rgba(0, 145, 255, 0.3)',
                          color: '#0091ff',
                          boxShadow: '0 0 16px rgba(0, 145, 255, 0.2)'
                        }}
                      >
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                        </div>
                        <span>Opérationnel</span>
                      </div>
                    </div>
                    <p className="text-xs opacity-70" style={{ color: colors.textSecondary }}>
                      Bienvenue dans le Cockpit - Pilotez votre CRM en toute intelligence
                    </p>
                  </div>

                  {/* Quick Stats avec glassmorphism */}
                  <div
                    className="flex items-center gap-4 ml-4 pl-4 py-2 px-3 rounded-lg backdrop-blur-sm"
                    style={{
                      borderLeft: `2px solid ${colors.border}`,
                      background: 'rgba(0, 145, 255, 0.05)'
                    }}
                  >
                    <div className="text-center">
                      <div
                        className="text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {messages.length}
                      </div>
                      <div className="text-[10px] opacity-60 font-medium" style={{ color: colors.textSecondary }}>
                        Messages
                      </div>
                    </div>
                    <div className="w-px h-6 opacity-30" style={{ background: colors.border }} />
                    <div className="text-center">
                      <div
                        className="text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #00cfff, #0091ff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {sessionId ? '100%' : '—'}
                      </div>
                      <div className="text-[10px] opacity-60 font-medium" style={{ color: colors.textSecondary }}>
                        Précision
                      </div>
                    </div>
                    <div className="w-px h-6 opacity-30" style={{ background: colors.border }} />
                    <div className="text-center">
                      <div
                        className="text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {activities.length}
                      </div>
                      <div className="text-[10px] opacity-60 font-medium" style={{ color: colors.textSecondary }}>
                        Activités
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* 🧪 Bouton Test Consent (dev only) */}
                <button
                  onClick={async () => {
                    try {
                      const consent = await requestConsent({
                        type: 'layout_modification',
                        description: 'TEST: Ajouter le champ testManuel aux layouts Lead',
                        details: {
                          entity: 'Lead',
                          fieldName: 'testManuel',
                          layoutTypes: ['detail', 'list']
                        }
                      });
                      addActivity('alert-circle', `TEST Consent créé: ${consent.consentId.substring(0, 20)}...`);

                      // Ajouter un message de consentement au chat
                      const testMessage: ChatMessage = {
                        role: 'system',
                        content: 'Opération sensible détectée - Test manuel',
                        timestamp: Date.now(),
                        type: 'consent',
                        consentId: consent.consentId,
                        operation: {
                          type: 'layout_modification',
                          description: 'TEST: Ajouter le champ testManuel aux layouts Lead',
                          details: {
                            entity: 'Lead',
                            fieldName: 'testManuel',
                            layoutTypes: ['detail', 'list']
                          }
                        },
                        consentStatus: 'pending'
                      };

                      // Forcer l'ajout au store - Hack pour ajouter un message custom
                      const currentStore = useChatStore.getState();
                      useChatStore.setState({
                        messages: [...currentStore.messages, testMessage]
                      });

                      console.log('[TEST] Message consent ajouté au chat');
                    } catch (error: any) {
                      console.error('[TEST] Erreur:', error);
                      alert('Erreur test consent: ' + error.message);
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                >
                  🧪 Test Consent
                </button>

                {/* Bouton Activité Premium */}
                <button
                  onClick={() => setIsActivityOpen(!isActivityOpen)}
                  className="group relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 overflow-hidden"
                  style={{
                    background: isActivityOpen
                      ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.2), rgba(0, 207, 255, 0.2))'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isActivityOpen ? 'rgba(0, 145, 255, 0.4)' : colors.borderLight,
                    color: colors.textPrimary,
                    boxShadow: isActivityOpen ? '0 0 20px rgba(0, 145, 255, 0.3)' : 'none'
                  }}
                >
                  <ActivityIcon className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" style={{ color: isActivityOpen ? '#0091ff' : colors.textSecondary }} />
                  <span className="text-sm font-medium">Activité</span>
                  {activities.length > 0 && (
                    <span
                      className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                        color: 'white'
                      }}
                    >
                      {activities.length}
                    </span>
                  )}
                </button>

                {/* Affichage tokens */}
                <TokenDisplay totalTokens={totalTokens} />

                {/* Bouton reset Premium */}
                <button
                  onClick={handleReset}
                  disabled={isLoading || isStreaming || messages.length === 0}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: colors.borderLight,
                    color: colors.textPrimary
                  }}
                >
                  <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
                  <span className="text-sm font-medium">Reset</span>
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div className="mt-5">
              <ModeSelector
                currentMode={mode}
                onChangeMode={handleChangeMode}
                disabled={isLoading || isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Messages avec scroll indépendant */}
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          isLoading={isLoading}
          sessionId={sessionId || undefined}
          onViewAudit={handleViewAudit}
        />

        {/* 🧪 BOUTON TEST CONSENTEMENT (visible seulement en mode debug ?debug=1) */}
        {isDebugMode && (
          <div className="px-6 py-2 border-t" style={{
            borderColor: 'rgba(251, 191, 36, 0.3)',
            background: 'rgba(251, 191, 36, 0.05)'
          }}>
            <button
              onClick={testConsentFlow}
              className="w-full px-4 py-3 rounded-lg font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                boxShadow: '0 4px 16px rgba(251, 191, 36, 0.3)'
              }}
            >
              🧪 Test Consentement (DEV ONLY)
            </button>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onUploadFile={handleUploadFile}
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
      </div>

      {/* Activity Panel (colonne rétractable) */}
      <ActivityPanel
        activities={activities}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
}
