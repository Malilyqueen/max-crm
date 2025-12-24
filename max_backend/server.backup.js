// --- Imports uniques (ESM) ---
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cors from 'cors';

// âœ… journal des actions (un seul import !)
import { logTask, readTaskHistory, latest } from './utils/task-log.js';

// âœ… gestion des leads
import { upsertLeads, analyzeLeads, suggestTags } from './utils/leads-store.js';

// (s'il existe chez toi) ton helper historique chat :
import { saveChatHistory, getChatHistory } from './utils/chat-history.js';
import { espo, getMetadata, updateEntity, linkMany, ensureTagId } from './utils/espoClient.js';

// --- init dirname/filename (obligatoire avant d'utiliser __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- .env
dotenv.config();

// --- Logger simple (aprÃ¨s __dirname)
const logFile = path.join(__dirname, 'logs', 'server.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line);
  }
  catch (e) { console.error('Impossible dâ€™Ã©crire dans server.log:', e.message); }
}

// Log au dÃ©marrage (crÃ©e logs/server.log mÃªme sans appel)
log('BOOT', 'M.A.X. dÃ©marre sur le port', process.env.PORT || 3005);
console.log('[M.A.X] .env chargÃ©:', fs.existsSync(path.join(__dirname, '.env')));
console.log('[M.A.X] API_KEY lue:', process.env.ESPO_API_KEY);

// >>> tu peux aussi logger ici
console.log('[M.A.X] ESPO_URL =', process.env.ESPO_URL, ' | API_KEY last4 =', (process.env.ESPO_API_KEY || '').slice(-4));
import analyzeResultRoutes from './routes/analyzeResult.js';
import etqActionsRoutes from './routes/etq_actions.js';
const app = express();
app.use(cors({ origin:'*' }));
app.use(express.json({ limit:'5mb' }));
app.use(express.urlencoded({ extended:true }));

// POST /api/tags/apply-suggested  -> applique toutes les suggestions courantes
app.post('/api/tags/apply-suggested', express.json(), async (req, res) => {
  try {
    const items = typeof suggestTags === 'function' ? suggestTags() : [];
    let totalApplied = 0;
    for (const s of items) {
      if (!s.applyTo?.length) continue;
      // TODO: ici, brancher EspoCRM si nÃ©cessaire. Pour lâ€™instant, on â€œsimuleâ€ local.
      // await espoApplyTagToLeads(s.key, s.applyTo);

      totalApplied += s.applyTo.length;
      if (typeof logTask === 'function') {
        logTask({
          action: 'Ajout Tag',
          entity: 'Lead',
          details: { tag: s.key, count: s.applyTo.length, leadIds: s.applyTo, rule: s.rule },
        });
      }
    }

    const reply = `ðŸ·ï¸ ${items.length} tags proposÃ©s traitÃ©s. ${totalApplied} affectations au total.`;
  saveChatHistory({ role: 'assistant', message: reply });
    res.json({ ok: true, appliedTags: items.map(i => i.key), totalApplied, reply });
  } catch (e) {
    console.error('apply-suggested error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/tags/apply  -> { tag: string, leadIds: string[] }
app.post('/api/tags/apply', express.json(), async (req, res) => {
  try {
    const { tag, leadIds } = req.body || {};
    if (!tag || !Array.isArray(leadIds) || !leadIds.length) {
      return res.status(400).json({ ok: false, error: 'tag + leadIds[] required' });
    }
    // TODO: brancher EspoCRM ici si tu veux lâ€™effet cÃ´tÃ© CRM.
    // await espoApplyTagToLeads(tag, leadIds);

    if (typeof logTask === 'function') {
      logTask({ action: 'Ajout Tag', entity: 'Lead', details: { tag, count: leadIds.length, leadIds } });
    }
    const reply = `âœ… Tag "${tag}" appliquÃ© Ã  ${leadIds.length} leads.`;
  saveChatHistory({ role: 'assistant', message: reply });
    res.json({ ok: true, applied: leadIds.length, reply });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// === CSV helpers & normalisation texte ===
const stripBOM = s => s?.replace(/^\uFEFF/, '') ?? '';
const pickSep = s => (s.includes(';') ? ';' : ',');

function csvToRows(csvTextRaw) {
  const csvText = stripBOM(String(csvTextRaw));
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { header: [], rows: [], sep: ',' };
  const sep = pickSep(lines[0]);
  const header = lines[0].split(sep).map(h => h.trim());
  const rows = lines.slice(1)
    .filter(Boolean)
    .map(line => line.split(sep).map(c => c.trim()));
  return { header, rows, sep };
}

function rowToObj(header, arr) {
  const o = {};
  header.forEach((k, i) => o[k] = (arr[i] ?? '').trim());
  return o;
}

function normalizeToText(x) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (Buffer.isBuffer(x)) return x.toString("utf8");
  if (Array.isArray(x)) return x.join("\n");
  if (typeof x === "object") {
    if ("content" in x) return normalizeToText(x.content);
    if ("data" in x && Array.isArray(x.data)) {
      try { return Buffer.from(x.data).toString("utf8"); } catch {}
    }
    try { return JSON.stringify(x); } catch { return String(x); }
  }
  return String(x);
}

// parseur CSV simple
function parseCsvLoose(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines.shift().split(/[,;|\t]/).map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(/[,;|\t]/).map(c => c.trim());
    const obj = {};
    header.forEach((h, i) => obj[h] = cols[i] || '');
    return obj;
  });
}

// POST /api/ask-task-with-file  -> lit CSV/JSON, upsert, analyse, propose tags, log + chat reply
// POST /api/ask-task-with-file  (unique et robuste)
app.post('/api/ask-task-with-file', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    let { prompt, fileType = "csv", fileContent, encoding } = req.body || {};

    // 1) normaliser en texte
    let raw = normalizeToText(fileContent);

    // 2) dÃ©coder base64 si demandÃ©
    if (encoding === "base64" && typeof raw === "string") {
      raw = Buffer.from(raw, "base64").toString("utf8");
    }

    if (fileType === "csv") {
      // 3) parser CSV avec auto-sÃ©parateur
      const { header, rows, sep } = csvToRows(raw);
      const items = rows.map(r => rowToObj(header, r))
                        .filter(o => (o.email && o.email.length)); // au moins email

      if (items.length === 0) {
        // Debug temporaire pour comprendre ce que lit le parseur
        return res.json({
          ok: true,
          reply: "ðŸ“¥ 0 leads importÃ©s....",
          debug: {
            sepUsed: sep,
            header,
            firstLine: raw.split(/\r?\n/)[0]
          }
        });
      }

      // ðŸ‘‰ Branche ici ton pipeline existant (analyse â†’ tags â†’ log) si besoin
      // const summary = await analyzeLeadsAndSuggest(items);

      return res.json({
        ok: true,
        reply: `ðŸ“¥ ${items.length} leads importÃ©s.`,
        count: items.length,
        sepUsed: sep,
        header,
        sample: items.slice(0, 2)
      });
    }

    return res.status(400).json({ ok: false, error: "fileType non gÃ©rÃ©" });

  } catch (e) {
    console.error('ask-task-with-file error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Parseur CSV tolÃ©rant

// POST /api/ask-task-with-file
// Contenu attendu : { prompt: "...", fileContent: "csv ou json string", fileType: "csv"|"json" }
// app.post('/api/ask-task-with-file', express.json({ limit: '5mb' }), async (req, res) => {
//   ...DEPRECATED, doublon supprimÃ©...
// });

// GET /api/task-history?range=24h | 48h | all
app.get('/api/task-history', (req, res) => {
  const { range = 'all' } = req.query;
  const hours = range === '24h' ? 24 : range === '48h' ? 48 : null;
  const data = readTaskHistory(hours);
  res.json({ ok: true, count: data.length, items: data });
});

// 3 derniÃ¨res actions
app.get('/api/task-highlights', (req, res) => {
  res.json({ ok: true, items: latest(3) });
});

// Analyse leads
app.get('/api/leads/analyze', (req, res) => {
  res.json({ ok: true, ...analyzeLeads() });
});

// Suggestions de tags
app.get('/api/tags/suggest', (req, res) => {
  res.json({ ok: true, items: suggestTags() });
});

// âœ… Route pour exposer le fichier dâ€™historique (20 derniers messages)
app.get('/api/history', (req, res) => {
  res.json(getChatHistory());
});
// Middlewares: place as early as possible


// ======== UTIL ========
// timeout simple pour fetch (si tu n'as pas dÃ©jÃ  une util similaire)
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// petit wrapper IA : route selon AI_PROVIDER
async function askAI(prompt) {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase().trim(); // 'openai' | 'ollama' | 'mistral' (proxy OpenAI-style Ã©ventuel)
  const model    = process.env.AI_MODEL || 'gpt-4o-mini';               // ou 'mistral' si Ollama
  const base     = process.env.AI_BASE_URL || '';                        // ex: http://127.0.0.1:11434

  // OPENAI (API officielle)
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY manquant');
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role:'user', content: prompt }],
        temperature: 0.7
      })
    }, 20000);
    if (!res.ok) throw new Error(`OPENAI_HTTP_${res.status}`);
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content?.trim() || '';
    if (!txt) throw new Error('RÃ©ponse vide OpenAI');
    return txt;
  }

  // OLLAMA local (ou via Cloudflare) /api/generate
  if (provider === 'ollama') {
    if (!base) throw new Error('AI_BASE_URL requis pour Ollama (ex: http://127.0.0.1:11434)');
    // Si tu passes par Cloudflare Access, ajoute ici tes headers Cf-Access...
    const headers = { 'Content-Type':'application/json' };
    const res = await fetchWithTimeout(`${base.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, prompt, stream: false })
    }, 20000);
    if (!res.ok) throw new Error(`OLLAMA_HTTP_${res.status}`);
    const data = await res.json();
    const txt = (data?.response || '').trim();
    if (!txt) throw new Error('RÃ©ponse vide Ollama');
    return txt;
  }

  // fallback simple si provider non configurÃ©
  return `M.A.X. (fallback): "${prompt}" bien reÃ§u. Configure AI_PROVIDER=openai ou ollama pour activer l'IA.`;
}

// ======== HANDLERS RÃ‰ELS ========

// /api/ask (court, sans mÃ©moire)
app.post('/api/ask', async (req, res) => {
  const msg = (req.body?.message || '').trim();
  if (!msg) return res.status(400).json({ ok:false, error:'MESSAGE_REQUIRED' });

  log('[ASK] in', msg);
  try {
    const answer = await askAI(msg);
    log('[ASK] out ok');
    return res.json({ ok:true, answer });
  } catch (e) {
    log('[ASK] fail', e.message);
    return res.status(500).json({ ok:false, error:'ASK_FAILED', detail: process.env.NODE_ENV==='dev' ? e.message : undefined });
  }
});

// /api/ask-task (avec wording assistant plus â€œagentâ€ si tu veux lâ€™Ã©tendre plus tard)
app.post('/api/ask-task', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ ok:false, error:'PROMPT_REQUIRED' });

  log('[ASK-TASK] in', prompt);
  try {
    // Ici tu pourrais: lire un â€œcontextâ€ (ex: derniers messages), pinger Espo, etc.
    const reply = await askAI(prompt);
    log('[ASK-TASK] out ok');
    return res.json({ ok:true, reply });
  } catch (e) {
    log('[ASK-TASK] fail', e.message);
    return res.status(500).json({ ok:false, error:'ASK_TASK_FAILED', detail: process.env.NODE_ENV==='dev' ? e.message : undefined });
  }
});
// --- Stack diagnostic route ---
app.get('/api/__stack', (_req, res) => {
  const stack = (app._router?.stack || []).map((layer, idx) => {
    if (layer.route) {
      return { idx, path: layer.route.path, methods: Object.keys(layer.route.methods || {}) };
    }
    return { idx, name: layer.name || 'middleware', handle: (layer?.handle?.name || 'anonymous') };
  });
  res.json({ count: stack.length, stack });
});
// --- Utils pagination sÃ»rs (Espo autorise ~200 max par page)
async function getLeadsAll(totalLimit = 1000, pageSize = 200) {
  const all = [];
  let offset = 0;
  const page = Math.min(Math.max(1, pageSize), 200); // 1..200

  while (all.length < totalLimit) {
    const size = Math.min(page, totalLimit - all.length);
    const chunk = await getAllLeads(`?maxSize=${size}&offset=${offset}`);
    if (!chunk || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < size) break; // plus rien
    offset += size;
  }
  return all;
}

// --- Routers montÃ©s dynamiquement (exÃ©cutions, etiquettes)
const executionsRouter = express.Router();
executionsRouter.get('/', async (req, res) => {
  try {
    const p = path.join(__dirname, 'data', 'execution-log.json');
    if (!fs.existsSync(p)) return res.json([]);
    const raw = fs.readFileSync(p, 'utf8');
    const log = JSON.parse(raw || '[]');
    res.json(log);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
executionsRouter.get('/:filename', async (req, res) => {
  try {
    const p = path.join(__dirname, 'data', 'execution-log.json');
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'no log' });
    const raw = fs.readFileSync(p, 'utf8');
    const log = JSON.parse(raw || '[]');
    const item = log.find(x => x.filename === req.params.filename);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
executionsRouter.post('/', async (req, res) => {
  try {
    const entry = {
      date: new Date().toISOString(),
      action: req.body.action || 'manual',
      filename: req.body.filename || null,
      result: req.body.result || 'OK'
    };
    const p = path.join(__dirname, 'data', 'execution-log.json');
    let log = [];
    try { log = JSON.parse(fs.readFileSync(p, 'utf8') || '[]'); } catch {}
    log.push(entry);
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(log, null, 2), 'utf8');
    res.json({ ok: true, entry });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const etiquettesRouter = express.Router();
// GET list of tags (Espo Tag entity)
etiquettesRouter.get('/', async (req, res) => {
  try {
  const data = await espo('GET', 'Tag?maxSize=200');
    const list = data.list || [];
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a tag
etiquettesRouter.post('/', async (req, res) => {
  try {
    const name = (req.body.name || req.body.label || '').toString().trim();
    if (!name) return res.status(400).json({ error: 'name required' });
  const created = await espo('POST', 'Tag', { body: JSON.stringify({ name }), headers: { 'Content-Type': 'application/json' } });
    res.json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Delete tag
etiquettesRouter.delete('/:id', async (req, res) => {
  try {
  await espo('DELETE', `Tag/${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mount routers
app.use('/api/executions', executionsRouter);
app.use('/api/espo/etiquettes', etiquettesRouter);

// simple ping


// --- Debug : distribution des statuts (paginer + paramÃ¨tres URL)
app.get('/api/debug/lead-statuses', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '600', 10), 5000);
    const pageSize = Math.min(parseInt(req.query.pageSize ?? '200', 10), 200);

    const leads = await getLeadsAll(limit, pageSize);
    const map = {};
    for (const l of leads) {
      const s = (l.status || l.statut || 'â€”').toString();
      map[s] = (map[s] || 0) + 1;
    }
    res.json({ total: leads.length, statuses: map });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug : Ã©chantillon brut des leads
app.get('/api/debug/leads-raw', async (_req, res) => {
  try {
    const leads = await getAllLeads('?maxSize=50');
    const sample = leads.slice(0, 10).map(l => {
      const keys = Object.keys(l).sort();
      return {
        id: l.id, name: l.name || `${l.firstName||''} ${l.lastName||''}`.trim(),
        status: l.status || l.statut,
        createdAt: l.createdAt || l.dateCreated || l.created || null,
        tags: l.tags || l.tagList || l.tagNames || null,
        keys
      };
    });
    res.json({ count: leads.length, sample });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug: lire un lead et voir ses tags
app.get('/api/debug/lead/:id', async (req, res) => {
  try {
  const l = await espo('GET', `Lead/${req.params.id}`);
    res.json({
      id: l.id,
      name: l.name || `${l.firstName||''} ${l.lastName||''}`.trim(),
      status: l.status || l.statut,
      createdAt: l.createdAt || l.dateCreated,
      tags: l.tags || l.tagList || l.tagNames || []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Preview : qui serait taguÃ© par le job "tag-rentree"
app.post('/api/actions/tag-rentree/preview', async (req, res) => {
  try {
    // ... ton code mÃ©tier ici ...
    const since = new Date(); since.setDate(since.getDate() - (sinceDays||0));
    const wanted = (statuses||[]).map(strip);

    const targeted = [], nonMatches = [];
    for (const l of leads) {
      const stRaw = (l.status || l.statut || '').toString();
      const st = strip(stRaw);
      const okStatus = wanted.length===0 ? true : wanted.some(w => st.includes(w));

      const createdRaw = l.createdAt || l.dateCreated || l.created || l.created_at || null;
      const created = createdRaw ? new Date(createdRaw) : null;
      const okRecent = (sinceDays||0) <= 0 ? true : (created ? created >= since : true);

      const rawTags = l.tags || l.tagList || l.tagNames || null;
      const tags = toTagArrayAny(rawTags).map(strip);
      const already = tags.includes(strip('rentrÃ©e')) || tags.includes('rentree');

      const hit = okStatus && okRecent && !already;
      (hit ? targeted : nonMatches).push({
        id: l.id,
        name: l.name || `${l.firstName||''} ${l.lastName||''}`.trim(),
        status: stRaw,
        createdAt: createdRaw,
        already
      });
    }

    res.json({
      ok: true,
      targetedCount: targeted.length,
      targeted: targeted.slice(0, 50),
      nonMatchesPreview: nonMatches.slice(0, 50)
    });
  } catch (err) {
    log('ERR', 'server.js try/catch zone ~199 ->', err.message);
    if (typeof res !== 'undefined' && res && typeof res.status === 'function') {
      return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', detail: err.message });
    }
  }
});
// Route : RÃ©cupÃ©rer l'Ã©tat d'une tÃ¢che (exÃ©cutÃ©e ou pas)
app.get('/api/executions/by-task/:filename', async (req, res) => {
  const filename = req.params.filename;
  const logPath = path.join(DATA_DIR, 'execution-log.json');

  try {
    const raw = await fs.promises.readFile(logPath, 'utf8');
    const log = JSON.parse(raw);

    const match = log.find(entry => entry.filename === filename);

    if (match) {
      res.json({
        executed: true,
        details: match
      });
    } else {
      res.json({
        executed: false,
        message: "TÃ¢che non encore validÃ©e par M.A.X."
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Impossible de lire execution-log.json', reason: err.message });
  }
});


// --- Action : GÃ©nÃ©rer une tÃ¢che "Campagne rentrÃ©e" (newsletter + WhatsApp)
app.post('/api/actions/create-campaign-rentree', async (req, res) => {
  try {
    const ctx = agentIdentity?.contexte_client || {};
    const task = {
      task: "campaign_rentree_damath",
      description: "Relance newsletter + WhatsApp spÃ©ciale rentrÃ©e (Damath)",
      action: "campaign_rentree",
      createdAt: new Date().toISOString(),
      payload: {
        client: ctx.nom || "Damath Overseas",
        segmentRules: { statuses: ["Nouveau", "Ã€ contacter"], tags: ["rentrÃ©e"] },
        email: {
          subject: "Offre spÃ©ciale rentrÃ©e â€“ expÃ©diez au meilleur tarif",
          preview: "RentrÃ©e: groupage, enlÃ¨vement, tarifs promo",
          variables: ["firstName","ville","type_envoi"]
        },
        whatsapp: {
          template: "Bonjour {{firstName}}, câ€™est Damath Overseas. Pour la rentrÃ©e, tarif spÃ©cial pour vos envois vers Madagascar. Voulez-vous quâ€™on sâ€™occupe du devis ?"
        },
        n8nWebhook: process.env.N8N_WEBHOOK_URL || null
      }
    };

    if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
    const filename = `campaign_rentree_${Date.now()}.json`;
    fs.writeFileSync(path.join(TASKS_DIR, filename), JSON.stringify(task, null, 2), 'utf8');
    saveToHistory('system', `TÃ¢che crÃ©Ã©e: ${filename}`);

    res.json({ ok: true, filename, task });
  } catch (e) {
    console.error('âŒ /api/actions/create-campaign-rentree', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});



// --- Action : Tag "rentrÃ©e" sur les nouveaux leads rÃ©cents
app.post('/api/actions/tag-rentree', async (req, res) => {
  try {
    const {
      statuses = ['Nouveau', 'Ã€ contacter', 'A contacter', 'New'],
      sinceDays = 7,
      limit = 600,
      pageSize = 200
    } = req.body || {};

    const since = new Date(); since.setDate(since.getDate() - (sinceDays||0));
    const leads = await getLeadsAll(limit, pageSize);

    const norm = s => (s||'').toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const toArrayTags = t => {
      if (!t) return [];
      if (Array.isArray(t)) return t;
      if (typeof t === 'string') return t.split(',').map(x=>x.trim()).filter(Boolean);
      if (typeof t === 'object') return Object.keys(t);
      return [];
    };

    const wanted = (statuses||[]).map(norm);

    const targeted = [];
    for (const l of leads) {
      const rawStatus = (l.status || l.statut || '').toString();
      const st = norm(rawStatus);
      const okStatus = wanted.length === 0 ? true : wanted.some(w => st.includes(w));

      const createdRaw = l.createdAt || l.dateCreated || l.created || l.created_at || null;
      const created = createdRaw ? new Date(createdRaw) : null;
      const okRecent = (sinceDays||0) <= 0 ? true : (created ? created >= since : true);

      const rawTags = l.tags || l.tagList || l.tagNames || null;
      const tags = toArrayTags(rawTags).map(norm);
      const hasRentree = tags.includes(norm('rentrÃ©e')) || tags.includes('rentree');

      if (okStatus && okRecent && !hasRentree) targeted.push(l);
    }

    let updated = 0, errors = [];
    for (const lead of targeted) {
      try {
        await patchLeadTags(lead.id, ['rentrÃ©e']);
        updated++;
      } catch (e) {
        errors.push({ id: lead.id, error: e.message });
      }
    }

    res.json({ ok: true, targeted: targeted.length, updated, errors });
  } catch (e) {
    console.error('âŒ /api/actions/tag-rentree', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- StratÃ©gie de tagging IA pour leads
app.post('/api/strategy/propose-tags', async (req, res) => {
  try {
    const leads = await getAllLeads('?maxSize=100');
    const context = agentIdentity?.contexte_client || {};

    const shortLeads = leads.map(l => ({
      nom: l.firstName + ' ' + l.lastName,
      statut: l.status,
      source: l.source,
      tags: l.tags,
      createdAt: l.createdAt
    }));

    const prompt = `\nTu es un assistant IA CRM intÃ©grÃ© Ã  EspoCRM.\n\nLe client est : ${context.nom ?? 'non prÃ©cisÃ©'} â€“ ${context.secteur ?? 'non prÃ©cisÃ©'}.\n\nObjectifs commerciaux :\n${(context.objectifs_commerciaux || []).map(o => "- " + o).join('\n')}\n\nTags utiles possibles :\n${(context.tags_utiles || []).join(', ')}\n\nVoici 10 leads rÃ©cents :\n${shortLeads.slice(0, 10).map(l => `- ${l.nom} | ${l.statut} | ${l.source} | ${l.tags?.join(', ') || 'â€”'} | ${l.createdAt}`).join('\n')}\n\nAnalyse ces leads et propose :\n1. âœ… Les tags Ã  ajouter cette semaine (avec contexte)\n2. ðŸ§  Des segments utiles pour automatiser les actions\n3. ðŸ” Des actions CRM ou marketing (WhatsApp, email, n8n)\n\nSois synthÃ©tique, structurÃ©, et pragmatique.\n`;

    const reply = await askOpenAI(prompt);
    saveToHistory('user', '[M.A.X. stratÃ©gie de tagging]');
    saveToHistory('assistant', reply);

    res.json({ ok: true, prompt, reply });
  } catch (e) {
    console.error('/api/strategy/propose-tags error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.use('/api/analyze-result', analyzeResultRoutes);

// --- SELFTEST inline (pour vÃ©rifier le montage global Express) ---


// --- SELFTEST inline sur le mÃªme prÃ©fixe (prouve que le prÃ©fixe est OK) ---
app.get('/api/actions/etiquette/__selftest-inline', (_req, res) => res.json({ ok: true, from: 'inline' }));

// --- Montage de la route ETIQUETTES + log dâ€™accÃ¨s ---
app.use('/api/actions/etiquette',
  (req, _res, next) => { console.log('>> [etiquette] hit:', req.method, req.url); next(); },
  etqActionsRoutes
);

// Ajout tag "rentrÃ©e" sur 1 lead (body.leadId OU ?leadId= OU /:id)
app.all('/api/actions/tag-one/:id?', async (req, res) => {
  try {
    const id =
      (req.body && (req.body.leadId || req.body.id)) ||
      req.query.leadId ||
      req.params.id;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "leadId requis (body.leadId, ?leadId=, ou /api/actions/tag-one/:id)"
      });
    }

    const r = await patchLeadTags(id, ['rentrÃ©e']);
    res.json({ ok: true, updated: id, result: r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.get('/api/analyze-result', (req, res) => {
  const file = path.join(process.cwd(), 'data', 'analyze-result.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Fichier non trouvÃ©' });

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);

    let items = [];
    if (Array.isArray(json)) {
      items = json;
    } else if (Array.isArray(json?.items)) {
      items = json.items;
    } else {
      // objet numerotÃ© -> le convertir en tableau
      items = Object.values(json)
        .filter(v => v && typeof v === 'object' && ('id' in v || 'fullName' in v));
    }

    res.json({ items });
  } catch (e) {
    console.error('âŒ analyze-result.json invalide :', e.message);
    res.status(500).json({ error: 'Fichier JSON invalide' });
  }
});
import { exec } from 'child_process';
import { say } from './utils/say.js';
import { analyzeCSV, enrichRealCSV } from './utils/analyzeCsv.js';
import { getAllLeads, updateLead } from './utils/espo-api.js';

// ðŸ” VÃ©rification environnement
const ESPO_URL = process.env.ESPO_URL;
const ESPO_API_KEY = process.env.ESPO_API_KEY;

function normalizeBase(u) {
  let base = (u || 'http://127.0.0.1:8081').toString().trim();
  // si quelquâ€™un a mis /api/v1/... dans ESPO_URL, on lâ€™enlÃ¨ve
  base = base.replace(/\/api\/v\d+.*$/i, '');
  return base.replace(/\/+$/, '');
}

const BASE = normalizeBase(ESPO_URL);
function espoUrl(p) {
  return `${BASE}/api/v1/${String(p).replace(/^\/+/, '')}`;
}


// Statut auth Espo
app.get('/api/__espo-status', async (req, res) => {
  try {
    const ping = await espo('GET', 'Lead?maxSize=1');
    res.json({
      ok: true,
      base: process.env.ESPO_BASE_URL || process.env.ESPO_URL,
      sample: Array.isArray(ping?.list) ? ping.list.length : (ping?.total ?? 0),
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

// Probe (mÃªme client)
app.get('/api/actions/etiquette/_probe', async (req, res) => {
  try {
    const sample = await espo('GET', 'Lead?maxSize=1');
    res.json({ ok:true, espo: process.env.ESPO_BASE_URL, sample: sample?.list?.length ?? 0 });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- utilitaire local
function parseTagsFromDescription(desc) {
  const m = /\bTAGS?\s*:\s*([^\n]+)/i.exec(desc || '');
  if (!m) return [];
  return m[1]
    .split(/[,\s#;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

app.get('/api/espo/lead/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    // on lit TOUT ce qui peut contenir des tags + description pour fallback
    const lead = await espo('GET', `Lead/${encodeURIComponent(id)}?select=name,description,tagNames,etiquettesNames,tags`);
    // prioritÃ©: etiquettesNames -> tagNames -> tags -> "TAGS:" dans la description
    let tags = [];
    const candidates = [lead?.etiquettesNames, lead?.tagNames, lead?.tags];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length) { tags = c; break; }
      if (c && typeof c === 'object') { tags = Object.keys(c); if (tags.length) break; }
      if (typeof c === 'string' && c.trim()) { tags = c.split(',').map(s => s.trim()); if (tags.length) break; }
    }
    if (!tags.length) tags = parseTagsFromDescription(lead?.description);

    return res.json({ ok: true, id, name: lead?.name ?? null, tags });
  } catch (e) {
    return res.status(404).json({ ok: false, error: String(e) });
  }
});

// --- Helpers (dates & tags)
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function normalizeTags(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  if (typeof t === 'string') return t.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}
function toTagArrayAny(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  if (typeof raw === 'object') return Object.keys(raw); // ex. { "rentrÃ©e": true }
  return [];
}

function toTagPayloadLike(rawBefore, tagsArray) {
  // Si initialement c'Ã©tait un objet -> renvoyer un objet { tag: true }
  if (rawBefore && typeof rawBefore === 'object' && !Array.isArray(rawBefore)) {
    const obj = {};
    for (const t of tagsArray) obj[t] = true;
    return obj;
  }
  // Sinon, tableau
  return tagsArray;
}

async function patchLeadTags(id, add = [], remove = [], fields = {}) {
  const lead = await espo('GET', `Lead/${id}`);

  // Si l'entitÃ© Lead a une relation 'tags', utiliser linkMany via ensureTagId
  try {
    const links = await getMetadata('entityDefs.Lead.links');
    if (links?.tags) {
      const ids = [];
      for (const t of add) {
        const tid = await ensureTagId(t);
        ids.push(tid);
      }
      if (ids.length) {
        await linkMany('Lead', id, 'tags', ids);
        return { ok: true, mode: 'link', linked: ids.length };
      }
    }
  } catch (e) {
    // fallback to patching the tags field
  }

  const current = toTagArrayAny(lead.tags || lead.tagList || lead.tagNames);
  const merged = new Set(current);
  add.forEach(t => merged.add(t));
  remove.forEach(t => merged.delete(t));

  const newTagsArr = Array.from(merged);
  const tagsPayload = toTagPayloadLike(lead.tags, newTagsArr);
  const payload = { ...fields, tags: tagsPayload };

  return espo('PATCH', `Lead/${id}`, { body: JSON.stringify(payload) });
}

// --- PATCH lead avec tags dynamiques (ancrÃ© dans le plan projet)
app.patch('/api/crm/update-lead/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tagsToAdd = [], tagsToRemove = [], ...fields } = req.body || {};

    // 1. Lire le lead actuel
  const lead = await espo('GET', `Lead/${id}`);
    const currentTags = Array.isArray(lead.tags) ? lead.tags : [];

    // 2. Merger proprement les tags
    const merged = new Set(currentTags);
    tagsToAdd.forEach(t => merged.add(t));
    tagsToRemove.forEach(t => merged.delete(t));

    const finalTags = Array.from(merged);

    // 3. Mettre Ã  jour le lead
    const patch = { ...fields, tags: finalTags };
    const updated = await espo('PATCH', `Lead/${id}`, {
      body: JSON.stringify(patch),
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ESPO_API_KEY
      }
    });

    res.json({ ok: true, updated });
  } catch (e) {
    console.error('âŒ PATCH /api/crm/update-lead/:id', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Config ---
// Test API EspoCRM (fetchEspo)

const PORT = process.env.PORT || 3005;
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
const TASKS_DIR = process.env.TASKS_DIR || path.join(__dirname, '..', 'ia_admin', 'tasks_autogen'); // fallback
const BACKUP_ROOT = process.env.BACKUP_ROOT || path.join(__dirname, '..', 'backups', 'react');
const REACT_SRC_DIR = process.env.REACT_SRC_DIR || path.join(__dirname, '..', 'ia-admin-ui', 'src');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const HISTORY_PATH = path.join(DATA_DIR, 'chat-history.json');
const AGENT_IDENTITY_PATH = path.join(DATA_DIR, 'agent_identity.json');
const PROJECT_MAP_PATH = path.join(__dirname, '..', 'ia_admin_api', 'project-map.json'); // keep compatibility

// --- Chargement unique de l'identitÃ© de l'agent ---
let agentIdentity = {};
try {
  if (fs.existsSync(AGENT_IDENTITY_PATH)) {
    const raw = fs.readFileSync(AGENT_IDENTITY_PATH, 'utf8');
    agentIdentity = JSON.parse(raw);
  } else {
    throw new Error('agent_identity.json manquant');
  }
} catch (e) {
  console.error('âš ï¸ Impossible de lire data/agent_identity.json â€” vÃ©rifiez le fichier.', e.message);
  agentIdentity = {}; // ou valeurs par dÃ©faut minimales si besoin
}

// --- Helpers: safe filenames, history, read/write ---
function isSafeReactFile(filename) {
  return /^[\w\-.]+\.jsx?$/.test(filename);
}

function readJSONSafe(p, defaultValue = null) {
  try {
    if (!fs.existsSync(p)) return defaultValue;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('readJSONSafe error', p, e.message);
    return defaultValue;
  }
}

function writeJSONSafe(p, obj) {
  try {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeJSONSafe error', p, e.message);
    return false;
  }
}

// Chat history helpers
function getHistory() {
  return readJSONSafe(HISTORY_PATH, []);
}

function saveChatHistoryLocal(message) {
  const path = './data/chat-history.json';
  const log = readJSONSafe(path) || [];

  // Si pas dÃ©jÃ  timestampÃ©, ajoute le timestamp
  if (!message.timestamp) {
    message.timestamp = new Date().toISOString();
  }

  log.push(message);
  fs.writeFileSync(path, JSON.stringify(log.slice(-500), null, 2), 'utf8'); // max 500 lignes
}
function getLastMessages(n = 10) {
  const h = getHistory();
  return h.slice(-n);
}

// --- Small utilities ---
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// Build prompt for LLM using agent identity + recent history
function buildPrompt(userPrompt, chatHistory = []) {
  const identitySection = `
Tu es ${agentIdentity.nom}, un ${agentIdentity.type}.
Mission : ${agentIdentity.role}

Projet : ${agentIdentity.contexte_projet?.projet ?? 'non spÃ©cifiÃ©'}
Utilisation : ${agentIdentity.contexte_projet?.utilisation ?? 'non spÃ©cifiÃ©'}
Mission mÃ©tier : ${agentIdentity.contexte_projet?.mission_metier ?? ''}

Voici tes permissions :
${(agentIdentity.permissions || []).map(p => `- ${p}`).join('\n')}

Objectifs :
${(agentIdentity.objectifs || []).map(o => `- ${o}`).join('\n')}

PersonnalitÃ© : ${agentIdentity.personnalitÃ© || ''}
`.trim();

  const historyText = (chatHistory.length ? chatHistory.map(h => `${h.role.toUpperCase()}: ${h.content || h.message || ''}`).join('\n') : '');
  return `${identitySection}\n\nContexte rÃ©cent :\n${historyText}\n\nDemande utilisateur : ${userPrompt}`;
}

// Ask OpenAI (fallback to test response if no key)
async function askOpenAI(prompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    // fallback friendly answer (keeps context)
    return `ðŸ§  (MODE LOCAL) M.A.X. a reÃ§u : "${prompt}". Pour des rÃ©ponses enrichies, dÃ©finis OPENAI_API_KEY dans .env.`;
  }

  // Using Chat Completions (gpt-3.5-turbo). Node 18+ has global fetch.
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
  model: 'gpt-4-1106-preview', // gpt-4-mini
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 800
      })
    });
    const json = await resp.json();
    if (!resp.ok) {
      console.error('OpenAI error:', json);
      return `âŒ Erreur OpenAI: ${json.error?.message || JSON.stringify(json)}`;
    }
    const reply = json.choices?.[0]?.message?.content ?? JSON.stringify(json);
    return reply;
  } catch (e) {
    console.error('askOpenAI error', e.message);
    return `âŒ Erreur (appel OpenAI): ${e.message}`;
  }
}

// --- ROUTES EXPRESS ---

// Test API EspoCRM (fetchEspo)


// SantÃ© API Espo (test auth + reach)
app.get('/api/crm/health', async (_req, res) => {
  try { await espo('GET', 'I18n'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Met Ã  jour des champs simples (statut, custom fieldsâ€¦)
app.post('/api/crm/:entity/:id/update', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const { patch } = req.body || {};
    if (!patch || typeof patch !== 'object') throw new Error('patch object required');
    const updated = await updateEntity(entity, id, patch);
    res.json({ ok: true, updated });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Ajoute des "tags" Ã  un Lead, en dÃ©tectant si câ€™est un CHAMP ou une RELATION
// Ajoute des "tags" Ã  un Lead, en essayant d'abord champ, puis relation
// Ajoute des tags Ã  un Lead en sâ€™adaptant Ã  lâ€™instance (relation 'etiquettes' ou 'tags', sinon champ)
// Ajoute des tags sur un Lead (gÃ¨re lien 'etiquettes'/'tags' OU champs 'tagNames'/'tags'/'tagList')
// Robust: try linking Lead/{id}/{link} then fallback to linking from the target side
// Ajoute des tags Ã  un Lead â€” dÃ©lÃ¨gue au helper patchLeadTags (relation si dispo, sinon patch champ)
// (removed duplicate â€” use the description-based POST handler defined later)


// --- Routes utilitaires pour le log et le diagnostic ---
app.get('/api/__ping-log', (_req, res) => {
  log('PING LOG OK');
  res.json({ ok: true });
});

// Canonical routes listing (single handler kept)
app.get('/api/__routes', (_req, res) => {
  const routes = [];
  (app._router?.stack || []).forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods || {}).map(k => k.toUpperCase()).filter(Boolean);
      routes.push({ path: m.route.path, methods });
    }
  });
  res.json({ ok: true, routesCount: routes.length, routes });
});

// ... toutes les routes sont dÃ©jÃ  dÃ©finies ci-dessus ...

// --- Listing des routes (diagnostic) ---
// duplicate /api/__routes removed (canonical handler declared earlier)

// Debug: lister les routes montÃ©es
// duplicate /api/__routes removed (canonical handler declared earlier)

// (removed an early 404 handler so routes defined after this point remain reachable)

// --- Endpoints Espo utiles (health & lead tags)
app.get('/api/__espo-status', async (req, res) => {
  try {
    const ping = await espo('GET', 'Lead?maxSize=1');
    res.json({
      ok: true,
      base: process.env.ESPO_BASE_URL || process.env.ESPO_URL,
      sample: Array.isArray(ping?.list) ? ping.list.length : (ping?.total ?? 0),
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

// 1) Lookup Espo par email
app.get('/api/espo/lead/by-email', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ ok:false, error:'email requis' });

    const where = encodeURIComponent(JSON.stringify([
      { type: 'equals', attribute: 'emailAddress', value: email }
    ]));
    const select = encodeURIComponent('id,name,emailAddress,phoneNumber,tagNames,etiquettesNames');
    const url = `Lead?maxSize=5&where=${where}&select=${select}`;

    const resp = await espo('GET', url);
    const items = (resp?.list || []).map(i => ({
      id: i.id,
      name: i.name,
      email: i.emailAddress ?? null,
      phone: i.phoneNumber ?? null,
      tags: i.etiquettesNames ?? i.tagNames ?? [],
    }));
    res.json({ ok:true, count: items.length, items });
  } catch (e) {
    res.status(503).json({ ok:false, error:String(e) });
  }
});

// 2) Lookup Espo par tÃ©lÃ©phone
app.get('/api/espo/lead/by-phone', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ ok:false, error:'phone requis' });

    const resp = await espo('GET', `Lead?maxSize=5&q=${encodeURIComponent(phone)}&select=id,name,tagNames,etiquettesNames,phoneNumber`);
    const items = (resp?.list || []).map(i => ({
      id: i.id,
      name: i.name,
      phone: i.phoneNumber || phone,
      tags: i.etiquettesNames ?? i.tagNames ?? []
    }));
    res.json({ ok:true, count: items.length, items });
  } catch (e) {
    res.status(503).json({ ok:false, error:String(e) });
  }
});

// POST /api/espo/upsert-lead  { firstName,lastName,email,phone,source,status }
app.post('/api/espo/upsert-lead', async (req, res) => {
  try {
    const { firstName='', lastName='', email='', phone='', source='Website', status='In Process' } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'email requis' });

    const where = encodeURIComponent(JSON.stringify([{ type:'equals', attribute:'emailAddress', value: email }]));
    const found = await espo('GET', `Lead?maxSize=1&where=${where}&select=id`);
    let id = found?.list?.[0]?.id;

    if (!id) {
      const created = await espo('POST', 'Lead', { body: { firstName, lastName, emailAddress: email, phoneNumber: phone, source, status }});
      id = created?.id;
    }

    res.json({ ok:true, id });
  } catch (e) {
    res.status(503).json({ ok:false, error:String(e) });
  }
});

// 3) Lire les tags dâ€™un lead Espo par ID (si tu as dÃ©jÃ  l'ID Espo)
// Remplace la ligne TAGS: dans description (ou lâ€™ajoute)
function upsertTagsInDescription(desc, tagsArr) {
  const base = (desc || '').replace(/^\s*(TAGS?|#tags?)\s*:.+$/gmi, '').trim();
  const line = `TAGS: ${[...new Set(tagsArr)].map(t => `#${t}`).join(' ')}`;
  return base ? `${base}\n${line}` : line;
}

app.post('/api/crm/lead/:id/tags', async (req, res) => {
  try {
    const leadId = req.params.id;
    const names = (req.body?.tags || []).map(s => String(s).trim()).filter(Boolean);
    if (!names.length) return res.status(400).json({ ok: false, error: 'tags array required' });

    // lire le lead et fusionner avec tags dÃ©jÃ  prÃ©sents dans description
    const lead = await espo('GET', `Lead/${encodeURIComponent(leadId)}?select=id,name,description`);
    const existing = (function parse(desc) {
      const m = /\bTAGS?\s*:\s*([^\n]+)/i.exec(desc || '');
      if (!m) return [];
      return m[1].split(/[,\s#;]+/).map(s => s.trim()).filter(Boolean);
    })(lead?.description);

    const merged = Array.from(new Set([...existing, ...names]));
    const description = upsertTagsInDescription(lead?.description || '', merged);

    const updated = await espo('PATCH', `Lead/${encodeURIComponent(leadId)}`, { body: { description } });
    return res.json({ ok: true, mode: 'description(TAGS: ...)', updated });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Recherche Lead par tÃ©lÃ©phone
app.get('/api/espo/lead/by-phone', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ ok:false, error:'phone requis' });

    const qs = `Lead?maxSize=5&q=${encodeURIComponent(phone)}&select=id,name,emailAddress,phoneNumber,tagNames,etiquettesNames`;
    const resp = await espo('GET', qs);
    const items = (resp?.list || []).map(i => ({
      id: i.id,
      name: i.name,
      email: i.emailAddress ?? null,
      phone: i.phoneNumber ?? null,
      tags: i.etiquettesNames ?? i.tagNames ?? [],
    }));
    res.json({ ok:true, count: items.length, items });
  } catch (e) {
    res.status(503).json({ ok:false, error:String(e) });
  }
});

// (duplicate removed â€” use the robust reader defined earlier)

// (optionnel) Duplicate routes listing removed â€” canonical /api/__routes is defined earlier

// serve project-map.json if exists
app.get('/project-map.json', (req, res) => {
  const p = path.join(process.cwd(), 'project-map.json');
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.status(404).json({ error: 'project-map.json non trouvÃ©' });
});

// list tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasksDir = TASKS_DIR;
    if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    const tasks = files.map(f => {
      const content = safeJsonParse(fs.readFileSync(path.join(tasksDir, f), 'utf8'));
      return { filename: f, content };
    });
    res.json(tasks);
  } catch (e) {
    console.error('/api/tasks', e.message);
    res.status(500).json({ error: e.message });
  }
});

// create task
app.post('/api/tasks/create', (req, res) => {
  try {
    const { name = 'task', description = '', payload = {} } = req.body;
    const timestamp = Date.now();
    const filename = `${name.replace(/[^\w\-]/g, '_')}-${timestamp}.json`;
    if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
    const taskPath = path.join(TASKS_DIR, filename);
    const taskData = { task: name, description, action: payload.action || 'custom', createdAt: new Date().toISOString(), payload };
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2), 'utf8');
    saveToHistory('system', `TÃ¢che crÃ©Ã©e: ${filename}`);
    res.json({ ok: true, filename, task: taskData });
  } catch (e) {
    console.error('/api/tasks/create', e.message);
    res.status(500).json({ error: e.message });
  }
});

// delete task
app.delete('/api/tasks/:filename', (req, res) => {
  try {
    const p = path.join(TASKS_DIR, req.params.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/tasks/:filename delete', e.message);
    res.status(500).json({ error: e.message });
  }
});

// validate/execute task
app.post('/api/tasks/:filename/validate', (req, res) => {
  try {
    const p = path.join(TASKS_DIR, req.params.filename);
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'task not found' });
    const payload = JSON.parse(fs.readFileSync(p, 'utf8'));

    saveToHistory('system', `Validation de la tÃ¢che ${req.params.filename}`);

    // handle known actions
    if (payload.action === 'generate_project_map' || payload.task === 'generate_crm_map') {
      const structure = payload.structure || payload.payload?.structure || {};
      const outPath = path.join(process.cwd(), 'project-map.json');
      fs.writeFileSync(outPath, JSON.stringify(structure, null, 2), 'utf8');
      say(`Jâ€™ai analysÃ© lâ€™environnement. La carte mentale est prÃªte.`);
      // Ajout log execution
      logExecution(req.params.filename, "Validation tÃ¢che MAX");
      return res.json({ ok: true, action: 'generate_project_map' });
    }

    // default: mark validated
    // Ajout log execution
    logExecution(req.params.filename, "Validation tÃ¢che MAX");
    return res.json({ ok: true, forwarded: !!process.env.N8N_WEBHOOK_URL });
  } catch (e) {
    console.error('/api/tasks/:filename/validate', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Log d'exÃ©cution des tÃ¢ches
async function logExecution(filename, action, result = 'OK') {
  const executionPath = path.join(DATA_DIR, 'execution-log.json');
  let log = [];
  try {
    const raw = await fs.promises.readFile(executionPath, 'utf8');
    log = JSON.parse(raw);
  } catch {
    log = [];
  }
  log.push({
    date: new Date().toISOString(),
    action,
    type: "Task",
    filename,
    result
  });
  await fs.promises.writeFile(executionPath, JSON.stringify(log, null, 2), 'utf8');
}

// list react files
app.get('/api/react-files', (req, res) => {
  try {
    const dir = REACT_SRC_DIR;
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'react src dir not found' });
    const files = fs.readdirSync(dir).filter(f => isSafeReactFile(f));
    res.json({ files });
  } catch (e) {
    console.error('/api/react-files', e.message);
    res.status(500).json({ error: e.message });
  }
});

// read react file
app.get('/api/react-file', (req, res) => {
  try {
    const name = req.query.name;
    if (!name || !isSafeReactFile(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });
    const filePath = path.join(REACT_SRC_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'fichier introuvable' });
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(content);
  } catch (e) {
    console.error('/api/react-file', e.message);
    res.status(500).json({ error: e.message });
  }
});

// write react file
app.post('/api/react-file/write', (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !isSafeReactFile(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });
    const filePath = path.join(REACT_SRC_DIR, name);
    fs.writeFileSync(filePath, content, 'utf8');
    saveToHistory('system', `Fichier React modifiÃ©: ${name}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/react-file/write', e.message);
    res.status(500).json({ error: e.message });
  }
});

// backup React source (simple copy + zip via PowerShell)
function backupReactSource() {
  try {
    if (!fs.existsSync(REACT_SRC_DIR)) return;
    if (!fs.existsSync(BACKUP_ROOT)) fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `backup-${timestamp}`;
    const tempDir = path.join(BACKUP_ROOT, folderName);
    fs.mkdirSync(tempDir);
    const files = fs.readdirSync(REACT_SRC_DIR).filter(f => isSafeReactFile(f));
    for (const file of files) {
      fs.copyFileSync(path.join(REACT_SRC_DIR, file), path.join(tempDir, file));
    }
    const zipFile = path.join(BACKUP_ROOT, `${folderName}.zip`);
    // compress on Windows using PowerShell Compress-Archive
    exec(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFile}'"`, (err) => {
      // remove temp dir afterwards
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      if (err) return console.error('âŒ Erreur compression ZIP :', err.message);
      console.log(`âœ… Backup compressÃ© : ${zipFile}`);
    });
  } catch (e) {
    console.error('backupReactSource error', e.message);
  }
}

function cleanOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    const now = Date.now();
    fs.readdirSync(BACKUP_ROOT).forEach(file => {
      const full = path.join(BACKUP_ROOT, file);
      const stats = fs.statSync(full);
      const ageMs = now - stats.mtimeMs;
      if (ageMs > 7 * 24 * 3600 * 1000) {
        fs.rmSync(full, { recursive: true, force: true });
        console.log('ðŸ—‘ï¸ Ancien backup supprimÃ©:', file);
      }
    });
  } catch (e) {
    console.error('cleanOldBackups error', e.message);
  }
}

// schedule backups every 48h
setInterval(() => {
  backupReactSource();
  cleanOldBackups();
}, 48 * 3600 * 1000);

// initial immediate backup
try { backupReactSource(); cleanOldBackups(); } catch (e) { /* ignore */ }

// manual backup endpoint
app.get('/api/backup-now', (req, res) => {
  try {
    backupReactSource();
    cleanOldBackups();
    res.json({ ok: true, message: 'Sauvegarde manuelle exÃ©cutÃ©e' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// check voice (attempt to run a Powershell TTS test)
app.get('/api/check-voice', (req, res) => {
  try {
    const testCommand = `powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('Test vocal IA')"`; // windows only
    exec(testCommand, (err) => {
      if (err) {
        return res.json({ ok: false, message: 'Erreur lors du test vocal (PowerShell).', error: err.message });
      } else {
        return res.json({ ok: true, message: 'SynthÃ¨se vocale exÃ©cutÃ©e avec succÃ¨s.' });
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// history endpoints
app.get('/api/history', (req, res) => {
  res.json(getHistory());
});

app.post('/api/chat', (req, res) => {
  const { role = 'user', message = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'message missing' });
  saveToHistory(role, message);
  res.json({ ok: true });
});

// main ask-task endpoint (uses LLM if OPENAI_API_KEY present, else fallback)
app.post('/api/ask-task', async (req, res) => {
  try {
    const userPrompt = (req.body?.prompt ?? '').toString();

      const lowPrompt = userPrompt.toLowerCase().trim();
      if (["bonjour", "salut", "hello", "coucou"].includes(lowPrompt)) {
        const greeting = "ðŸ‘‹ Bonjour, je suis M.A.X. ! Voici ce que je peux faire pour vous :\n" +
          "- CrÃ©er un nouveau prospect\n" +
          "- Ajouter un tag comme 'rentrÃ©e' ou 'prioritaire'\n" +
          "- Proposer une stratÃ©gie de tagging ou dâ€™automatisation\n\n" +
          "Que souhaitez-vous faire aujourdâ€™hui ?";
        saveToHistory('user', userPrompt);
        saveToHistory('assistant', greeting);
        if (req.body.speak === true) say(greeting);
        return res.json({ reply: greeting });
      }
      if (!userPrompt) return res.status(400).json({ reply: 'âŒ prompt manquant' });

    const last = getLastMessages(10);
    const fullPrompt = buildPrompt(userPrompt, last);

    const reply = await askOpenAI(fullPrompt);

    saveToHistory('user', userPrompt);
    saveToHistory('assistant', reply);

    if (req.body.speak === true) {
      say(reply); // âœ… CorrigÃ© ici : lit la vraie rÃ©ponse
    }

    res.json({ reply });
  } catch (e) {
    console.error('/api/ask-task error', e.message);
    res.status(500).json({ reply: 'âŒ Erreur interne M.A.X.' });
  }
});

// Legacy /api/ask simple endpoint (keeps parity)
app.post('/api/ask', async (req, res) => {
  const { message } = req.body;

    log('ASK route appelÃ©e avec message:', message);

  try {
    // Appel Ã  OpenAI ou ta logique IA rÃ©elle
    const response = await askOpenAI(message);

    // âœ… Envoie de la rÃ©ponse Ã  lâ€™utilisateur
    res.json({ response });

    // ðŸ—£ï¸ SynthÃ¨se vocale de la rÃ©ponse (optionnelle si ENV activÃ©e)
    if (process.env.ENABLE_SPEECH === "true") {
      say(response);
    }
  } catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({ error: "Erreur lors de la gÃ©nÃ©ration IA." });
  }
});

// Serve static files (optional) - if you want to expose React build or other static assets
// app.use(express.static(path.join(__dirname, '..', 'ia-admin-ui', 'dist')));

// route de test vocal
app.get("/api/test-voice", (req, res) => {
  console.log("ðŸ—£ï¸ Tentative de parler...");
  say("Test vocal rÃ©ussi.");
  res.send("âœ… Commande vocale envoyÃ©e.");
});

// RÃ©cupÃ©rer les 5 derniÃ¨res exÃ©cutions IA/CRM
app.get("/api/executions/recent", async (req, res) => {
  try {
    const raw = await fs.promises.readFile(path.join(DATA_DIR, "execution-log.json"), "utf8");
    const history = JSON.parse(raw);
    const recent = history.slice(-5).reverse();
    res.json(recent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Scan et rÃ©sume un dossier autorisÃ©
app.post('/api/scan-folder', (req, res) => {
  const folder = req.body.path;
  const allowed = agentIdentity.accÃ¨s_fichiers || [];

  if (!allowed.includes(folder)) {
    return res.status(403).json({ error: "Dossier non autorisÃ©." });
  }

  // Fonction de scan et rÃ©sumÃ© simple (Ã  adapter selon besoin)
  function scanAndSummarize(dir) {
    if (!fs.existsSync(dir)) return "Dossier introuvable.";
    const files = fs.readdirSync(dir);
    return {
      dossier: dir,
      fichiers: files,
      total: files.length
    };
  }

  const rÃ©sumÃ© = scanAndSummarize(folder);
  say("Jâ€™ai explorÃ© le dossier et gÃ©nÃ©rÃ© un rÃ©sumÃ©.");
  res.json({ rÃ©sumÃ© });
});

app.post("/api/analyze-entity", (req, res) => {
  const entity = req.body.entity || "Prospect";
  const entityPath = `D:/Macrea/CRMACREA/clients/client_A_artisane/espocrm_data/application/Espo/Custom/Resources/metadata/entityDefs/${entity}.json`;

  if (!fs.existsSync(entityPath)) {
    return res.status(404).json({ error: "EntitÃ© non trouvÃ©e." });
  }

  const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));
  say(`Jâ€™ai analysÃ© lâ€™entitÃ© ${entity}. Elle contient ${Object.keys(entityData.fields).length} champs.`);

  res.json({ entity, fields: entityData.fields, links: entityData.links });
});

// ðŸ“ Lecture du fichier Lead.json depuis EspoCRM
app.get('/api/entity/lead', (req, res) => {
  const filePath = path.join(
  __dirname,
  '..',
  'clients',
  'client_A_artisane',
  'data',
  'espocrm_data',
  'application',
  'Espo',
  'Modules',
  'Crm',
  'Resources',
  'metadata',
  'entityDefs',
  'Lead.json'
);

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json({ content: JSON.parse(data) });
  } catch (error) {
    console.error('Erreur lecture Lead.json', error);
    res.status(500).json({ error: "Erreur lors de la lecture du fichier Lead.json" });
  }
});


// Enrichit un fichier CSV rÃ©el avec des donnÃ©es supplÃ©mentaires
app.post('/api/process-real-csv', async (req, res) => {
  try {
    const inputPath = path.join(DATA_DIR, 'leads', 'import_test_prospects_client_B.csv');
    const outputPath = path.join(DATA_DIR, 'output', 'leads_enrichis_client_B.csv');

    console.log("âž¡ï¸ DÃ©but analyse CSV rÃ©el...");
    const result = await enrichRealCSV(inputPath, outputPath);
    console.log("âœ… Fichier enrichi :", result);

    res.json({
      message: 'Fichier analysÃ© avec succÃ¨s.',
      fichier_enrichi: outputPath,
      ...result
    });
  } catch (err) {
    console.error('âŒ Erreur enrichissement CSV rÃ©el:', err);
    res.status(500).json({ success: false, message: 'Erreur analyse CSV rÃ©el' });
  }
});

// test EspoCRM API
app.get('/api/test-espo', async (req, res) => {
  try {
    const leads = await getAllLeads('?maxSize=50');
    res.json({ total: leads.length, leads });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

function analyzeLead(lead) {
  const tags = [];
  let action = '';
  const notes = [];

  const statut    = (lead.statut_client || '').toLowerCase();
  const source    = (lead.source || '').toLowerCase();
  const objection = (lead.objection || '').toLowerCase();
  const type      = (lead.type_client || '').toLowerCase();

  if (statut.includes('Ã  relancer') || statut.includes('a relancer') || statut.includes('a relancÃ©')) {
    tags.push('Ã _relancer');
    action = 'Appel sous 48h';
    notes.push('Lead Ã  recontacter rapidement');
  } else if (statut.includes('client')) {
    tags.push('client_actif');
    action = 'FidÃ©lisation';
    notes.push('Client existant Ã  entretenir');
  } else if (statut.includes('perdu')) {
    tags.push('lead_perdu');
    action = 'Archiver ou relancer plus tard';
    notes.push('Lead classÃ© comme perdu');
  } else if (!statut || statut === '-') {
    tags.push('premier_contact');
    action = 'Qualifier';
    notes.push('Statut vide â†’ Ã  qualifier');
  }

  if (source.includes('meta') || source.includes('facebook')) tags.push('facebook_ads');
  else if (source.includes('site')) tags.push('site_web');
  else if (source.includes('recommandation')) tags.push('bouche_Ã _oreille');

  if (objection.includes('cher')) {
    tags.push('prix_sensible');
    notes.push('Objection liÃ©e au prix');
  }

  if (type === 'entreprise') tags.push('b2b');
  else if (type === 'particulier') tags.push('b2c');

  return {
    tags: tags.join(', '),
    action_suggeree: action,
    commentaire_IA: notes.join(' | ')
  };
}

app.post('/api/sync-leads', async (req, res) => {
  try {
    const leads = await getAllLeads('?maxSize=100');
    let updated = 0;

    for (const lead of leads) {
      const ai = analyzeLead(lead);

      const payload = {
        tags: ai.tags,
        action_suggeree: ai.action_suggeree,
        commentaire_IA: ai.commentaire_IA
      };

      await updateLead(lead.id, payload);
      updated++;
    }

    res.json({ success: true, total: leads.length, updated });
  } catch (e) {
    console.error('âŒ /api/sync-leads error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

async function sendMessage(userText) {
  const res = await fetch('/api/ask-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userText, speak: false })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP_${res.status}`);

  // data.reply ou data.note selon ta route de test
  return data;
}

// --- Server start (ESM-safe)
const isMain = (() => {
  // compare lâ€™URL de ce module avec le fichier invoquÃ© en CLI
  const invoked = 'file://' + path.resolve(process.argv[1] || '').replace(/\\/g, '/');
  return import.meta.url === invoked;
})();
if (isMain) {
  try {
    const server = app.listen(PORT, BIND_HOST, () => {
      console.log(`âœ… M.A.X. server listening on http://${BIND_HOST}:${PORT} (pid=${process.pid})`);
    });

    // Graceful shutdown
    const shutdown = (sig) => {
      console.log(`âš ï¸ Received ${sig}, shutting down...`);
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
      console.error('UncaughtException', err && err.stack ? err.stack : String(err));
      // Allow process to crash after logging
      setTimeout(() => process.exit(1), 200);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('UnhandledRejection', reason);
    });
  } catch (e) {
    console.error('Failed to start server', e && e.stack ? e.stack : String(e));
    process.exit(1);
  }
}
// permet d'importer `app` ailleurs sans dÃ©marrer le serveur
export default app;


