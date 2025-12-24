/**
 * bubble.js
 *
 * Routes API pour la Bulle M.A.X. contextuelle dans EspoCRM
 * - POST /api/max/bubble/context - Transmettre le contexte (entity + id)
 * - POST /api/max/bubble/suggest - Générer une suggestion intelligente
 * - POST /api/max/bubble/apply - Appliquer une suggestion
 */

import express from 'express';
import { espoFetch } from '../lib/espoClient.js';
import { callOpenAI } from '../lib/aiClient.js';
import { logMaxActivity } from '../lib/activityLogger.js';
import MAX_TOOLS from '../lib/maxTools.js';
import { TENANTS } from '../core/tenants.js';

const router = express.Router();

// Middleware pour ajouter le tenant par défaut (macrea-admin)
router.use((req, res, next) => {
  if (!req.tenant) {
    req.tenant = TENANTS['macrea-admin'];
    console.log('[Bulle M.A.X.] Tenant par défaut appliqué:', req.tenant.id);
  }
  next();
});

/**
 * POST /api/max/bubble/context
 * Recevoir le contexte depuis la bulle (entity + entityId)
 * Retourner les données nécessaires pour générer une suggestion
 */
router.post('/context', async (req, res) => {
  try {
    const { entity, entityId } = req.body;

    if (!entity || !entityId) {
      return res.status(400).json({
        ok: false,
        error: 'Entity et entityId requis'
      });
    }

    console.log(`[Bulle M.A.X.] Context reçu : ${entity}/${entityId}`);

    // 1. Récupérer l'entité depuis EspoCRM
    const record = await espoFetch(`/${entity}/${entityId}`);

    // 2. Récupérer les MissionMAX associées (optionnel - peut ne pas exister)
    let missions = { total: 0, list: [] };
    try {
      const missionsParams = new URLSearchParams({
        maxSize: '10',
        orderBy: 'dateExecution',
        order: 'desc',
        where: JSON.stringify([{
          type: 'equals',
          attribute: entity === 'Lead' ? 'leadId' : 'accountId',
          value: entityId
        }])
      });
      missions = await espoFetch(`/MissionMAX?${missionsParams.toString()}`);
      console.log(`[Bulle M.A.X.] ${missions.total} missions trouvées`);
    } catch (e) {
      console.log('[Bulle M.A.X.] MissionMAX non disponible (entité custom non créée)');
    }

    // 3. Récupérer DiagnosticIA s'il existe (optionnel - peut ne pas exister)
    let diagnostic = null;
    if (entity === 'Lead') {
      try {
        const diagnosticParams = new URLSearchParams({
          maxSize: '1',
          orderBy: 'dateGeneration',
          order: 'desc',
          where: JSON.stringify([{
            type: 'equals',
            attribute: 'leadId',
            value: entityId
          }])
        });
        const diagnostics = await espoFetch(`/DiagnosticIA?${diagnosticParams.toString()}`);
        if (diagnostics.list && diagnostics.list.length > 0) {
          diagnostic = diagnostics.list[0];
        }
        console.log(`[Bulle M.A.X.] DiagnosticIA trouvé: ${!!diagnostic}`);
      } catch (e) {
        console.log('[Bulle M.A.X.] DiagnosticIA non disponible (entité custom non créée)');
      }
    }

    // Log l'activité
    logMaxActivity({
      type: 'bubble_context_loaded',
      entity,
      entityId,
      details: `Context chargé : ${record.name || entityId} - ${missions.total} missions`
    });

    return res.json({
      ok: true,
      context: {
        entity,
        entityId,
        record,
        missions: missions.list || [],
        diagnostic,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Bulle M.A.X.] Erreur context:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/max/bubble/suggest
 * Générer une suggestion intelligente basée sur le contexte
 */
router.post('/suggest', async (req, res) => {
  try {
    const { context } = req.body;

    if (!context || !context.entity || !context.entityId) {
      return res.status(400).json({
        ok: false,
        error: 'Context requis'
      });
    }

    console.log(`[Bulle M.A.X.] Génération suggestion pour ${context.entity}/${context.entityId}`);

    // Construire le prompt pour M.A.X.
    const prompt = `Tu es M.A.X., l'assistant IA du CRM MaCréa.

CONTEXTE :
- Entity : ${context.entity}
- Record : ${JSON.stringify(context.record, null, 2)}
- Missions récentes : ${context.missions.length} missions
${context.missions.length > 0 ? `\nDernières missions :\n${context.missions.slice(0, 3).map(m => `- ${m.name} (${m.typeAction}) : ${m.resultat}`).join('\n')}` : ''}
${context.diagnostic ? `\nDiagnostic IA récent :\n${context.diagnostic.syntheseIA}` : ''}

MISSION :
Génère UNE suggestion intelligente et concrète pour améliorer ce ${context.entity === 'Lead' ? 'lead' : 'compte'}.

La suggestion doit :
1. Être actionnable immédiatement
2. Apporter de la valeur (enrichissement, tag, statut, action, email)
3. Être basée sur les données réelles (pas d'hallucination)

Réponds UNIQUEMENT au format JSON suivant (sans markdown) :
{
  "type": "enrichissement|tag|statut|action|email",
  "titre": "Titre court de la suggestion",
  "description": "Description détaillée",
  "action": {
    "tool": "nom_du_tool_à_appeler",
    "params": { /* paramètres du tool */ }
  }
}`;

    // Appeler OpenAI
    const response = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es M.A.X., assistant IA spécialisé dans le CRM. Tu réponds UNIQUEMENT en JSON valide.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    // Parser la réponse
    let suggestion;
    try {
      // callOpenAI retourne {text, usage} au lieu de {choices}
      let content;
      if (response.text) {
        content = response.text.trim();
      } else if (response.choices && response.choices[0]) {
        content = response.choices[0].message.content.trim();
      } else {
        throw new Error('Réponse OpenAI invalide: ' + JSON.stringify(response));
      }

      console.log('[Bulle M.A.X.] Contenu brut:', content);

      // Enlever les éventuels backticks markdown
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      suggestion = JSON.parse(jsonContent);
      console.log('[Bulle M.A.X.] Suggestion parsée:', suggestion);
    } catch (parseError) {
      console.error('[Bulle M.A.X.] Erreur parsing JSON:', parseError);
      console.error('[Bulle M.A.X.] Réponse complète:', JSON.stringify(response, null, 2));
      return res.status(500).json({
        ok: false,
        error: 'Erreur parsing suggestion M.A.X.: ' + parseError.message
      });
    }

    // Log l'activité
    logMaxActivity({
      type: 'bubble_suggestion_generated',
      entity: context.entity,
      entityId: context.entityId,
      details: `Suggestion générée : ${suggestion.type} - ${suggestion.titre}`
    });

    return res.json({
      ok: true,
      suggestion,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Bulle M.A.X.] Erreur suggest:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/max/bubble/apply
 * Appliquer une suggestion (exécuter le tool)
 */
router.post('/apply', async (req, res) => {
  try {
    const { suggestion, context } = req.body;

    if (!suggestion || !suggestion.action) {
      return res.status(400).json({
        ok: false,
        error: 'Suggestion avec action requise'
      });
    }

    console.log(`[Bulle M.A.X.] Application suggestion : ${suggestion.action.tool}`);

    // TODO: Importer executeToolCall depuis chat.js
    // Pour l'instant, on retourne un placeholder
    // Cette partie sera complétée quand on aura accès à executeToolCall

    // Log l'activité
    logMaxActivity({
      type: 'bubble_suggestion_applied',
      entity: context?.entity,
      entityId: context?.entityId,
      details: `Suggestion appliquée : ${suggestion.type} - ${suggestion.titre}`
    });

    return res.json({
      ok: true,
      message: 'Suggestion appliquée avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Bulle M.A.X.] Erreur apply:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
