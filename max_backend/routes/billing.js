/**
 * billing.js
 * Routes API pour la gestion du budget tokens et recharges
 */

import express from 'express';
import { getTokenState } from '../lib/tokenMeter.js';
import {
  rechargeTokens,
  getRechargeStatus,
  getRechargeHistory,
  checkLowBudgetAlert,
  getTotalRecharges
} from '../lib/tokenRecharge.js';

const router = express.Router();

/**
 * GET /api/billing/status
 * Récupère le statut complet du budget tokens
 */
router.get('/status', async (req, res) => {
  try {
    const status = getRechargeStatus();
    const alert = checkLowBudgetAlert(10); // Alerte à 10%

    res.json({
      ok: true,
      ...status,
      alert
    });
  } catch (error) {
    console.error('[Billing] Error getting status:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve billing status'
    });
  }
});

/**
 * GET /api/billing/history
 * Récupère l'historique des recharges
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const history = getRechargeHistory(limit);

    res.json({
      ok: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('[Billing] Error getting history:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve recharge history'
    });
  }
});

/**
 * POST /api/billing/recharge
 * Recharge le budget tokens
 *
 * Body:
 * {
 *   amount: number,     // Montant en tokens (100K - 5M)
 *   password: string,   // Mot de passe admin
 *   reason?: string     // Raison de la recharge (optionnel)
 * }
 */
router.post('/recharge', async (req, res) => {
  try {
    const { amount, password, reason } = req.body;

    // Validation basique
    if (!amount || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: amount and password'
      });
    }

    // Effectuer la recharge
    const result = await rechargeTokens(amount, password, reason);

    if (result.success) {
      res.json({
        ok: true,
        message: `Successfully recharged ${amount} tokens`,
        ...result
      });
    } else {
      res.status(result.error.includes('Authentication') ? 401 : 400).json({
        ok: false,
        ...result
      });
    }
  } catch (error) {
    console.error('[Billing] Error during recharge:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to process recharge'
    });
  }
});

/**
 * GET /api/billing/alert
 * Vérifie l'état des alertes de budget
 */
router.get('/alert', async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const alert = checkLowBudgetAlert(threshold);

    res.json({
      ok: true,
      ...alert
    });
  } catch (error) {
    console.error('[Billing] Error checking alert:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check budget alert'
    });
  }
});

/**
 * GET /api/billing/stats
 * Statistiques complètes du système de billing
 */
router.get('/stats', async (req, res) => {
  try {
    const tokenState = getTokenState();
    const status = getRechargeStatus();
    const totalRecharges = getTotalRecharges();

    res.json({
      ok: true,
      tokens: {
        consumed: tokenState.total,
        input: tokenState.inputTotal,
        output: tokenState.outputTotal,
        calls: tokenState.calls,
        avgPerCall: tokenState.avgTokensPerTask
      },
      budget: {
        current: status.currentBudget,
        remaining: status.remaining,
        percentUsed: status.percentUsed,
        hardCap: status.hardCap,
        remainingCapacity: status.remainingCapacity
      },
      recharges: {
        total: totalRecharges,
        count: status.rechargeCount,
        last: status.lastRecharge
      },
      cost: {
        usd: tokenState.costUsd
      }
    });
  } catch (error) {
    console.error('[Billing] Error getting stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve billing stats'
    });
  }
});

export default router;
