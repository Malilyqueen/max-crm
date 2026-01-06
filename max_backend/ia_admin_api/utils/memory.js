// utils/memory.js
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data').replace(/^\/([A-Za-z]:)/, '$1');
const HISTORY = path.join(DATA_DIR, 'chat-history.json');
const ACTIONS = path.join(DATA_DIR, 'actions.json');
const logPath = path.join(DATA_DIR, 'execution-log.json'); // chemin cohérent avec le reste

function read(p){ if(!fs.existsSync(p)) return []; try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return []; } }
function write(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2),'utf8'); }

export function addMessage(role, content){
  const h = read(HISTORY);
  h.push({ role, content, timestamp: new Date().toISOString() });
  write(HISTORY,h);
}
export function getHistory(){ return read(HISTORY); }
export function addAction(name, payload, previousState=null){
  const a = read(ACTIONS);
  a.push({ name, payload, previousState, timestamp: new Date().toISOString() });
  write(ACTIONS,a);
}
export function rollbackLastAction(){
  const a = read(ACTIONS);
  const last = a.pop();
  write(ACTIONS,a);
  return last;
}

// Nouvelle fonction logExecution
export async function logExecution(action, type = "IA", details = {}) {
  try {
    const raw = await fs.promises.readFile(logPath, "utf8").catch(() => "[]");
    const history = JSON.parse(raw);
    history.push({
      date: new Date().toISOString(),
      action,
      type,
      details
    });
    await fs.promises.writeFile(logPath, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error("❌ Impossible de loguer l'action :", e);
  }
}
