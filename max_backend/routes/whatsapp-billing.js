/**
 * routes/whatsapp-billing.js
 * API pour la gestion du billing WhatsApp (abonnement + recharges)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Packs de recharge disponibles
const RECHARGE_PACKS = {
  pack_100: { messages: 100, price: 9.90, label: '100 messages' },
  pack_250: { messages: 250, price: 24.90, label: '250 messages' },
  pack_500: { messages: 500, price: 49.90, label: '500 messages' },
  pack_1000: { messages: 1000, price: 99.90, label: '1 000 messages' }
};

// Prix abonnement mensuel
const SUBSCRIPTION_PRICE = 24.90;
const SUBSCRIPTION_INCLUDED_MESSAGES = 100;

/**
 * GET /api/whatsapp/billing
 * Récupère l'état du billing WhatsApp pour le tenant
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';

    // Récupérer depuis la vue summary
    const { data, error } = await supabase
      .from('whatsapp_billing_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    // Si pas de billing, retourner état par défaut
    if (!data) {
      return res.json({
        ok: true,
        billing: {
          subscriptionActive: false,
          subscriptionExpiresAt: null,
          includedMessages: 0,
          includedMessagesUsed: 0,
          includedRemaining: 0,
          rechargedMessages: 0,
          rechargedMessagesUsed: 0,
          rechargedRemaining: 0,
          totalAvailable: 0,
          isLowBalance: false,
          expiresSoon: false
        },
        packs: RECHARGE_PACKS,
        subscriptionPrice: SUBSCRIPTION_PRICE,
        subscriptionIncludedMessages: SUBSCRIPTION_INCLUDED_MESSAGES
      });
    }

    res.json({
      ok: true,
      billing: {
        subscriptionActive: data.subscription_active,
        subscriptionExpiresAt: data.subscription_expires_at,
        includedMessages: data.included_messages,
        includedMessagesUsed: data.included_messages_used,
        includedRemaining: data.included_remaining,
        rechargedMessages: data.recharged_messages,
        rechargedMessagesUsed: data.recharged_messages_used,
        rechargedRemaining: data.recharged_remaining,
        totalAvailable: data.total_available,
        isLowBalance: data.is_low_balance,
        expiresSoon: data.expires_soon
      },
      packs: RECHARGE_PACKS,
      subscriptionPrice: SUBSCRIPTION_PRICE,
      subscriptionIncludedMessages: SUBSCRIPTION_INCLUDED_MESSAGES
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur GET /:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de la récupération du billing'
    });
  }
});

/**
 * POST /api/whatsapp/billing/subscribe
 * Active ou renouvelle l'abonnement WhatsApp (admin only)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';
    const { months = 1 } = req.body;

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('activate_whatsapp_subscription', {
      p_tenant_id: tenantId,
      p_months: months
    });

    if (error) {
      throw error;
    }

    console.log(`[WhatsApp Billing] ✅ Abonnement activé pour ${tenantId} (${months} mois)`);

    // Récupérer le nouvel état
    const { data: billing } = await supabase
      .from('whatsapp_billing_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    res.json({
      ok: true,
      message: `Abonnement WhatsApp activé pour ${months} mois`,
      billing: billing ? {
        subscriptionActive: billing.subscription_active,
        subscriptionExpiresAt: billing.subscription_expires_at,
        includedMessages: billing.included_messages,
        totalAvailable: billing.total_available
      } : null
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur POST /subscribe:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'activation de l\'abonnement'
    });
  }
});

/**
 * POST /api/whatsapp/billing/recharge
 * Ajoute une recharge de messages (admin only)
 */
router.post('/recharge', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';
    const { packId } = req.body;
    const createdBy = req.user?.email || 'admin';

    // Valider le pack
    const pack = RECHARGE_PACKS[packId];
    if (!pack) {
      return res.status(400).json({
        ok: false,
        error: `Pack invalide: ${packId}. Packs disponibles: ${Object.keys(RECHARGE_PACKS).join(', ')}`
      });
    }

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('add_whatsapp_recharge', {
      p_tenant_id: tenantId,
      p_pack_id: packId,
      p_messages: pack.messages,
      p_price: pack.price,
      p_created_by: createdBy
    });

    if (error) {
      throw error;
    }

    console.log(`[WhatsApp Billing] ✅ Recharge ajoutée pour ${tenantId}: ${pack.messages} messages (${pack.price}€)`);

    // Récupérer le nouvel état
    const { data: billing } = await supabase
      .from('whatsapp_billing_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    res.json({
      ok: true,
      message: `${pack.messages} messages ajoutés à votre compte`,
      pack: {
        id: packId,
        messages: pack.messages,
        price: pack.price
      },
      billing: billing ? {
        rechargedMessages: billing.recharged_messages,
        rechargedRemaining: billing.recharged_remaining,
        totalAvailable: billing.total_available
      } : null
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur POST /recharge:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'ajout de la recharge'
    });
  }
});

/**
 * POST /api/whatsapp/billing/consume
 * Consomme 1 message (appelé après chaque envoi réussi)
 * Note: Cette route est appelée en interne par sendWhatsapp
 */
router.post('/consume', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('consume_whatsapp_message', {
      p_tenant_id: tenantId
    });

    if (error) {
      throw error;
    }

    const result = data?.[0];

    if (!result || !result.success) {
      return res.status(403).json({
        ok: false,
        error: result?.error_message || 'Impossible de consommer le message',
        blocked: result?.source === 'blocked',
        empty: result?.source === 'empty'
      });
    }

    res.json({
      ok: true,
      remaining: result.remaining,
      source: result.source // 'included' ou 'recharged'
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur POST /consume:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de la consommation du message'
    });
  }
});

/**
 * GET /api/whatsapp/billing/history
 * Historique des recharges
 */
router.get('/history', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';
    const limit = parseInt(req.query.limit) || 20;

    const { data, error } = await supabase
      .from('whatsapp_recharge_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      ok: true,
      history: data || []
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur GET /history:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de la récupération de l\'historique'
    });
  }
});

/**
 * GET /api/whatsapp/billing/check
 * Vérifie si l'envoi est autorisé (utilisé par sendWhatsapp)
 */
router.get('/check', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant'] || req.ctx?.tenant || 'macrea';

    const { data, error } = await supabase
      .from('whatsapp_billing_summary')
      .select('subscription_active, total_available')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Pas de billing = non autorisé
    if (!data) {
      return res.json({
        ok: true,
        canSend: false,
        reason: 'no_subscription',
        message: 'Aucun abonnement WhatsApp configuré'
      });
    }

    // Abonnement inactif
    if (!data.subscription_active) {
      return res.json({
        ok: true,
        canSend: false,
        reason: 'subscription_inactive',
        message: 'Veuillez renouveler votre abonnement WhatsApp pour utiliser votre crédit.'
      });
    }

    // Plus de messages
    if (data.total_available < 1) {
      return res.json({
        ok: true,
        canSend: false,
        reason: 'no_messages',
        message: 'Solde de messages épuisé. Veuillez recharger.'
      });
    }

    res.json({
      ok: true,
      canSend: true,
      remaining: data.total_available
    });

  } catch (error) {
    console.error('[WhatsApp Billing] Erreur GET /check:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de la vérification'
    });
  }
});

export default router;
