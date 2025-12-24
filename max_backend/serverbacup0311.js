// --- Imports uniques (ESM) ---
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cors from 'cors';
import { exec } from 'child_process';
import crypto from 'node:crypto'; // <-- AJOUT: import pour HMAC (ESM)
// <-- AJOUT: fetch pour Node (utilisé par la fonction espo)
import fetch from 'node-fetch';

// --- CORRECTIF : .env doit être chargé AVANT les autres imports ---
dotenv.config();
// --- Fin du correctif ---

// ✅ journal des actions (un seul import !)
import { logTask, readTaskHistory, latest } from './utils/task-log.js';
import { IDENTITY as LOADED_IDENTITY } from './utils/identity-loader.js';

// ✅ gestion des leads
import { upsertLeads, analyzeLeads, suggestTags } from './utils/leads-store.js';

// (s'il existe chez toi) ton helper historique chat :
import { saveChatHistory, getChatHistory } from './utils/chat-history.js';
import { getMetadata, updateEntity, linkMany, ensureTagId } from './utils/espoClient.js';
import { mapLead } from './utils/lead-mapper.js';
import { say } from './utils/say.js';
import { analyzeCSV, enrichRealCSV } from './utils/analyzeCsv.js';
import { getAllLeads, updateLead } from './utils/espo-api.js';

// --- init dirname/filename (obligatoire avant d'utiliser __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- .env (l'appel .config() est déjà fait en haut) ---

// --- CORRECTIF 2 : Chargement de l'identité de l'agent (DÉPLACÉ ICI) ---
const DATA_DIR = path.join(__dirname, 'data');

// mini-loader (lightweight, inline)
const DATA = p => path.join(process.cwd(), 'data', p);
const readJson = (p, fb = {}) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } };

// fallback identity defaults
const DEFAULT_IDENTITY = {
  nom: 'M.A.X.',
  terminologie: {
    crm_nom: 'MaCréa CRM',
    interdit: ['je ne peux pas me connecter aux systèmes externes']
  }
};

// load agentIdentity using the mini-loader (client overrides if present)
let agentIdentity = readJson(DATA('agent_identity.json'), DEFAULT_IDENTITY);

// expose a unified IDENTITY variable for prompts (falls back to agentIdentity)
const IDENTITY = LOADED_IDENTITY || agentIdentity;

// --- Fin du correctif de déplacement ---


// --- Logger simple (après __dirname)
const logFile = path.join(__dirname, 'logs', 'server.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line);
  }
  catch (e) { console.error('Impossible d’écrire dans server.log:', e.message); }
}

// --- HOTFIX: task store minimal + logExecution ---
global.logExecution = function (task, level, msg, meta) {
  try {
    task.logs = task.logs || [];
    task.logs.push({ t: Date.now(), level: level || 'info', msg: msg || '', meta: meta || null });
    task.updatedAt = new Date().toISOString();
    if (typeof saveTask === 'function') saveTask(task); // sauvegarde si mini-store présent
  } catch (_) { /* no-op */ }
};
// --- FIN HOTFIX ---

// Log au démarrage (crée logs/server.log même sans appel)
log('BOOT', 'M.A.X. démarre sur le port', process.env.PORT || 3005);
console.log('[M.A.X] .env chargé:', fs.existsSync(path.join(__dirname, '.env')));
console.log('[M.A.X] API_KEY lue:', process.env.ESPO_API_KEY);

// >>> tu peux aussi logger ici
console.log('[M.A.X] ESPO_URL =', process.env.ESPO_URL, ' | API_KEY last4 =', (process.env.ESPO_API_KEY || '').slice(-4));
import analyzeResultRoutes from './routes/analyzeResult.js';
import etqActionsRoutes from './routes/etq_actions.js';
const app = express();
app.use(cors({ origin:'*' }));
app.use(express.json({ limit:'5mb' })); // <-- Votre plan le demande, il est bien là
app.use(express.urlencoded({ extended:true }));

// --- AJOUT (depuis votre plan) : Route de test Echo ---
app.post('/api/__echo', (req, res) => {
  console.log('[ECHO] Body reçu:', req.body);
  res.json({ ok: true, body: req.body });
});
// --- Fin de l'ajout ---

// POST /api/tags/apply-suggested  -> applique toutes les suggestions courantes
app.post('/api/tags/apply-suggested', express.json(), async (req, res) => {
  try {
    const items = typeof suggestTags === 'function' ? suggestTags() : [];
    let totalApplied = 0;
    for (const s of items) {
      if (!s.applyTo?.length) continue;
      // TODO: ici, brancher EspoCRM si nécessaire. Pour l’instant, on “simule” local.
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

    const reply = `Tâches ${items.length} tags proposés traités. ${totalApplied} affectations au total.`;
    // --- CORRECTIF 4: "saveToHistory" -> "saveChatHistory"
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
    // TODO: brancher EspoCRM ici si tu veux l’effet côté CRM.
    // await espoApplyTagToLeads(tag, leadIds);

    if (typeof logTask === 'function') {
      logTask({ action: 'Ajout Tag', entity: 'Lead', details: { tag, count: leadIds.length, leadIds } });
    }
    const reply = `✅ Tag "${tag}" appliqué à ${leadIds.length} leads.`;
    // --- CORRECTIF 4: "saveToHistory" -> "saveChatHistory"
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
// POST /api/ask-task-with-file  -> lit CSV/JSON, renvoie leads complets + sample
app.post('/api/ask-task-with-file', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    let { prompt, fileType = "csv", fileContent, encoding, mode = "import" } = req.body || {};

    // 1) normaliser en texte
    let raw = normalizeToText(fileContent);

    // 2) décoder base64 si besoin
    if (encoding === "base64" && typeof raw === "string") {
      raw = Buffer.from(raw, "base64").toString("utf8");
    }

    if (fileType === "csv") {
      // 3) parser CSV
      const { header, rows, sep } = csvToRows(raw);
      const items = rows.map(r => rowToObj(header, r))
                        .filter(o => (o.email && o.email.length));

      if (items.length === 0) {
        return res.json({
          ok: true,
          reply: "📎 0 leads importés...",
          debug: { sepUsed: sep, header, firstLine: raw.split(/\r?\n/)[0] }
        });
      }

      // éventuel traitement (upsert ou tag auto si demandé)
      if (mode === "upsert" || mode === "upsert+tag") {
        await upsertLeads(items);
      }

      return res.json({
        ok: true,
        reply: `📎 ${items.length} leads importés.`,
        count: items.length,
        sepUsed: sep,
        header,
        sample: items.slice(0, 2), // aperçu
        leads: items               // ⚠️ liste complète pour React
      });
    }

    return res.status(400).json({ ok: false, error: "fileType non géré" });

  } catch (e) {
    console.error('ask-task-with-file error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/task-history?range=24h | 48h | all
app.get('/api/task-history', (req, res) => {
  const { range = 'all' } = req.query;
  const hours = range === '24h' ? 24 : range === '48h' ? 48 : null;
  const data = readTaskHistory(hours);
  res.json({ ok: true, count: data.length, items: data });
});

// 3 dernières actions
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

// ✅ Route pour exposer le fichier d’historique (20 derniers messages)
app.get('/api/history', (req, res) => {
  res.json(getChatHistory());
});
// Middlewares: place as early as possible


// ======== UTIL ========
// timeout simple pour fetch (si tu n'as pas déjà une util similaire)
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

// --- CORRECTIF 3: "askOpenAI" -> "askAI"
// petit wrapper IA : route selon AI_PROVIDER
async function askAI(prompt) {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase().trim(); // 'openai' | 'ollama' | 'mistral' (proxy OpenAI-style éventuel)
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
    if (!txt) throw new Error('Réponse vide OpenAI');
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
    if (!txt) throw new Error('Réponse vide Ollama');
    return txt;
  }

  // fallback simple si provider non configuré
  return `M.A.X. (fallback): "${prompt}" bien reçu. Configure AI_PROVIDER=openai ou ollama pour activer l'IA.`;
}

// --- NEW: helper pour appeler le LLM avec un systemPrompt + message
async function askLLM({ systemPrompt, message, mode = 'assist' } = {}) {
  // concat simple : systemPrompt en tête, puis le message utilisateur
  const fullPrompt = `${systemPrompt || ''}\n\nUtilisateur: ${message || ''}\n\nRéponds de façon concise et utile.`;
  return askAI(fullPrompt);
}

// ======== HANDLERS RÉELS ========

// /api/ask (court, sans mémoire)  <- REPLACED to include systemPrompt / short-circuit
app.post('/api/ask', async (req, res) => {
  const { message, mode = 'assist', context = {} } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ ok:false, error:'MESSAGE_REQUIRED' });

  // <-- INSERT: start the try block and log the incoming message so the final catch has a matching try
  log('[ASK] in', message);
  try {

  // --- Interception pour "leads du 1 novembre" ---
  if (/leads?.*(1|premier).*novembre/i.test(message)) {
    const date = '2025-11-01';
    try {
      const localPort = process.env.PORT || 3005;
      const r = await fetch(`http://127.0.0.1:${localPort}/api/crm/leads/by-date?date=${date}`).then(x => x.json());
      if (r.ok && r.leads?.length) {
        const lines = r.leads.map(l => `
──────────────
👤 ${l.prénom} ${l.nom}
📧 ${l.email}
📞 ${l.téléphone}
🎯 Statut : ${l.statut}
💡 Source : ${l.source}
📅 Créé le : ${l.dateCréation}
──────────────`).join('\n');

        return res.json({ ok: true, answer: `✅ Voici les leads créés le 1er novembre :\n${lines}` });
      } else {
        return res.json({ ok: true, answer: "Aucun lead trouvé pour le 1er novembre." });
      }
    } catch (err) {
      return res.json({ ok: false, answer: "Erreur lors de la récupération des leads du 1er novembre." });
    }
  }

  // --- Interception pour "dernier lead" ---
  if (/^\s*dernier\s+lead\s*$/i.test(message)) {
    try {
      const localPort = process.env.PORT || 3005;
      const r = await fetch(`http://127.0.0.1:${localPort}/api/crm/lead/latest`, { cache: 'no-store' }).then(x => x.json());
      if (r.ok && r.lead) {
        const l = r.lead;
        const reply =
`📋 Dernier lead ajouté
────────────────────────
👤 ${l.firstName || ''} ${l.lastName || ''}
📧 ${l.emailAddress || '—'}
📞 ${l.phoneNumber || '—'}
🏢 Société : ${l.accountName || '—'}
🎯 Statut : ${l.status || '—'}
💡 Source : ${l.source || '—'}
📅 Créé le ${(l.createdAt || '').slice(0,10)}
📝 Note : ${l.description || '—'}
────────────────────────`;
        return res.json({ ok: true, answer: reply });
      } else {
        return res.json({ ok: false, answer: "Aucun lead trouvé." });
      }
    } catch (err) {
      return res.json({ ok: false, answer: "Erreur lors de la récupération du dernier lead." });
    }
  }

  // --- Interception pour "lead <ID>" (hex-like) ---
  if (/lead\s+([0-9a-fA-F]{8,40})/i.test(message || '')) {
    try {
      const [, leadId] = message.match(/lead\s+([0-9a-fA-F]{8,40})/i);
      const r = await espo('GET', `Lead/${encodeURIComponent(leadId)}`);
      if (r && r.id) {
        const reply = `Voici la fiche complète de ${r.firstName || ''} ${r.lastName || ''} :\n` +
          `📧 ${r.emailAddress || r.email || '—'}\n📞 ${r.phoneNumber || r.phone || '—'}\n` +
          `🏢 ${r.accountName || '—'}\n🎯 Statut : ${r.status || '—'}\n` +
          `📅 Créé le ${(r.createdAt || '').slice(0,10)}`;
        return res.json({ ok: true, answer: reply });
      }
    } catch (err) {
      return res.json({ ok: false, error: 'crm_fetch_failed', details: String(err?.message || err) });
    }
  }

  // --- Interception pour "lead <First> <Last>" par nom ---
  if (/lead\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)/i.test(message || '')) {
    try {
      const m = message.match(/lead\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)/i);
      const firstName = m[1], lastName = m[2];
      const where = encodeURIComponent(JSON.stringify([
        { type: 'equals', attribute: 'firstName', value: firstName },
        { type: 'equals', attribute: 'lastName', value: lastName }
      ]));
      const r = await espo('GET', `Lead?where=${where}&maxSize=1`);
      if (r?.list?.length) {
        const l = r.list[0];
        const reply = `Voici la fiche complète de ${l.firstName || ''} ${l.lastName || ''} :\n` +
          `📧 ${l.emailAddress || l.email || '—'}\n📞 ${l.phoneNumber || r.phone || '—'}\n` +
          `🏢 ${l.accountName || '—'}\n🎯 Statut : ${l.status || '—'}\n` +
          `📅 Créé le ${(l.createdAt || '').slice(0,10)}`;
        return res.json({ ok: true, answer: reply });
      } else {
        return res.json({ ok: true, answer: `Aucun lead trouvé pour ${firstName} ${lastName}.` });
      }
    } catch (err) {
      return res.json({ ok: false, error: 'crm_fetch_failed', details: String(err?.message || err) });
    }
  }

  // 🧠 SI aucune interception ne correspond → on passe au LLM
  // --- NEW: use IDENTITY here per your request ---
  const crmConnectedText = context?.crmOnline ? 'oui' : 'non';
  const crmName = IDENTITY?.terminologie?.crm_nom || 'MaCréa CRM';
  const clientName = agentIdentity?.contexte_client?.nom || 'MaCréa Client (test)';
  const clientSector = agentIdentity?.contexte_client?.secteur || 'générique';

  let systemPrompt = `
Tu es ${IDENTITY?.nom || 'M.A.X.'}, copilote IA du système ${crmName}.
Ton rôle est d'assister l'utilisateur dans la gestion du CRM.
CRM connecté: ${crmConnectedText}.
Si connecté, dis-le clairement: "Oui, je suis connecté à ${crmName} via le backend."
Si non connecté, propose de tester la connexion.
Ne jamais dire la phrase "je ne peux pas me connecter aux systèmes externes" ni toute variante équivalente.
Toujours utiliser le terme "${crmName}".
`;
  systemPrompt += `\nClient actif: ${clientName} (${clientSector}).`;
  if (agentIdentity?.terminologie?.interdit?.length) {
    systemPrompt += `\nInterdits: ${agentIdentity.terminologie.interdit.join(', ')}.`;
  }
  systemPrompt += `\nRègle: si l'utilisateur demande "quel client est actif", réponds directement "${clientName}" sans poser de questions supplémentaires.`;

  // Court-circuit pour questions ultra simples
  if (/quel client est actif|client actif|who.*client/i.test(message || '')) {
    const direct = `Client actif: ${clientName}. CRM: ${crmName} (connecté: ${crmConnectedText}).`;
    return res.json({ ok: true, answer: direct });
  }

  const answer = await askLLM({ systemPrompt, message, mode });

  // log assistant tokens
  try { logTokenUsage('assistant', answer); } catch (_) {}

  log('[ASK] out ok');
  return res.json({ ok:true, answer });
} catch (e) {
  log('[ASK] fail', e.message);
  return res.status(500).json({ ok:false, error:'ASK_FAILED', detail: process.env.NODE_ENV==='dev' ? e.message : undefined });
}
});

// Replace: /api/ask-task -> async + immediate dispatch in auto mode
app.post('/api/ask-task', async (req, res) => {
  try {
    const b = req.body || {};
    const mode = (b.mode || process.env.MODE_DEFAULT || 'assist').toLowerCase(); // auto|assist|observe

    const task = {
      id: `task-${Date.now()}`,
      type: b.type || 'generic',
      mode,
      status: mode === 'auto' ? 'queued' : 'waiting_validation',
      prompt: b.prompt || b.message || '',
      payload: b.payload || {},
      crmLinks: {},
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // persist & log via global.logExecution (it will call saveTask when available)
    saveTask(task);
    try { global.logExecution(task, 'info', 'Task created from chat', { step: 'ask-task' }); } catch (_) {}

    // Compose systemPrompt / LLM reply when a message/prompt is provided
    const userMessage = String(b.prompt || b.message || '').trim();
    if (userMessage) {
      try {
        const context = b.context || {};
        // --- NEW: use IDENTITY here as well ---
        const crmConnectedText = context?.crmOnline ? 'oui' : 'non';
        const crmName = IDENTITY?.terminologie?.crm_nom || 'MaCréa CRM';
        const clientName = agentIdentity?.contexte_client?.nom || 'MaCréa Client (test)';
        const clientSector = agentIdentity?.contexte_client?.secteur || 'générique';

        let systemPrompt = `
Tu es ${IDENTITY?.nom || 'M.A.X.'}, copilote IA du système ${crmName}.
Ton rôle est d'assister l'utilisateur dans la gestion du CRM.
CRM connecté: ${crmConnectedText}.
Si connecté, dis-le clairement: "Oui, je suis connecté à ${crmName} via le backend."
Si non connecté, propose de tester la connexion.
Ne jamais dire la phrase "je ne peux pas me connecter aux systèmes externes" ni toute variante équivalente.
Toujours utiliser le terme "${crmName}".
`;
        // keep client context appended
        systemPrompt += `\nClient actif: ${clientName} (${clientSector}).`;
        if (agentIdentity?.terminologie?.interdit?.length) {
          systemPrompt += `\nInterdits: ${agentIdentity.terminologie.interdit.join(', ')}.`;
        }
        systemPrompt += `\nRègle: si l'utilisateur demande "quel client est actif", réponds directement "${clientName}" sans poser de questions supplémentaires.`;

        // Court-circuit ultra-simple
        if (/quel client est actif|client actif|who.*client/i.test(userMessage || '')) {
          task.aiReply = `Client actif: ${clientName}. CRM: ${crmName} (connecté: ${crmConnectedText}).`;
          // log assistant tokens for the direct reply
          try { logTokenUsage('assistant', task.aiReply); } catch (_) {}
        } else {
          // log user tokens
          try { logTokenUsage('user', userMessage); } catch (_) {}

          task.aiReply = await askLLM({ systemPrompt, message: userMessage, mode });

          // log assistant tokens
          try { logTokenUsage('assistant', task.aiReply); } catch (_) {}
        }
        // optionally persist reply into chat history
        try { saveChatHistory({ role:'assistant', message: task.aiReply }); } catch (_) {}
        saveTask(task);
      } catch (err) {
        // don't fail task creation on LLM error
        console.warn('/api/ask-task LLM error', err.message || err);
      }
    }

    // If auto mode => dispatch immediately (background)
    if (mode === 'auto') {
      // trigger dispatch now; run async but don't block response
      dispatchTask(task).catch(err => {
        try { global.logExecution(task, 'error', 'Auto dispatch failed', { error: String(err) }); } catch (_) {}
        task.status = 'failed';
        try { saveTask(task); } catch (_) {}
      });
    }

    return res.json({ ok: true, task });
  } catch (e) {
    console.error('/api/ask-task error', e);
    return res.status(500).json({ ok:false, error:'ASK_TASK_CREATE_FAILED', detail: String(e) });
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
// --- Utils pagination sûrs (Espo autorise ~200 max par page)
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

// --- Routers montés dynamiquement (exécutions, etiquettes)
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


// --- Debug : distribution des statuts (paginer + paramètres URL)
app.get('/api/debug/lead-statuses', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '600', 10), 5000);
    const pageSize = Math.min(parseInt(req.query.pageSize ?? '200', 10), 200);

    // --- CORRECTIF (faute de frappe): "getLeadsAll" -> "getAllLeads"
    const leads = await getAllLeads(`?maxSize=${limit}`);
    const map = {};
    for (const l of leads) {
      const s = (l.status || l.statut || '—').toString();
      map[s] = (map[s] || 0) + 1;
    }
    res.json({ total: leads.length, statuses: map });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Debug : échantillon brut des leads
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

// --- CORRECTIF 5: Route "preview" désactivée (cassée) ---
/*
// Preview : qui serait tagué par le job "tag-rentree"
app.post('/api/actions/tag-rentree/preview', async (req, res) => {
  try {
    // ... ton code métier ici ...
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
      const already = tags.includes(strip('rentrée')) || tags.includes('rentree');

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
*/
// --- Fin du correctif 5 ---


// Route : Récupérer l'état d'une tâche (exécutée ou pas)
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
        message: "Tâche non encore validée par M.A.X."
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Impossible de lire execution-log.json', reason: err.message });
  }
});


// --- Action : Générer une tâche "Campagne rentrée" (newsletter + WhatsApp)
app.post('/api/actions/create-campaign-rentree', async (req, res) => {
  try {
    const ctx = agentIdentity?.contexte_client || {};
    const task = {
      task: "campaign_rentree_damath",
      description: "Relance newsletter + WhatsApp spéciale rentrée (Damath)",
      action: "campaign_rentree",
      createdAt: new Date().toISOString(),
      payload: {
        client: ctx.nom || "Damath Overseas",
        segmentRules: { statuses: ["Nouveau", "À contacter"], tags: ["rentrée"] },
        email: {
          subject: "Offre spéciale rentrée – expédiez au meilleur tarif",
          preview: "Rentrée: groupage, enlèvement, tarifs promo",
          variables: ["firstName","ville","type_envoi"]
        },
        whatsapp: {
          template: "Bonjour {{firstName}}, c’est Damath Overseas. Pour la rentrée, tarif spécial pour vos envois vers Madagascar. Voulez-vous qu’on s’occupe du devis ?"
        },
        n8nWebhook: process.env.N8N_WEBHOOK_URL || null
      }
    };

    if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
    const filename = `campaign_rentree_${Date.now()}.json`;
    fs.writeFileSync(path.join(TASKS_DIR, filename), JSON.stringify(task, null, 2), 'utf8');
    // --- CORRECTIF 4: "saveToHistory" -> "saveChatHistory"
    saveChatHistory('system', `Tâche créée: ${filename}`);

    res.json({ ok: true, filename, task });
  } catch (e) {
    console.error('❌ /api/actions/create-campaign-rentree', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});



// --- Action : Tag "rentrée" sur les nouveaux leads récents
app.post('/api/actions/tag-rentree', async (req, res) => {
  try {
    const {
      statuses = ['Nouveau', 'À contacter', 'A contacter', 'New'],
      sinceDays = 7,
      limit = 600,
      pageSize = 200
    } = req.body || {};

    const since = new Date(); since.setDate(since.getDate() - (sinceDays||0));
    // --- CORRECTIF (faute de frappe): "getLeadsAll" -> "getAllLeads"
    const leads = await getAllLeads(`?maxSize=${limit}`);

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
      const hasRentree = tags.includes(norm('rentrée')) || tags.includes('rentree');

      if (okStatus && okRecent && !hasRentree) targeted.push(l);
    }

    let updated = 0, errors = [];
    for (const lead of targeted) {
      try {
        await patchLeadTags(lead.id, ['rentrée']);
        updated++;
      } catch (e) {
        errors.push({ id: lead.id, error: e.message });
      }
    }

    res.json({ ok: true, targeted: targeted.length, updated, errors });
  } catch (e) {
    console.error('❌ /api/actions/tag-rentree', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- CORRECTIF 5: Route "strategy" désactivée (cassée) ---
/*
// --- Stratégie de tagging IA pour leads
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

    const prompt = `\nTu es un assistant IA CRM intégré à EspoCRM.\n\nLe client est : ${context.nom ?? 'non précisé'} – ${context.secteur ?? 'non précisé'}.\n\nObjectifs commerciaux :\n${(context.objectifs_commerciaux || []).map(o => "- " + o).join('\n')}\n\nTags utiles possibles :\n${(context.tags_utiles || []).join(', ')}\n\nVoici 10 leads récents :\n${shortLeads.slice(0, 10).map(l => `- ${l.nom} | ${l.statut} | ${l.source} | ${l.tags?.join(', ') || '—'} | ${l.createdAt}`).join('\n')}\n\nAnalyse ces leads et propose :\n1. ✅ Les tags à ajouter cette semaine (avec contexte)\n2. 🧠 Des segments utiles pour automatiser les actions\n3. ⚡️ Des actions CRM ou marketing (WhatsApp, email, n8n)\n\nSois synthétique, structuré, et pragmatique.\n`;

    // --- CORRECTIF 3: "askOpenAI" -> "askAI"
    const reply = await askAI(prompt);
    // --- CORRECTIF 4: "saveToHistory" -> "saveChatHistory"
    saveChatHistory('user', '[M.A.X. stratégie de tagging]');
    saveChatHistory('assistant', reply);

    res.json({ ok: true, prompt, reply });
  } catch (e) {
    console.error('/api/strategy/propose-tags error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});
*/
// --- Fin du correctif 5 ---

app.use('/api/analyze-result', analyzeResultRoutes);

// --- SELFTEST inline (pour vérifier le montage global Express) ---


// --- SELFTEST inline sur le même préfixe (prouve que le préfixe est OK) ---
app.get('/api/actions/etiquette/__selftest-inline', (_req, res) => res.json({ ok: true, from: 'inline' }));

// --- Montage de la route ETIQUETTES + log d'accès ---
app.use('/api/actions/etiquette',
  (req, _res, next) => { console.log('>> [etiquette] hit:', req.method, req.url); next(); },
  etqActionsRoutes
);

// Ajout tag "rentrée" sur 1 lead (body.leadId OU ?leadId= OU /:id)
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

    const r = await patchLeadTags(id, ['rentrée']);
    res.json({ ok: true, updated: id, result: r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.get('/api/analyze-result', (req, res) => {
  const file = path.join(process.cwd(), 'data', 'analyze-result.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Fichier non trouvé' });

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);

    let items = [];
    if (Array.isArray(json)) {
      items = json;
    } else if (Array.isArray(json?.items)) {
      items = json.items;
    } else {
      // objet numeroté -> le convertir en tableau
      items = Object.values(json)
        .filter(v => v && typeof v === 'object' && ('id' in v || 'fullName' in v));
    }

    res.json({ items });
  } catch (e) {
    console.error('❌ analyze-result.json invalide :', e.message);
    res.status(500).json({ error: 'Fichier JSON invalide' });
  }
});

// --- CORRECTIF: Imports dupliqués supprimés d'ici ---

// 🔍 Vérification environnement
const ESPO_URL = process.env.ESPO_URL;
const ESPO_API_KEY = process.env.ESPO_API_KEY;

function normalizeBase(u) {
  let base = (u || 'http://127.0.0.1:8081').toString().trim();
  // si quelqu’un a mis /api/v1/... dans ESPO_URL, on l’enlève
  base = base.replace(/\/api\/v\d+.*$/i, '');
  return base.replace(/\/+$/, '');
}

const BASE = normalizeBase(ESPO_URL);
function espoUrl(p) {
  return `${BASE}/api/v1/${String(p).replace(/^\/+/, '')}`;
}

// --- NEW: espo() implementation as requested ---
async function espo(method, endpoint, body = null) {
  // endpoint should be like "Lead?maxSize=1" (no leading /api/v1/)
  const url = /^https?:\/\//i.test(String(endpoint || ''))
    ? endpoint
    : `${process.env.ESPO_BASE || BASE}/api/v1/${String(endpoint).replace(/^\/+/, '')}`;

  const headers = { 'Content-Type': 'application/json' };

  // Prefer API key if present
  if (process.env.ESPO_API_KEY) {
    headers['X-Api-Key'] = process.env.ESPO_API_KEY;
  } else if (process.env.ESPO_USERNAME && process.env.ESPO_PASSWORD) {
    headers['Authorization'] =
      'Basic ' +
      Buffer.from(`${process.env.ESPO_USERNAME}:${process.env.ESPO_PASSWORD}`).toString('base64');
  } else if (process.env.ESPO_USER && process.env.ESPO_PASS) {
    // backward compatibility with previous env names
    headers['Authorization'] =
      'Basic ' + Buffer.from(`${process.env.ESPO_USER}:${process.env.ESPO_PASS}`).toString('base64');
  }

  const timeoutMs = Number(process.env.ESPO_TIMEOUT_MS || 15000);
  const opts = { method: (method || 'GET').toUpperCase(), headers };

  if (body != null) opts.body = typeof body === 'string' ? body : JSON.stringify(body);

  // node-fetch doesn't support timeout option on init; implement simple timeout wrapper
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`EspoCRM ${res.status} ${res.statusText}${txt ? ' - ' + txt.slice(0, 300) : ''}`);
    }
    const ct = String(res.headers.get('content-type') || '');
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
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

// Probe (même client)
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
    // priorité: etiquettesNames -> tagNames -> tags -> "TAGS:" dans la description
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
  if (typeof raw === 'object') return Object.keys(raw); // ex. { "rentrée": true }
  return [];
}

function toTagPayloadLike(rawBefore, tagsArray) {
  // Si initialement c'était un objet -> renvoyer un objet { tag: true }
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

  // Si l'entité Lead a une relation 'tags', utiliser linkMany via ensureTagId
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

  // --- MODIFIÉ: `body` doit être un objet, pas une string
  return espo('PATCH', `Lead/${id}`, payload);
}

// Applique un tag à une liste de leads via EspoCRM, avec fallback description(TAGS: ...)
async function espoApplyTagToLeads(tagKey, leadIds = []) {
  if (!tagKey || !Array.isArray(leadIds) || leadIds.length === 0) {
    return { ok: true, updated: 0 };
  }
  let updated = 0;
  let failed = 0;
  for (const id of leadIds) {
    try {
      await patchLeadTags(id, [tagKey]);
      updated++;
      continue;
    } catch (e) {
      // fallback: écrire dans description sous forme "TAGS: #key ..."
      try {
        const lead = await espo('GET', `Lead/${encodeURIComponent(id)}?select=id,description`);
        const existing = parseTagsFromDescription(lead?.description);
        const merged = Array.from(new Set([...(existing || []), tagKey]));
        const description = upsertTagsInDescription(lead?.description || '', merged);
        // --- MODIFIÉ: `body` doit être un objet
        await espo('PATCH', `Lead/${encodeURIComponent(id)}`, { description });
        updated++;
      } catch (e2) {
        failed++;
        console.warn('[espoApplyTagToLeads] failed for', id, e2?.message || e2);
      }
    }
  }
  return { ok: true, updated, failed };
}

// --- PATCH lead avec tags dynamiques (ancré dans le plan projet)
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

    // 3. Mettre à jour le lead
    const patch = { ...fields, tags: finalTags };
    // --- MODIFIÉ: `body` doit être un objet
    const updated = await espo('PATCH', `Lead/${id}`, patch);

    res.json({ ok: true, updated });
  } catch (e) {
    console.error('❌ PATCH /api/crm/update-lead/:id', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === PATCH: store tâches ESM-friendly + routes create/validate/status (remplace l'ancien store) ===
const TASKS_DIR = path.join(__dirname, 'tasks');
if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });

function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function saveTask(task) {
  if (!task.id) task.id = `task-${Date.now()}`;
  const filename = task._filename || `${task.id}.json`;
  task._filename = filename;
  const p = path.join(TASKS_DIR, filename);
  fs.writeFileSync(p, JSON.stringify(task, null, 2), 'utf8');
  return filename;
}

function loadTaskFlexible(idOrFilename) {
  const base = idOrFilename.replace(/\.json$/i, '');
  const candidates = [ `${base}.json`, idOrFilename ];
  for (const c of candidates) {
    const p = path.join(TASKS_DIR, c);
    if (fileExists(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const t = JSON.parse(raw);
      t._filename = c;
      t.logs = t.logs || [];
      return t;
    }
  }
  throw new Error(`task not found: ${idOrFilename}`);
}

function logExecutionLocal(task, level, msg, meta) {
  task.logs = task.logs || [];
  task.logs.push({ t: Date.now(), level: level || 'info', msg: msg || '', meta: meta || null });
  task.updatedAt = new Date().toISOString();
  saveTask(task);
}

// override global.logExecution to be safe & persist when possible
global.logExecution = function (task, level, msg, meta) {
  try {
    if (task && typeof task === 'object') {
      logExecutionLocal(task, level, msg, meta);
    }
  } catch (_) { /* no-op */ }
};

function normalizeStatus(s) {
  const ok = new Set(['queued','running','waiting_validation','success','failed','canceled']);
  return ok.has(s) ? s : undefined;
}

// Route réelle de création qui écrit VRAIMENT le fichier
app.post('/api/tasks/create', (req, res) => {
  try {
    const body = req.body || {};
    const task = {
      id: `task-${Date.now()}`,
      _filename: null,
      type: body.type || 'generic',
      mode: body.mode || (process.env.MODE_DEFAULT || 'assist'),
      status: 'waiting_validation',
      prompt: body.prompt || '',
      payload: body.payload || {},
      crmLinks: {},
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveTask(task); // ensure file exists before logging
    logExecutionLocal(task, 'info', 'Task created', { step: 'create' });
    return res.json({ ok: true, filename: task._filename, task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'CREATE_FAILED', detail:String(e) });
  }
});

// Validate: accepte id OU id.json
// <-- REMPLACÉ: route améliorée pour déclencher dispatchTask() après validation
app.post('/api/tasks/:id/validate', async (req, res) => {
  try {
    let task;
    try {
      task = loadTaskFlexible(req.params.id);
    } catch (err) {
      return res.status(404).json({ ok: false, error: 'task_not_found', detail: String(err) });
    }

    // only allow validation when waiting for validation
    if (task.status !== 'waiting_validation') {
      return res.json({ ok: true, forwarded: false, reason: `status=${task.status}` });
    }

    // mark queued, persist and log
    task.status = 'queued';
    saveTask(task);
    try { global.logExecution(task, 'info', 'Validated by user', { step: 'validate' }); } catch (_) {}

    // dispatch réel (n8n ou exécution locale)
    dispatchTask(task).catch(err => {
      try {
        global.logExecution(task, 'error', 'Dispatch failed', { error: String(err) });
      } catch (_) {}
      task.status = 'failed';
      try { saveTask(task); } catch (_) {}
    });

    return res.json({ ok: true, forwarded: true, id: task.id, filename: task._filename, status: task.status });
  } catch (e) {
    console.error('/api/tasks/:id/validate', e);
    return res.status(500).json({ ok: false, error: 'VALIDATE_FAILED', detail: String(e) });
  }
});

// Status callback (n8n -> M.A.X.)
app.post('/api/tasks/:id/status', (req, res) => {
  try {
    const task = loadTaskFlexible(req.params.id);
    const { status, message, meta, crm } = req.body || {};
    const safe = normalizeStatus(status);
    if (safe) task.status = safe;
    if (crm) task.crmLinks = { ...(task.crmLinks||{}), ...crm };
    logExecutionLocal(task, 'info', message || `status:${safe||'unknown'}`, meta);
    return res.json({ ok:true, id: task.id, filename: task._filename, status: task.status, crm: task.crmLinks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'STATUS_UPDATE_FAILED', detail:String(e) });
  }
});
// === FIN PATCH ===

// --- Debug
app.get('/api/debug/agent-identity', (req, res) => {
  res.json({ ok: true, agentIdentity });
});

// NEW: simple whoami debug endpoint
app.get('/api/__whoami', (req, res) => {
  const crmName = agentIdentity?.terminologie?.crm_nom || 'MaCréa CRM';
  const clientName = agentIdentity?.contexte_client?.nom || 'MaCréa Client (test)';
  res.json({ ok: true, crm: crmName, client: clientName });
});

// --- Action : Tag "rentrée" sur les nouveaux leads récents (version simplifiée)
app.post('/api/actions/tag-rentree/simple', async (req, res) => {
  try {
    const sinceDays = 7;
    const since = new Date(); since.setDate(since.getDate() - sinceDays);
    const tag = 'rentrée';

    // 1. Chercher les leads récents
    const leads = await getAllLeads(`?maxSize=100`);
    const targeted = leads.filter(l => {
      const created = new Date(l.createdAt || l.dateCreated);
      return created >= since && l.status !== 'client' && l.status !== 'perdu';
    });

    // 2. Appliquer le tag
    let updated = 0, errors = [];
    for (const lead of targeted) {
      try {
        await patchLeadTags(lead.id, [tag]);
        updated++;
      } catch (e) {
        errors.push({ id: lead.id, error: e.message });
      }
    }

    res.json({ ok: true, targeted: targeted.length, updated, errors });
  } catch (e) {
    console.error('❌ /api/actions/tag-rentree/simple', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Lister les derniers leads depuis MaCréa CRM (EspoCRM) ---
app.get('/api/crm/leads/latest', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 2);
    const r = await espo('GET', `Lead?maxSize=${limit}&orderBy=createdAt&order=desc`);
    const list = Array.isArray(r?.list) ? r.list : [];
    const leads = list.map(l => ({
      id: l.id,
      prénom: l.firstName || '',
      nom: l.lastName || '',
      email: l.emailAddress || l.email || '—',
      téléphone: l.phoneNumber || l.phone || '—',
      statut: l.status || '—',
      source: l.source || '—',
      société: l.accountName || '—',
      intérêt: l.opportunityAmount || '—',
      ville: l.primaryAddressCity || '—',
      dateCréation: (l.createdAt || '').slice(0, 10)
    }));
    res.json({ ok: true, total: leads.length, leads });
  } catch (e) {
    console.error('Erreur lecture leads:', e?.message || e);
    res.status(500).json({ ok: false, error: 'crm_fetch_failed', details: String(e?.message || e) });
  }
});

// --- NEW: Dernier lead complet ---
app.get('/api/crm/lead/latest', async (req, res) => {
  try {
    const r = await espo('GET', `Lead?maxSize=1&orderBy=createdAt&order=desc`);
    const lead = r?.list?.[0];
    if (!lead) return res.json({ ok: false, message: "Aucun lead trouvé." });

    const full = await espo('GET', `Lead/${lead.id}`);
    res.json({ ok: true, lead: full });
  } catch (e) {
    console.error("Erreur /lead/latest:", e?.message || e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// --- NEW: Leads créés à une date précise ---
app.get('/api/crm/leads/by-date', async (req, res) => {
  const date = req.query.date; // format "YYYY-MM-DD"
  if (!date) return res.status(400).json({ ok: false, error: "date manquante" });

  try {
    const where = encodeURIComponent(JSON.stringify([
      { type: 'between', attribute: 'createdAt', value: [`${date} 00:00:00`, `${date} 23:59:59`] }
    ]));

    const r = await espo('GET', `Lead?where=${where}&orderBy=createdAt&order=asc`);
    const leads = (r.list || []).map(l => ({
      id: l.id,
      prénom: l.firstName || '',
      nom: l.lastName || '',
      email: l.emailAddress || '—',
      téléphone: l.phoneNumber || '—',
      statut: l.status || '—',
      source: l.source || '—',
      dateCréation: (l.createdAt || '').slice(0, 10)
    }));
    res.json({ ok: true, total: leads.length, leads });
  } catch (e) {
    console.error("Erreur /leads/by-date:", e?.message || e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// --- Debug : liste des routes définies (pour vérification)
app.get('/api/debug/routes', (req, res) => {
  const list = (app._router?.stack || [])
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods).join(', '),
      middlewares: r.route.stack.length
    }));
  res.json({ ok: true, count: list.length, routes: list });
});

// --- Route de test (vérifie que le serveur répond)
app.get('/api/__ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// --- Server start (force start)
const isMain = true;
if (isMain) {
  try {
    // --- PORT Fallback ---
    if (typeof PORT === 'undefined') {
      var PORT = process.env.PORT || 3005;
    }

    // <-- AJOUT : BIND_HOST fallback (défini si absent)
    if (typeof BIND_HOST === 'undefined') {
      var BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
    }

    const server = app.listen(PORT, BIND_HOST, () => {
      console.log(`✅ M.A.X. server listening on http://${BIND_HOST}:${PORT} (pid=${process.pid})`);
    });

    // Graceful shutdown
    const shutdown = (sig) => {
      console.log(`⚠️  Received ${sig}, shutting down...`);
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
// permet d'importer `app` ailleurs sans démarrer le serveur
export default app;

// --- Token usage tracker ---
const tokenUsagePath = path.join(DATA_DIR, 'token-usage.json');

function estimateTokens(text) {
  // estimation simple : ~4 chars par token
  return Math.max(0, Math.ceil(String(text || '').length / 4));
}

function logTokenUsage(role, text) {
  const tokens = estimateTokens(text);
  const entry = { time: new Date().toISOString(), role, tokens, excerpt: String(text || '').slice(0, 200) };
  let data = [];
  try {
    if (fs.existsSync(tokenUsagePath)) {
      data = JSON.parse(fs.readFileSync(tokenUsagePath, 'utf8') || '[]');
    }
  } catch (err) { /* ignore parse errors */ }

  data.push(entry);
  try {
    fs.mkdirSync(path.dirname(tokenUsagePath), { recursive: true });
    fs.writeFileSync(tokenUsagePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) { console.warn('Unable to write token usage:', err?.message || err); }
  return tokens;
}