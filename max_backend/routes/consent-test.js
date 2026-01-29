/**
 * routes/consent-test.js
 * Endpoints de test pour le système de consentement
 * À utiliser pour valider le flux E2E avant intégration complète dans M.A.X.
 */

import express from 'express';
import { requestConsent } from '../actions/requestConsent.js';

const router = express.Router();

/**
 * POST /api/chat/test-consent
 * Simule M.A.X. demandant le consentement
 * Retourne un message avec type='consent' pour le frontend
 */
router.post('/test-consent', async (req, res) => {
  try {
    const {
      sessionId,
      operation = 'layout_modification',
      description = 'Ajouter le champ secteur aux layouts Lead'
    } = req.body;

    console.log(`[ConsentTest] 🧪 Test consentement pour session ${sessionId}`);

    // Créer la demande de consentement
    const consentResult = await requestConsent({
      type: operation,
      description,
      details: {
        entity: 'Lead',
        fieldName: 'secteur',
        layoutTypes: ['detail', 'list']
      },
      tenantId: req.tenantId
    });

    if (!consentResult.success) {
      return res.status(500).json({
        success: false,
        error: consentResult.error
      });
    }

    // Retourner un message formaté pour le frontend
    // FORMAT ATTENDU PAR ChatMessage interface
    res.json({
      success: true,
      sessionId,
      message: {
        role: 'assistant',
        content: `Je souhaite ${description}. Cette opération nécessite ton autorisation.`,
        timestamp: Date.now(),
        type: 'consent',
        consentId: consentResult.consentId,
        operation: {
          type: operation,
          description,
          details: consentResult.metadata.details
        },
        consentStatus: 'pending'
      },
      mode: 'assisté',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      conversationLength: 1
    });

  } catch (error) {
    console.error('[ConsentTest] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
