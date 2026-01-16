/**
 * routes/sms-settings.js
 * API pour la configuration SMS des tenants
 *
 * Mode MaCréa: Sender ID alphanumérique personnalisable
 * Mode Self-Service: Credentials Twilio propres
 */

import express from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { resolveTenant } from '../core/resolveTenant.js';

const router = express.Router();

// ============================================================
// Helper: Sanitize Sender ID
// ============================================================

/**
 * Sanitize et valide un sender ID SMS
 * @param {string} input - Texte brut (ex: "Cabinet Dr. Martin")
 * @returns {string} - Sender ID sanitized (ex: "CABINETDRM")
 */
function sanitizeSenderId(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input sender label required');
  }

  // 1. Remove accents
  let clean = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2. Keep only A-Z, 0-9
  clean = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.length === 0) {
    throw new Error('Sender label must contain at least one alphanumeric character');
  }

  // 3. Ensure starts with letter (Twilio requirement)
  if (/^[0-9]/.test(clean)) {
    clean = 'X' + clean;
  }

  // 4. Truncate to 10 chars (reserve 1 for collision suffix)
  clean = clean.substring(0, 10);

  return clean;
}

/**
 * Trouve un sender ID unique en gérant les collisions
 * @param {string} baseSenderId - Sender ID de base (ex: "CABINETDRM")
 * @param {string} excludeTenantId - Tenant ID à exclure (pour update)
 * @returns {Promise<{senderId: string, isAvailable: boolean, alternatives: string[]}>}
 */
async function findUniqueSenderId(baseSenderId, excludeTenantId = null) {
  const alternatives = [];
  let candidate = baseSenderId;
  let suffix = 2;

  // Check si le sender_id de base est disponible
  const { data: existing } = await supabase
    .from('tenant_settings')
    .select('tenant_id')
    .eq('sms_sender_id', candidate)
    .neq('tenant_id', excludeTenantId || '')
    .single();

  if (!existing) {
    return {
      senderId: candidate,
      isAvailable: true,
      alternatives: []
    };
  }

  // Générer des alternatives avec suffixes
  while (suffix <= 99) {
    const suffixStr = suffix.toString();
    candidate = baseSenderId.substring(0, 11 - suffixStr.length) + suffixStr;

    const { data: collision } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('sms_sender_id', candidate)
      .neq('tenant_id', excludeTenantId || '')
      .single();

    if (!collision) {
      alternatives.push(candidate);
      if (alternatives.length >= 3) break; // Max 3 suggestions
    }

    suffix++;
  }

  return {
    senderId: baseSenderId,
    isAvailable: false,
    alternatives
  };
}

// ============================================================
// GET /api/settings/sms
// Récupérer la configuration SMS du tenant
// ============================================================

router.get('/', resolveTenant, async (req, res) => {
  const { tenantId } = req;

  try {
    console.log('[SMS Settings] GET config - Tenant:', tenantId);

    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select(`
        sms_mode,
        sms_sender_label,
        sms_sender_id,
        twilio_messaging_service_sid,
        twilio_from_number
      `)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

    // Valeurs par défaut si pas encore configuré
    const config = {
      sms_mode: settings?.sms_mode || 'macrea',
      sms_sender_label: settings?.sms_sender_label || null,
      sms_sender_id: settings?.sms_sender_id || null,
      twilio_messaging_service_sid: settings?.twilio_messaging_service_sid || null,
      twilio_from_number: settings?.twilio_from_number || null
    };

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('[SMS Settings] Erreur GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// PUT /api/settings/sms
// Mettre à jour la configuration SMS
// ============================================================

router.put('/', resolveTenant, async (req, res) => {
  const { tenantId } = req;
  const {
    sms_mode,
    sms_sender_label,
    twilio_messaging_service_sid,
    twilio_from_number
  } = req.body;

  try {
    console.log('[SMS Settings] PUT config - Tenant:', tenantId, '- Mode:', sms_mode);

    // Validation mode
    if (!['macrea', 'self_service'].includes(sms_mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sms_mode. Must be "macrea" or "self_service"'
      });
    }

    let updateData = { sms_mode };

    // Mode MaCréa: valider et générer sender_id
    if (sms_mode === 'macrea') {
      if (!sms_sender_label) {
        return res.status(400).json({
          success: false,
          error: 'sms_sender_label required for macrea mode'
        });
      }

      // Sanitize le sender_id
      const baseSenderId = sanitizeSenderId(sms_sender_label);

      // Trouver un sender_id unique
      const { senderId, isAvailable, alternatives } = await findUniqueSenderId(baseSenderId, tenantId);

      if (!isAvailable) {
        // Prendre la première alternative disponible
        if (alternatives.length === 0) {
          return res.status(409).json({
            success: false,
            error: 'Cannot generate unique sender ID',
            suggested_id: baseSenderId,
            alternatives: []
          });
        }
        updateData.sms_sender_id = alternatives[0];
      } else {
        updateData.sms_sender_id = senderId;
      }

      updateData.sms_sender_label = sms_sender_label;
      updateData.twilio_messaging_service_sid = null;
      updateData.twilio_from_number = null;
    }

    // Mode Self-Service: valider credentials Twilio
    if (sms_mode === 'self_service') {
      if (!twilio_messaging_service_sid && !twilio_from_number) {
        return res.status(400).json({
          success: false,
          error: 'Either twilio_messaging_service_sid or twilio_from_number required for self_service mode'
        });
      }

      updateData.twilio_messaging_service_sid = twilio_messaging_service_sid || null;
      updateData.twilio_from_number = twilio_from_number || null;
      updateData.sms_sender_label = null;
      updateData.sms_sender_id = null;
    }

    // Update dans la DB
    const { data, error } = await supabase
      .from('tenant_settings')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    console.log('[SMS Settings] Config updated:', data.sms_sender_id || data.twilio_from_number);

    res.json({
      success: true,
      config: {
        sms_mode: data.sms_mode,
        sms_sender_label: data.sms_sender_label,
        sms_sender_id: data.sms_sender_id,
        twilio_messaging_service_sid: data.twilio_messaging_service_sid,
        twilio_from_number: data.twilio_from_number
      }
    });

  } catch (error) {
    console.error('[SMS Settings] Erreur PUT:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// POST /api/settings/sms/validate-sender
// Valider et prévisualiser un sender ID
// ============================================================

router.post('/validate-sender', resolveTenant, async (req, res) => {
  const { tenantId } = req;
  const { sms_sender_label } = req.body;

  try {
    console.log('[SMS Settings] Validate sender - Tenant:', tenantId);

    if (!sms_sender_label) {
      return res.status(400).json({
        success: false,
        error: 'sms_sender_label required'
      });
    }

    // Sanitize
    const baseSenderId = sanitizeSenderId(sms_sender_label);

    // Check availability
    const { senderId, isAvailable, alternatives } = await findUniqueSenderId(baseSenderId, tenantId);

    res.json({
      success: true,
      suggested_id: isAvailable ? senderId : (alternatives[0] || senderId),
      is_available: isAvailable,
      base_id: baseSenderId,
      alternatives
    });

  } catch (error) {
    console.error('[SMS Settings] Erreur validation:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;