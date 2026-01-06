/**
 * Action M.A.X.: Envoyer un message WhatsApp à un lead
 *
 * Usage:
 *   POST /api/action-layer/sendWhatsAppToLead
 *   Body: {
 *     leadId: "abc123" ou phoneNumber: "+15146412055",
 *     message: "Bonjour! Ceci est un message de M.A.X."
 *   }
 */

import { sendWhatsApp } from '../lib/whatsappHelper.js';
import { readAll as getAllLeads } from '../utils/leads-store.js';

export const metadata = {
  name: 'sendWhatsAppToLead',
  description: 'Envoie un message WhatsApp à un lead via Green-API',
  tags: ['whatsapp', 'communication', 'greenapi'],
  params: {
    leadId: { type: 'string', required: false, description: 'ID du lead (optionnel si phoneNumber fourni)' },
    phoneNumber: { type: 'string', required: false, description: 'Numéro direct (optionnel si leadId fourni)' },
    message: { type: 'string', required: true, description: 'Texte du message à envoyer' }
  }
};

export async function execute({ leadId, phoneNumber, message }, context) {
  try {
    console.log('[ACTION] sendWhatsAppToLead', { leadId, phoneNumber, messagePreview: message?.substring(0, 50) });

    let targetPhone = phoneNumber;

    // Si leadId fourni, chercher le numéro dans les leads
    if (leadId && !phoneNumber) {
      const leads = getAllLeads();
      const lead = leads.find(l => l.id === leadId);

      if (!lead) {
        return {
          ok: false,
          error: 'LEAD_NOT_FOUND',
          message: `Lead ${leadId} introuvable`
        };
      }

      if (!lead.phone) {
        return {
          ok: false,
          error: 'LEAD_NO_PHONE',
          message: `Le lead ${lead.name || leadId} n'a pas de numéro de téléphone`
        };
      }

      targetPhone = lead.phone;
      console.log(`[ACTION] Lead trouvé: ${lead.name} → ${targetPhone}`);
    }

    // Vérifier qu'on a un numéro
    if (!targetPhone) {
      return {
        ok: false,
        error: 'MISSING_PHONE',
        message: 'Aucun numéro de téléphone fourni (leadId ou phoneNumber requis)'
      };
    }

    // Vérifier qu'on a un message
    if (!message || message.trim() === '') {
      return {
        ok: false,
        error: 'MISSING_MESSAGE',
        message: 'Le message ne peut pas être vide'
      };
    }

    // Envoyer le message via Green-API
    const result = await sendWhatsApp(targetPhone, message);

    console.log('[ACTION] ✅ Message WhatsApp envoyé:', {
      to: targetPhone,
      messageId: result.messageId
    });

    return {
      ok: true,
      action: 'sendWhatsAppToLead',
      result: {
        messageId: result.messageId,
        status: 'sent',
        phoneNumber: targetPhone,
        sentAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[ACTION] ❌ Erreur sendWhatsAppToLead:', error.message);
    return {
      ok: false,
      error: 'SEND_FAILED',
      message: error.message
    };
  }
}
