/**
 * emailAnalyzer.js
 * Module d'enrichissement intelligent des leads basé sur l'analyse des emails
 *
 * Permet à M.A.X. de déduire automatiquement :
 * - Le secteur d'activité
 * - Les services potentiellement intéressants
 * - Les tags appropriés
 *
 * À partir de l'adresse email du lead
 */

import { callAI } from './aiClient.js';

/**
 * Extrait le domaine d'un email
 * @param {string} email - Adresse email
 * @returns {string} Domaine (ex: "cosmetics.com")
 */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Analyse un domaine pour détecter des mots-clés évidents
 * @param {string} domain - Domaine à analyser
 * @returns {Object} Indices détectés
 */
function detectKeywords(domain) {
  const keywords = {
    // Commerce & Retail
    cosmetic: ['cosmetic', 'beauty', 'makeup', 'parfum', 'beaute', 'glow', 'skin', 'hair', 'afro', 'argan', 'care', 'spa'],
    fashion: ['fashion', 'mode', 'vetement', 'textile', 'clothing', 'boutique'],
    food: ['food', 'restaurant', 'cafe', 'bistro', 'cuisine', 'traiteur', 'miel', 'bio', 'organic'],

    // Services
    consulting: ['consulting', 'conseil', 'advisory', 'strategy'],
    marketing: ['marketing', 'pub', 'communication', 'digital', 'agence', 'media'],
    tech: ['tech', 'software', 'dev', 'digital', 'web', 'app', 'saas', 'cloud'],

    // Événementiel & Divertissement
    events: ['event', 'dj', 'mix', 'music', 'sound', 'party', 'wedding', 'concert'],

    // Coaching & Formation
    coaching: ['coach', 'training', 'formation', 'mentor', 'consulting'],

    // Santé & Bien-être
    health: ['health', 'medical', 'clinic', 'sante', 'wellness', 'fitness', 'yoga', 'therapy'],

    // Logistique & Transport
    logistics: ['logistic', 'transport', 'fret', 'delivery', 'express', 'cargo', 'shipping'],

    // Immobilier & Construction
    realestate: ['immobilier', 'realestate', 'property', 'construction'],

    // Finance
    finance: ['finance', 'bank', 'invest', 'assurance', 'insurance'],

    // Éducation
    education: ['education', 'school', 'formation', 'university', 'learn']
  };

  const detected = {};

  for (const [sector, terms] of Object.entries(keywords)) {
    for (const term of terms) {
      if (domain.includes(term)) {
        detected[sector] = true;
        break;
      }
    }
  }

  return detected;
}

/**
 * Analyse un email avec l'IA pour déduire secteur et intérêts
 * @param {string} email - Adresse email à analyser
 * @param {Object} leadData - Données du lead (nom, description, etc.)
 * @returns {Promise<Object>} Analyse complète
 */
export async function analyzeEmailForEnrichment(email, leadData = {}) {
  if (!email) {
    return {
      success: false,
      error: 'Email manquant'
    };
  }

  const domain = extractDomain(email);

  if (!domain) {
    return {
      success: false,
      error: 'Email invalide'
    };
  }

  // Détection rapide par mots-clés
  const keywordHints = detectKeywords(domain);

  // Construction du prompt pour l'IA enrichi avec TOUTES les informations
  const analysisPrompt = `Tu es un expert en analyse d'entreprises et stratégie CRM. Analyse TOUTES ces informations pour enrichir ce lead au maximum.

📧 INFORMATIONS DISPONIBLES:
- Email: ${email}
- Domaine: ${domain}
${leadData.accountName ? `- Nom entreprise: ${leadData.accountName}` : ''}
${leadData.description ? `- Description/Remarque: ${leadData.description}` : ''}
${leadData.phoneNumber ? `- Téléphone: ${leadData.phoneNumber}` : ''}
${leadData.addressCity ? `- Localisation: ${leadData.addressCity}` : ''}
${leadData.website ? `- Site web: ${leadData.website}` : ''}

🎯 INSTRUCTIONS D'ANALYSE INTELLIGENTE:
1. ⭐ Utilise PRIORITAIREMENT la description/remarque (contient les vraies infos métier)
2. Analyse le nom d'entreprise pour comprendre l'activité
3. Examine le domaine email pour des indices complémentaires
4. Considère la localisation pour le contexte (ex: Genève = possiblement finance/luxe)
5. Déduis le niveau de maturité numérique (site Wordpress vs Shopify vs custom)

💡 STRATÉGIE D'AUTOMATISATION:
En plus du secteur, identifie:
- Le niveau de maturité digitale (basique/intermédiaire/avancé)
- Les besoins probables (site web, CRM, marketing, e-commerce...)
- Le moment optimal pour contacter (urgence ou prospection froide)
- Le type de contenu à proposer (cas clients, guides, démo...)

Exemples de déductions:
- "qmix-paris" → Probablement DJ/Événementiel (mix = musique)
- "coach-vero" → Coaching (business, vie, sport)
- "boutiquemiel" → E-commerce alimentaire (miel, produits naturels)
- "terraya-paris" → Cosmétique/Bien-être (suffixe typique beauté + Paris)
- "glowco" → Cosmétique (glow = éclat de peau)
- "afrohairshop" → Cosmétique capillaire (hair = cheveux)

Fournis une réponse JSON stricte avec cette structure exacte:
{
  "secteur": "Nom du secteur (ex: Food, Tech, Cosmetic, Events, Consulting, Interior Design...)",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "services_interesses": ["Service 1", "Service 2", "Service 3"],
  "description_courte": "Description en 1-2 phrases du profil du lead",
  "confiance": "haute|moyenne|basse",
  "maturite_digitale": "basique|intermediaire|avance",
  "besoins_detectes": ["Besoin 1", "Besoin 2"],
  "urgence": "immediate|moyen_terme|prospection",
  "strategie_contact": "Suggestion concrète sur comment/quand aborder ce lead"
}

Règles:
- Secteur: Sois précis (Food/Bakery, Tech/Drones, Interior Design...) pas juste "Commerce"
- Tags: EXACTEMENT 2-3 tags pertinents MAXIMUM
- Services: Ce qui pourrait intéresser ce type de client
- Maturité digitale: Déduis du type de site (Shopify=intermédiaire, "site simple"=basique, "application"=avancé)
- Besoins: Identifie les manques/opportunités (ex: "Besoin CRM", "Newsletter inexistante")
- Urgence: Évalue si le lead semble actif et prêt
- Stratégie: Conseil concret pour l'équipe commerciale
- Confiance: haute si infos claires, basse si vraiment ambigu
- TOUJOURS faire une déduction complète, même avec confiance "basse"
- UNIQUEMENT du JSON valide, pas de texte avant/après`;

  try {
    const response = await callAI({
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 600, // Augmenté pour inclure les insights stratégiques
      temperature: 0.4
    });

    // Parser la réponse JSON
    let analysis;
    try {
      // Nettoyer la réponse (parfois l'IA ajoute des backticks)
      const responseText = response.text || response.content || '';
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[EmailAnalyzer] Erreur parsing JSON:', parseError);
      console.error('[EmailAnalyzer] Réponse brute:', responseText || response);

      // Fallback: retourner une analyse basique
      return {
        success: true,
        secteur: Object.keys(keywordHints)[0] || 'Non déterminé',
        tags: Object.keys(keywordHints).slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
        services_interesses: ['Branding', 'Marketing Digital'],
        description_courte: `Lead du domaine ${domain}`,
        confiance: 'basse',
        email,
        domain,
        source: 'fallback'
      };
    }

    return {
      success: true,
      ...analysis,
      email,
      domain,
      source: 'ai'
    };

  } catch (error) {
    console.error('[EmailAnalyzer] Erreur analyse IA:', error);

    // Fallback sur détection keywords
    if (Object.keys(keywordHints).length > 0) {
      return {
        success: true,
        secteur: Object.keys(keywordHints)[0].charAt(0).toUpperCase() + Object.keys(keywordHints)[0].slice(1),
        tags: Object.keys(keywordHints).slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
        services_interesses: ['Branding', 'Marketing Digital'],
        description_courte: `Lead du secteur ${Object.keys(keywordHints)[0]}`,
        confiance: 'moyenne',
        email,
        domain,
        source: 'keywords'
      };
    }

    return {
      success: false,
      error: error.message,
      email,
      domain
    };
  }
}

/**
 * Analyse plusieurs leads en batch
 * @param {Array} leads - Liste de leads avec au minimum {id, email}
 * @returns {Promise<Object>} Résultats d'enrichissement
 */
export async function batchAnalyzeLeads(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      success: false,
      error: 'Aucun lead à analyser'
    };
  }

  const results = {
    analyzed: 0,
    enriched: 0,
    skipped: 0,
    details: []
  };

  for (const lead of leads) {
    // Construire le nom du lead de manière sûre
    const leadName = lead.name ||
                     `${lead.firstName || ''} ${lead.lastName || ''}`.trim() ||
                     lead.accountName ||
                     'Sans nom';

    if (!lead.emailAddress && !lead.email) {
      results.skipped++;
      results.details.push({
        leadId: lead.id,
        name: leadName,
        status: 'skipped',
        reason: 'Pas d\'email'
      });
      continue;
    }

    const email = lead.emailAddress || lead.email;

    try {
      const analysis = await analyzeEmailForEnrichment(email, {
        accountName: lead.accountName || leadName,
        description: lead.description,
        phoneNumber: lead.phoneNumber,
        addressCity: lead.addressCity,
        website: lead.website
      });

      if (analysis.success) {
        results.analyzed++;

        // Préparer les données d'enrichissement
        const enrichmentData = {
          leadId: lead.id,
          name: leadName,
          email,
          secteur: analysis.secteur,
          tags: analysis.tags || [],
          services: analysis.services_interesses || [],
          description: analysis.description_courte,
          confiance: analysis.confiance,
          source: analysis.source,
          // Ajouter les insights stratégiques
          maturite_digitale: analysis.maturite_digitale,
          urgence: analysis.urgence,
          besoins_detectes: analysis.besoins_detectes,
          strategie_contact: analysis.strategie_contact
        };

        results.enriched++;
        results.details.push({
          ...enrichmentData,
          status: 'enriched'
        });

        console.log(`[EmailAnalyzer] ✓ Lead ${lead.id} (${leadName}) enrichi: ${analysis.secteur}`);
      } else {
        results.skipped++;
        results.details.push({
          leadId: lead.id,
          name: leadName,
          email,
          status: 'skipped',
          reason: analysis.error || 'Analyse échouée'
        });

        console.log(`[EmailAnalyzer] ⊘ Lead ${lead.id} (${leadName}) ignoré: ${analysis.error}`);
      }
    } catch (error) {
      console.error(`[EmailAnalyzer] ✗ Erreur lead ${lead.id} (${leadName}):`, error.message);
      results.skipped++;
      results.details.push({
        leadId: lead.id,
        name: leadName,
        email,
        status: 'error',
        reason: error.message
      });
    }
  }

  console.log(`[EmailAnalyzer] Batch terminé: ${results.enriched} enrichis, ${results.skipped} ignorés`);


  return {
    success: true,
    ...results
  };
}

/**
 * Formate les résultats d'analyse pour mise à jour EspoCRM
 * @param {Array} analysisDetails - Résultats de batchAnalyzeLeads
 * @returns {Array} Leads formatés pour update
 */
export function formatEnrichedLeadsForUpdate(analysisDetails) {
  if (!Array.isArray(analysisDetails)) {
    console.error('[EmailAnalyzer] formatEnrichedLeadsForUpdate: analysisDetails n\'est pas un tableau');
    return [];
  }

  return analysisDetails
    .filter(detail => detail && detail.status === 'enriched')
    .map(detail => {
      const lead = {
        id: detail.leadId
      };

      // Ajouter secteur si détecté
      if (detail.secteur && detail.secteur !== 'Non déterminé') {
        lead.secteur = detail.secteur;
      }

      // Ajouter description seulement si non-vide
      if (detail.description && detail.description.trim()) {
        lead.description = detail.description;
      }

      // Ajouter tags seulement si tableau non-vide
      // Utilise le champ "maxTags" qui existe déjà dans EspoCRM et est visible dans le dashboard
      if (Array.isArray(detail.tags) && detail.tags.length > 0) {
        lead.maxTags = detail.tags.slice(0, 3); // Limite à 3 tags
      }

      // 🚀 ENRICHISSEMENT STRATÉGIQUE AVANCÉ
      // Ces champs permettent l'automatisation et la qualification intelligente
      // Note: Si les champs n'existent pas encore dans EspoCRM, ils seront ignorés silencieusement

      // Stocker la stratégie de contact dans la description si pas déjà présente
      if (detail.strategie_contact && !lead.description) {
        lead.description = `💡 Stratégie: ${detail.strategie_contact}`;
      }

      // Ajouter les insights stratégiques en tant que "remarques internes"
      // On peut les mettre dans un champ custom ou dans la description enrichie
      if (detail.maturite_digitale || detail.urgence || detail.besoins_detectes) {
        const insights = [];
        if (detail.maturite_digitale) insights.push(`Maturité: ${detail.maturite_digitale}`);
        if (detail.urgence) insights.push(`Urgence: ${detail.urgence}`);
        if (detail.besoins_detectes && detail.besoins_detectes.length > 0) {
          insights.push(`Besoins: ${detail.besoins_detectes.join(', ')}`);
        }

        // Ajouter ces insights à la description existante
        if (insights.length > 0 && lead.description) {
          lead.description += `\n\n📊 Insights M.A.X.: ${insights.join(' | ')}`;
        } else if (insights.length > 0) {
          lead.description = `📊 Insights M.A.X.: ${insights.join(' | ')}`;
        }
      }

      return lead;
    })
    .filter(lead => Object.keys(lead).length > 1); // Garder seulement si plus que juste l'ID
}
