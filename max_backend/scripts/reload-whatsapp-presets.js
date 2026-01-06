/**
 * Script pour recharger les presets WhatsApp
 * Utile après modification des templates dans whatsapp-message-presets.js
 *
 * Usage:
 *   node scripts/reload-whatsapp-presets.js
 */

import { reloadWhatsAppPresets } from '../lib/whatsappPresetsLoader.js';

console.log('\n🔄 RECHARGEMENT DES PRESETS WHATSAPP\n');
console.log('Ce script va mettre à jour tous les presets WhatsApp depuis whatsapp-message-presets.js');
console.log('Les templates existants seront mis à jour avec les nouvelles données.\n');

try {
  const result = await reloadWhatsAppPresets();

  console.log('\n' + '='.repeat(80));
  console.log('✅ RECHARGEMENT TERMINÉ');
  console.log('='.repeat(80));
  console.log(`   Créés: ${result.created}`);
  console.log(`   Mis à jour: ${result.updated}`);
  console.log(`   Erreurs: ${result.errors}`);
  console.log(`   Total: ${result.total}`);
  console.log('='.repeat(80) + '\n');

  if (result.errors > 0) {
    console.warn('⚠️  Certains presets n\'ont pas pu être chargés. Consultez les logs ci-dessus.\n');
    process.exit(1);
  }

  console.log('✅ Tous les presets ont été rechargés avec succès!\n');
  console.log('💡 M.A.X. peut maintenant utiliser les templates avec boutons.\n');

} catch (error) {
  console.error('\n❌ ERREUR FATALE:', error.message);
  console.error(error.stack);
  process.exit(1);
}
