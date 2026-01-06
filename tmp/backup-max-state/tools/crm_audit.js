/**
 * CRM AUDIT TOOL - Détecte les incohérences structurelles dans EspoCRM
 * Identifie:
 * - Champs définis dans metadata mais absents dans les leads
 * - Champs présents dans les leads mais non définis dans metadata
 * - Valeurs NULL vs champs manquants
 * - Versions de schéma différentes entre leads
 */

import { espoFetch } from '../lib/espoClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Récupère la définition metadata des champs Lead
 */
async function getLeadFieldsMetadata() {
  const metadataPath = path.join(
    process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm',
    'custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json'
  );

  if (fs.existsSync(metadataPath)) {
    const content = fs.readFileSync(metadataPath, 'utf8');
    const metadata = JSON.parse(content);
    return metadata.fields || {};
  }

  return {};
}

/**
 * Récupère tous les leads d'EspoCRM
 */
async function getAllLeads() {
  const response = await espoFetch('/Lead?maxSize=200');
  return response.list || [];
}

/**
 * Analyse un lead individuel pour détecter les incohérences
 */
function analyzeLead(lead, expectedFields) {
  const analysis = {
    id: lead.id,
    name: lead.name,
    modifiedAt: lead.modifiedAt,
    issues: [],
    missingFields: [],
    extraFields: [],
    nullFields: [],
    populatedFields: []
  };

  const leadKeys = Object.keys(lead);
  const expectedKeys = Object.keys(expectedFields);

  // Champs attendus mais absents
  for (const fieldName of expectedKeys) {
    if (expectedFields[fieldName].isCustom) {
      if (!(fieldName in lead)) {
        analysis.missingFields.push(fieldName);
        analysis.issues.push(`Champ "${fieldName}" défini dans metadata mais absent du lead`);
      } else if (lead[fieldName] === null || lead[fieldName] === undefined) {
        analysis.nullFields.push(fieldName);
      } else {
        analysis.populatedFields.push(fieldName);
      }
    }
  }

  // Champs présents mais non définis dans metadata
  for (const fieldName of leadKeys) {
    if (!expectedKeys.includes(fieldName) && !fieldName.startsWith('_') && fieldName !== 'id' && fieldName !== 'name') {
      analysis.extraFields.push(fieldName);
      analysis.issues.push(`Champ "${fieldName}" présent dans le lead mais non défini dans metadata`);
    }
  }

  return analysis;
}

/**
 * Génère un rapport d'audit complet
 */
async function auditCRM() {
  console.log('[CRM_AUDIT] 🔍 Démarrage audit EspoCRM...\n');

  // 1. Récupérer les définitions de champs
  const expectedFields = await getLeadFieldsMetadata();
  console.log(`[CRM_AUDIT] 📋 Champs définis dans metadata: ${Object.keys(expectedFields).length}`);
  console.log(`[CRM_AUDIT] 📋 Champs custom: ${Object.values(expectedFields).filter(f => f.isCustom).length}\n`);

  // 2. Récupérer tous les leads
  const leads = await getAllLeads();
  console.log(`[CRM_AUDIT] 👥 Leads trouvés: ${leads.length}\n`);

  // 3. Analyser chaque lead
  const analyses = leads.map(lead => analyzeLead(lead, expectedFields));

  // 4. Agrégation des résultats
  const report = {
    totalLeads: leads.length,
    timestamp: new Date().toISOString(),
    fieldsInMetadata: Object.keys(expectedFields).filter(k => expectedFields[k].isCustom),
    globalIssues: {
      leadsWithMissingFields: 0,
      leadsWithExtraFields: 0,
      leadsWithNullFields: 0,
      leadsClean: 0
    },
    fieldUsage: {},
    inconsistencies: []
  };

  // Compter l'usage de chaque champ custom
  for (const fieldName of report.fieldsInMetadata) {
    report.fieldUsage[fieldName] = {
      present: 0,
      missing: 0,
      null: 0,
      populated: 0
    };
  }

  // Analyser les résultats
  for (const analysis of analyses) {
    if (analysis.issues.length === 0 && analysis.nullFields.length === 0) {
      report.globalIssues.leadsClean++;
    }

    if (analysis.missingFields.length > 0) {
      report.globalIssues.leadsWithMissingFields++;
    }

    if (analysis.extraFields.length > 0) {
      report.globalIssues.leadsWithExtraFields++;
    }

    if (analysis.nullFields.length > 0) {
      report.globalIssues.leadsWithNullFields++;
    }

    // Mettre à jour l'usage des champs
    for (const fieldName of report.fieldsInMetadata) {
      if (analysis.missingFields.includes(fieldName)) {
        report.fieldUsage[fieldName].missing++;
      } else if (analysis.nullFields.includes(fieldName)) {
        report.fieldUsage[fieldName].null++;
        report.fieldUsage[fieldName].present++;
      } else if (analysis.populatedFields.includes(fieldName)) {
        report.fieldUsage[fieldName].populated++;
        report.fieldUsage[fieldName].present++;
      }
    }

    // Stocker les leads problématiques
    if (analysis.issues.length > 0) {
      report.inconsistencies.push({
        id: analysis.id,
        name: analysis.name,
        modifiedAt: analysis.modifiedAt,
        issues: analysis.issues,
        missingFields: analysis.missingFields,
        extraFields: analysis.extraFields
      });
    }
  }

  return { report, analyses };
}

/**
 * Affiche un rapport formaté
 */
function displayReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT D\'AUDIT CRM');
  console.log('='.repeat(80));
  console.log(`📅 Date: ${report.timestamp}`);
  console.log(`👥 Total leads: ${report.totalLeads}`);
  console.log('\n📋 CHAMPS CUSTOM DÉFINIS:');
  report.fieldsInMetadata.forEach(f => console.log(`   - ${f}`));

  console.log('\n🔍 STATISTIQUES GLOBALES:');
  console.log(`   ✅ Leads propres (aucun problème): ${report.globalIssues.leadsClean}`);
  console.log(`   ⚠️  Leads avec champs manquants: ${report.globalIssues.leadsWithMissingFields}`);
  console.log(`   ⚠️  Leads avec champs orphelins: ${report.globalIssues.leadsWithExtraFields}`);
  console.log(`   📭 Leads avec champs NULL: ${report.globalIssues.leadsWithNullFields}`);

  console.log('\n📊 USAGE DES CHAMPS CUSTOM:');
  Object.entries(report.fieldUsage).forEach(([fieldName, usage]) => {
    const percentPresent = ((usage.present / report.totalLeads) * 100).toFixed(1);
    const percentPopulated = ((usage.populated / report.totalLeads) * 100).toFixed(1);
    console.log(`\n   🔹 ${fieldName}:`);
    console.log(`      Présent: ${usage.present}/${report.totalLeads} (${percentPresent}%)`);
    console.log(`      Rempli: ${usage.populated}/${report.totalLeads} (${percentPopulated}%)`);
    console.log(`      NULL: ${usage.null}`);
    console.log(`      Manquant: ${usage.missing}`);
  });

  if (report.inconsistencies.length > 0) {
    console.log(`\n⚠️  INCOHÉRENCES DÉTECTÉES (${report.inconsistencies.length} leads):`);
    report.inconsistencies.slice(0, 5).forEach(inc => {
      console.log(`\n   Lead: ${inc.name} (${inc.id})`);
      inc.issues.forEach(issue => console.log(`      ❌ ${issue}`));
    });
    if (report.inconsistencies.length > 5) {
      console.log(`\n   ... et ${report.inconsistencies.length - 5} autres leads avec problèmes`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// Export pour utilisation comme tool
export {
  auditCRM,
  displayReport,
  getLeadFieldsMetadata,
  getAllLeads,
  analyzeLead
};

// Exécution directe
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    try {
      const { report } = await auditCRM();
      displayReport(report);

      // Sauvegarder le rapport
      const reportPath = path.join(__dirname, '../audit_reports', `audit_${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);
    } catch (error) {
      console.error('[CRM_AUDIT] ❌ Erreur:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}
