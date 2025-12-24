/**
 * actionMapper.js
 * Génère les boutons d'action appropriés selon l'état de la conversation
 */

import { ConversationState } from './contextDetector.js';

/**
 * Retourne les boutons appropriés pour un état donné
 * @param {string} state - L'état de la conversation
 * @param {object} context - Données contextuelles
 * @returns {array} Liste des boutons d'action
 */
export function getButtonsForState(state, context = {}) {
  switch (state) {
    case ConversationState.ANALYSIS_READY:
      return [
        {
          id: 'confirm_import',
          label: '✅ Oui, importer',
          action: 'confirm-import-espo',
          style: 'primary'
        },
        {
          id: 'cancel_import',
          label: '❌ Non, annuler',
          action: 'cancel-import',
          style: 'secondary'
        },
        {
          id: 'download_csv',
          label: '📥 Télécharger CSV enrichi',
          action: 'download-enriched',
          style: 'secondary'
        }
      ];

    case ConversationState.IMPORT_DONE:
      return [
        {
          id: 'enrich_leads',
          label: '🔧 Enrichir les données',
          action: 'start-enrichment',
          style: 'primary',
          description: 'Ajouter objectifs, budget, secteur détaillé'
        },
        {
          id: 'create_workflows',
          label: '⚡ Créer workflows',
          action: 'setup-workflows',
          style: 'primary',
          description: 'Automatiser les relances et suivis'
        },
        {
          id: 'segment_leads',
          label: '🎯 Segmenter',
          action: 'segment-leads',
          style: 'secondary',
          description: 'Créer des segments par potentiel'
        },
        {
          id: 'create_campaign',
          label: '✉️ Créer campagne',
          action: 'create-campaign',
          style: 'secondary',
          description: 'Lancer une séquence d\'emails'
        }
      ];

    case ConversationState.ENRICHMENT_PROPOSED:
      const enrichableCount = context.enrichable_count || 0;
      const cost = context.enrichment_cost || 0;

      return [
        {
          id: 'confirm_enrichment',
          label: enrichableCount > 0 && cost > 0
            ? `✅ Enrichir (${enrichableCount} leads, ${cost}€)`
            : '✅ Enrichir maintenant',
          action: 'execute-enrichment',
          style: 'success'
        },
        {
          id: 'skip_enrichment',
          label: '⏭️ Passer',
          action: 'skip-enrichment',
          style: 'secondary'
        },
        {
          id: 'view_details',
          label: '📋 Voir détails',
          action: 'show-enrichment-details',
          style: 'secondary'
        }
      ];

    case ConversationState.WORKFLOW_PROPOSED:
      const workflowName = context.workflow_name || 'ce workflow';

      return [
        {
          id: 'activate_workflow',
          label: `🚀 Activer "${workflowName}"`,
          action: 'activate-workflow',
          style: 'success'
        },
        {
          id: 'customize_workflow',
          label: '⚙️ Personnaliser',
          action: 'customize-workflow',
          style: 'primary'
        },
        {
          id: 'skip_workflow',
          label: '⏭️ Passer',
          action: 'skip-workflow',
          style: 'secondary'
        }
      ];

    case ConversationState.ERROR:
      return [
        {
          id: 'retry',
          label: '🔄 Réessayer',
          action: 'retry',
          style: 'warning'
        },
        {
          id: 'cancel',
          label: '❌ Annuler',
          action: 'cancel',
          style: 'secondary'
        }
      ];

    case ConversationState.IDLE:
    default:
      return [];
  }
}
