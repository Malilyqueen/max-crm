/**
 * M.A.X. Créa Service
 *
 * Service de génération de contenu marketing avec Claude AI
 * Utilise aiClient pour le tracking de tokens et budget
 */

import { callHaiku } from './aiClient.js';

/**
 * Générer des suggestions de messages marketing
 *
 * @param {Object} params
 * @param {string} params.campaignName - Nom de la campagne
 * @param {string} params.objective - Objectif de la campagne
 * @param {string} params.target - Description de la cible
 * @param {string} params.tone - Ton souhaité (professionnel, amical, urgent, etc.)
 * @param {string} params.channel - Canal (email, sms)
 * @returns {Promise<Object>} Suggestions générées
 */
export async function generateCampaignContent(params) {
  const { campaignName, objective, target, tone = 'professionnel', channel = 'email' } = params;

  const prompt = buildPrompt(campaignName, objective, target, tone, channel);

  try {
    const result = await callHaiku({
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 2000,
      temperature: 0.7
    });

    const parsed = parseGeneratedContent(result.text, channel);

    return {
      ok: true,
      suggestions: parsed,
      raw: result.text,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('[MaxCreaService] Erreur génération:', error);
    return {
      ok: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Construire le prompt pour Claude
 */
function buildPrompt(campaignName, objective, target, tone, channel) {
  if (channel === 'email') {
    return `Tu es M.A.X., un expert en marketing automation pour EspoCRM.

Génère 3 variantes de messages EMAIL pour une campagne marketing avec les caractéristiques suivantes:

CAMPAGNE: ${campaignName}
OBJECTIF: ${objective}
CIBLE: ${target}
TON: ${tone}

Pour chaque variante, fournis:
1. Un OBJET d'email accrocheur (max 60 caractères)
2. Un CORPS de message persuasif (200-300 mots)
3. Un CALL-TO-ACTION clair

Format ta réponse EXACTEMENT comme suit:
---VARIANTE 1---
OBJET: [objet ici]
CORPS:
[corps ici]
CTA: [call to action ici]

---VARIANTE 2---
OBJET: [objet ici]
CORPS:
[corps ici]
CTA: [call to action ici]

---VARIANTE 3---
OBJET: [objet ici]
CORPS:
[corps ici]
CTA: [call to action ici]

Adapte le ton et le style à la cible. Sois créatif et persuasif!`;
  } else if (channel === 'sms') {
    return `Tu es M.A.X., un expert en marketing automation pour EspoCRM.

Génère 3 variantes de messages SMS pour une campagne marketing avec les caractéristiques suivantes:

CAMPAGNE: ${campaignName}
OBJECTIF: ${objective}
CIBLE: ${target}
TON: ${tone}

Contraintes SMS:
- Maximum 160 caractères par message
- Inclure un appel à l'action clair
- Être concis et impactant

Format ta réponse EXACTEMENT comme suit:
---VARIANTE 1---
[message SMS ici]

---VARIANTE 2---
[message SMS ici]

---VARIANTE 3---
[message SMS ici]

Adapte le ton et le style à la cible. Sois créatif et persuasif!`;
  }
}

/**
 * Parser le contenu généré par Claude
 */
function parseGeneratedContent(content, channel) {
  const suggestions = [];

  if (channel === 'email') {
    const variants = content.split(/---VARIANTE \d+---/).filter(v => v.trim());

    variants.forEach((variant, index) => {
      const subjectMatch = variant.match(/OBJET:\s*(.+?)(?:\n|$)/);
      const bodyMatch = variant.match(/CORPS:\s*([\s\S]+?)(?=CTA:|$)/);
      const ctaMatch = variant.match(/CTA:\s*(.+?)(?:\n|$)/);

      if (subjectMatch && bodyMatch) {
        suggestions.push({
          id: `variant-${index + 1}`,
          type: 'email',
          subject: subjectMatch[1].trim(),
          body: bodyMatch[1].trim(),
          cta: ctaMatch ? ctaMatch[1].trim() : ''
        });
      }
    });
  } else if (channel === 'sms') {
    const variants = content.split(/---VARIANTE \d+---/).filter(v => v.trim());

    variants.forEach((variant, index) => {
      const message = variant.trim();
      if (message) {
        suggestions.push({
          id: `variant-${index + 1}`,
          type: 'sms',
          message: message.substring(0, 160) // Ensure 160 char limit
        });
      }
    });
  }

  return suggestions;
}

export default {
  generateCampaignContent
};
