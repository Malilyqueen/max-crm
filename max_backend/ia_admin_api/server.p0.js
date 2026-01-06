import 'dotenv/config';
import express from 'express';
import { checkModeWrite } from './middleware/checkMode.js';

const app = express();
app.use(express.json());

// Sanity ping
app.get('/api/ping', (req, res) => res.json({ ok: true, pong: true }));

// P0: actions sans aucun appel Espo
app.post('/api/actions/updateLead', checkModeWrite, async (req, res) => {
  const { id, fields } = req.body || {};
  if (!id || !fields) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
  // Pas d'appel Espo ici (P0) → on simule juste OK
  return res.json({ ok: true, updated: true, id, fields });
});

app.post('/api/actions/trigger', checkModeWrite, async (req, res) => {
  const { message, context } = req.body || {};
  if (!message) return res.status(400).json({ ok: false, error: 'MISSING_MESSAGE' });
  // Pas d'appel n8n ici (P0) → on simule juste OK
  return res.json({ ok: true, sent: true, context: context || 'generic' });
});

// P0: mode courant (lecture depuis body volontairement ignorée ici)
app.get('/api/brain/status', (req, res) => {
  res.json({ ok: true, brains: ['logistique','coach','ecommerce'], mode: 'assist' });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log('M.A.X. P0 server running on port', PORT));
