const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, '..', 'data', 'execution-log.json');

function readLog() {
  if (!fs.existsSync(LOG)) return [];
  try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch { return []; }
}
function writeLog(items) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, JSON.stringify(items, null, 2), 'utf8');
}
function upsertExecution(entry) {
  const items = readLog();
  const i = items.findIndex(x => x.id === entry.id);
  if (i >= 0) items[i] = entry; else items.unshift(entry);
  writeLog(items);
  return entry;
}
function listExecutions({ limit=200, sinceHours } = {}) {
  let items = readLog();
  if (sinceHours) {
    const t = Date.now() - sinceHours*3600*1000;
    items = items.filter(x => new Date(x.startedAt).getTime() >= t);
  }
  return items.slice(0, limit);
}
module.exports = { upsertExecution, listExecutions };
