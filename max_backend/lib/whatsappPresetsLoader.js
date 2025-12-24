/**
 * whatsappPresetsLoader.js
 * Charge automatiquement les presets WhatsApp au démarrage de MAX
 */

import { WHATSAPP_MESSAGE_PRESETS } from '../config/whatsapp-message-presets.js';
import { WhatsAppMessage } from '../models/WhatsAppMessage.js';

/**
 * Charge tous les presets dans WhatsAppMessage
 * Cette fonction est appelée au démarrage du serveur
 */
export async function loadWhatsAppPresets() {
  console.log('\n================================================================================');
  console.log('📱 CHARGEMENT DES PRESETS WHATSAPP');
  console.log('================================================================================\n');

  let loaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const preset of WHATSAPP_MESSAGE_PRESETS) {
    try {
      // Vérifier si le message existe déjà
      const existing = WhatsAppMessage.findByName(preset.name);

      if (existing) {
        console.log(`⏭️  [SKIP] "${preset.name}" (déjà existant: ${existing.id})`);
        skipped++;
        continue;
      }

      // Créer le message depuis le preset
      const message = WhatsAppMessage.create({
        tenantId: preset.tenantId,
        name: preset.name,
        type: preset.type,
        messageText: preset.messageText,
        variables: preset.variables,
        buttons: preset.buttons || [],
        contentSid: preset.contentSid,
        status: 'active', // Les presets sont automatiquement actifs
        metadata: {
          templateName: preset.templateName,
          mode: preset.mode,
          description: preset.description,
          preset: true,
          payloadEncoding: preset.payloadEncoding || false,
          payloadSchema: preset.payloadSchema || null
        }
      });

      console.log(`✅ [OK] "${preset.name}" (${message.id}) - ContentSid: ${preset.contentSid}`);
      loaded++;

    } catch (error) {
      console.error(`❌ [ERROR] "${preset.name}": ${error.message}`);
      errors++;
    }
  }

  console.log('\n================================================================================');
  console.log(`📊 RÉSUMÉ: ${loaded} chargés, ${skipped} existants, ${errors} erreurs`);
  console.log('================================================================================\n');

  return {
    loaded,
    skipped,
    errors,
    total: WHATSAPP_MESSAGE_PRESETS.length
  };
}

/**
 * Recharge tous les presets (écrase les existants)
 * Utile pour mettre à jour les presets après modification
 */
export async function reloadWhatsAppPresets() {
  console.log('\n🔄 RECHARGEMENT DES PRESETS WHATSAPP...\n');

  let updated = 0;
  let created = 0;
  let errors = 0;

  for (const preset of WHATSAPP_MESSAGE_PRESETS) {
    try {
      // Vérifier si le message existe déjà
      const existing = WhatsAppMessage.findByName(preset.name);

      if (existing) {
        // Mettre à jour le message existant
        existing.messageText = preset.messageText;
        existing.variables = preset.variables;
        existing.buttons = preset.buttons || [];
        existing.contentSid = preset.contentSid;
        existing.type = preset.type;
        existing.metadata = {
          ...existing.metadata,
          templateName: preset.templateName,
          mode: preset.mode,
          description: preset.description,
          preset: true,
          payloadEncoding: preset.payloadEncoding || false,
          payloadSchema: preset.payloadSchema || null,
          updatedAt: new Date().toISOString()
        };

        console.log(`🔄 [UPDATED] "${preset.name}" (${existing.id})`);
        updated++;
      } else {
        // Créer le message
        const message = WhatsAppMessage.create({
          tenantId: preset.tenantId,
          name: preset.name,
          type: preset.type,
          messageText: preset.messageText,
          variables: preset.variables,
          buttons: preset.buttons || [],
          contentSid: preset.contentSid,
          status: 'active',
          metadata: {
            templateName: preset.templateName,
            mode: preset.mode,
            description: preset.description,
            preset: true,
            payloadEncoding: preset.payloadEncoding || false,
            payloadSchema: preset.payloadSchema || null
          }
        });

        console.log(`✅ [CREATED] "${preset.name}" (${message.id})`);
        created++;
      }

    } catch (error) {
      console.error(`❌ [ERROR] "${preset.name}": ${error.message}`);
      errors++;
    }
  }

  console.log(`\n📊 RÉSUMÉ: ${created} créés, ${updated} mis à jour, ${errors} erreurs\n`);

  return {
    created,
    updated,
    errors,
    total: WHATSAPP_MESSAGE_PRESETS.length
  };
}

export default { loadWhatsAppPresets, reloadWhatsAppPresets };
