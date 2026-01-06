import fs from 'fs';
import path from 'path';

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function loadIdentity() {
  const baseDir = path.resolve(process.cwd(), 'data');
  const globalPath = path.join(baseDir, 'agent_identity.json');
  const globalId = loadJSON(globalPath) || {};

  const active = process.env.ACTIVE_CLIENT || 'macrea_client';
  if (active === 'generic') return globalId;

  const clientPath = path.join(baseDir, 'clients', `${active}.json`);
  const clientId = loadJSON(clientPath) || {};

  return { ...globalId, ...clientId, contexte_client: clientId.contexte_client || undefined };
}

export const IDENTITY = loadIdentity();
