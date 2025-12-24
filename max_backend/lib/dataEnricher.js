/**
 * dataEnricher.js
 *
 * Enrichissement intelligent des données via Claude Haiku
 * - Génération de descriptions contextuelles
 * - Suggestion de tags automatiques
 * - Attribution de statuts
 * - Enrichissement basé sur contexte utilisateur
 */

import { callHaiku } from './aiClient.js';

/**
 * Génère une description contextuelle pour un lead
 * @param {Object} lead - Données du lead
 * @param {string} context - Contexte fourni par l'utilisateur
 * @returns {Promise<string>} - Description générée
 */
export async function generateDescription(lead, context) {
  const leadInfo = Object.entries(lead)
    .filter(([key, value]) => value && String(value).trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  const prompt = `Contexte: ${context}

Lead: ${leadInfo}

Génère une description professionnelle concise (1-2 phrases) pour ce lead CRM, en intégrant le contexte fourni.
Réponds uniquement avec la description, sans préambule.`;

  try {
    const result = await callHaiku({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.5
    });

    return result.text.trim();
  } catch (error) {
    console.error('[DataEnricher] Erreur génération description:', error);
    return `Lead issu de: ${context}`;
  }
}

/**
 * Suggère des tags automatiques basés sur le contexte
 * @param {string} context - Contexte fourni par l'utilisateur
 * @param {Array} leads - Liste des leads (pour analyse globale)
 * @returns {Promise<Array>} - Liste de tags suggérés
 */
export async function suggestTags(context, leads = []) {
  const sampleLeads = leads.slice(0, 5).map(lead => {
    return Object.entries(lead)
      .filter(([key, value]) => value && String(value).trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }).join('\n');

  const prompt = `Contexte: ${context}

Exemples de leads:
${sampleLeads}

Suggère 3-5 tags pertinents pour segmenter ces leads (ex: "Salon Auto 2024", "Rénovation énergétique", "B2B", etc.).
Réponds uniquement avec une liste de tags séparés par des virgules, sans numérotation ni explication.`;

  try {
    const result = await callHaiku({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.4
    });

    // Parse tags
    const tags = result.text
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && tag.length > 2 && tag.length < 50)
      .slice(0, 5);

    return tags;
  } catch (error) {
    console.error('[DataEnricher] Erreur génération tags:', error);
    // Fallback: extraire mots-clés du contexte
    const words = context.split(/\s+/).filter(w => w.length > 3);
    return words.slice(0, 3);
  }
}

/**
 * Détermine le statut approprié basé sur le contexte
 * @param {string} context - Contexte fourni par l'utilisateur
 * @returns {Promise<string>} - Statut suggéré
 */
export async function suggestStatus(context) {
  const prompt = `Contexte de ces leads: ${context}

Basé sur ce contexte, quel statut serait le plus approprié parmi:
- Lead Chaud (récent, fort intérêt)
- Lead Tiède (intérêt modéré)
- Lead Froid (ancien, faible engagement)
- Prospect Qualifié
- Contact Inactif

Réponds avec UN SEUL statut, sans explication.`;

  try {
    const result = await callHaiku({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.3
    });

    const status = result.text.trim();

    // Validation du statut
    const validStatuses = ['Lead Chaud', 'Lead Tiède', 'Lead Froid', 'Prospect Qualifié', 'Contact Inactif'];
    const matched = validStatuses.find(s => status.toLowerCase().includes(s.toLowerCase()));

    return matched || 'Lead Tiède'; // Fallback
  } catch (error) {
    console.error('[DataEnricher] Erreur suggestion statut:', error);
    return 'Lead Tiède';
  }
}

/**
 * Détermine la source basée sur le contexte
 * @param {string} context - Contexte fourni par l'utilisateur
 * @returns {Promise<string>} - Source suggérée
 */
export async function suggestSource(context) {
  const prompt = `Contexte: ${context}

Quelle est la source de ces leads parmi:
- Événement - Salon
- Site Web
- Réseaux Sociaux
- Référence
- Campagne Marketing
- Autre

Réponds avec UNE SEULE source, sans explication.`;

  try {
    const result = await callHaiku({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.3
    });

    const source = result.text.trim();

    // Validation
    const validSources = ['Événement - Salon', 'Site Web', 'Réseaux Sociaux', 'Référence', 'Campagne Marketing', 'Autre'];
    const matched = validSources.find(s => source.toLowerCase().includes(s.toLowerCase()));

    return matched || 'Autre';
  } catch (error) {
    console.error('[DataEnricher] Erreur suggestion source:', error);
    // Détection basique par mots-clés
    const lowerContext = context.toLowerCase();
    if (lowerContext.includes('salon') || lowerContext.includes('événement') || lowerContext.includes('event')) {
      return 'Événement - Salon';
    }
    if (lowerContext.includes('site') || lowerContext.includes('web') || lowerContext.includes('formulaire')) {
      return 'Site Web';
    }
    if (lowerContext.includes('linkedin') || lowerContext.includes('facebook') || lowerContext.includes('social')) {
      return 'Réseaux Sociaux';
    }
    return 'Autre';
  }
}

/**
 * Enrichit un seul lead avec toutes les données générées
 * @param {Object} lead - Lead original
 * @param {Object} enrichmentData - Données d'enrichissement
 * @returns {Object} - Lead enrichi
 */
export function enrichLead(lead, enrichmentData) {
  const enriched = { ...lead };

  // Ajouter description si manquante
  if (!enriched.description && enrichmentData.description) {
    enriched.description = enrichmentData.description;
  }

  // Ajouter tags si manquants
  if (!enriched.tags && enrichmentData.tags) {
    enriched.tags = Array.isArray(enrichmentData.tags)
      ? enrichmentData.tags.join(', ')
      : enrichmentData.tags;
  }

  // Ajouter statut si manquant
  if (!enriched.status && enrichmentData.status) {
    enriched.status = enrichmentData.status;
  }

  // Ajouter source si manquante
  if (!enriched.source && enrichmentData.source) {
    enriched.source = enrichmentData.source;
  }

  return enriched;
}

/**
 * Enrichit tous les leads d'un dataset
 * @param {Array} leads - Liste des leads
 * @param {string} userContext - Contexte fourni par l'utilisateur
 * @param {Object} options - Options d'enrichissement
 * @returns {Promise<Object>} - { enrichedLeads, enrichmentData, stats }
 */
export async function enrichDataset(leads, userContext, options = {}) {
  console.log(`[DataEnricher] Enrichissement de ${leads.length} leads avec contexte: "${userContext.slice(0, 100)}..."`);

  const {
    generateDescriptions = true,
    generateTags = true,
    generateStatus = true,
    generateSource = true
  } = options;

  try {
    // Génération globale (1 appel IA pour tous)
    const enrichmentData = {};

    if (generateTags) {
      enrichmentData.tags = await suggestTags(userContext, leads);
      console.log(`[DataEnricher] Tags générés: ${enrichmentData.tags.join(', ')}`);
    }

    if (generateStatus) {
      enrichmentData.status = await suggestStatus(userContext);
      console.log(`[DataEnricher] Statut suggéré: ${enrichmentData.status}`);
    }

    if (generateSource) {
      enrichmentData.source = await suggestSource(userContext);
      console.log(`[DataEnricher] Source détectée: ${enrichmentData.source}`);
    }

    // Description générique (même pour tous)
    if (generateDescriptions) {
      enrichmentData.description = `Contact issu de: ${userContext}`;
    }

    // Enrichir chaque lead
    const enrichedLeads = leads.map(lead => enrichLead(lead, enrichmentData));

    // Stats
    const stats = {
      totalLeads: leads.length,
      fieldsAdded: {
        description: enrichedLeads.filter(l => l.description).length,
        tags: enrichedLeads.filter(l => l.tags).length,
        status: enrichedLeads.filter(l => l.status).length,
        source: enrichedLeads.filter(l => l.source).length
      },
      tokensUsed: 'Variable selon appels IA'
    };

    console.log(`[DataEnricher] Enrichissement terminé:`, stats);

    return {
      enrichedLeads,
      enrichmentData,
      stats
    };

  } catch (error) {
    console.error('[DataEnricher] Erreur enrichissement:', error);
    throw new Error(`Erreur enrichissement: ${error.message}`);
  }
}

/**
 * Pose des questions intelligentes pour enrichir les données
 * @param {Object} analysis - Analyse du fichier
 * @param {string} userContext - Contexte déjà fourni (optionnel)
 * @returns {Promise<Object>} - Questions à poser
 */
export async function askForContext(analysis, userContext = '') {
  const { missingFields, summary, columns } = analysis;

  // Si contexte déjà fourni, générer questions de précision
  if (userContext) {
    const prompt = `J'ai analysé un fichier CSV avec ${summary.rowCount} lignes.

Contexte fourni: "${userContext}"

Colonnes détectées: ${columns.map(c => c.name).join(', ')}
Champs manquants: ${missingFields.map(f => f.label).join(', ')}

Génère 2-3 questions courtes et précises pour enrichir au mieux ces données CRM.
Format: une question par ligne, sans numérotation.`;

    try {
      const result = await callHaiku({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.6
      });

      const questions = result.text
        .split('\n')
        .map(q => q.trim().replace(/^[-•*]\s*/, ''))
        .filter(q => q && q.endsWith('?'))
        .slice(0, 3);

      return {
        questions,
        type: 'precision',
        context: userContext
      };

    } catch (error) {
      console.error('[DataEnricher] Erreur génération questions:', error);
    }
  }

  // Sinon, questions de base
  const baseQuestions = [
    'D\'où proviennent ces contacts? (salon, site web, campagne...)',
    'Quel est le secteur d\'activité ou contexte de ces leads?',
    'Quel est leur niveau d\'engagement estimé? (chaud, tiède, froid)'
  ];

  return {
    questions: baseQuestions,
    type: 'initial',
    context: null
  };
}
