/**
 * examples/ConsentCardExample.tsx
 * Exemple d'utilisation de ConsentCard dans ChatPage
 */

import React, { useState } from 'react';
import { ConsentCard } from '../components/chat/ConsentCard';
import { AuditReportModal } from '../components/chat/AuditReportModal';
import { useConsent } from '../hooks/useConsent';
import { Activity } from '../components/chat/ActivityPanel';

/**
 * Exemple d'intégration dans ChatPage
 */
export function ConsentCardExample() {
  const { requestConsent, executeConsent } = useConsent();
  const [currentConsent, setCurrentConsent] = useState<any>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  /**
   * Quand MAX détecte qu'il a besoin de modifier des layouts
   */
  const handleMaxNeedsLayoutModification = async () => {
    try {
      // Créer une demande de consentement
      const consent = await requestConsent({
        type: 'layout_modification',
        description: 'Ajouter le champ "secteurActivite" aux layouts Lead',
        details: {
          entity: 'Lead',
          fieldName: 'secteurActivite',
          layoutTypes: ['detail', 'detailSmall', 'list'],
        },
      });

      setCurrentConsent(consent);

      // Log dans ActivityPanel
      addActivity({
        icon: 'target',
        message: 'Demande de consentement créée pour modification layouts',
      });
    } catch (error) {
      console.error('Failed to request consent:', error);
    }
  };

  /**
   * Quand l'utilisateur approuve le consentement
   */
  const handleApproveConsent = async (consentId: string) => {
    try {
      // Log activité: début d'exécution
      addActivity({
        icon: 'refresh',
        message: 'Exécution intervention layouts...',
      });

      // Exécuter l'opération
      const result = await executeConsent(consentId);

      // Log activité: succès
      if (result.success && result.result) {
        addActivity({
          icon: 'edit',
          message: `Champ ajouté à ${result.result.layoutsModified} layout(s)`,
        });
      }

      // Cleanup consent
      setCurrentConsent(null);
    } catch (error: any) {
      // Log activité: erreur
      addActivity({
        icon: 'zap',
        message: `Erreur: ${error.message}`,
      });
      throw error;
    }
  };

  /**
   * Afficher le rapport d'audit
   */
  const handleViewAudit = (consentId: string) => {
    setSelectedAuditId(consentId);
    setAuditModalOpen(true);
  };

  /**
   * Ajouter une activité au panel
   */
  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    setActivities((prev) => [
      {
        id: `activity_${Date.now()}`,
        timestamp: Date.now(),
        ...activity,
      },
      ...prev,
    ]);
  };

  return (
    <div className="p-4">
      {/* Bouton de test pour déclencher une demande de consentement */}
      <button
        onClick={handleMaxNeedsLayoutModification}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Tester demande consentement
      </button>

      {/* Carte de consentement (affichée dans le chat) */}
      {currentConsent && (
        <ConsentCard
          consentId={currentConsent.consentId}
          operation={currentConsent.operation}
          expiresIn={currentConsent.expiresIn}
          onApprove={handleApproveConsent}
          onViewAudit={handleViewAudit}
        />
      )}

      {/* Modal de rapport d'audit */}
      {selectedAuditId && (
        <AuditReportModal
          consentId={selectedAuditId}
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {/* Liste des activités (pour démonstration) */}
      <div className="mt-6">
        <h3 className="font-bold mb-2">Activités:</h3>
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li key={activity.id} className="p-2 bg-gray-100 rounded">
              {activity.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
