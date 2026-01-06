// utils/chat-history.js (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CHAT_HISTORY_PATH = path.join(DATA_DIR, 'chat-history.json');

// Assure que le fichier existe
function ensureHistoryFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CHAT_HISTORY_PATH)) fs.writeFileSync(CHAT_HISTORY_PATH, '[]', 'utf-8');
}

function readHistory() {
  ensureHistoryFile();
  try {
    return JSON.parse(fs.readFileSync(CHAT_HISTORY_PATH, 'utf-8'));
  } catch {
    fs.writeFileSync(CHAT_HISTORY_PATH, '[]', 'utf-8');
    return [];
  }
}

function writeHistory(items) {
  fs.writeFileSync(CHAT_HISTORY_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Sauvegarde un message (user ou assistant) dans l’historique
 * @param {string} role - 'user' ou 'assistant'
 * @param {string} message - contenu du message
 * @param {object} extra - métadonnées optionnelles
 */
export function saveChatHistory({ role, message, extra = {} }) {
  const all = readHistory();
  const item = {
    timestamp: new Date().toISOString(),
    role,
    message,
    ...extra,
  };
  all.push(item);
  writeHistory(all);
  return item;
}

/**
 * Retourne tout l’historique
 */
export function getChatHistory() {
  return readHistory();
}
