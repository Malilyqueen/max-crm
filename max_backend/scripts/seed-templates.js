/**
 * scripts/seed-templates.js
 *
 * Migration one-shot: Insère les 12 templates hardcodés de TemplatesSection.tsx
 * dans la table message_templates.
 *
 * Usage:
 *   node scripts/seed-templates.js [tenantId]
 *
 * Par défaut, utilise 'macrea' comme tenant.
 * Les templates sont créés avec status='active' et created_by='system'.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Les 12 templates originaux de TemplatesSection.tsx
const TEMPLATES = [
  // === WHATSAPP (4) ===
  {
    channel: 'whatsapp',
    name: 'Confirmation de Rendez-vous',
    category: 'vente',
    whatsapp_from: 'whatsapp:+14155238886',
    content: `Bonjour {{firstName}} 👋

Votre rendez-vous est confirmé pour le {{appointmentDate}} à {{appointmentTime}}.

📍 Lieu: {{location}}
👤 Avec: {{salesRep}}

Répondez OUI pour confirmer ou ANNULER pour reporter.`
  },
  {
    channel: 'whatsapp',
    name: 'Validation de Panier Abandonné',
    category: 'vente',
    whatsapp_from: 'whatsapp:+14155238886',
    content: `Bonjour {{firstName}} 🛒

Vous avez {{itemCount}} articles dans votre panier pour un montant de {{cartTotal}}€.

Souhaitez-vous finaliser votre commande ? Cliquez ici: {{checkoutLink}}

✨ Offre spéciale: -10% si vous commandez aujourd'hui avec le code CART10`
  },
  {
    channel: 'whatsapp',
    name: 'Relance Lead Froid J+3',
    category: 'vente',
    whatsapp_from: 'whatsapp:+14155238886',
    content: `Bonjour {{firstName}},

Je remarque que nous n'avons pas eu de nouvelles depuis notre dernier échange. Y a-t-il des questions auxquelles je peux répondre pour vous aider dans votre décision ?

Je reste à votre disposition.`
  },
  {
    channel: 'whatsapp',
    name: 'Rappel Facture Impayée',
    category: 'facturation',
    whatsapp_from: 'whatsapp:+14155238886',
    content: `Bonjour {{firstName}},

Nous constatons que la facture n°{{invoiceNumber}} du {{invoiceDate}} ({{amount}}€) n'a pas encore été réglée.

Echéance: {{dueDate}}

Pour tout règlement, utilisez ce lien: {{paymentLink}}`
  },

  // === EMAIL (5) ===
  {
    channel: 'email',
    name: 'Relance Lead J+3 Email',
    category: 'vente',
    subject: 'Suite à notre échange - {{companyName}}',
    content: `Bonjour {{firstName}},

Nous n'avons pas eu de retour de votre part depuis {{daysAgo}} jours suite à notre dernier échange concernant {{product}}.

Souhaitez-vous que nous reprogrammions un échange pour discuter de vos besoins ?

Je reste à votre entière disposition.`
  },
  {
    channel: 'email',
    name: 'Newsletter Segmentée',
    category: 'marketing',
    subject: 'Votre newsletter {{month}} - Actualités {{sector}}',
    content: `Bonjour {{firstName}},

Découvrez les dernières actualités et tendances de votre secteur {{sector}}. Nous avons sélectionné pour vous :

✓ {{article1}}
✓ {{article2}}
✓ {{article3}}

Bonne lecture !`
  },
  {
    channel: 'email',
    name: 'Alerte Lead Chaud (Commercial)',
    category: 'vente',
    subject: '🔥 ALERTE: Lead chaud détecté - {{leadName}}',
    content: `Un nouveau lead chaud a été détecté !

👤 Contact: {{leadName}}
🏢 Société: {{companyName}}
📊 Score: {{score}}/100
📅 Dernière interaction: {{lastInteraction}}

⚡ Action recommandée: Contact sous 24h

Consulter la fiche: {{leadUrl}}`
  },
  {
    channel: 'email',
    name: 'Bienvenue Nouveau Client',
    category: 'support',
    subject: 'Bienvenue chez {{companyName}} 🎉',
    content: `Bonjour {{firstName}},

Bienvenue dans la famille {{companyName}} !

Voici vos premiers pas :
1. Accédez à votre espace client: {{portalLink}}
2. Téléchargez nos ressources: {{resourcesLink}}
3. Contactez votre conseiller dédié: {{salesRep}}

Nous sommes ravis de vous accompagner.`
  },
  {
    channel: 'email',
    name: 'Confirmation de Commande',
    category: 'vente',
    subject: 'Commande n°{{orderNumber}} confirmée ✓',
    content: `Bonjour {{firstName}},

Votre commande n°{{orderNumber}} a bien été enregistrée.

📦 Récapitulatif:
{{orderItems}}

💰 Total: {{orderTotal}}€
📅 Livraison estimée: {{deliveryDate}}

Suivre ma commande: {{trackingLink}}`
  },

  // === SMS (2) ===
  {
    channel: 'sms',
    name: 'Rappel RDV J-1',
    category: 'vente',
    content: `Rappel: RDV demain {{date}} à {{time}} avec {{salesRep}}. Lieu: {{location}}. Confirmez en répondant OK ou annulez: {{cancelLink}}`
  },
  {
    channel: 'sms',
    name: 'Code de Validation',
    category: 'securite',
    content: `Votre code de validation {{companyName}}: {{code}}. Valable 10 minutes. Ne partagez ce code avec personne.`
  }
];

async function seedTemplates(tenantId = 'macrea') {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 SEED TEMPLATES - Migration des templates hardcodés');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Tenant: ${tenantId}`);
  console.log(`Templates à insérer: ${TEMPLATES.length}`);
  console.log('');

  // Vérifier si des templates existent déjà pour ce tenant
  const { data: existing, error: checkError } = await supabase
    .from('message_templates')
    .select('id, name')
    .eq('tenant_id', tenantId);

  if (checkError) {
    console.error('❌ Erreur vérification:', checkError.message);
    console.log('');
    console.log('💡 Avez-vous exécuté la migration 013_message_templates.sql ?');
    console.log('   Exécutez-la d\'abord dans Supabase SQL Editor.');
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`⚠️  ${existing.length} templates existent déjà pour ce tenant:`);
    existing.forEach(t => console.log(`   - ${t.name}`));
    console.log('');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Voulez-vous continuer et ajouter les nouveaux templates ? (y/n) ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Annulé.');
      process.exit(0);
    }
  }

  // Insérer les templates
  let inserted = 0;
  let skipped = 0;

  for (const template of TEMPLATES) {
    // Vérifier si ce template existe déjà (par nom + canal)
    const exists = existing?.some(
      e => e.name === template.name
    );

    if (exists) {
      console.log(`⏭️  Skip (existe déjà): ${template.name}`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: tenantId,
        channel: template.channel,
        name: template.name,
        category: template.category,
        subject: template.subject || null,
        content: template.content,
        whatsapp_from: template.whatsapp_from || null,
        status: 'active', // Templates système = actifs par défaut
        created_by: 'system'
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Erreur insert "${template.name}":`, error.message);
    } else {
      console.log(`✅ Inséré: ${template.name} (${template.channel}) → ${data.id.substring(0, 8)}`);
      inserted++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 RÉSULTAT: ${inserted} insérés, ${skipped} ignorés`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Afficher un résumé par canal
  const { data: summary } = await supabase
    .from('message_templates')
    .select('channel')
    .eq('tenant_id', tenantId);

  if (summary) {
    const counts = {
      email: summary.filter(t => t.channel === 'email').length,
      sms: summary.filter(t => t.channel === 'sms').length,
      whatsapp: summary.filter(t => t.channel === 'whatsapp').length
    };
    console.log('Templates par canal:');
    console.log(`   📧 Email: ${counts.email}`);
    console.log(`   💬 SMS: ${counts.sms}`);
    console.log(`   📱 WhatsApp: ${counts.whatsapp}`);
  }
}

// Exécution
const tenantId = process.argv[2] || 'macrea';
seedTemplates(tenantId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
