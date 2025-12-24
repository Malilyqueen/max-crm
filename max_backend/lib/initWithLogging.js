/**
 * Wrapper pour init-espo-transport.js avec logging automatique
 *
 * Ce module intercepte les actions du script d'initialisation
 * et les logue automatiquement dans le système M.A.X. Actions
 */

import { logAction, ACTION_TYPES, PRIORITY_LEVELS } from './maxActionLogger.js';

/**
 * Logger après création de champs
 */
export async function logFieldCreation(field, brainType) {
  await logAction({
    type: ACTION_TYPES.FIELD_CREATED,
    title: `Champ ${field.name} créé`,
    description: `M.A.X. a créé le champ custom "${field.label}" (${field.type}) pour l'entité ${field.entity}`,
    metadata: {
      fieldName: field.name,
      fieldType: field.type,
      entity: field.entity,
      brainType
    },
    priority: PRIORITY_LEVELS.HIGH,
    success: true
  });
}

/**
 * Logger après création système de tags
 */
export async function logTagSystemCreation(tagOptions) {
  await logAction({
    type: ACTION_TYPES.TAG_CREATED,
    title: 'Système de tags créé',
    description: `M.A.X. a créé le champ multiEnum "maxTags" avec ${tagOptions.length} options pour le tagging intelligent des leads`,
    metadata: {
      tagOptions,
      count: tagOptions.length
    },
    priority: PRIORITY_LEVELS.HIGH,
    success: true
  });
}

/**
 * Logger après import de lead
 */
export async function logLeadImport(lead) {
  await logAction({
    type: ACTION_TYPES.LEAD_IMPORTED,
    title: `Lead ${lead.firstName} ${lead.lastName} importé`,
    description: `M.A.X. a importé le lead ${lead.firstName} ${lead.lastName} de ${lead.accountName ||''}`,
    metadata: {
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      company: lead.accountName,
      status: lead.status
    },
    priority: PRIORITY_LEVELS.MEDIUM,
    success: true
  });
}

/**
 * Logger après tagging de lead
 */
export async function logLeadTagging(lead, tags) {
  await logAction({
    type: ACTION_TYPES.LEAD_TAGGED,
    title: `Tags appliqués à ${lead.firstName} ${lead.lastName}`,
    description: `M.A.X. a détecté et appliqué automatiquement ${tags.length} tags au lead`,
    metadata: {
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      tags,
      tagsCount: tags.length
    },
    priority: PRIORITY_LEVELS.LOW,
    success: true
  });
}

/**
 * Logger après analyse de leads
 */
export async function logLeadAnalysis(totalLeads, hotLeads, strategies) {
  await logAction({
    type: ACTION_TYPES.LEAD_ANALYZED,
    title: `Analyse de ${totalLeads} leads terminée`,
    description: `M.A.X. a analysé ${totalLeads} leads, identifié ${hotLeads} leads prioritaires et généré ${strategies.length} stratégies marketing`,
    metadata: {
      totalLeads,
      hotLeads,
      strategiesCount: strategies.length
    },
    priority: PRIORITY_LEVELS.HIGH,
    success: true
  });
}

/**
 * Logger stratégies générées
 */
export async function logStrategiesGenerated(strategies) {
  for (const strategy of strategies) {
    await logAction({
      type: ACTION_TYPES.STRATEGY_GENERATED,
      title: strategy.title,
      description: `M.A.X. suggère: ${strategy.description}`,
      metadata: {
        priority: strategy.priority,
        impact: strategy.impact
      },
      priority: strategy.priority === 'HAUTE' ? PRIORITY_LEVELS.HIGH : PRIORITY_LEVELS.MEDIUM,
      success: true
    });
  }
}

/**
 * Logger détection de cerveau
 */
export async function logBrainDetection(brainType, confidence) {
  await logAction({
    type: ACTION_TYPES.BRAIN_DETECTED,
    title: `Cerveau "${brainType}" détecté`,
    description: `M.A.X. a détecté automatiquement le secteur d'activité "${brainType}" et va adapter la structure CRM en conséquence`,
    metadata: {
      brainType,
      confidence
    },
    priority: PRIORITY_LEVELS.CRITICAL,
    success: true
  });
}

export default {
  logFieldCreation,
  logTagSystemCreation,
  logLeadImport,
  logLeadTagging,
  logLeadAnalysis,
  logStrategiesGenerated,
  logBrainDetection
};
