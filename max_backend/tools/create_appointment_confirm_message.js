#!/usr/bin/env node

/**
 * Script pour créer le message WhatsApp "Confirmation RDV - TEXT only"
 * avec le template Twilio approuvé
 */

import 'dotenv/config';
import WhatsAppMessage from '../models/WhatsAppMessage.js';

console.log('================================================================================');
console.log('📝 CRÉATION MESSAGE WHATSAPP - Confirmation RDV TEXT');
console.log('================================================================================\n');

// Créer le message avec le ContentSid Twilio approuvé
const message = WhatsAppMessage.create({
  tenantId: 'macrea',
  name: 'Confirmation RDV - TEXT only',
  type: 'appointment',
  messageText: `Bonjour {{prenom}},

Votre rendez-vous est confirmé le {{date}} à {{heure}}.

Nous avons hâte de vous rencontrer !`,
  variables: ['prenom', 'date', 'heure'],
  buttons: [],
  contentSid: 'HX8903819c78549d63782e7209d9ce8b8c',
  status: 'active',
  metadata: {
    twilioTemplateId: 'appointment_confirm_text_v1',
    twilioApproved: true,
    createdBy: 'setup_script'
  }
});

console.log('✅ Message créé avec succès !');
console.log('');
console.log('📋 Détails du message:');
console.log(`   ID: ${message.id}`);
console.log(`   Nom: ${message.name}`);
console.log(`   Type: ${message.type}`);
console.log(`   ContentSid: ${message.contentSid}`);
console.log(`   Status: ${message.status}`);
console.log(`   Variables: ${message.variables.join(', ')}`);
console.log('');
console.log('================================================================================');
console.log('🧪 POUR TESTER CE MESSAGE:');
console.log('================================================================================');
console.log('');
console.log('curl -X POST http://localhost:3005/api/whatsapp/messages/' + message.id + '/send \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{');
console.log('    "toPhoneNumber": "+33648662734",');
console.log('    "leadId": "lead-test-123",');
console.log('    "variables": {');
console.log('      "prenom": "Jean",');
console.log('      "date": "15/12/2025",');
console.log('      "heure": "14h30"');
console.log('    }');
console.log('  }\'');
console.log('');
console.log('================================================================================');
console.log('💾 POUR RÉCUPÉRER CE MESSAGE VIA L\'API:');
console.log('================================================================================');
console.log('');
console.log('curl http://localhost:3005/api/whatsapp/messages/' + message.id);
console.log('');
console.log('================================================================================');
console.log('');
console.log(`🎯 ID du message: ${message.id}`);
console.log('');
