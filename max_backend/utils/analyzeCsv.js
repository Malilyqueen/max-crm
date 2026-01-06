// D:/Macrea/CRMACREA/ia_admin_api/utils/analyzeCsv.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { parse } from 'json2csv';

export async function analyzeCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        const tags = [];
        const action = [];

        // Exemple simple de logique
        if (data.source && data.source.toLowerCase().includes('facebook')) {
          tags.push('facebook');
        }
        if (data.statut && data.statut.toLowerCase().includes('à contacter')) {
          tags.push('client_urgent');
          action.push('Appel dans les 24h');
        }

        results.push({
          ...data,
          tags,
          action_suggeree: action.join(', '),
          commentaire_IA: `Lead analysé : ${tags.join(', ')}`,
        });
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// 🔍 Analyse avancée pour fichier réel de prospects (client_B)
export async function enrichRealCSV(inputPath, outputPath) {
  // Import dynamiques pour compatibilité ESM
  const fs = await import('fs');
  const csv = (await import('csv-parser')).default || (await import('csv-parser'));
  const { parse } = await import('json2csv');

  const rawRows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(csv())
      .on('data', (row) => {
        const tags = [];
        let action = "";
        const commentaire = [];

        const statut = row['statut_client']?.toLowerCase() || '';
        const type = row['type_client']?.toLowerCase() || '';
        const objection = row['objection']?.toLowerCase() || '';
        const source = row['source']?.toLowerCase() || '';

        if (statut.includes('relancer')) {
          tags.push('à_relancer');
          action = 'Appel sous 48h';
          commentaire.push('Lead à recontacter rapidement');
        } else if (statut.includes('client')) {
          tags.push('client_actif');
          action = 'Fidélisation';
          commentaire.push('Client existant à entretenir');
        } else if (statut.includes('perdu')) {
          tags.push('lead_perdu');
          action = 'Archiver ou relancer plus tard';
          commentaire.push('Lead classé comme perdu');
        }

        if (source.includes('meta')) tags.push('facebook_ads');
        else if (source.includes('site')) tags.push('site_web');
        else if (source.includes('recommandation')) tags.push('bouche_à_oreille');

        if (objection.includes('cher')) {
          tags.push('prix_sensible');
          commentaire.push('Objection liée au prix');
        }

        if (type === 'entreprise') tags.push('b2b');
        else if (type === 'particulier') tags.push('b2c');

        row.tags = tags.join(', ');
        row.action_suggeree = action;
        row.commentaire_IA = commentaire.join(' | ');

        rawRows.push(row);
      })
      .on('end', () => {
        const csvOutput = parse(rawRows, { fields: Object.keys(rawRows[0]) });
        fs.writeFileSync(outputPath, csvOutput, 'utf8');
        resolve({ success: true, total: rawRows.length });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
