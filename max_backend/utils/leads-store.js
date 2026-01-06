// utils/leads-store.js (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR   = path.resolve(__dirname, '../data');
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_PATH)) fs.writeFileSync(LEADS_PATH, '[]', 'utf-8');
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
  } catch {
    fs.writeFileSync(LEADS_PATH, '[]', 'utf-8');
    return [];
  }
}

function writeAll(items) {
  fs.writeFileSync(LEADS_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/** Normalise un lead entrant (CSV ou JSON) vers un format commun */
export function normalizeLead(raw = {}) {
  const email = String(raw.email || raw.Email || '').trim().toLowerCase() || null;
  const phone = String(raw.phone || raw.Phone || raw.telephone || '').replace(/\s+/g, '') || null;
  const firstName = (raw.firstName || raw.prenom || raw['First Name'] || '').trim();
  const lastName  = (raw.lastName  || raw.nom    || raw['Last Name']  || '').trim();
  const name = raw.name?.trim() || `${firstName} ${lastName}`.trim() || null;
  const source = (raw.source || raw.Source || '').trim() || null;
  const status = (raw.status || raw.Status || 'In Process').trim();
  const interestScore = Number(raw.interestScore ?? raw.score ?? 0) || 0;
  const lastContactAt = raw.lastContactAt ? new Date(raw.lastContactAt).toISOString() : null;

  return {
    id: raw.id || cryptoRandom(),
    name, firstName, lastName,
    email, phone,
    source, status,
    interestScore,
    lastContactAt,
    createdAt: new Date().toISOString(),
    raw, // garde la ligne d'origine
  };
}

function cryptoRandom() {
  return 'L' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

/** Insert batch (merge par email/phone) */
export function upsertLeads(batch = []) {
  const store = readAll();
  const byKey = new Map(store.map(l => [leadKey(l), l]));

  for (const raw of batch) {
    const n = normalizeLead(raw);
    const key = leadKey(n);
    if (byKey.has(key)) {
      const current = byKey.get(key);
      byKey.set(key, { ...current, ...n, id: current.id }); // merge conservant l’id
    } else {
      byKey.set(key, n);
    }
  }
  const out = [...byKey.values()];
  writeAll(out);
  return out;
}

function leadKey(l) {
  return (l.email && l.email.toLowerCase()) || (l.phone && l.phone) || `id:${l.id}`;
}

/** Analyse : doublons, segments simples, stats de base */
export function analyzeLeads() {
  const all = readAll();

  // Doublons par email/phone
  const groups = {};
  for (const l of all) {
    const key = (l.email || l.phone || l.id);
    groups[key] ||= [];
    groups[key].push(l);
  }
  const duplicates = Object.values(groups).filter(g => g.length > 1);

  // Segments (exemples)
  const bySource = groupBy(all, l => l.source || 'unknown');
  const hotLeads = all.filter(l => l.interestScore >= 3);
  const toFollow48h = all.filter(l => {
    if (!l.lastContactAt) return false;
    return Date.now() - new Date(l.lastContactAt).getTime() > 48 * 3600 * 1000 && l.status === 'In Process';
  });

  return {
    total: all.length,
    sources: Object.fromEntries(Object.entries(bySource).map(([k,v]) => [k, v.length])),
    duplicates, // tableau de groupes
    hotLeads: hotLeads.map(pickCore),
    toFollow48h: toFollow48h.map(pickCore),
    sample: all.slice(0, 10).map(pickCore),
  };
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function pickCore(l) {
  return { id: l.id, name: l.name, email: l.email, phone: l.phone, source: l.source, status: l.status, interestScore: l.interestScore };
}

/** Suggestions de tags de base */
export function suggestTags() {
  const { duplicates, hotLeads, toFollow48h } = analyzeLeads();
  return [
    {
      key: 'doublon_potentiel',
      label: 'Marquer les doublons potentiels',
      applyTo: [...new Set(duplicates.flat().map(l => l.id))],
      rule: 'Même email/phone détecté',
    },
    {
      key: 'prioritaire',
      label: 'Leads prioritaires (score ≥ 3)',
      applyTo: hotLeads.map(l => l.id),
      rule: 'interestScore >= 3',
    },
    {
      key: 'a_relancer_48h',
      label: 'À relancer (> 48h, In Process)',
      applyTo: toFollow48h.map(l => l.id),
      rule: 'lastContactAt > 48h & status=In Process',
    },
  ];
}
