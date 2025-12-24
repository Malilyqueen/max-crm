/**
 * Script pour enrichir TOUS les leads directement
 * Contourne M.A.X. pour tester si le code d'enrichissement fonctionne
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { batchAnalyzeLeads, formatEnrichedLeadsForUpdate } from './lib/emailAnalyzer.js';

dotenv.config();

const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const API_KEY = '7b8a983aab7071bb64f18a75cf27ebbc';

async function espoFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} - ${await response.text()}`);
  }

  return response.json();
}

async function enrichAllLeads() {
  console.log('🚀 ENRICHISSEMENT DIRECT DE TOUS LES LEADS\n');

  // 1. Récupérer tous les leads
  console.log('1️⃣ Récupération des leads...');
  const leadsData = await espoFetch('/Lead?maxSize=20&orderBy=createdAt&order=desc');
  const leads = leadsData.list;

  console.log(`   ✅ ${leads.length} leads récupérés\n`);

  // 2. Analyser les leads
  console.log('2️⃣ Analyse des leads par l\'IA...');
  const analysisResults = await batchAnalyzeLeads(leads);

  console.log(`   ✅ Analysés: ${analysisResults.analyzed}`);
  console.log(`   ✅ Enrichis: ${analysisResults.enriched}`);
  console.log(`   ⏭️  Ignorés: ${analysisResults.skipped}\n`);

  // 3. Formater pour mise à jour
  const leadsForUpdate = formatEnrichedLeadsForUpdate(analysisResults.details);

  console.log('3️⃣ Application des enrichissements...\n');

  let updated = 0;
  let failed = 0;

  for (const lead of leadsForUpdate) {
    try {
      console.log(`   📝 Mise à jour: ${lead.name || lead.id}`);
      console.log(`      Secteur: ${lead.secteur || '(vide)'}`);
      console.log(`      maxTags: ${JSON.stringify(lead.maxTags) || '(vide)'}`);

      await espoFetch(`/Lead/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          secteur: lead.secteur,
          maxTags: lead.maxTags,
          description: lead.description
        })
      });

      console.log(`      ✅ Mis à jour avec succès\n`);
      updated++;
    } catch (error) {
      console.log(`      ❌ Erreur: ${error.message}\n`);
      failed++;
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ ENRICHISSEMENT TERMINÉ`);
  console.log(`   • Mis à jour: ${updated}`);
  console.log(`   • Échecs: ${failed}`);
  console.log('═══════════════════════════════════════\n');
}

enrichAllLeads().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
