// utils/task-log.js (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR      = path.resolve(__dirname, '../data');
const TASK_LOG_PATH = path.join(DATA_DIR, 'task-log.json');

// S'assure que le fichier existe et est un tableau JSON
function ensureLogFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TASK_LOG_PATH)) fs.writeFileSync(TASK_LOG_PATH, '[]', 'utf-8');
}

function readAll() {
  ensureLogFile();
  try {
    const raw = fs.readFileSync(TASK_LOG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    fs.writeFileSync(TASK_LOG_PATH, '[]', 'utf-8');
    return [];
  }
}

function writeAll(items) {
  fs.writeFileSync(TASK_LOG_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/** Enregistre une action réalisée réellement par M.A.X. dans EspoCRM */
export function logTask(payload = {}) {
  const now = new Date().toISOString();
  const item = {
    timestamp: now,
    action:  payload.action || 'Action',
    details: payload.details || {},
    actor:   payload.actor || 'M.A.X.',
    entity:  payload.entity || null,
  };
  const items = readAll();
  items.push(item);
  writeAll(items);
  return item;
}

/** Lit l'historique avec filtre temporel (heures) */
export function readTaskHistory(rangeHours = null) {
  const items = readAll();
  if (!rangeHours) return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const threshold = Date.now() - rangeHours * 60 * 60 * 1000;
  return items
    .filter(i => new Date(i.timestamp).getTime() >= threshold)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/** Retourne les N dernières actions */
export function latest(n = 3) {
  return readTaskHistory(null).slice(0, n);
}

// (facultatif) export du chemin interne si besoin
export { TASK_LOG_PATH };
