/**
 * fileAnalyzer.js
 *
 * Analyse intelligente de fichiers multiples formats
 * - CSV/Excel: détection colonnes, qualité données
 * - PDF/DOCX/DOC: extraction texte
 * - TXT/MD/JSON/XML/HTML: lecture directe
 * - Analyse sémantique et suggestions enrichissement
 */

import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';

/**
 * Type de colonne détecté
 */
const COLUMN_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  COMPANY: 'company',
  ADDRESS: 'address',
  DATE: 'date',
  URL: 'url',
  NUMERIC: 'numeric',
  TEXT: 'text',
  UNKNOWN: 'unknown'
};

/**
 * Champs standards CRM attendus
 */
const EXPECTED_FIELDS = [
  { name: 'email', label: 'Email', type: COLUMN_TYPES.EMAIL, critical: true },
  { name: 'phone', label: 'Téléphone', type: COLUMN_TYPES.PHONE, critical: false },
  { name: 'name', label: 'Nom', type: COLUMN_TYPES.NAME, critical: true },
  { name: 'company', label: 'Entreprise', type: COLUMN_TYPES.COMPANY, critical: false },
  { name: 'description', label: 'Description', type: COLUMN_TYPES.TEXT, critical: false },
  { name: 'status', label: 'Statut', type: COLUMN_TYPES.TEXT, critical: false },
  { name: 'source', label: 'Source', type: COLUMN_TYPES.TEXT, critical: false },
  { name: 'tags', label: 'Tags', type: COLUMN_TYPES.TEXT, critical: false }
];

/**
 * Parse un fichier CSV et retourne les données
 * @param {Buffer|string} fileContent - Contenu du fichier
 * @param {Object} options - Options de parsing
 * @returns {Promise<Object>} - { data: Array, errors: Array, meta: Object }
 */
export function parseCSV(fileContent, options = {}) {
  return new Promise((resolve, reject) => {
    const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf8') : fileContent;

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      encoding: 'utf8',
      ...options,
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
          meta: results.meta
        });
      },
      error: (error) => {
        reject(new Error(`Erreur parsing CSV: ${error.message}`));
      }
    });
  });
}

/**
 * Détecte le type d'une colonne en analysant ses valeurs
 * @param {string} columnName - Nom de la colonne
 * @param {Array} values - Valeurs de la colonne (sample)
 * @returns {string} - Type détecté
 */
function detectColumnType(columnName, values) {
  const name = columnName.toLowerCase();
  const sample = values.filter(v => v && v.trim()).slice(0, 10); // 10 premiers non-vides

  if (sample.length === 0) return COLUMN_TYPES.UNKNOWN;

  // Détection par nom de colonne
  if (/(email|e-mail|mail)/i.test(name)) {
    return COLUMN_TYPES.EMAIL;
  }
  if (/(phone|tel|telephone|mobile|gsm)/i.test(name)) {
    return COLUMN_TYPES.PHONE;
  }
  if (/(name|nom|prenom|firstname|lastname|contact)/i.test(name)) {
    return COLUMN_TYPES.NAME;
  }
  if (/(company|entreprise|societe|organization)/i.test(name)) {
    return COLUMN_TYPES.COMPANY;
  }
  if (/(address|adresse|rue|street)/i.test(name)) {
    return COLUMN_TYPES.ADDRESS;
  }
  if (/(date|created|modified|birth)/i.test(name)) {
    return COLUMN_TYPES.DATE;
  }
  if (/(url|website|site|link)/i.test(name)) {
    return COLUMN_TYPES.URL;
  }

  // Détection par contenu
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[\d\s\-\+\(\)\.]{8,}$/;
  const urlPattern = /^https?:\/\//i;
  const datePattern = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/;
  const numericPattern = /^-?\d+\.?\d*$/;

  let emailCount = 0;
  let phoneCount = 0;
  let urlCount = 0;
  let dateCount = 0;
  let numericCount = 0;

  sample.forEach(value => {
    const val = String(value).trim();
    if (emailPattern.test(val)) emailCount++;
    if (phonePattern.test(val)) phoneCount++;
    if (urlPattern.test(val)) urlCount++;
    if (datePattern.test(val)) dateCount++;
    if (numericPattern.test(val)) numericCount++;
  });

  const threshold = sample.length * 0.7; // 70% des valeurs

  if (emailCount >= threshold) return COLUMN_TYPES.EMAIL;
  if (phoneCount >= threshold) return COLUMN_TYPES.PHONE;
  if (urlCount >= threshold) return COLUMN_TYPES.URL;
  if (dateCount >= threshold) return COLUMN_TYPES.DATE;
  if (numericCount >= threshold) return COLUMN_TYPES.NUMERIC;

  return COLUMN_TYPES.TEXT;
}

/**
 * Analyse les colonnes d'un dataset
 * @param {Array} data - Données parsées
 * @returns {Array} - Liste des colonnes avec stats
 */
function analyzeColumns(data) {
  if (!data || data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const totalRows = data.length;

  return columns.map(colName => {
    const values = data.map(row => row[colName]);
    const nonEmptyValues = values.filter(v => v && String(v).trim());
    const emptyCount = totalRows - nonEmptyValues.length;
    const completionRate = (nonEmptyValues.length / totalRows) * 100;

    const type = detectColumnType(colName, nonEmptyValues);

    // Détecter doublons
    const uniqueValues = new Set(nonEmptyValues.map(v => String(v).toLowerCase().trim()));
    const duplicateRate = ((nonEmptyValues.length - uniqueValues.size) / nonEmptyValues.length) * 100;

    return {
      name: colName,
      type,
      totalValues: totalRows,
      emptyValues: emptyCount,
      completionRate: Math.round(completionRate),
      uniqueValues: uniqueValues.size,
      duplicateRate: Math.round(duplicateRate),
      sample: nonEmptyValues.slice(0, 3) // 3 exemples
    };
  });
}

/**
 * Identifie les champs manquants par rapport aux standards CRM
 * @param {Array} detectedColumns - Colonnes détectées
 * @returns {Array} - Champs manquants avec priorité
 */
function detectMissingFields(detectedColumns) {
  const detectedTypes = new Set(detectedColumns.map(col => col.type));
  const detectedNames = new Set(detectedColumns.map(col => col.name.toLowerCase()));

  const missing = EXPECTED_FIELDS.filter(expected => {
    // Vérifier si le type existe déjà
    const typeExists = detectedTypes.has(expected.type);
    // Vérifier si le nom existe (fuzzy match)
    const nameExists = Array.from(detectedNames).some(name =>
      name.includes(expected.name) || expected.name.includes(name)
    );

    return !typeExists && !nameExists;
  });

  return missing.map(field => ({
    name: field.name,
    label: field.label,
    type: field.type,
    critical: field.critical,
    priority: field.critical ? 'high' : 'medium'
  }));
}

/**
 * Analyse la qualité globale des données
 * @param {Array} data - Données parsées
 * @param {Array} columns - Colonnes analysées
 * @returns {Object} - Rapport qualité
 */
function analyzeDataQuality(data, columns) {
  const totalRows = data.length;
  const totalCells = totalRows * columns.length;

  // Compter cellules vides
  let emptyCells = 0;
  columns.forEach(col => {
    emptyCells += col.emptyValues;
  });

  const completionRate = ((totalCells - emptyCells) / totalCells) * 100;

  // Détecter lignes totalement vides ou quasi-vides
  const almostEmptyRows = data.filter(row => {
    const filledCells = Object.values(row).filter(v => v && String(v).trim()).length;
    return filledCells <= 1; // 1 cellule remplie ou moins
  }).length;

  // Détecter doublons complets (basé sur email si présent)
  const emailColumn = columns.find(col => col.type === COLUMN_TYPES.EMAIL);
  let duplicateRows = 0;

  if (emailColumn) {
    const emails = data.map(row => String(row[emailColumn.name] || '').toLowerCase().trim());
    const uniqueEmails = new Set(emails.filter(e => e));
    const nonEmptyEmails = emails.filter(e => e).length;
    duplicateRows = nonEmptyEmails - uniqueEmails.size;
  }

  // Détecter erreurs de format
  const formatErrors = columns.reduce((count, col) => {
    if (col.type === COLUMN_TYPES.EMAIL) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = data.filter(row => {
        const val = row[col.name];
        return val && val.trim() && !emailPattern.test(val);
      }).length;
      return count + invalidEmails;
    }
    return count;
  }, 0);

  return {
    totalRows,
    totalCells,
    emptyCells,
    completionRate: Math.round(completionRate),
    almostEmptyRows,
    duplicateRows,
    formatErrors,
    quality: completionRate >= 80 ? 'good' : completionRate >= 50 ? 'medium' : 'poor'
  };
}

/**
 * Détecte le type de fichier et retourne le format
 * @param {string} filename - Nom du fichier
 * @returns {string} - Format détecté
 */
function detectFileFormat(filename) {
  const ext = path.extname(filename).toLowerCase();

  if (['.csv'].includes(ext)) return 'csv';
  if (['.xlsx', '.xls'].includes(ext)) return 'excel';
  if (['.txt', '.md', '.log'].includes(ext)) return 'text';
  if (['.json'].includes(ext)) return 'json';
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.docx', '.doc'].includes(ext)) return 'docx';
  if (['.html', '.htm'].includes(ext)) return 'html';
  if (['.xml'].includes(ext)) return 'xml';
  if (['.yaml', '.yml'].includes(ext)) return 'yaml';
  if (['.toml'].includes(ext)) return 'toml';

  // Fichiers sans extension (README, LICENSE, etc.)
  if (ext === '') {
    const basename = path.basename(filename).toLowerCase();
    if (['readme', 'license', 'changelog', 'contributing'].some(name => basename.includes(name))) {
      return 'text';
    }
  }

  return 'unknown';
}

/**
 * Analyse un fichier texte simple
 * @param {string} content - Contenu du fichier
 * @param {string} filename - Nom du fichier
 * @returns {Object} - Analyse du texte
 */
function analyzeTextFile(content, filename) {
  const lines = content.split('\n');
  const wordCount = content.split(/\s+/).filter(w => w.trim()).length;
  const charCount = content.length;

  // Détection de structure
  const hasMarkdownHeaders = /^#{1,6}\s/.test(content);
  const hasEmailAddresses = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content);
  const hasPhoneNumbers = /\b\d{10,}\b/.test(content);
  const hasURLs = /https?:\/\//.test(content);

  return {
    format: 'text',
    lineCount: lines.length,
    wordCount,
    charCount,
    hasMarkdownHeaders,
    hasEmailAddresses,
    hasPhoneNumbers,
    hasURLs,
    preview: lines.slice(0, 20).join('\n'), // Premiers 20 lignes
    fullContent: content
  };
}

/**
 * Analyse un fichier JSON
 * @param {string} content - Contenu du fichier
 * @param {string} filename - Nom du fichier
 * @returns {Object} - Analyse du JSON
 */
function analyzeJSONFile(content, filename) {
  try {
    const data = JSON.parse(content);
    const isArray = Array.isArray(data);
    const itemCount = isArray ? data.length : Object.keys(data).length;

    return {
      format: 'json',
      isArray,
      itemCount,
      structure: isArray ? 'array' : 'object',
      keys: isArray && data.length > 0 ? Object.keys(data[0]) : Object.keys(data),
      sample: isArray ? data.slice(0, 3) : data,
      fullData: data
    };
  } catch (error) {
    return {
      format: 'json',
      error: `Erreur parsing JSON: ${error.message}`,
      fullContent: content
    };
  }
}

/**
 * Analyse complète d'un fichier (multi-format)
 * @param {Buffer|string} fileContent - Contenu du fichier
 * @param {string} filename - Nom du fichier
 * @returns {Promise<Object>} - Analyse complète
 */
export async function analyzeFile(fileContent, filename) {
  console.log(`[FileAnalyzer] Analyse du fichier: ${filename}`);

  const format = detectFileFormat(filename);
  const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf8') : fileContent;

  // Analyse selon le format
  switch (format) {
    case 'csv': {
      // Analyse CSV (existant)
      const parseResult = await parseCSV(content);

      if (parseResult.errors.length > 0) {
        console.warn(`[FileAnalyzer] Erreurs de parsing CSV:`, parseResult.errors);
      }

      const data = parseResult.data;

      if (data.length === 0) {
        throw new Error('Fichier CSV vide ou format invalide');
      }

      const columns = analyzeColumns(data);
      const missingFields = detectMissingFields(columns);
      const quality = analyzeDataQuality(data, columns);

      const summary = {
        filename,
        format: 'csv',
        rowCount: data.length,
        columnCount: columns.length,
        completionRate: quality.completionRate,
        quality: quality.quality,
        hasCriticalFields: columns.some(col =>
          col.type === COLUMN_TYPES.EMAIL || col.type === COLUMN_TYPES.NAME
        ),
        issues: []
      };

      if (quality.completionRate < 50) {
        summary.issues.push('Données incomplètes (< 50% rempli)');
      }
      if (quality.duplicateRows > 0) {
        summary.issues.push(`${quality.duplicateRows} doublons détectés`);
      }
      if (quality.formatErrors > 0) {
        summary.issues.push(`${quality.formatErrors} erreurs de format`);
      }
      if (!summary.hasCriticalFields) {
        summary.issues.push('Aucun email ou nom détecté');
      }

      console.log(`[FileAnalyzer] CSV analysé: ${data.length} lignes, ${columns.length} colonnes`);

      return {
        summary,
        columns,
        missingFields,
        quality,
        data,
        parseErrors: parseResult.errors
      };
    }

    case 'text': {
      const analysis = analyzeTextFile(content, filename);

      console.log(`[FileAnalyzer] Texte analysé: ${analysis.lineCount} lignes, ${analysis.wordCount} mots`);

      return {
        summary: {
          filename,
          format: 'text',
          lineCount: analysis.lineCount,
          wordCount: analysis.wordCount,
          charCount: analysis.charCount,
          hasEmailAddresses: analysis.hasEmailAddresses,
          hasPhoneNumbers: analysis.hasPhoneNumbers,
          hasURLs: analysis.hasURLs,
          issues: []
        },
        textAnalysis: analysis,
        content: analysis.fullContent
      };
    }

    case 'json': {
      const analysis = analyzeJSONFile(content, filename);

      if (analysis.error) {
        throw new Error(analysis.error);
      }

      console.log(`[FileAnalyzer] JSON analysé: ${analysis.itemCount} items`);

      return {
        summary: {
          filename,
          format: 'json',
          itemCount: analysis.itemCount,
          structure: analysis.structure,
          issues: []
        },
        jsonAnalysis: analysis,
        data: analysis.fullData
      };
    }

    case 'pdf':
    case 'docx': {
      // Pour PDF et DOCX, on retourne le contenu brut
      // L'IA pourra l'analyser directement
      console.log(`[FileAnalyzer] Fichier ${format.toUpperCase()} détecté - nécessite extraction IA`);

      return {
        summary: {
          filename,
          format,
          requiresAIExtraction: true,
          message: `Fichier ${format.toUpperCase()} détecté. Utilisez l'IA pour extraire le contenu.`,
          issues: []
        },
        rawContent: fileContent,
        needsProcessing: true
      };
    }

    default: {
      // Format inconnu - traiter comme texte brut
      console.log(`[FileAnalyzer] Format inconnu, traitement comme texte: ${filename}`);

      return {
        summary: {
          filename,
          format: 'unknown',
          message: 'Format de fichier non reconnu, traité comme texte brut',
          issues: ['Format non reconnu']
        },
        content,
        rawContent: fileContent
      };
    }
  }
}

/**
 * Génère des questions contextuelles pour enrichir les données
 * @param {Object} analysis - Résultat d'analyse
 * @returns {Array} - Questions à poser à l'utilisateur
 */
export function generateEnrichmentQuestions(analysis) {
  const questions = [];
  const format = analysis.summary?.format || 'csv';

  // Questions spécifiques au format CSV
  if (format === 'csv' && analysis.columns && analysis.missingFields) {
    // Questions basées sur champs manquants critiques
    const criticalMissing = analysis.missingFields.filter(f => f.critical);
    if (criticalMissing.length > 0) {
      questions.push({
        type: 'critical_missing',
        priority: 'high',
        question: `Je ne détecte pas de champ "${criticalMissing[0].label}". Avez-vous cette information ailleurs?`,
        field: criticalMissing[0].name
      });
    }

    // Questions sur la source des données
    if (!analysis.columns.some(col => col.name.toLowerCase().includes('source'))) {
      questions.push({
        type: 'source',
        priority: 'high',
        question: 'D\'où proviennent ces contacts? (ex: salon, site web, LinkedIn, référence...)',
        suggestedField: 'source'
      });
    }

    // Questions sur le contexte métier
    if (!analysis.columns.some(col => col.name.toLowerCase().includes('description'))) {
      questions.push({
        type: 'context',
        priority: 'medium',
        question: 'Pouvez-vous me donner le contexte de ces leads? (secteur, événement, campagne...)',
        suggestedField: 'description'
      });
    }

    // Questions sur la segmentation
    if (!analysis.columns.some(col => col.name.toLowerCase().includes('tag') || col.name.toLowerCase().includes('segment'))) {
      questions.push({
        type: 'segmentation',
        priority: 'medium',
        question: 'Comment souhaitez-vous segmenter ces contacts? (tags, catégories...)',
        suggestedField: 'tags'
      });
    }

    // Questions sur le statut
    if (!analysis.columns.some(col => col.name.toLowerCase().includes('status') || col.name.toLowerCase().includes('statut'))) {
      questions.push({
        type: 'status',
        priority: 'medium',
        question: 'Quel est le niveau d\'engagement de ces leads? (chaud, tiède, froid...)',
        suggestedField: 'status'
      });
    }
  } else if (format === 'text') {
    // Questions pour fichiers texte
    questions.push({
      type: 'usage',
      priority: 'high',
      question: 'Comment souhaitez-vous utiliser ce fichier texte? (extraction de données, analyse, import...)',
      suggestedField: 'usage'
    });
  } else if (format === 'json') {
    // Questions pour fichiers JSON
    questions.push({
      type: 'import',
      priority: 'high',
      question: 'Voulez-vous importer ces données dans votre CRM?',
      suggestedField: 'import'
    });
  } else {
    // Questions génériques pour autres formats
    questions.push({
      type: 'general',
      priority: 'medium',
      question: 'Comment puis-je vous aider avec ce fichier?',
      suggestedField: 'help'
    });
  }

  return questions.slice(0, 5); // Max 5 questions pour ne pas surcharger
}
