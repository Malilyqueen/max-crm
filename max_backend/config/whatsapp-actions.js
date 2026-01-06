/**
 * Configuration des actions WhatsApp
 *
 * Ce fichier définit tous les handlers pour les différentes actions WhatsApp.
 * Architecture: type (appointment, cart, event, follow_up) → action (confirm, cancel, etc.)
 *
 * Chaque handler reçoit:
 * - tenantId: ID du tenant (pour multitenant)
 * - leadId: ID du lead/contact dans EspoCRM
 * - payload: Données contextuelles du ButtonPayload
 * - from: Numéro WhatsApp de l'expéditeur
 *
 * Chaque handler retourne:
 * - success: boolean
 * - message: string (description du résultat)
 * - updates: object (changements appliqués à EspoCRM)
 */

import { espoFetch } from '../lib/espoClient.js';
import { sendSimpleWhatsAppMessage } from '../services/whatsappSendService.js';

/**
 * Handler pour confirmer un rendez-vous
 */
async function handleAppointmentConfirm({ tenantId, leadId, payload, from }) {
  console.log(`   ✅ [appointment.confirm] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    // Mettre à jour le statut du Lead dans EspoCRM
    await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Process',
        description: `Rendez-vous confirmé via WhatsApp le ${new Date().toLocaleString('fr-FR')}`
      })
    });

    // Créer une note pour tracer l'interaction
    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rendez-vous confirmé',
        post: `Le contact a confirmé le rendez-vous via WhatsApp.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   ✅ Lead ${leadId} mis à jour avec succès`);

    // Envoyer un message de confirmation automatique
    try {
      await sendSimpleWhatsAppMessage(
        from,
        '✅ Parfait ! Votre rendez-vous est confirmé.\n\nNous avons hâte de vous rencontrer !'
      );
      console.log(`   📤 Message de confirmation envoyé à ${from}`);
    } catch (smsError) {
      console.warn(`   ⚠️  Impossible d'envoyer le message de confirmation:`, smsError.message);
      // Ne pas bloquer si l'envoi échoue
    }

    return {
      success: true,
      message: 'Rendez-vous confirmé avec succès',
      updates: {
        status: 'In Process',
        noteCreated: true,
        confirmationSent: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors de la confirmation:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour annuler un rendez-vous
 */
async function handleAppointmentCancel({ tenantId, leadId, payload, from }) {
  console.log(`   ❌ [appointment.cancel] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    // Mettre à jour le statut du Lead dans EspoCRM
    await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Dead',
        description: `Rendez-vous annulé via WhatsApp le ${new Date().toLocaleString('fr-FR')}`
      })
    });

    // Créer une note pour tracer l'interaction
    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rendez-vous annulé',
        post: `Le contact a annulé le rendez-vous via WhatsApp.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   ❌ Lead ${leadId} marqué comme annulé`);

    // Envoyer un message d'annulation automatique
    try {
      await sendSimpleWhatsAppMessage(
        from,
        'Votre rendez-vous a bien été annulé.\n\nSi vous souhaitez reprogrammer, n\'hésitez pas à nous contacter.'
      );
      console.log(`   📤 Message d'annulation envoyé à ${from}`);
    } catch (smsError) {
      console.warn(`   ⚠️  Impossible d'envoyer le message d'annulation:`, smsError.message);
      // Ne pas bloquer si l'envoi échoue
    }

    return {
      success: true,
      message: 'Rendez-vous annulé',
      updates: {
        status: 'Dead',
        noteCreated: true,
        confirmationSent: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors de l'annulation:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour reporter un rendez-vous
 */
async function handleAppointmentReschedule({ tenantId, leadId, payload, from }) {
  console.log(`   🔄 [appointment.reschedule] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    // Créer une note pour signaler que le contact veut reporter
    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Demande de report de rendez-vous',
        post: `Le contact a demandé à reporter le rendez-vous via WhatsApp.\n\n⏰ Action requise: Contacter le lead pour fixer une nouvelle date.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   🔄 Note de report créée pour ${leadId}`);

    return {
      success: true,
      message: 'Demande de report enregistrée',
      updates: {
        noteCreated: true,
        actionRequired: 'reschedule'
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors du report:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour ajouter un produit au panier
 */
async function handleCartAdd({ tenantId, leadId, payload, from }) {
  console.log(`   🛒 [cart.add] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    // Créer une note pour signaler l'intérêt du contact
    const productInfo = payload.product ? ` - Produit: ${payload.product}` : '';

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Produit ajouté au panier',
        post: `Le contact a ajouté un produit au panier via WhatsApp${productInfo}.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   🛒 Produit ajouté au panier pour ${leadId}`);

    return {
      success: true,
      message: 'Produit ajouté au panier',
      updates: {
        noteCreated: true,
        cartUpdated: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors de l'ajout au panier:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour voir le panier
 */
async function handleCartView({ tenantId, leadId, payload, from }) {
  console.log(`   👁️ [cart.view] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    // TODO: Récupérer les produits du panier depuis EspoCRM ou autre système
    // Pour l'instant, on crée juste une note pour tracer l'action

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Panier consulté',
        post: `Le contact a consulté son panier via WhatsApp.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   👁️ Panier consulté pour ${leadId}`);

    return {
      success: true,
      message: 'Panier consulté',
      updates: {
        noteCreated: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors de la consultation du panier:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour s'inscrire à un événement
 */
async function handleEventRegister({ tenantId, leadId, payload, from }) {
  console.log(`   📅 [event.register] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    const eventInfo = payload.event ? ` - Événement: ${payload.event}` : '';

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Inscription à un événement',
        post: `Le contact s'est inscrit à un événement via WhatsApp${eventInfo}.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    // Mettre à jour le statut du Lead pour montrer son engagement
    await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Process'
      })
    });

    console.log(`   📅 Inscription à l'événement enregistrée pour ${leadId}`);

    return {
      success: true,
      message: 'Inscription à l\'événement confirmée',
      updates: {
        status: 'In Process',
        noteCreated: true,
        eventRegistered: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur lors de l'inscription:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour marquer un lead comme intéressé (follow-up)
 */
async function handleFollowUpInterested({ tenantId, leadId, payload, from }) {
  console.log(`   👍 [follow_up.interested] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Process',
        description: `Lead intéressé - confirmé via WhatsApp le ${new Date().toLocaleString('fr-FR')}`
      })
    });

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lead intéressé',
        post: `Le contact a confirmé son intérêt via WhatsApp.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   👍 Lead ${leadId} marqué comme intéressé`);

    return {
      success: true,
      message: 'Lead marqué comme intéressé',
      updates: {
        status: 'In Process',
        noteCreated: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Handler pour marquer un lead comme non intéressé
 */
async function handleFollowUpNotInterested({ tenantId, leadId, payload, from }) {
  console.log(`   👎 [follow_up.not_interested] Lead ${leadId} (Tenant: ${tenantId})`);

  try {
    await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Dead',
        description: `Lead non intéressé - confirmé via WhatsApp le ${new Date().toLocaleString('fr-FR')}`
      })
    });

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lead non intéressé',
        post: `Le contact a indiqué ne pas être intéressé via WhatsApp.\n\n📱 Interaction du ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   👎 Lead ${leadId} marqué comme non intéressé`);

    return {
      success: true,
      message: 'Lead marqué comme non intéressé',
      updates: {
        status: 'Dead',
        noteCreated: true
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur:`, error.message);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Registre central des handlers
 * Structure: ACTION_HANDLERS[type][action] = handlerFunction
 */
export const ACTION_HANDLERS = {
  appointment: {
    confirm: handleAppointmentConfirm,
    cancel: handleAppointmentCancel,
    reschedule: handleAppointmentReschedule
  },
  cart: {
    add: handleCartAdd,
    view: handleCartView
  },
  event: {
    register: handleEventRegister
  },
  follow_up: {
    interested: handleFollowUpInterested,
    not_interested: handleFollowUpNotInterested
  }
};

/**
 * Exécute une action WhatsApp en appelant le handler correspondant
 *
 * @param {string} type - Type d'action (appointment, cart, event, follow_up)
 * @param {string} action - Action spécifique (confirm, cancel, add, etc.)
 * @param {object} context - Contexte avec tenantId, leadId, payload, from
 * @returns {object} Résultat de l'exécution { success, message, updates }
 */
export async function executeWhatsAppAction(type, action, context) {
  console.log(`\n🎯 Exécution action: ${type}.${action}`);
  console.log(`   Tenant: ${context.tenantId}`);
  console.log(`   Lead: ${context.leadId}`);
  console.log(`   From: ${context.from}`);

  // Vérifier que le type existe
  if (!ACTION_HANDLERS[type]) {
    console.error(`   ❌ Type d'action inconnu: ${type}`);
    return {
      success: false,
      message: `Type d'action inconnu: ${type}`,
      updates: {}
    };
  }

  // Vérifier que l'action existe pour ce type
  if (!ACTION_HANDLERS[type][action]) {
    console.error(`   ❌ Action inconnue: ${type}.${action}`);
    return {
      success: false,
      message: `Action inconnue: ${type}.${action}`,
      updates: {}
    };
  }

  // Exécuter le handler
  try {
    const handler = ACTION_HANDLERS[type][action];
    const result = await handler(context);

    console.log(`   ${result.success ? '✅' : '❌'} ${result.message}`);

    return result;
  } catch (error) {
    console.error(`   ❌ Erreur lors de l'exécution du handler:`, error);
    return {
      success: false,
      message: `Erreur lors de l'exécution: ${error.message}`,
      updates: {}
    };
  }
}

/**
 * Liste toutes les actions disponibles
 * Utile pour l'introspection et la documentation
 *
 * @returns {array} Liste des actions avec type, action, description
 */
export function listAvailableActions() {
  const actions = [];

  Object.entries(ACTION_HANDLERS).forEach(([type, handlers]) => {
    Object.keys(handlers).forEach(action => {
      actions.push({
        type,
        action,
        key: `${type}.${action}`
      });
    });
  });

  return actions;
}

export default ACTION_HANDLERS;
