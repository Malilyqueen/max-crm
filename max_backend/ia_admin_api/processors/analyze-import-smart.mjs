import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

// ========== 📁 Lecture CSV ==========
const csvPath = path.join(process.cwd(), 'test-leads.csv');
const fileContent = fs.readFileSync(csvPath);
const leads = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
});

// ========== 🧼 Nettoyage JSON IA ==========
function sanitizeToJson(text) {
  if (!text) return null;

  // ✅ Si l'IA a déjà renvoyé un objet (pas une string JSON)
  if (typeof text === 'object') return text;

  try {
    const cleaned = String(text)
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\r?\n|\r/g, ' ') // supprimer les sauts de ligne mal encodés
      .trim();

    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) return null;

    return JSON.parse(match[0]);
  } catch (e) {
    console.warn("❌ sanitizeToJson a échoué :", e.message);
    return null;
  }
}

// ========== 💾 Logging IA ==========
function logIA(type, leadId, content) {
  const dir = path.join(process.cwd(), 'logs', 'ia');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = path.join(dir, `${Date.now()}__${type}__${leadId}.txt`);
  fs.writeFileSync(filename, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

// ========== 🧠 Construction du prompt ==========
function buildPromptForLead(lead) {
  return `
Tu es un assistant IA. Réponds uniquement avec un objet JSON valide, sans texte autour.

Schema attendu :
{
  "leadId": "string",
  "tags": ["string"],
  "status": "a_contacter | relance | chaud | froid | lent | perdu",
  "emailMessage": "string",
  "whatsappMessage": "string",
  "confidence": 0.0 à 1.0
}

Voici le lead :
${JSON.stringify(lead)}

Réponds uniquement avec l'objet JSON correspondant, sans markdown ni explication.`;
}

// ========== 🤖 Appel à M.A.X. ==========
async function callModel(prompt) {
  const res = await fetch('http://127.0.0.1:3005/api/ask-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const json = await res.json();
  if (!json?.reply) {
    console.warn('⚠️ IA a répondu vide ou mal formé :', JSON.stringify(json, null, 2));
  }
  return json?.reply || '';
}

// ========== 🚀 Lancement analyse ==========
const results = [];

for (const lead of leads) {
  const prompt = buildPromptForLead(lead);
  logIA('prompt', lead.email || lead.id, prompt);

  const raw = await callModel(prompt);
  logIA('response', lead.email || lead.id, raw);

  const parsed = sanitizeToJson(raw);

  if (!parsed) {
    console.warn(`⚠️ Fallback utilisé pour ${lead.firstName} ${lead.lastName}`);
    results.push({
      id: lead.email || lead.id,
      fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      tags: [],
      status: 'a_contacter',
      email: lead.email || '',
      whatsapp: lead.phone || '',
      emailMessage: '',
      whatsappMessage: '',
      confidence: 0.4
    });
  } else {
    results.push({
      id: parsed.leadId || lead.email,
      fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      tags: parsed.tags || [],
      status: parsed.status || 'a_contacter',
      email: lead.email || '',
      whatsapp: lead.phone || '',
      emailMessage: parsed.emailMessage || '',
      whatsappMessage: parsed.whatsappMessage || '',
      confidence: Number(parsed.confidence || 0.4)
    });
  }
}

// ========== 💾 Sauvegarde du résultat ==========
const outputPath = path.join(process.cwd(), 'analyze-result.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log(`✅ Analyse terminée. Résultats sauvegardés dans analyze-result.json`);
