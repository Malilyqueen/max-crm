/**
 * pages/MaxPage.tsx
 * Page M.A.X. - "Le Cerveau IA" avec Suggestions, Execution Log et Admin Tools
 */

import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useThemeColors } from '../hooks/useThemeColors';
import { SuggestionCard, type Suggestion } from '../components/max/SuggestionCard';
import { TaskTrayComponent, type ExecutionLogEntry } from '../components/max/TaskTrayComponent';
import { AdminPanel } from '../components/max/AdminPanel';

/**
 * Génération de suggestions IA côté front (logique simple)
 * En Phase 2, ces suggestions pourront venir de l'API backend
 */
function generateSuggestions(leads: any[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Exemple: Lead sans email
  const leadsWithoutEmail = leads.filter((l) => !l.email);
  if (leadsWithoutEmail.length > 0) {
    const lead = leadsWithoutEmail[0];
    suggestions.push({
      id: `email-${lead.id}`,
      type: 'email',
      title: '📧 Compléter l\'email',
      description: `Lead "${lead.name}" n'a pas d'email enregistré`,
      leadId: lead.id,
      leadName: lead.name
    });
  }

  // Exemple: Lead ancien (créé il y a plus de 3 jours)
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const oldLeads = leads.filter((l) => new Date(l.createdAt).getTime() < threeDaysAgo);
  if (oldLeads.length > 0) {
    const lead = oldLeads[0];
    suggestions.push({
      id: `relance-${lead.id}`,
      type: 'relance',
      title: '⏰ Relancer J+3',
      description: `Lead "${lead.name}" créé il y a plus de 3 jours sans activité`,
      leadId: lead.id,
      leadName: lead.name
    });
  }

  // Exemple: Lead sans tag
  const leadsWithoutTag = leads.filter((l) => !l.tags || l.tags.length === 0);
  if (leadsWithoutTag.length > 0) {
    const lead = leadsWithoutTag[0];
    suggestions.push({
      id: `tag-${lead.id}`,
      type: 'tag',
      title: '🏷️ Taguer comme Prospect chaud',
      description: `Lead "${lead.name}" n'a aucun tag assigné`,
      leadId: lead.id,
      leadName: lead.name
    });
  }

  return suggestions;
}

interface ApiExecutionLog {
  ok: boolean;
  logs: Array<{
    id: string;
    timestamp: string;
    action: string;
    status: 'pending' | 'running' | 'success' | 'error';
    details?: string;
  }>;
}

export function MaxPage() {
  const colors = useThemeColors();
  const { data: executionLogData } = useApi<ApiExecutionLog>('/api/max/execution-log');

  // Mock data pour les suggestions (Phase 1 - logique front simple)
  const [suggestions] = useState<Suggestion[]>([
    {
      id: '1',
      type: 'email',
      title: '📧 Compléter l\'email',
      description: 'Lead "John Doe" n\'a pas d\'email enregistré',
      leadId: 'lead-123',
      leadName: 'John Doe'
    },
    {
      id: '2',
      type: 'relance',
      title: '⏰ Relancer J+3',
      description: 'Lead "Jane Smith" créé il y a plus de 3 jours sans activité',
      leadId: 'lead-456',
      leadName: 'Jane Smith'
    },
    {
      id: '3',
      type: 'tag',
      title: '🏷️ Taguer comme Prospect chaud',
      description: 'Lead "Bob Martin" n\'a aucun tag assigné',
      leadId: 'lead-789',
      leadName: 'Bob Martin'
    }
  ]);

  const executionLogs: ExecutionLogEntry[] = executionLogData?.logs || [
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      action: 'Relance automatique J+3',
      status: 'success',
      details: '15 emails envoyés avec succès'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      action: 'Tag automatique #chaud',
      status: 'success',
      details: '8 leads tagués'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      action: 'Analyse des leads',
      status: 'running',
      details: 'En cours d\'exécution...'
    }
  ];

  const handleExecuteSuggestion = (suggestion: Suggestion) => {
    console.log('Exécution de la suggestion:', suggestion);
    // En Phase 2: Appel API pour exécuter l'action
    alert(`Suggestion "${suggestion.title}" exécutée pour ${suggestion.leadName}`);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
          M.A.X. - Le Cerveau IA
        </h1>
        <p className="mt-1" style={{ color: colors.textSecondary }}>
          Intelligence artificielle pour la gestion automatisée de vos leads CRM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Suggestions IA */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
            Suggestions IA
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Actions recommandées par M.A.X. pour optimiser votre CRM
          </p>

          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: colors.textSecondary }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p style={{ color: colors.textSecondary }}>Aucune suggestion pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onExecute={handleExecuteSuggestion}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Execution Log */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
            Journal d'exécution
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Historique des actions automatisées par M.A.X.
          </p>

          <TaskTrayComponent logs={executionLogs} />
        </div>
      </div>

      {/* Section 3: Admin Tools */}
      <AdminPanel />
    </div>
  );
}