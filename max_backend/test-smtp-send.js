/**
 * Test envoi SMTP réel
 *
 * Configure d'abord le mot de passe dans .env:
 * SMTP_PASSWORD=ton_vrai_mot_de_passe
 */

import 'dotenv/config';
import { executeAction } from './actions/index.js';

console.log('\n📧 Test envoi email SMTP OVH\n');

const params = {
  tenantId: 'macrea',
  to: 'contact@malalacrea.fr', // Envoyer à soi-même pour test
  subject: 'Test M.A.X. - Envoi SMTP',
  body: 'Ceci est un email de test envoyé par M.A.X. via SMTP OVH.\n\nSi vous recevez cet email, l\'intégration fonctionne parfaitement! 🎉'
};

console.log('Envoi vers:', params.to);
console.log('Sujet:', params.subject);
console.log('');

try {
  const result = await executeAction('send_email', params);

  if (result.success) {
    console.log('✅ Email envoyé avec succès!');
    console.log('Message ID:', result.entityId);
    console.log('');
    console.log('Vérifie ta boîte mail:', params.to);
  } else {
    console.error('❌ Échec:', result.error);
  }
} catch (error) {
  console.error('❌ Exception:', error.message);
  console.log('');
  console.log('Vérifie que:');
  console.log('1. Le mot de passe SMTP est correct dans .env');
  console.log('2. Le serveur OVH autorise les connexions SMTP');
}
