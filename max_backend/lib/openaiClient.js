/**
 * lib/openaiClient.js
 * Client OpenAI centralisé pour M.A.X. MVP1
 *
 * Fonctionnalités:
 * - Appels OpenAI GPT-4o-mini (modèle simple)
 * - Appels OpenAI GPT-4o (modèle complexe)
 * - Support streaming (SSE)
 * - Support messages avec historique
 * - Gestion erreurs et retry
 */

import OpenAI from 'openai';
import 'dotenv/config';
import { getTenantMemory } from './maxLogger.js';
import { getLocalMemory } from './memoryFallback.js';

// Configuration depuis .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_SIMPLE = process.env.AI_MODEL_SIMPLE || 'gpt-4o-mini';
const MODEL_COMPLEX = process.env.AI_MODEL_COMPLEX || 'gpt-4o';
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.MAX_REQUEST_TIMEOUT_MS || '45000', 10);

if (!OPENAI_API_KEY) {
  console.error('[OPENAI_CLIENT] ❌ OPENAI_API_KEY manquante dans .env');
  throw new Error('OPENAI_API_KEY is required');
}

// Instance OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: REQUEST_TIMEOUT_MS,
  maxRetries: MAX_RETRY_ATTEMPTS
});

/**
 * Prompts système pour les 3 modes M.A.X.
 */
const SYSTEM_PROMPTS = {
  auto: `Tu es M.A.X., un assistant IA pour la gestion de leads CRM (MaCréa).

**Mode AUTO** : Tu PROPOSES des actions concrètes (créer lead, envoyer WhatsApp, mettre à jour statut, etc.), mais tu N'EXÉCUTES JAMAIS directement. Tu attends TOUJOURS la confirmation de l'utilisateur avant toute action.

Fonctionnalités disponibles :
- Analyse de fichiers CSV/PDF/DOCX uploadés
- Proposition d'actions sur les leads (création, mise à jour, enrichissement)
- Suggestion d'envoi de messages WhatsApp
- Résumé et analyse de données

Tu DOIS :
- Être concis et professionnel
- Proposer des actions claires avec leurs conséquences
- Demander confirmation avant toute action critique
- Formater les réponses en markdown

Tu NE DOIS PAS :
- Exécuter d'actions sans confirmation
- Inventer des données
- Faire des suppositions non basées sur les données fournies`,

  assist: `Tu es M.A.X., un assistant IA pour la gestion de leads CRM (MaCréa).

**Mode ASSISTÉ** : Tu PROPOSES uniquement des recommandations. Tu n'exécutes RIEN et tu ne suggères même pas d'exécuter. Tu donnes des conseils sur ce qui POURRAIT être fait.

Fonctionnalités disponibles :
- Analyse de fichiers CSV/PDF/DOCX uploadés
- Recommandations sur la gestion des leads
- Conseils sur les meilleures pratiques CRM
- Aide à la décision

Tu DOIS :
- Être très concis et professionnel
- Donner des recommandations claires
- Expliquer le "pourquoi" de tes suggestions
- Formater les réponses en markdown

Tu NE DOIS PAS :
- Proposer d'exécuter des actions
- Utiliser des formulations impératives
- Inventer des données`,

  conseil: `Tu es M.A.X., un conseiller IA expert en gestion de leads et CRM.

**Mode CONSEIL** : Tu donnes UNIQUEMENT des conseils, analyses et explications. Aucune action, aucune recommandation d'action. Pure analyse et conseil.

Fonctionnalités disponibles :
- Analyse de fichiers uploadés
- Réponses aux questions sur les leads
- Explications sur les meilleures pratiques
- Aide à la compréhension des données

Tu DOIS :
- Être très concis et pédagogique
- Expliquer clairement les concepts
- Donner des exemples si pertinent
- Formater les réponses en markdown

Tu NE DOIS PAS :
- Proposer d'actions ou de recommandations d'actions
- Utiliser un ton directif
- Inventer des données`
};

/**
 * Récupérer les informations tenant depuis Supabase pour enrichir le contexte
 * Utilise un fallback local si Supabase n'est pas disponible
 */
async function getTenantContext(tenantId) {
  if (!tenantId) return null;

  const context = {};

  try {
    // Essayer d'abord Supabase
    const [nom, projet, businessModel, secteur] = await Promise.all([
      getTenantMemory(tenantId, 'user_name', 'global'),
      getTenantMemory(tenantId, 'project_name', 'global'),
      getTenantMemory(tenantId, 'business_model', 'global'),
      getTenantMemory(tenantId, 'secteur', 'global')
    ]);

    if (nom?.ok && nom.data) {
      context.userName = nom.data.memory_value;
    }

    if (projet?.ok && projet.data) {
      context.projectName = projet.data.memory_value;
    }

    if (businessModel?.ok && businessModel.data) {
      context.businessModel = businessModel.data.memory_value;
    }

    if (secteur?.ok && secteur.data) {
      context.secteur = secteur.data.memory_value;
    }

    // Si on a récupéré des données, les retourner
    if (Object.keys(context).length > 0) {
      console.log('[OPENAI_CLIENT] 🧠 Contexte récupéré depuis Supabase');
      return context;
    }
  } catch (error) {
    console.warn('[OPENAI_CLIENT] ⚠️ Supabase indisponible, utilisation mémoire locale');
  }

  // Fallback: utiliser la mémoire locale
  try {
    const userName = getLocalMemory(tenantId, 'user_name');
    const projectName = getLocalMemory(tenantId, 'project_name');
    const businessModel = getLocalMemory(tenantId, 'business_model');
    const secteur = getLocalMemory(tenantId, 'secteur');

    if (userName) context.userName = userName;
    if (projectName) context.projectName = projectName;
    if (businessModel) context.businessModel = businessModel;
    if (secteur) context.secteur = secteur;

    if (Object.keys(context).length > 0) {
      console.log('[OPENAI_CLIENT] 💾 Contexte récupéré depuis mémoire locale (fallback)');
      return context;
    }
  } catch (error) {
    console.error('[OPENAI_CLIENT] ❌ Erreur récupération mémoire locale:', error);
  }

  return null;
}

/**
 * Enrichir le prompt système avec les informations du tenant
 */
function enrichSystemPromptWithContext(basePrompt, context) {
  if (!context) return basePrompt;

  let enrichedPrompt = basePrompt;

  // Ajouter les informations personnelles en haut du prompt
  const contextLines = [];

  if (context.userName) {
    contextLines.push(`**NOM DE L'UTILISATEUR**: ${context.userName}`);
  }

  if (context.projectName) {
    contextLines.push(`**PROJET**: ${context.projectName}`);
  }

  if (context.businessModel) {
    contextLines.push(`**MODÈLE D'AFFAIRES**: ${context.businessModel}`);
  }

  if (context.secteur) {
    contextLines.push(`**SECTEUR**: ${context.secteur}`);
  }

  if (contextLines.length > 0) {
    const contextBlock = `
=== CONTEXTE UTILISATEUR (MÉMOIRE LONG TERME) ===
${contextLines.join('\n')}
================================================

`;
    enrichedPrompt = contextBlock + basePrompt;
  }

  return enrichedPrompt;
}

/**
 * Appel OpenAI simple (non-streaming)
 *
 * @param {Object} params
 * @param {Array} params.messages - Tableau de messages [{role: 'user'|'assistant'|'system', content: string}]
 * @param {string} params.mode - Mode M.A.X. : 'auto', 'assist', 'conseil'
 * @param {string} params.tenantId - ID du tenant (pour récupérer contexte Supabase)
 * @param {boolean} params.useComplexModel - Utiliser GPT-4o au lieu de GPT-4o-mini
 * @param {number} params.maxTokens - Nombre max de tokens en réponse (défaut: 2000)
 * @param {number} params.temperature - Température (0-2, défaut: 0.7)
 * @returns {Promise<{content: string, usage: object}>}
 */
export async function callOpenAI({
  messages,
  mode = 'assist',
  tenantId = null,
  useComplexModel = false,
  maxTokens = 2000,
  temperature = 0.7
}) {
  try {
    const model = useComplexModel ? MODEL_COMPLEX : MODEL_SIMPLE;
    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.assist;

    // Enrichir le prompt système avec les informations du tenant depuis Supabase
    if (tenantId) {
      const tenantContext = await getTenantContext(tenantId);
      if (tenantContext) {
        systemPrompt = enrichSystemPromptWithContext(systemPrompt, tenantContext);
        console.log('[OPENAI_CLIENT] 🧠 Contexte tenant ajouté:', {
          tenantId,
          hasUserName: !!tenantContext.userName,
          hasProjectName: !!tenantContext.projectName,
          hasBusinessModel: !!tenantContext.businessModel
        });
      }
    }

    console.log('[OPENAI_CLIENT] 🤖 Appel OpenAI:', {
      model,
      mode,
      messagesCount: messages.length,
      maxTokens,
      temperature,
      tenantId: tenantId || 'none'
    });

    // Construire les messages avec le system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const content = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('[OPENAI_CLIENT] ✅ Réponse reçue:', {
      contentLength: content.length,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    });

    return {
      content,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      }
    };
  } catch (error) {
    console.error('[OPENAI_CLIENT] ❌ Erreur:', error.message);

    if (error.status === 429) {
      throw new Error('Limite de taux OpenAI atteinte. Veuillez réessayer dans quelques instants.');
    } else if (error.status === 401) {
      throw new Error('Clé API OpenAI invalide.');
    } else if (error.status === 500) {
      throw new Error('Erreur serveur OpenAI. Veuillez réessayer.');
    } else {
      throw new Error(`Erreur OpenAI: ${error.message}`);
    }
  }
}

/**
 * Appel OpenAI avec streaming (SSE)
 *
 * @param {Object} params
 * @param {Array} params.messages - Tableau de messages
 * @param {string} params.mode - Mode M.A.X. : 'auto', 'assist', 'conseil'
 * @param {boolean} params.useComplexModel - Utiliser GPT-4o au lieu de GPT-4o-mini
 * @param {number} params.maxTokens - Nombre max de tokens en réponse
 * @param {number} params.temperature - Température (0-2)
 * @returns {Promise<AsyncIterable>} - Stream de chunks
 */
export async function callOpenAIStream({
  messages,
  mode = 'assist',
  tenantId = null,
  useComplexModel = false,
  maxTokens = 2000,
  temperature = 0.7
}) {
  try {
    const model = useComplexModel ? MODEL_COMPLEX : MODEL_SIMPLE;
    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.assist;

    // Enrichir le prompt système avec les informations du tenant depuis Supabase
    if (tenantId) {
      const tenantContext = await getTenantContext(tenantId);
      if (tenantContext) {
        systemPrompt = enrichSystemPromptWithContext(systemPrompt, tenantContext);
        console.log('[OPENAI_CLIENT] 🧠 Contexte tenant ajouté (streaming):', {
          tenantId,
          hasUserName: !!tenantContext.userName,
          hasProjectName: !!tenantContext.projectName
        });
      }
    }

    console.log('[OPENAI_CLIENT] 🌊 Appel OpenAI STREAMING:', {
      model,
      mode,
      messagesCount: messages.length,
      tenantId: tenantId || 'none'
    });

    // Construire les messages avec le system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const stream = await openai.chat.completions.create({
      model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return stream;
  } catch (error) {
    console.error('[OPENAI_CLIENT] ❌ Erreur streaming:', error.message);

    if (error.status === 429) {
      throw new Error('Limite de taux OpenAI atteinte.');
    } else if (error.status === 401) {
      throw new Error('Clé API OpenAI invalide.');
    } else {
      throw new Error(`Erreur OpenAI streaming: ${error.message}`);
    }
  }
}

/**
 * Obtenir le nom du modèle utilisé
 */
export function getModelName(useComplexModel = false) {
  return useComplexModel ? MODEL_COMPLEX : MODEL_SIMPLE;
}

/**
 * Vérifier la configuration OpenAI
 */
export function checkConfiguration() {
  return {
    configured: !!OPENAI_API_KEY,
    modelSimple: MODEL_SIMPLE,
    modelComplex: MODEL_COMPLEX,
    maxRetries: MAX_RETRY_ATTEMPTS,
    timeout: REQUEST_TIMEOUT_MS
  };
}

console.log('[OPENAI_CLIENT] ✅ Client OpenAI initialisé:', {
  modelSimple: MODEL_SIMPLE,
  modelComplex: MODEL_COMPLEX,
  timeout: `${REQUEST_TIMEOUT_MS}ms`,
  maxRetries: MAX_RETRY_ATTEMPTS
});

export default {
  callOpenAI,
  callOpenAIStream,
  getModelName,
  checkConfiguration
};
