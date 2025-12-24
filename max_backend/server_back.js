// server.js (ESM-ready)
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// ----- ESM __dirname -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- Config / Paths -----
const PORT = process.env.PORT || 3005;
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1'; // force IPv4 to avoid ::1 issues
const DATA_DIR = path.join(__dirname, 'data');
const AGENT_ID_PATH = path.join(DATA_DIR, 'agent_identity.json');
const CHAT_LOG = path.join(DATA_DIR, 'chat-history.json');
const TASKS_DIR = process.env.TASKS_DIR || path.join(__dirname, '..', 'ia_admin', 'tasks_autogen'); // fallback
const BACKUP_REACT_SRC = process.env.REACT_SRC_DIR || path.join(__dirname, '..', 'ia-admin-ui', 'src');
const BACKUP_ROOT = process.env.BACKUP_ROOT || path.join(__dirname, '..', 'backups', 'react');

// ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ----- Load agent identity if exists (safe) -----
let agentIdentity = {
  nom: "M.A.X.",
  type: "Agent IA Admin CRM – MaCréa (par défaut)",
  rôle: "Assistant IA Admin (identité par défaut). Place ton fichier data/agent_identity.json pour personnaliser.",
  personnalité: "Synthétique, proactif et bienveillant.",
  contexte_projet: {
    projet: "MaCréa (info non fournie)",
    utilisation: "Local",
    mission_metier: "Assister la gestion CRM"
  },
  permissions: [],
  objectifs: []
};

try {
  if (fs.existsSync(AGENT_ID_PATH)) {
    const raw = fs.readFileSync(AGENT_ID_PATH, 'utf8');
    agentIdentity = JSON.parse(raw);
    console.log('✅ Chargé agent_identity.json');
  } else {
    console.log('⚠️ data/agent_identity.json non trouvé — utilisent valeurs par défaut');
  }
} catch (e) {
  console.error('❌ Erreur lecture agent_identity.json :', e.message);
}

// ----- Helpers -----
function isSafeReactFile(filename) {
  return /^[\w\-.]+\.jsx?$/.test(filename); // allow letters, numbers, - _ . and .js/.jsx
}

function readJsonSafe(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('Warning: JSON parse failed for', p, e.message);
    return null;
  }
}

function writeJsonSafe(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

// chat history helpers
function appendChatEntry(role, content) {
  const entry = { timestamp: new Date().toISOString(), role, content };
  let arr = [];
  if (fs.existsSync(CHAT_LOG)) {
    try { arr = JSON.parse(fs.readFileSync(CHAT_LOG, 'utf8')); } catch { arr = []; }
  }
  arr.push(entry);
  fs.writeFileSync(CHAT_LOG, JSON.stringify(arr, null, 2), 'utf8');
  return entry;
}

function getLastMessages(n = 10) {
  if (!fs.existsSync(CHAT_LOG)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(CHAT_LOG, 'utf8'));
    return arr.slice(-n);
  } catch (e) {
    console.warn('Cannot read chat log:', e.message);
    return [];
  }
}

// Build a single canonical prompt to send to LLM
function buildPrompt(userPrompt = '', chatHistory = []) {
  const identitySection = `
Tu es ${agentIdentity.nom} — ${agentIdentity.type}.
Mission : ${agentIdentity.rôle}

Contexte projet :
- projet: ${agentIdentity.contexte_projet?.projet ?? 'inconnu'}
- utilisation: ${agentIdentity.contexte_projet?.utilisation ?? 'local'}
- mission_metier: ${agentIdentity.contexte_projet?.mission_metier ?? ''}

Permissions :
${(agentIdentity.permissions || []).map(p => `- ${p}`).join('\n')}

Objectifs :
${(agentIdentity.objectifs || []).map(o => `- ${o}`).join('\n')}

Personnalité : ${agentIdentity.personnalité || ''}
`.trim();

  const historySection = chatHistory.length
    ? '\nContexte récent :\n' + chatHistory.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')
    : '';

  return `${identitySection}\n\n${historySection}\n\nDemande de l'utilisatrice: ${userPrompt}`;
}

// LLM call wrapper (OpenAI) — falls back to simple reply if API key missing
async function callLLM(prompt) {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY?.trim();
  // prefer built-in fetch available in Node >=18; if not present user must install node-fetch
  if (!key) {
    // fallback: simple synthetic reply to keep UI alive
    return `🧠 (Réponse simulée) M.A.X. a lu votre demande. Prompt résumé: ${prompt.slice(0, 800)}${prompt.length > 800 ? '…' : ''}`;
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(process.env.OPENAI_TEMP ?? 0.6),
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 700),
      }),
    });
    const json = await resp.json();
    const reply = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
    return reply;
  } catch (e) {
    console.error('LLM call failed:', e);
    return `❌ Erreur d'appel LLM: ${e.message}`;
  }
}

// Try to import local say.js if exists; else fallback to console.log
let say = (t) => console.log('🗣️ (no-say) ', t);
try {
  const sayPath = path.join(__dirname, 'utils', 'say.js');
  if (fs.existsSync(sayPath)) {
    // dynamic import
    const mod = await import(`file://${sayPath}`);
    if (mod && typeof mod.say === 'function') say = mod.say;
    console.log('✅ say.js chargé (synthèse vocale locale)');
  } else {
    console.log('⚠️ utils/say.js introuvable — la voix locale est désactivée');
  }
} catch (e) {
  console.warn('Impossible de charger say.js :', e.message);
}

// safe memory utils stub if utils/memory.js exists
let memoryUtils = {};
try {
  const memPath = path.join(__dirname, 'utils', 'memory.js');
  if (fs.existsSync(memPath)) {
    memoryUtils = await import(`file://${memPath}`);
    console.log('✅ utils/memory.js chargé');
  }
} catch (e) {
  console.warn('⚠️ utils/memory.js non chargé :', e.message);
}

// ----- EXPRESS APP -----
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve agent_identity.json explicitly
app.get('/agent-identity.json', (_req, res) => {
  if (fs.existsSync(AGENT_ID_PATH)) {
    return res.sendFile(AGENT_ID_PATH);
  }
  return res.status(404).json({ error: 'agent_identity.json non trouvé' });
});

// --- Tasks endpoints ---
app.get('/api/tasks', (req, res) => {
  try {
    if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
    const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.json'));
    const tasks = files.map(f => ({
      filename: f,
      content: readJsonSafe(path.join(TASKS_DIR, f))
    }));
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tasks/create', (req, res) => {
  try {
    const { name = 'task', description = '' } = req.body;
    const timestamp = Date.now();
    const filename = `${name.replace(/\s+/g,'_')}-${timestamp}.json`;
    if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
    const taskPath = path.join(TASKS_DIR, filename);
    const taskData = {
      task: name,
      description,
      action: 'custom_task',
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2), 'utf8');
    if (memoryUtils.addAction) memoryUtils.addAction('create_task', { filename, content: taskData }, null);
    say(`Nouvelle tâche créée : ${name}`);
    res.json({ ok: true, filename, task: taskData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tasks/:filename', (req, res) => {
  try {
    const p = path.join(TASKS_DIR, req.params.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// validate task (executes configured actions)
app.post('/api/tasks/:filename/validate', async (req, res) => {
  try {
    const p = path.join(TASKS_DIR, req.params.filename);
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'task not found' });
    const payload = JSON.parse(fs.readFileSync(p, 'utf8'));

    if (memoryUtils.addAction) memoryUtils.addAction('validate_task', { filename: req.params.filename, content: payload }, payload.previousState || null);

    // Example action: generate project map (custom payload expected)
    if (payload.action === 'generate_project_map' && payload.structure) {
      const mapPath = path.join(__dirname, 'project-map.json');
      fs.writeFileSync(mapPath, JSON.stringify(payload.structure, null, 2), 'utf8');
      say("J’ai analysé l’environnement. La carte mentale est prête.");
      return res.json({ ok: true, action: 'generate_project_map' });
    }

    // Example task: generate_crm_map
    if (payload.task === 'generate_crm_map') {
      const root = payload.root || path.join(__dirname, '..');
      const include = payload.include || ['ia-admin-ui', 'ia_admin_api', 'tasks_autogen'];
      const scanDir = (dir, categories) => {
        const result = {};
        categories.forEach(cat => {
          const pathCat = path.join(dir, cat);
          if (fs.existsSync(pathCat)) {
            result[cat] = {};
            fs.readdirSync(pathCat, { withFileTypes: true }).forEach(f => {
              result[cat][f.name] = f.isDirectory() ? 'folder' : 'file';
            });
          }
        });
        return result;
      };
      const map = scanDir(root, include);
      const mapPath = path.join(__dirname, 'project-map.json');
      fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
      say("J’ai analysé l’environnement. La carte mentale est prête.");
      return res.json({ ok: true, action: 'generate_crm_map' });
    }

    // default
    res.json({ ok: true, forwarded: !!process.env.N8N_WEBHOOK_URL });
  } catch (e) {
    console.error('validate task error:', e);
    res.status(500).json({ error: e.message });
  }
});

// --- React file browser / editor (safe) ---
app.get('/api/react-files', (req, res) => {
  try {
    const dir = BACKUP_REACT_SRC;
    if (!fs.existsSync(dir)) return res.json({ files: [] });
    const files = fs.readdirSync(dir).filter(f => isSafeReactFile(f));
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/react-file', (req, res) => {
  const name = req.query.name;
  if (!name || !isSafeReactFile(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });
  const filePath = path.join(BACKUP_REACT_SRC, name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable' });
  res.sendFile(filePath);
});

app.post('/api/react-file/write', (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !isSafeReactFile(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });
    const filePath = path.join(BACKUP_REACT_SRC, name);
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Chat history endpoints ---
app.get('/api/history', (req, res) => {
  try {
    if (!fs.existsSync(CHAT_LOG)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(CHAT_LOG, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/chat', (req, res) => {
  try {
    const { role, message } = req.body;
    const entry = appendChatEntry(role || 'user', message || '');
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ask and ask-task endpoints (use buildPrompt + history) ---
app.post('/api/ask', async (req, res) => {
  try {
    const userPrompt = req.body.prompt || '';
    const history = getLastMessages(10);
    const prompt = buildPrompt(userPrompt, history);
    // call LLM (or fallback)
    const reply = await callLLM(prompt);
    appendChatEntry('user', userPrompt);
    appendChatEntry('assistant', reply);
    // speak
    try { say(reply); } catch(e){ console.warn('say error', e.message); }
    res.json({ reply });
  } catch (e) {
    console.error('/api/ask error', e);
    res.status(500).json({ reply: '❌ Erreur interne M.A.X.' });
  }
});

app.post('/api/ask-task', async (req, res) => {
  try {
    const userPrompt = req.body.prompt || '';
    const history = getLastMessages(10);
    const prompt = buildPrompt(userPrompt, history);
    const reply = await callLLM(prompt);
    appendChatEntry('user', userPrompt);
    appendChatEntry('assistant', reply);
    try { say(reply); } catch(e){ console.warn('say error', e.message); }
    res.json({ reply });
  } catch (e) {
    console.error('/api/ask-task error', e);
    res.status(500).json({ reply: '❌ Erreur interne M.A.X.' });
  }
});

// --- voice / say check & init ---
app.get('/api/check-voice', (req, res) => {
  try {
    const sayPath = path.join(__dirname, 'utils', 'say.js');
    const logPath = path.join(__dirname, 'agent.log');
    const status = {
      sayExists: fs.existsSync(sayPath),
      logExists: fs.existsSync(logPath),
      canExecuteVoice: false,
      message: ''
    };
    // quick test invoke (non-blocking)
    const testCmd = `powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('Test vocal')"`; 
    exec(testCmd, (err) => {
      if (err) {
        status.message = `Erreur test vocal: ${err.message}`;
        return res.json({ ok: false, voiceStatus: status });
      }
      status.canExecuteVoice = true;
      status.message = 'Synthèse vocale exécutée (test).';
      return res.json({ ok: true, voiceStatus: status });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- project map serve ---
app.get('/project-map.json', (req, res) => {
  const mapPath = path.join(__dirname, 'project-map.json');
  if (!fs.existsSync(mapPath)) return res.status(404).json({ error: 'project-map.json introuvable' });
  res.sendFile(mapPath);
});

// --- backups (react) ---
function backupReactSourceOnce() {
  try {
    if (!fs.existsSync(BACKUP_ROOT)) fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `backup-${timestamp}`;
    const targetDir = path.join(BACKUP_ROOT, folderName);
    fs.mkdirSync(targetDir, { recursive: true });
    if (!fs.existsSync(BACKUP_REACT_SRC)) return console.warn('React src non trouvé pour backup:', BACKUP_REACT_SRC);
    const files = fs.readdirSync(BACKUP_REACT_SRC).filter(f => isSafeReactFile(f));
    files.forEach(f => fs.copyFileSync(path.join(BACKUP_REACT_SRC, f), path.join(targetDir, f)));
    // compress (PowerShell Compress-Archive)
    const zipFile = path.join(BACKUP_ROOT, `${folderName}.zip`);
    exec(`powershell Compress-Archive -Path "${targetDir}\\*" -DestinationPath "${zipFile}"`, (err) => {
      if (err) return console.warn('Erreur compress backup:', err.message);
      // remove tmp folder
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log('✅ Backup react créé:', zipFile);
    });
  } catch (e) {
    console.warn('Backup error:', e.message);
  }
}

function cleanOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    const files = fs.readdirSync(BACKUP_ROOT);
    const now = Date.now();
    files.forEach(file => {
      const full = path.join(BACKUP_ROOT, file);
      const stat = fs.statSync(full);
      const age = now - stat.mtimeMs;
      if (age > 7 * 24 * 3600 * 1000) {
        fs.rmSync(full, { recursive: true, force: true });
        console.log('🗑️ Supprimé ancien backup:', file);
      }
    });
  } catch (e) {
    console.warn('cleanOldBackups error:', e.message);
  }
}

// schedule backups every 2 days
setInterval(() => { backupReactSourceOnce(); cleanOldBackups(); }, 172800000);
backupReactSourceOnce();
cleanOldBackups();

// --- graceful error handlers ---
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Start server binding IPv4 to avoid ::1 proxy issues
app.listen(PORT, BIND_HOST, () => {
  console.log(`✅ Backend M.A.X. prêt sur http://${BIND_HOST}:${PORT}`);
});
