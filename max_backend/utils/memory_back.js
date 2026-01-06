import fs from 'fs';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'data/chat-history.json');
const ROLLBACK_FILE = path.join(process.cwd(), 'data/rollback-log.json');

// ✅ Ajouter un message à l'historique
export function addMessage(role, message) {
  const entry = { timestamp: new Date().toISOString(), role, message };
  const data = fs.existsSync(MEMORY_FILE) ? JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) : [];
  data.push(entry);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8');
  return entry;
}

// ✅ Récupérer l'historique complet
export function getHistory(limit = 50) {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  return data.slice(-limit); // retourne les derniers messages si gros historique
}

// ✅ Récupérer les derniers messages
export function getLastMessages(n = 10) {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  const content = fs.readFileSync(MEMORY_FILE, 'utf8');
  const history = JSON.parse(content || '[]');
  return history.slice(-n); // les derniers
}

// ✅ Ajouter une action avec rollback possible
export function addAction(actionName, details, previousState = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: actionName,
    details,
    previousState
  };
  const data = fs.existsSync(ROLLBACK_FILE) ? JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf8')) : [];
  data.push(entry);
  fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  return entry;
}

// ✅ Récupérer les actions avec rollback
export function getActions(limit = 50) {
  if (!fs.existsSync(ROLLBACK_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf8'));
  return data.slice(-limit);
}

// ✅ Fonction pour revenir en arrière sur une action
export function rollbackLastAction() {
  if (!fs.existsSync(ROLLBACK_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf8'));
  const last = data.pop();
  if (last) {
    fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
    return last.previousState || null;
  }
  return null;
}
