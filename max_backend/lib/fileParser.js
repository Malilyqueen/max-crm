/**
 * lib/fileParser.js
 * Parser de fichiers pour M.A.X. MVP1
 *
 * Supporte:
 * - CSV → extraction lignes + colonnes
 * - PDF → extraction texte brut
 * - DOCX → extraction texte brut
 *
 * MVP1: Extraction minimaliste en mémoire, pas de stockage
 */

import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

/**
 * Parser CSV depuis un Buffer
 *
 * @param {Buffer} buffer - Contenu du fichier CSV
 * @param {Object} options - Options (delimiter, encoding)
 * @returns {Promise<{rows: Array, headers: Array, summary: string}>}
 */
export async function parseCSV(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser({
        separator: options.delimiter || ',',
        ...options
      }))
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        console.log('[FILE_PARSER] ✅ CSV parsé:', {
          rows: rows.length,
          headers: headers.length,
          headersNames: headers.join(', ')
        });

        // Générer un résumé textuel pour M.A.X.
        const summary = generateCSVSummary(rows, headers);

        resolve({
          rows,
          headers,
          summary,
          stats: {
            totalRows: rows.length,
            totalColumns: headers.length
          }
        });
      })
      .on('error', (error) => {
        console.error('[FILE_PARSER] ❌ Erreur parsing CSV:', error.message);
        reject(new Error(`Erreur parsing CSV: ${error.message}`));
      });
  });
}

/**
 * Parser PDF depuis un Buffer
 *
 * @param {Buffer} buffer - Contenu du fichier PDF
 * @returns {Promise<{text: string, pages: number, summary: string}>}
 */
export async function parsePDF(buffer) {
  try {
    const data = await pdfParse(buffer);

    const text = data.text || '';
    const pages = data.numpages || 0;

    console.log('[FILE_PARSER] ✅ PDF parsé:', {
      pages,
      textLength: text.length,
      firstChars: text.substring(0, 100)
    });

    // Générer un résumé pour M.A.X.
    const summary = `Document PDF de ${pages} page(s), contenant environ ${text.length} caractères.\n\nContenu extrait:\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`;

    return {
      text,
      pages,
      summary,
      stats: {
        pages,
        charactersCount: text.length,
        linesCount: text.split('\n').length
      }
    };
  } catch (error) {
    console.error('[FILE_PARSER] ❌ Erreur parsing PDF:', error.message);
    throw new Error(`Erreur parsing PDF: ${error.message}`);
  }
}

/**
 * Parser DOCX depuis un Buffer
 *
 * @param {Buffer} buffer - Contenu du fichier DOCX
 * @returns {Promise<{text: string, summary: string}>}
 */
export async function parseDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value || '';
    const messages = result.messages || [];

    // Logger les warnings si présents
    if (messages.length > 0) {
      console.warn('[FILE_PARSER] ⚠️ Warnings DOCX:', messages);
    }

    console.log('[FILE_PARSER] ✅ DOCX parsé:', {
      textLength: text.length,
      warnings: messages.length,
      firstChars: text.substring(0, 100)
    });

    // Générer un résumé pour M.A.X.
    const summary = `Document DOCX contenant environ ${text.length} caractères.\n\nContenu extrait:\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`;

    return {
      text,
      summary,
      stats: {
        charactersCount: text.length,
        linesCount: text.split('\n').length,
        warnings: messages.length
      }
    };
  } catch (error) {
    console.error('[FILE_PARSER] ❌ Erreur parsing DOCX:', error.message);
    throw new Error(`Erreur parsing DOCX: ${error.message}`);
  }
}

/**
 * Parser automatique basé sur l'extension
 *
 * @param {Buffer} buffer - Contenu du fichier
 * @param {string} filename - Nom du fichier (pour détecter extension)
 * @param {Object} options - Options de parsing
 * @returns {Promise<{type: string, data: object, summary: string}>}
 */
export async function parseFile(buffer, filename, options = {}) {
  const extension = filename.split('.').pop().toLowerCase();

  console.log('[FILE_PARSER] 📄 Parsing fichier:', {
    filename,
    extension,
    size: buffer.length
  });

  switch (extension) {
    case 'csv': {
      const result = await parseCSV(buffer, options);
      return {
        type: 'csv',
        data: result,
        summary: result.summary
      };
    }

    case 'pdf': {
      const result = await parsePDF(buffer);
      return {
        type: 'pdf',
        data: result,
        summary: result.summary
      };
    }

    case 'docx': {
      const result = await parseDOCX(buffer);
      return {
        type: 'docx',
        data: result,
        summary: result.summary
      };
    }

    default:
      throw new Error(`Type de fichier non supporté: ${extension}. Formats acceptés: CSV, PDF, DOCX`);
  }
}

/**
 * Générer un résumé textuel pour un CSV
 *
 * @param {Array} rows - Lignes du CSV
 * @param {Array} headers - En-têtes
 * @returns {string} - Résumé formaté
 */
function generateCSVSummary(rows, headers) {
  const sampleSize = Math.min(5, rows.length);
  const sample = rows.slice(0, sampleSize);

  let summary = `Fichier CSV contenant ${rows.length} ligne(s) et ${headers.length} colonne(s).\n\n`;
  summary += `Colonnes: ${headers.join(', ')}\n\n`;

  if (rows.length > 0) {
    summary += `Aperçu des ${sampleSize} premières lignes:\n\n`;

    sample.forEach((row, index) => {
      summary += `Ligne ${index + 1}:\n`;
      headers.forEach(header => {
        summary += `  - ${header}: ${row[header]}\n`;
      });
      summary += '\n';
    });

    if (rows.length > sampleSize) {
      summary += `... et ${rows.length - sampleSize} autres ligne(s).\n`;
    }
  }

  return summary;
}

/**
 * Valider qu'un fichier est supporté
 *
 * @param {string} filename - Nom du fichier
 * @returns {boolean}
 */
export function isSupportedFile(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  return ['csv', 'pdf', 'docx'].includes(extension);
}

/**
 * Obtenir les extensions supportées
 *
 * @returns {Array<string>}
 */
export function getSupportedExtensions() {
  return ['csv', 'pdf', 'docx'];
}

console.log('[FILE_PARSER] ✅ Parser initialisé:', {
  supportedFormats: getSupportedExtensions().join(', ')
});

export default {
  parseFile,
  parseCSV,
  parsePDF,
  parseDOCX,
  isSupportedFile,
  getSupportedExtensions
};
