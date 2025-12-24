/**
 * AI Client - Wrapper Anthropic Claude Haiku
 *
 * Gère les appels IA avec tracking de tokens et respect du budget
 * OpenAI en commentaire pour switch futur
 */

import Anthropic from '@anthropic-ai/sdk';
import { addUsage, canProceed } from './tokenMeter.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';

/**
 * Appeler Claude Haiku avec tracking de tokens
 *
 * @param {Object} params
 * @param {string} params.system - Instruction système optionnelle
 * @param {Array} params.messages - Messages [{role, content}]
 * @param {number} params.max_tokens - Tokens max de réponse (défaut: 1024)
 * @param {number} params.temperature - Température 0-1 (défaut: 0.7)
 * @returns {Promise<{text: string, usage: {input_tokens, output_tokens, total_tokens}}>}
 */
export async function callHaiku({
  system,
  messages,
  max_tokens = Number(process.env.MAX_RESPONSE_TOKENS) || 900,
  temperature = 0.7
}) {
  // Vérification budget (estimation préliminaire, conservatrice)
  const estimatedTokens = 0; // On pourrait estimer via longueur du prompt
  if (!canProceed(estimatedTokens)) {
    const error = new Error('Budget tokens dépassé');
    error.status = 429;
    error.code = 'BUDGET_EXCEEDED';
    throw error;
  }

  try {
    const params = {
      model: MODEL,
      max_tokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role, // Anthropic n'accepte que user/assistant dans messages
        content: m.content
      }))
    };

    if (system) {
      params.system = system;
    }

    const result = await anthropic.messages.create(params);

    // Extraire le texte
    const text = result.content?.[0]?.type === 'text' ? result.content[0].text : '';

    // Récupérer l'usage
    const usage = result.usage || { input_tokens: 0, output_tokens: 0 };
    const input = usage.input_tokens || 0;
    const output = usage.output_tokens || 0;
    const total = input + output;

    // Vérifier qu'on n'a pas dépassé le budget après coup
    if (!canProceed(total)) {
      const error = new Error('Budget tokens dépassé');
      error.status = 429;
      error.code = 'BUDGET_EXCEEDED';
      throw error;
    }

    // Enregistrer l'usage
    addUsage(input, output);

    return {
      text,
      usage: {
        input_tokens: input,
        output_tokens: output,
        total_tokens: total
      }
    };
  } catch (error) {
    // Si c'est notre erreur de budget, on la relance
    if (error.code === 'BUDGET_EXCEEDED') {
      throw error;
    }

    // Sinon c'est une erreur Anthropic
    console.error('[AIClient] Erreur Anthropic:', error);
    const err = new Error(error.message || 'Erreur appel IA');
    err.status = error.status || 500;
    throw err;
  }
}

/* ——————————————————————————————————————————————————————————————
 * OpenAI (ACTIVÉ pour test vs Claude Haiku)
 * ——————————————————————————————————————————————————————————————
 */

import OpenAI from 'openai';

let openai = null; // Lazy initialization

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

/**
 * Sélectionne intelligemment le modèle selon la complexité de la tâche
 * - GPT-4o-mini : Tâches simples (conversations, formatage, résumés)
 * - GPT-4o : Tâches complexes avec function calling (CRM, enrichissement, updates)
 */
function selectModelByComplexity(tools) {
  // Si pas de tools = tâche simple (conversation, formatage)
  if (!tools || tools.length === 0) {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  // Liste des tools complexes qui nécessitent GPT-4o pour éviter hallucinations
  const COMPLEX_TOOLS = [
    'create_espo_lead',
    'update_leads_in_espo',
    'update_lead_fields',
    'auto_enrich_missing_leads',
    'analyze_and_enrich_leads',
    'import_leads_to_crm',
    'create_custom_field',
    'configure_entity_layout',
    'create_tags',
    'batch_update_leads'
  ];

  // Vérifier si un tool complexe est présent
  const hasComplexTool = tools.some(tool =>
    COMPLEX_TOOLS.includes(tool.function?.name || tool.name)
  );

  // FORCE GPT-4o-mini pour TOUTES les tâches (économie)
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (hasComplexTool) {
    console.log('[AIClient] 🎯 Tâche complexe détectée → ' + model + ' (mode économique forcé)');
  } else {
    console.log('[AIClient] 💡 Tâche simple détectée → ' + model + ' (économique)');
  }
  return model;
}

export async function callOpenAI({
  system,
  messages,
  max_tokens = 1024,
  temperature = 0.7,
  tools = null,
  forceModel = null // Permet de forcer un modèle spécifique si besoin
}) {
  const estimatedTokens = 0;
  if (!canProceed(estimatedTokens)) {
    const error = new Error('Budget tokens dépassé');
    error.status = 429;
    error.code = 'BUDGET_EXCEEDED';
    throw error;
  }

  try {
    const messagesWithSystem = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ];

    // Sélection intelligente du modèle
    const selectedModel = forceModel || selectModelByComplexity(tools);

    const params = {
      model: selectedModel,
      messages: messagesWithSystem,
      max_tokens,
      temperature
    };

    // Ajouter tools si fournis
    if (tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = 'auto';
    }

    const response = await getOpenAIClient().chat.completions.create(params);

    const choice = response.choices[0];
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
    const input = usage.prompt_tokens;
    const output = usage.completion_tokens;
    const total = input + output;

    if (!canProceed(total)) {
      const error = new Error('Budget tokens dépassé');
      error.status = 429;
      error.code = 'BUDGET_EXCEEDED';
      throw error;
    }

    addUsage(input, output);

    const result = {
      text: choice.message?.content || '',
      usage: {
        input_tokens: input,
        output_tokens: output,
        total_tokens: total
      }
    };

    // Ajouter tool_calls si présents
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls;
      result.finish_reason = choice.finish_reason;
    }

    return result;
  } catch (error) {
    if (error.code === 'BUDGET_EXCEEDED') {
      throw error;
    }

    console.error('[AIClient] Erreur OpenAI:', error);
    const err = new Error(error.message || 'Erreur appel IA');
    err.status = error.status || 500;
    throw err;
  }
}

/**
 * Fonction universelle qui choisit le bon provider selon .env
 *
 * @param {Object} params - Paramètres de la requête IA
 * @returns {Promise<{text: string, usage: object, tool_calls?: array}>}
 */
export async function callAI(params) {
  const provider = process.env.AI_PROVIDER || 'anthropic';

  if (provider === 'anthropic') {
    // Utiliser callAnthropic avec le modèle configuré dans AI_MODEL
    return callAnthropic(params);
  } else if (provider === 'openai') {
    return callOpenAI(params);
  } else {
    throw new Error(`Unknown AI_PROVIDER: ${provider}. Must be 'anthropic' or 'openai'`);
  }
}

/**
 * Appeler n'importe quel modèle Anthropic avec le modèle depuis AI_MODEL
 * (Remplace callHaiku pour supporter Sonnet, Opus, etc.)
 *
 * IMPORTANT: Anthropic ne supporte PAS encore les tools (function calling) dans la même API qu'OpenAI.
 * Pour utiliser les tools avec Claude, il faut utiliser l'API beta "tools" qui est différente.
 * Pour l'instant, cette fonction ne supporte que les appels simples sans tools.
 */
export async function callAnthropic({
  system,
  messages,
  max_tokens = Number(process.env.MAX_RESPONSE_TOKENS) || 900,
  temperature = 0.7,
  tools = null
}) {
  const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';

  const estimatedTokens = 0;
  if (!canProceed(estimatedTokens)) {
    const error = new Error('Budget tokens dépassé');
    error.status = 429;
    error.code = 'BUDGET_EXCEEDED';
    throw error;
  }

  try {
    const params = {
      model,
      max_tokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    };

    if (system) {
      params.system = system;
    }

    // ⚠️ Support basique des tools pour Anthropic (API beta)
    // Anthropic utilise "tools" mais avec un format légèrement différent
    if (tools && tools.length > 0) {
      params.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
    }

    const result = await anthropic.messages.create(params);

    // Extraire le texte de la réponse
    const text = result.content?.[0]?.type === 'text' ? result.content[0].text : '';

    // Extraire les tool_calls si présents (format Anthropic)
    const tool_calls = result.content
      ?.filter(c => c.type === 'tool_use')
      .map(c => ({
        id: c.id,
        type: 'function',
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input)
        }
      }));

    const usage = result.usage || { input_tokens: 0, output_tokens: 0 };
    const input = usage.input_tokens || 0;
    const output = usage.output_tokens || 0;
    const total = input + output;

    if (!canProceed(total)) {
      const error = new Error('Budget tokens dépassé');
      error.status = 429;
      error.code = 'BUDGET_EXCEEDED';
      throw error;
    }

    addUsage(input, output);

    const response = {
      text,
      usage: {
        input_tokens: input,
        output_tokens: output,
        total_tokens: total
      }
    };

    // Ajouter les tool_calls si présents
    if (tool_calls && tool_calls.length > 0) {
      response.tool_calls = tool_calls;
      response.finish_reason = result.stop_reason;
    }

    return response;
  } catch (error) {
    if (error.code === 'BUDGET_EXCEEDED') {
      throw error;
    }

    console.error('[AIClient] Erreur Anthropic:', error);
    const err = new Error(error.message || 'Erreur appel IA');
    err.status = error.status || 500;
    throw err;
  }
}

export default {
  callHaiku,
  callOpenAI,
  callAnthropic,
  callAI
};
