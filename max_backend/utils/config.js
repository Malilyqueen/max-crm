import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

function defaultConfig() {
  return { mode: 'chat', allowAutoActions: false };
}

export function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return defaultConfig();
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    if (!raw) return defaultConfig();
    return JSON.parse(raw);
  } catch (e) {
    // on erreur, retourne config par défaut
    return defaultConfig();
  }
}

export function writeConfig(next = {}) {
  try {
    const cur = readConfig();
    const merged = { ...cur, ...next };
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (e) {
    // en cas d'erreur, retourne au moins l'objet demandé
    return { ...readConfig(), ...next };
  }
}
