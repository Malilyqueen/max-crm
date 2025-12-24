/**
 * espoImporter.js
 *
 * Import de leads enrichis dans EspoCRM
 * - Création de champs personnalisés
 * - Import bulk de leads
 * - Création de segments automatiques
 */

import fetch from 'node-fetch';

const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm';
const ESPO_API_KEY = process.env.ESPO_API_KEY || 'votre_api_key';

/**
 * Vérifie si un champ personnalisé existe dans EspoCRM
 * @param {string} entityType - Type d'entité (Lead, Contact, etc.)
 * @param {string} fieldName - Nom du champ
 * @returns {Promise<boolean>} - true si existe
 */
async function fieldExists(entityType, fieldName) {
  try {
    const res = await fetch(`${ESPO_BASE}/api/v1/Metadata/entityDefs/${entityType}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ESPO_API_KEY
      }
    });

    if (!res.ok) return false;

    const metadata = await res.json();
    return metadata.fields && metadata.fields[fieldName] !== undefined;
  } catch (error) {
    console.error('[EspoImporter] Erreur vérification champ:', error);
    return false;
  }
}

/**
 * Crée un champ personnalisé dans EspoCRM
 * @param {string} entityType - Type d'entité
 * @param {string} fieldName - Nom du champ
 * @param {Object} fieldConfig - Configuration du champ
 * @returns {Promise<boolean>} - true si succès
 */
async function createCustomField(entityType, fieldName, fieldConfig) {
  try {
    console.log(`[EspoImporter] Création champ ${fieldName} pour ${entityType}...`);

    // Vérifier si existe déjà
    const exists = await fieldExists(entityType, fieldName);
    if (exists) {
      console.log(`[EspoImporter] Champ ${fieldName} existe déjà`);
      return true;
    }

    // API EspoCRM pour créer champ personnalisé (via Administration)
    // Note: Cette API peut nécessiter des privilèges admin
    const res = await fetch(`${ESPO_BASE}/api/v1/Admin/fieldManager/${entityType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ESPO_API_KEY
      },
      body: JSON.stringify({
        name: fieldName,
        ...fieldConfig
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.warn(`[EspoImporter] Impossible de créer champ ${fieldName}: ${error}`);
      return false;
    }

    console.log(`[EspoImporter] Champ ${fieldName} créé avec succès`);
    return true;

  } catch (error) {
    console.error(`[EspoImporter] Erreur création champ ${fieldName}:`, error);
    return false;
  }
}

/**
 * Crée les champs personnalisés standards pour leads enrichis
 * @returns {Promise<Object>} - Résultat de la création
 */
export async function createStandardFields() {
  console.log('[EspoImporter] Création des champs personnalisés standards...');

  const fields = [
    {
      name: 'customSource',
      config: {
        type: 'enum',
        options: ['Événement - Salon', 'Site Web', 'Réseaux Sociaux', 'Référence', 'Campagne Marketing', 'Autre'],
        default: 'Autre',
        required: false,
        label: 'Source (Custom)'
      }
    },
    {
      name: 'customTags',
      config: {
        type: 'text',
        label: 'Tags (Custom)',
        required: false
      }
    },
    {
      name: 'customStatus',
      config: {
        type: 'enum',
        options: ['Lead Chaud', 'Lead Tiède', 'Lead Froid', 'Prospect Qualifié', 'Contact Inactif'],
        default: 'Lead Tiède',
        required: false,
        label: 'Statut Engagement (Custom)'
      }
    },
    {
      name: 'customDescription',
      config: {
        type: 'text',
        label: 'Description Enrichie (Custom)',
        required: false
      }
    }
  ];

  const results = {
    created: [],
    existing: [],
    failed: []
  };

  for (const field of fields) {
    const success = await createCustomField('Lead', field.name, field.config);
    if (success) {
      const exists = await fieldExists('Lead', field.name);
      if (exists) {
        results.existing.push(field.name);
      } else {
        results.created.push(field.name);
      }
    } else {
      results.failed.push(field.name);
    }
  }

  console.log('[EspoImporter] Résultat création champs:', results);
  return results;
}

/**
 * Importe un lead enrichi dans EspoCRM
 * @param {Object} lead - Données du lead enrichi
 * @returns {Promise<Object>} - Lead créé ou erreur
 */
async function importSingleLead(lead) {
  try {
    // Mapper les champs enrichis vers EspoCRM
    const espoLead = {
      // Champs standards
      firstName: lead.firstName || lead.name?.split(' ')[0] || '',
      lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || lead.name || 'N/A',
      emailAddress: lead.email || lead.emailAddress,
      phoneNumber: lead.phone || lead.phoneNumber || lead.tel || lead.telephone,
      accountName: lead.company || lead.accountName,
      description: lead.description || lead.customDescription,

      // Champs personnalisés (si créés)
      customSource: lead.source || lead.customSource,
      customTags: lead.tags || lead.customTags,
      customStatus: lead.status || lead.customStatus,
      customDescription: lead.description || lead.customDescription,

      // Statut par défaut
      status: 'New'
    };

    // Appel API EspoCRM
    const res = await fetch(`${ESPO_BASE}/api/v1/Lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ESPO_API_KEY
      },
      body: JSON.stringify(espoLead)
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`EspoCRM error: ${error}`);
    }

    const created = await res.json();
    return { ok: true, lead: created };

  } catch (error) {
    console.error('[EspoImporter] Erreur import lead:', error);
    return { ok: false, error: error.message, lead };
  }
}

/**
 * Importe une liste de leads enrichis
 * @param {Array} leads - Liste des leads enrichis
 * @param {Object} options - Options d'import
 * @returns {Promise<Object>} - Résultat de l'import
 */
export async function importLeads(leads, options = {}) {
  console.log(`[EspoImporter] Import de ${leads.length} leads dans EspoCRM...`);

  const {
    createFields = true,
    batchSize = 10
  } = options;

  // Créer champs personnalisés si demandé
  let fieldsResult = null;
  if (createFields) {
    fieldsResult = await createStandardFields();
  }

  const results = {
    total: leads.length,
    success: [],
    failed: [],
    fieldsCreated: fieldsResult
  };

  // Import par batch pour éviter surcharge
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(lead => importSingleLead(lead))
    );

    batchResults.forEach(result => {
      if (result.ok) {
        results.success.push(result.lead);
      } else {
        results.failed.push({
          lead: result.lead,
          error: result.error
        });
      }
    });

    console.log(`[EspoImporter] Batch ${Math.floor(i / batchSize) + 1}: ${batchResults.filter(r => r.ok).length}/${batch.length} succès`);
  }

  console.log(`[EspoImporter] Import terminé: ${results.success.length}/${results.total} succès, ${results.failed.length} échecs`);

  return results;
}

/**
 * Crée un segment (Target List) dans EspoCRM
 * @param {string} name - Nom du segment
 * @param {Array} leadIds - IDs des leads à inclure
 * @param {Object} criteria - Critères de segmentation (optionnel)
 * @returns {Promise<Object>} - Segment créé
 */
export async function createSegment(name, leadIds = [], criteria = {}) {
  try {
    console.log(`[EspoImporter] Création segment "${name}" avec ${leadIds.length} leads...`);

    // Créer Target List
    const res = await fetch(`${ESPO_BASE}/api/v1/TargetList`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ESPO_API_KEY
      },
      body: JSON.stringify({
        name,
        description: criteria.description || `Segment créé automatiquement par M.A.X.`,
        entryCount: leadIds.length
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`EspoCRM error: ${error}`);
    }

    const targetList = await res.json();
    console.log(`[EspoImporter] Target List créée: ${targetList.id}`);

    // Ajouter les leads au segment (si IDs fournis)
    if (leadIds.length > 0) {
      for (const leadId of leadIds) {
        await fetch(`${ESPO_BASE}/api/v1/TargetList/${targetList.id}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': ESPO_API_KEY
          },
          body: JSON.stringify({ id: leadId })
        });
      }
      console.log(`[EspoImporter] ${leadIds.length} leads ajoutés au segment`);
    }

    return {
      ok: true,
      segment: targetList,
      leadsAdded: leadIds.length
    };

  } catch (error) {
    console.error('[EspoImporter] Erreur création segment:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Importe les leads enrichis et crée les segments automatiquement
 * @param {Object} enrichmentData - Données enrichies complètes
 * @returns {Promise<Object>} - Résultat complet de l'import
 */
export async function importEnrichedDataset(enrichmentData) {
  const { enrichedLeads, enrichmentData: metadata, context } = enrichmentData;

  console.log(`[EspoImporter] Import dataset enrichi: ${enrichedLeads.length} leads`);

  // 1. Import des leads
  const importResult = await importLeads(enrichedLeads, { createFields: true });

  if (importResult.failed.length > 0) {
    console.warn(`[EspoImporter] ${importResult.failed.length} leads ont échoué`);
  }

  // 2. Créer segments automatiques basés sur les tags
  const segments = [];
  if (metadata.tags && metadata.tags.length > 0 && importResult.success.length > 0) {
    const leadIds = importResult.success.map(lead => lead.id);

    // Segment principal basé sur contexte
    const mainSegmentName = metadata.tags[0]; // Premier tag comme nom
    const mainSegment = await createSegment(
      mainSegmentName,
      leadIds,
      { description: `Import: ${context}` }
    );

    if (mainSegment.ok) {
      segments.push(mainSegment.segment);
    }
  }

  return {
    ok: true,
    importResult,
    segments,
    stats: {
      totalLeads: enrichedLeads.length,
      imported: importResult.success.length,
      failed: importResult.failed.length,
      segmentsCreated: segments.length
    }
  };
}
