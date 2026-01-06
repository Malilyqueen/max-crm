import fs from 'fs';
import path from 'path';
import express from 'express';

const router = express.Router();

router.get('/api/analyze-result', (req, res) => {
  const filePath = path.join(process.cwd(), 'data', 'analysis', 'analyze-result.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'Fichier introuvable' });
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  res.json({ ok: true, ...JSON.parse(data) });
});

export default router;
