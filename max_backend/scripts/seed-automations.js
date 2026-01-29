/**
 * scripts/seed-automations.js
 *
 * Migration one-shot: Insère les 6 workflows mockés de automationMvp1.js
 * dans la table automations.
 *
 * Usage:
 *   node scripts/seed-automations.js [tenantId]
 *
 * Par défaut, utilise 'macrea' comme tenant.
 * Les workflows sont créés avec leur statut d'origine et created_by='system'.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Les 6 workflows originaux de automationMvp1.js
const WORKFLOWS = [
  {
    name: 'Confirmation RDV WhatsApp automatique',
    description: 'Envoie une confirmation WhatsApp instantanée après la prise de rendez-vous',
    status: 'active',
    trigger_type: 'lead_created',
    trigger_label: 'Nouveau lead créé',
    trigger_config: {},
    actions: [
      {
        id: 'a1',
        type: 'wait',
        label: 'Attendre 2 minutes',
        description: 'Délai pour permettre la validation du RDV',
        config: { duration: 2, unit: 'minutes' },
        order: 1
      },
      {
        id: 'a2',
        type: 'send_email',
        label: 'Envoyer WhatsApp de confirmation',
        description: 'Template WhatsApp: Confirmation RDV - TEXT only',
        config: {
          template: 'msg_d2813bb1ec2be305',
          channel: 'whatsapp',
          contentSid: 'Hxb52bb079e24d459e6b3962a49213096e'
        },
        order: 2
      },
      {
        id: 'a3',
        type: 'add_tag',
        label: 'Ajouter tag "rdv_confirmé"',
        description: 'Marquer le lead comme ayant reçu la confirmation',
        config: { tags: ['rdv_confirmé'] },
        order: 3
      }
    ],
    stats_total_executions: 247,
    stats_success_rate: 99.2,
    stats_last_executed: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    stats_average_duration: 180
  },
  {
    name: 'Rappel RDV WhatsApp J-1',
    description: 'Rappel automatique par WhatsApp 24h avant le rendez-vous',
    status: 'active',
    trigger_type: 'time_based',
    trigger_label: 'Tous les jours à 9h00',
    trigger_config: { schedule: '0 9 * * *', timezone: 'Europe/Paris' },
    actions: [
      {
        id: 'b1',
        type: 'send_email',
        label: 'Envoyer WhatsApp de rappel',
        description: 'Template WhatsApp: Rappel RDV',
        config: {
          template: 'msg_4bd47f36d5a81cef',
          channel: 'whatsapp',
          contentSid: 'HX43ff9d92de715f0d410727f0287d47b7'
        },
        order: 1
      },
      {
        id: 'b2',
        type: 'create_task',
        label: 'Créer tâche de suivi',
        description: 'Préparer le dossier pour le RDV',
        config: {
          title: 'Préparer dossier client pour RDV demain',
          dueIn: 1,
          dueUnit: 'hours'
        },
        order: 2
      },
      {
        id: 'b3',
        type: 'add_tag',
        label: 'Ajouter tag "rappel_envoyé"',
        description: 'Marquer que le rappel a été envoyé',
        config: { tags: ['rappel_envoyé'] },
        order: 3
      }
    ],
    stats_total_executions: 183,
    stats_success_rate: 97.8,
    stats_last_executed: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    stats_average_duration: 240
  },
  {
    name: 'Relance WhatsApp J+1 sans réponse',
    description: 'Relance automatique par WhatsApp si aucune réponse après 24h',
    status: 'active',
    trigger_type: 'time_based',
    trigger_label: 'Vérification toutes les heures',
    trigger_config: { schedule: '0 * * * *', timezone: 'Europe/Paris' },
    actions: [
      {
        id: 'c1',
        type: 'send_email',
        label: 'Envoyer WhatsApp Relance J+1',
        description: 'Template WhatsApp: Relance J+1',
        config: {
          template: 'msg_c5b9c04d3d99ffd7',
          channel: 'whatsapp',
          contentSid: 'HX8edc734256e6b70b5d73bc61a7921505'
        },
        order: 1
      },
      {
        id: 'c2',
        type: 'update_field',
        label: 'Marquer comme "relancé"',
        description: 'Changer statut en "Relancé J+1"',
        config: { field: 'status', value: 'relanced_d1' },
        order: 2
      },
      {
        id: 'c3',
        type: 'add_tag',
        label: 'Ajouter tag "relance_j1"',
        description: 'Identifier les leads relancés après 24h',
        config: { tags: ['relance_j1'] },
        order: 3
      }
    ],
    stats_total_executions: 156,
    stats_success_rate: 95.5,
    stats_last_executed: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    stats_average_duration: 200
  },
  {
    name: 'Relance WhatsApp J+3 insistante',
    description: 'Dernière relance WhatsApp si toujours aucune réponse après 3 jours',
    status: 'active',
    trigger_type: 'time_based',
    trigger_label: 'Vérification quotidienne à 14h',
    trigger_config: { schedule: '0 14 * * *', timezone: 'Europe/Paris' },
    actions: [
      {
        id: 'd1',
        type: 'send_email',
        label: 'Envoyer WhatsApp Relance J+3',
        description: 'Template WhatsApp: Relance J+3',
        config: {
          template: 'msg_5d2653309b7207a9',
          channel: 'whatsapp',
          contentSid: 'HX70f182f65f2ebd94b9cd80679bf039e1'
        },
        order: 1
      },
      {
        id: 'd2',
        type: 'create_task',
        label: 'Créer tâche appel manuel',
        description: 'Si pas de réponse après J+3, prévoir appel téléphonique',
        config: {
          title: 'Appeler le lead - Dernière tentative',
          dueIn: 2,
          dueUnit: 'hours'
        },
        order: 2
      },
      {
        id: 'd3',
        type: 'add_tag',
        label: 'Ajouter tag "relance_j3"',
        description: 'Marquer comme relancé J+3',
        config: { tags: ['relance_j3'] },
        order: 3
      }
    ],
    stats_total_executions: 89,
    stats_success_rate: 92.1,
    stats_last_executed: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    stats_average_duration: 220
  },
  {
    name: 'Panier abandonné WhatsApp',
    description: 'Relance WhatsApp automatique pour les paniers abandonnés sur le site',
    status: 'active',
    trigger_type: 'lead_status_changed',
    trigger_label: 'Statut → Panier abandonné',
    trigger_config: { fromStatus: 'En cours', toStatus: 'Panier abandonné' },
    actions: [
      {
        id: 'e1',
        type: 'send_email',
        label: 'Envoyer WhatsApp panier abandonné',
        description: 'Template WhatsApp: Panier abandonné - simple',
        config: {
          template: 'msg_ade34fbb749a144c',
          channel: 'whatsapp',
          contentSid: 'HX61f249a45e5bbb10e7c26efce55c6446'
        },
        order: 1
      },
      {
        id: 'e2',
        type: 'create_task',
        label: 'Créer tâche de suivi commercial',
        description: 'Prévoir un suivi personnalisé pour ce prospect',
        config: {
          title: 'Appeler pour comprendre le blocage panier',
          dueIn: 1,
          dueUnit: 'days'
        },
        order: 2
      },
      {
        id: 'e3',
        type: 'add_tag',
        label: 'Ajouter tag "panier_abandonné"',
        description: 'Identifier pour analyse des abandons',
        config: { tags: ['panier_abandonné'] },
        order: 3
      }
    ],
    stats_total_executions: 78,
    stats_success_rate: 88.5,
    stats_last_executed: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    stats_average_duration: 190
  },
  {
    name: 'Inscription événement WhatsApp',
    description: 'Confirmation automatique par WhatsApp après inscription à un événement',
    status: 'inactive',
    trigger_type: 'lead_status_changed',
    trigger_label: 'Statut → Inscrit événement',
    trigger_config: { toStatus: 'event_registered' },
    actions: [
      {
        id: 'f1',
        type: 'send_email',
        label: 'Envoyer WhatsApp confirmation inscription',
        description: 'Template WhatsApp: Inscription événement',
        config: {
          template: 'msg_caab3cc83cf72d39',
          channel: 'whatsapp',
          contentSid: 'HXf257b92197254aaae707f913a137a76e'
        },
        order: 1
      },
      {
        id: 'f2',
        type: 'add_tag',
        label: 'Ajouter tag "événement_2025"',
        description: 'Identifier les participants événement',
        config: { tags: ['événement_2025'] },
        order: 2
      },
      {
        id: 'f3',
        type: 'create_task',
        label: 'Préparer matériel événement',
        description: "Tâche pour l'équipe logistique",
        config: {
          title: 'Préparer badge et documentation participant',
          dueIn: 2,
          dueUnit: 'days'
        },
        order: 3
      }
    ],
    stats_total_executions: 0,
    stats_success_rate: 0,
    stats_last_executed: null,
    stats_average_duration: 0
  }
];

async function seedAutomations(tenantId = 'macrea') {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚡ SEED AUTOMATIONS - Migration des workflows mockés');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Tenant: ${tenantId}`);
  console.log(`Workflows à insérer: ${WORKFLOWS.length}`);
  console.log('');

  // Vérifier si des automations existent déjà pour ce tenant
  const { data: existing, error: checkError } = await supabase
    .from('automations')
    .select('id, name')
    .eq('tenant_id', tenantId);

  if (checkError) {
    console.error('❌ Erreur vérification:', checkError.message);
    console.log('');
    console.log('💡 Avez-vous exécuté la migration 014_automations.sql ?');
    console.log("   Exécutez-la d'abord dans Supabase SQL Editor.");
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`⚠️  ${existing.length} automations existent déjà pour ce tenant:`);
    existing.forEach(a => console.log(`   - ${a.name}`));
    console.log('');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Voulez-vous continuer et ajouter les nouvelles automations ? (y/n) ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Annulé.');
      process.exit(0);
    }
  }

  // Insérer les workflows
  let inserted = 0;
  let skipped = 0;

  for (const workflow of WORKFLOWS) {
    // Vérifier si ce workflow existe déjà (par nom)
    const exists = existing?.some(e => e.name === workflow.name);

    if (exists) {
      console.log(`⏭️  Skip (existe déjà): ${workflow.name}`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: tenantId,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        trigger_type: workflow.trigger_type,
        trigger_label: workflow.trigger_label,
        trigger_config: workflow.trigger_config,
        actions: workflow.actions,
        stats_total_executions: workflow.stats_total_executions,
        stats_success_rate: workflow.stats_success_rate,
        stats_last_executed: workflow.stats_last_executed,
        stats_average_duration: workflow.stats_average_duration,
        created_by: 'system'
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Erreur insert "${workflow.name}":`, error.message);
    } else {
      console.log(`✅ Inséré: ${workflow.name} (${workflow.trigger_type}) → ${data.id.substring(0, 8)}`);
      inserted++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 RÉSULTAT: ${inserted} insérés, ${skipped} ignorés`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Afficher un résumé par trigger type
  const { data: summary } = await supabase
    .from('automations')
    .select('trigger_type, status')
    .eq('tenant_id', tenantId);

  if (summary) {
    const byTrigger = {};
    const byStatus = {};

    summary.forEach(a => {
      byTrigger[a.trigger_type] = (byTrigger[a.trigger_type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });

    console.log('Automations par type de déclencheur:');
    Object.entries(byTrigger).forEach(([type, count]) => {
      console.log(`   🔔 ${type}: ${count}`);
    });

    console.log('');
    console.log('Automations par statut:');
    Object.entries(byStatus).forEach(([status, count]) => {
      const icon = status === 'active' ? '✅' : status === 'inactive' ? '⏸️' : '📝';
      console.log(`   ${icon} ${status}: ${count}`);
    });
  }
}

// Exécution
const tenantId = process.argv[2] || 'macrea';
seedAutomations(tenantId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
