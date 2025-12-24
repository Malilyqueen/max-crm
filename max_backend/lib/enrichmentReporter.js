/**
 * enrichmentReporter.js
 * Système de reporting pour les enrichissements intelligents
 *
 * Enregistre et formate les rapports d'enrichissement pour affichage
 * dans l'interface M.A.X.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const ENRICHMENTS_FILE = path.join(REPORTS_DIR, 'enrichments.json');

/**
 * S'assure que le dossier de rapports existe
 */
async function ensureReportsDir() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error('[EnrichmentReporter] Erreur création dossier reports:', error);
  }
}

/**
 * Enregistre un rapport d'enrichissement
 * @param {Object} enrichmentData - Données de l'enrichissement
 * @returns {Promise<string>} ID du rapport
 */
export async function saveEnrichmentReport(enrichmentData) {
  await ensureReportsDir();

  const reportId = `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const report = {
    id: reportId,
    timestamp: new Date().toISOString(),
    ...enrichmentData
  };

  try {
    // Charger les rapports existants
    let reports = [];
    try {
      const data = await fs.readFile(ENRICHMENTS_FILE, 'utf-8');
      reports = JSON.parse(data);
    } catch (error) {
      // Fichier n'existe pas encore, on commence avec un tableau vide
      reports = [];
    }

    // Ajouter le nouveau rapport
    reports.unshift(report); // Ajouter au début (plus récent en premier)

    // Garder seulement les 100 derniers rapports
    if (reports.length > 100) {
      reports = reports.slice(0, 100);
    }

    // Sauvegarder
    await fs.writeFile(ENRICHMENTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');

    console.log(`[EnrichmentReporter] Rapport sauvegardé: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('[EnrichmentReporter] Erreur sauvegarde rapport:', error);
    throw error;
  }
}

/**
 * Récupère tous les rapports d'enrichissement
 * @param {number} limit - Nombre maximum de rapports à retourner
 * @returns {Promise<Array>} Liste des rapports
 */
export async function getEnrichmentReports(limit = 20) {
  await ensureReportsDir();

  try {
    const data = await fs.readFile(ENRICHMENTS_FILE, 'utf-8');
    const reports = JSON.parse(data);
    return reports.slice(0, limit);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Fichier n'existe pas encore
    }
    console.error('[EnrichmentReporter] Erreur lecture rapports:', error);
    throw error;
  }
}

/**
 * Récupère un rapport spécifique par ID
 * @param {string} reportId - ID du rapport
 * @returns {Promise<Object|null>} Rapport ou null si non trouvé
 */
export async function getEnrichmentReport(reportId) {
  const reports = await getEnrichmentReports(100);
  return reports.find(r => r.id === reportId) || null;
}

/**
 * Génère des statistiques globales d'enrichissement
 * @returns {Promise<Object>} Statistiques
 */
export async function getEnrichmentStats() {
  const reports = await getEnrichmentReports(100);

  if (reports.length === 0) {
    return {
      totalReports: 0,
      totalLeadsAnalyzed: 0,
      totalLeadsEnriched: 0,
      totalLeadsSkipped: 0,
      successRate: 0,
      sectorsDetected: {},
      last7Days: []
    };
  }

  let totalAnalyzed = 0;
  let totalEnriched = 0;
  let totalSkipped = 0;
  const sectorsCount = {};

  // Stats des 7 derniers jours
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dailyStats = {};

  reports.forEach(report => {
    totalAnalyzed += report.analyzed || 0;
    totalEnriched += report.enriched || 0;
    totalSkipped += report.skipped || 0;

    // Compter les secteurs détectés
    if (report.details && Array.isArray(report.details)) {
      report.details
        .filter(d => d.status === 'enriched' && d.secteur)
        .forEach(d => {
          sectorsCount[d.secteur] = (sectorsCount[d.secteur] || 0) + 1;
        });
    }

    // Stats par jour
    const reportDate = new Date(report.timestamp);
    if (reportDate >= sevenDaysAgo) {
      const day = reportDate.toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { analyzed: 0, enriched: 0, skipped: 0 };
      }
      dailyStats[day].analyzed += report.analyzed || 0;
      dailyStats[day].enriched += report.enriched || 0;
      dailyStats[day].skipped += report.skipped || 0;
    }
  });

  const successRate = totalAnalyzed > 0
    ? ((totalEnriched / totalAnalyzed) * 100).toFixed(2)
    : 0;

  return {
    totalReports: reports.length,
    totalLeadsAnalyzed: totalAnalyzed,
    totalLeadsEnriched: totalEnriched,
    totalLeadsSkipped: totalSkipped,
    successRate: parseFloat(successRate),
    sectorsDetected: sectorsCount,
    last7Days: Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats
    })).sort((a, b) => b.date.localeCompare(a.date))
  };
}

/**
 * Formate un rapport pour affichage
 * @param {Object} report - Rapport d'enrichissement
 * @returns {string} Rapport formaté en Markdown
 */
export function formatReportForDisplay(report) {
  if (!report) {
    return '❌ Rapport non trouvé';
  }

  const date = new Date(report.timestamp).toLocaleString('fr-FR');
  const successRate = report.analyzed > 0
    ? ((report.enriched / report.analyzed) * 100).toFixed(1)
    : 0;

  let markdown = `# 📊 Rapport d'Enrichissement\n\n`;
  markdown += `**Date** : ${date}\n`;
  markdown += `**ID** : \`${report.id}\`\n\n`;

  markdown += `## 📈 Résumé\n\n`;
  markdown += `- **Leads analysés** : ${report.analyzed || 0}\n`;
  markdown += `- **Leads enrichis** : ${report.enriched || 0} ✅\n`;
  markdown += `- **Leads ignorés** : ${report.skipped || 0} ⏭️\n`;
  markdown += `- **Taux de succès** : ${successRate}%\n\n`;

  // Détails des leads enrichis
  if (report.details && Array.isArray(report.details)) {
    const enriched = report.details.filter(d => d.status === 'enriched');

    if (enriched.length > 0) {
      markdown += `## ✅ Leads Enrichis (${enriched.length})\n\n`;
      markdown += `| Lead | Email | Secteur | Tags | Confiance |\n`;
      markdown += `|------|-------|---------|------|----------|\n`;

      enriched.slice(0, 20).forEach(lead => {
        const tags = Array.isArray(lead.tags)
          ? lead.tags.slice(0, 3).join(', ')
          : '';
        markdown += `| ${lead.name} | ${lead.email} | ${lead.secteur} | ${tags} | ${lead.confiance} |\n`;
      });

      if (enriched.length > 20) {
        markdown += `\n*... et ${enriched.length - 20} autres leads*\n`;
      }
    }

    // Détails des erreurs
    const errors = report.details.filter(d => d.status === 'skipped' || d.status === 'error');

    if (errors.length > 0) {
      markdown += `\n## ⚠️ Leads Ignorés/Erreurs (${errors.length})\n\n`;
      markdown += `| Lead | Email | Raison |\n`;
      markdown += `|------|-------|--------|\n`;

      errors.slice(0, 10).forEach(lead => {
        markdown += `| ${lead.name || 'N/A'} | ${lead.email || 'N/A'} | ${lead.reason} |\n`;
      });

      if (errors.length > 10) {
        markdown += `\n*... et ${errors.length - 10} autres*\n`;
      }
    }
  }

  // Secteurs détectés
  if (report.details) {
    const enriched = report.details.filter(d => d.status === 'enriched');
    const sectorsCount = {};

    enriched.forEach(lead => {
      if (lead.secteur) {
        sectorsCount[lead.secteur] = (sectorsCount[lead.secteur] || 0) + 1;
      }
    });

    if (Object.keys(sectorsCount).length > 0) {
      markdown += `\n## 🏢 Secteurs Détectés\n\n`;
      Object.entries(sectorsCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([secteur, count]) => {
          markdown += `- **${secteur}** : ${count} lead${count > 1 ? 's' : ''}\n`;
        });
    }
  }

  markdown += `\n---\n`;
  markdown += `*Rapport généré par M.A.X. - Enrichissement Intelligent*\n`;

  return markdown;
}

/**
 * Génère un rapport de statistiques globales
 * @returns {Promise<string>} Statistiques formatées en Markdown
 */
export async function formatGlobalStats() {
  const stats = await getEnrichmentStats();

  let markdown = `# 📊 Statistiques Globales d'Enrichissement\n\n`;

  markdown += `## 📈 Vue d'ensemble\n\n`;
  markdown += `- **Total rapports** : ${stats.totalReports}\n`;
  markdown += `- **Total leads analysés** : ${stats.totalLeadsAnalyzed}\n`;
  markdown += `- **Total leads enrichis** : ${stats.totalLeadsEnriched} ✅\n`;
  markdown += `- **Total leads ignorés** : ${stats.totalLeadsSkipped} ⏭️\n`;
  markdown += `- **Taux de succès global** : ${stats.successRate}%\n\n`;

  // Secteurs les plus détectés
  if (Object.keys(stats.sectorsDetected).length > 0) {
    markdown += `## 🏢 Top Secteurs Détectés\n\n`;
    Object.entries(stats.sectorsDetected)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([secteur, count], index) => {
        markdown += `${index + 1}. **${secteur}** : ${count} lead${count > 1 ? 's' : ''}\n`;
      });
    markdown += `\n`;
  }

  // Activité des 7 derniers jours
  if (stats.last7Days.length > 0) {
    markdown += `## 📅 Activité des 7 derniers jours\n\n`;
    markdown += `| Date | Analysés | Enrichis | Ignorés | Taux |\n`;
    markdown += `|------|----------|----------|---------|------|\n`;

    stats.last7Days.forEach(day => {
      const rate = day.analyzed > 0
        ? ((day.enriched / day.analyzed) * 100).toFixed(1)
        : 0;
      markdown += `| ${day.date} | ${day.analyzed} | ${day.enriched} | ${day.skipped} | ${rate}% |\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n`;
  markdown += `*Statistiques M.A.X. - Enrichissement Intelligent*\n`;

  return markdown;
}
