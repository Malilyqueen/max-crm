/**
 * stores/useAutomationStore.ts
 * Store Zustand pour la gestion des workflows et automatisations MVP1
 */

import { create } from 'zustand';
import { API_BASE_URL as BASE_URL } from '../config/api';
import type { Workflow, AutomationFilters, WorkflowStatus } from '../types/automation';

interface AutoGuardConfig {
  enabled: boolean;
  allowed: string[];
  rateLimitPerHour: number;
  schedule: {
    start: string;
    end: string;
  };
}

interface AutomationState {
  // Data
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  filters: AutomationFilters;
  autoGuardConfig: AutoGuardConfig | null;

  // UI State
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  // Stats
  total: number;

  // Actions
  loadWorkflows: () => Promise<void>;
  loadAutoGuardConfig: () => Promise<void>;
  loadWorkflowDetail: (workflowId: string) => Promise<void>;
  toggleWorkflowStatus: (workflowId: string) => Promise<void>;
  setFilters: (filters: AutomationFilters) => void;
  clearFilters: () => void;
  clearSelectedWorkflow: () => void;
  clearError: () => void;
}

const API_BASE_URL = `${BASE_URL}/api`;

// Helpers pour mapper les workflows n8n vers l'UI
function getWorkflowLabel(code: string): string {
  const labels: Record<string, string> = {
    'wf-relance-j3': 'Relance automatique J+3',
    'wf-relance-j3-whatsapp': 'Relance WhatsApp J+3',
    'wf-tag-chaud': 'Tag automatique leads chauds',
    'wf-nettoyage': 'Nettoyage automatique des données',
    'wf-newsletter-segment': 'Newsletter segmentée automatique'
  };
  return labels[code] || code;
}

function getWorkflowDescription(code: string): string {
  const descriptions: Record<string, string> = {
    'wf-relance-j3': 'Relance automatique des leads froids après 3 jours sans réponse',
    'wf-relance-j3-whatsapp': 'Envoi automatique d\'un message WhatsApp de relance après 3 jours',
    'wf-tag-chaud': 'Détection et tagging automatique des leads avec forte intention d\'achat',
    'wf-nettoyage': 'Nettoyage périodique des doublons et données obsolètes',
    'wf-newsletter-segment': 'Envoi automatique de newsletters personnalisées par segment'
  };
  return descriptions[code] || 'Workflow automatisé créé par M.A.X.';
}

function getWorkflowTrigger(code: string): { type: string; label: string; config: any } {
  const triggers: Record<string, { type: string; label: string; config: any }> = {
    'wf-relance-j3': {
      type: 'time_based',
      label: 'Tous les jours à 9h00',
      config: { schedule: '0 9 * * *' }
    },
    'wf-relance-j3-whatsapp': {
      type: 'time_based',
      label: 'Tous les jours à 9h00',
      config: { schedule: '0 9 * * *' }
    },
    'wf-tag-chaud': {
      type: 'lead_scored',
      label: 'Score lead > 80',
      config: { threshold: 80 }
    },
    'wf-nettoyage': {
      type: 'time_based',
      label: 'Tous les lundis à 6h00',
      config: { schedule: '0 6 * * 1' }
    },
    'wf-newsletter-segment': {
      type: 'time_based',
      label: 'Tous les vendredis à 10h00',
      config: { schedule: '0 10 * * 5' }
    }
  };
  return triggers[code] || {
    type: 'manual',
    label: 'Déclenchement manuel',
    config: {}
  };
}

function getWorkflowActions(code: string): any[] {
  const actions: Record<string, any[]> = {
    'wf-relance-j3': [
      {
        id: 'a1',
        type: 'wait',
        label: 'Attendre 10 secondes (test)',
        description: 'Délai de test pour validation',
        config: { duration: 10, unit: 'seconds' },
        order: 1
      },
      {
        id: 'a2',
        type: 'send_email',
        label: 'Envoyer message de relance',
        description: 'Message généré par M.A.X. adapté au contexte',
        config: { channel: 'email', template: 'relance-j3' },
        order: 2
      }
    ],
    'wf-relance-j3-whatsapp': [
      {
        id: 'a1',
        type: 'wait',
        label: 'Attendre 10 secondes (test)',
        description: 'Délai de test pour validation',
        config: { duration: 10, unit: 'seconds' },
        order: 1
      },
      {
        id: 'a2',
        type: 'send_email',
        label: 'Envoyer WhatsApp de relance',
        description: 'Template Twilio WhatsApp via n8n',
        config: {
          channel: 'whatsapp',
          template: 'relance-j3-whatsapp',
          from: 'whatsapp:+14155238886'
        },
        order: 2
      }
    ],
    'wf-tag-chaud': [
      {
        id: 'a1',
        type: 'add_tag',
        label: 'Ajouter tag "Lead Chaud"',
        description: 'Marquer le lead comme prioritaire',
        config: { tags: ['Lead Chaud', 'Priorité Haute'] },
        order: 1
      },
      {
        id: 'a2',
        type: 'notify',
        label: 'Notifier le commercial',
        description: 'Alerte en temps réel',
        config: { channel: 'email', recipients: ['commercial'] },
        order: 2
      }
    ],
    'wf-nettoyage': [
      {
        id: 'a1',
        type: 'update_field',
        label: 'Identifier les doublons',
        description: 'Scan des emails et téléphones',
        config: { fields: ['email', 'phone'] },
        order: 1
      },
      {
        id: 'a2',
        type: 'update_field',
        label: 'Fusionner les doublons',
        description: 'Consolidation automatique',
        config: { action: 'merge' },
        order: 2
      }
    ],
    'wf-newsletter-segment': [
      {
        id: 'a1',
        type: 'update_field',
        label: 'Segmenter les leads',
        description: 'Par statut, secteur et score',
        config: { criteria: ['status', 'sector', 'score'] },
        order: 1
      },
      {
        id: 'a2',
        type: 'send_email',
        label: 'Envoyer newsletter personnalisée',
        description: 'Contenu adapté par segment',
        config: { channel: 'email', template: 'newsletter' },
        order: 2
      }
    ]
  };
  return actions[code] || [];
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  // Initial state
  workflows: [],
  selectedWorkflow: null,
  filters: {},
  autoGuardConfig: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  total: 0,

  // Load workflows list (vrais workflows n8n)
  loadWorkflows: async () => {
    set({ isLoading: true, error: null });

    try {
      // Récupérer le token depuis le store auth (Zustand persist)
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      if (!token) {
        throw new Error('Non authentifié');
      }

      // CHANGEMENT: Appeler l'endpoint n8n au lieu du mock MVP1
      const response = await fetch(`${API_BASE_URL}/n8n/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des workflows');
      }

      const data = await response.json();

      // data.list contient les noms de workflows n8n
      // On les transforme en format Workflow pour l'UI
      const workflowsList = (data.list || []).map((code: string) => ({
        id: code,
        name: getWorkflowLabel(code),
        description: getWorkflowDescription(code),
        status: 'active', // TODO: récupérer le vrai statut depuis auto.json
        trigger: getWorkflowTrigger(code),
        actions: [], // TODO: récupérer depuis n8n
        stats: {
          totalExecutions: 0,
          successRate: 0,
          lastExecuted: null,
          averageDuration: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'M.A.X.'
      }));

      set({
        workflows: workflowsList,
        total: workflowsList.length,
        isLoading: false
      });

    } catch (error) {
      console.error('[AutomationStore] Erreur loadWorkflows:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        isLoading: false
      });
    }
  },

  // Load auto-guard config (auto.json)
  loadAutoGuardConfig: async () => {
    try {
      // Pour l'instant, on hardcode la config depuis auto.json
      // TODO: Créer un endpoint backend pour exposer auto.json
      const config: AutoGuardConfig = {
        enabled: true,
        allowed: ['wf-relance-j3', 'wf-tag-chaud', 'wf-newsletter-segment'],
        rateLimitPerHour: 50,
        schedule: {
          start: '09:00',
          end: '19:00'
        }
      };

      set({ autoGuardConfig: config });
    } catch (error) {
      console.error('[AutomationStore] Erreur loadAutoGuardConfig:', error);
    }
  },

  // Load workflow detail - Charge depuis n8n + auto.json
  loadWorkflowDetail: async (workflowId: string) => {
    set({ isLoadingDetail: true, error: null });

    try {
      // Pour l'instant, on construit le détail depuis nos helpers
      // TODO: Charger les vraies données depuis n8n API et auto.json

      const workflow: Workflow = {
        id: workflowId,
        name: getWorkflowLabel(workflowId),
        description: getWorkflowDescription(workflowId),
        status: 'active', // TODO: vérifier dans auto.json
        trigger: getWorkflowTrigger(workflowId),
        actions: getWorkflowActions(workflowId),
        stats: {
          totalExecutions: 0,
          successRate: 0,
          lastExecuted: null,
          averageDuration: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'M.A.X.'
      };

      set({
        selectedWorkflow: workflow,
        isLoadingDetail: false
      });

    } catch (error) {
      console.error('[AutomationStore] Erreur loadWorkflowDetail:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        isLoadingDetail: false
      });
    }
  },

  // Toggle workflow status (active/inactive) - Déclenche le workflow n8n
  toggleWorkflowStatus: async (workflowId: string) => {
    try {
      // Récupérer le token depuis le store auth (Zustand persist)
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      if (!token) {
        throw new Error('Non authentifié');
      }

      // Pour l'instant, on déclenche manuellement le workflow
      // TODO: Implémenter un vrai système d'activation/désactivation
      const response = await fetch(`${API_BASE_URL}/n8n/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Preview': 'false' // Execution réelle, pas preview
        },
        body: JSON.stringify({
          code: workflowId,
          mode: 'manual',
          payload: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du déclenchement du workflow');
      }

      const result = await response.json();

      console.log('[AutomationStore] Workflow déclenché:', result);

      // Pour l'instant, on ne change pas vraiment le statut
      // Le workflow est déclenché manuellement
      // TODO: Gérer un vrai état active/inactive

    } catch (error) {
      console.error('[AutomationStore] Erreur toggleWorkflowStatus:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  },

  // Set filters
  setFilters: (filters: AutomationFilters) => {
    set({ filters });
    get().loadWorkflows();
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: {} });
    get().loadWorkflows();
  },

  // Clear selected workflow
  clearSelectedWorkflow: () => {
    set({ selectedWorkflow: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
