/**
 * Action M.A.X.: Envoyer un message WhatsApp en masse à plusieurs leads
 *
 * Usage:
 *   POST /api/action-layer/sendWhatsAppBroadcast
 *   Body: {
 *     filter: { source: "greenapi-test", status: "test" },
 *     message: "Bonjour à tous! Message de test.",
 *     dryRun: true  // Pour tester sans envoyer
 *   }
 */

import { sendWhatsApp } from '../lib/whatsappHelper.js';
import { readAll as getAllLeads } from '../utils/leads-store.js';

export const metadata = {
  name: 'sendWhatsAppBroadcast',
  description: 'Envoie un message WhatsApp en broadcast à plusieurs leads',
  tags: ['whatsapp', 'broadcast', 'greenapi', 'mass-messaging'],
  params: {
    filter: { type: 'object', required: false, description: 'Filtres pour sélectionner les leads (ex: {source: "test"})' },
    leadIds: { type: 'array', required: false, description: 'Liste d\'IDs de leads spécifiques' },
    message: { type: 'string', required: true, description: 'Message à envoyer' },
    dryRun: { type: 'boolean', required: false, default: false, description: 'Mode test (liste les destinataires sans envoyer)' }
  }
};

export async function execute({ filter = {}, leadIds, message, dryRun = false }, context) {
  try {
    console.log('[ACTION] sendWhatsAppBroadcast', { filter, leadIds, dryRun });

    let leads = getAllLeads();

    // Filtrer par IDs si fournis
    if (leadIds && leadIds.length > 0) {
      leads = leads.filter(l => leadIds.includes(l.id));
    }

    // Appliquer les filtres
    if (Object.keys(filter).length > 0) {
      leads = leads.filter(lead => {
        return Object.entries(filter).every(([key, value]) => {
          return lead[key] === value;
        });
      });
    }

    // Filtrer uniquement ceux qui ont un numéro de téléphone
    const leadsWithPhone = leads.filter(l => l.phone && l.phone.trim() !== '');

    if (leadsWithPhone.length === 0) {
      return {
        ok: false,
        error: 'NO_LEADS_FOUND',
        message: 'Aucun lead avec numéro de téléphone trouvé pour les critères donnés'
      };
    }

    console.log(`[ACTION] ${leadsWithPhone.length} lead(s) ciblé(s)`);

    // Mode Dry Run: lister sans envoyer
    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        recipients: leadsWithPhone.map(l => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          source: l.source,
          status: l.status
        })),
        message: `${leadsWithPhone.length} destinataire(s) - Mode test activé (aucun message envoyé)`
      };
    }

    // Envoi réel avec délai entre chaque message (éviter rate limiting)
    const results = [];
    const errors = [];

    for (const lead of leadsWithPhone) {
      try {
        console.log(`[ACTION] Envoi à ${lead.name} (${lead.phone})...`);

        const result = await sendWhatsApp(lead.phone, message);

        results.push({
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          messageId: result.messageId,
          status: 'sent'
        });

        // Délai de 2 secondes entre chaque envoi
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[ACTION] ❌ Erreur envoi à ${lead.name}:`, error.message);
        errors.push({
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          error: error.message
        });
      }
    }

    console.log(`[ACTION] ✅ Broadcast terminé: ${results.length} envoyés, ${errors.length} erreurs`);

    return {
      ok: true,
      action: 'sendWhatsAppBroadcast',
      summary: {
        total: leadsWithPhone.length,
        sent: results.length,
        failed: errors.length
      },
      results,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('[ACTION] ❌ Erreur sendWhatsAppBroadcast:', error.message);
    return {
      ok: false,
      error: 'BROADCAST_FAILED',
      message: error.message
    };
  }
}
