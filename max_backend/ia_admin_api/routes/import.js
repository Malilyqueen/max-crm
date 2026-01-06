import express from 'express';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';
import activityService from '../services/activity.js';
import { upsertLead, upsertContact } from '../utils/espo-api.js';

const router = express.Router();

// Mapping fields.json pour correspondre aux champs EspoCRM
const FIELD_MAPPING = {
  'Email': 'emailAddress',
  'email': 'emailAddress',
  'Nom': 'lastName',  // Pour EspoCRM Contact
  'name': 'lastName',
  'Prénom': 'firstName',
  'firstName': 'firstName',
  'Téléphone': 'phoneNumber',
  'phone': 'phoneNumber',
  'Entreprise': 'accountName',
  'company': 'accountName',
  'Ville': 'addressCity',
  'city': 'addressCity',
  'Status': 'status',
  'status': 'status'
};

function mapFields(row) {
  const mapped = {};
  for (const [csvField, value] of Object.entries(row)) {
    const espoField = FIELD_MAPPING[csvField] || csvField;
    if (value && value.trim()) {
      mapped[espoField] = value.trim();
    }
  }
  return mapped;
}

router.post('/import', async (req, res) => {
  try {
    const buf = await new Promise((ok, ko) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => ok(Buffer.concat(chunks)));
      req.on('error', ko);
    });

    // Support UTF-8 BOM
    let csvContent = buf.toString('utf8');
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: csvContent.includes(';') ? ';' : ','
    });

    let created = 0, updated = 0, skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const email = row.Email || row.email;
        if (!email || !email.trim()) {
          skipped++;
          continue;
        }

        const mappedData = mapFields(row);

        // Déterminer si c'est un Lead ou Contact basé sur les données
        const isLead = mappedData.status || mappedData.source;
        const upsertFn = isLead ? upsertLead : upsertContact;

        await upsertFn(mappedData);
        updated++; // Pour l'instant on compte tout comme updated

      } catch (rowError) {
        console.error('Row import error:', rowError);
        errors.push({ row, error: rowError.message });
        skipped++;
      }
    }

    const fileHash = crypto.createHash('sha1').update(buf).digest('hex');

    // Log activity
    activityService.push({
      actor: 'MAX',
      tenant: req.ctx?.tenant || 'default',
      event: 'import.csv',
      rows: rows.length,
      created,
      updated,
      skipped,
      fileHash,
      errors: errors.length
    });

    res.json({
      ok: true,
      stats: { rows: rows.length, created, updated, skipped },
      fileHash,
      errors: errors.slice(0, 10) // Limiter les erreurs affichées
    });

  } catch (e) {
    console.error('Import error:', e);
    res.status(400).json({
      ok: false,
      error: 'PARSE_ERROR',
      detail: String(e?.message || e)
    });
  }
});

export default router;