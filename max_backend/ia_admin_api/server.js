import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkModeWrite } from './middleware/checkMode.js';
import headers from './middleware/headers.js';
import acl from './middleware/acl.js';
import brainRouter from './routes/brain.js';
import logsRouter from './routes/logs.js';
import brainConfig from './config/brain.config.js';
import leadRoutes from './routes/lead.js';
import triggerRoutes from './routes/trigger.js';
import tagsRoutes from './routes/tags.js';
import { resolveTenant } from './core/resolveTenant.js';
import crmRouter from './routes/crm.js';
import resolveRouter from './routes/resolve.js';
import reportingRouter from './routes/reporting.js';
import agentRouter from './routes/agent.js';
import chatRouter from './routes/chat.js';
import statusRouter from './routes/status.js';
import askRouter from './routes/ask.js';
import menuRouter from './routes/menu.js';
import actionsRouter from './routes/actions.js';
import auditRouter from './routes/audit.js';
import tasksRouter from './routes/tasks.js';
import n8nRouter from './routes/n8n.js';
import modeRouter from './routes/mode.js';
console.log('Mode router loaded:', !!modeRouter);
import dashboardRouter from './routes/dashboard.js';
import workflowsRouter from './routes/workflows.js';
import n8nTriggerRouter from './routes/n8n-trigger.js';
import importRouter from './routes/import.js';
import segmentsRouter from './routes/segments.js';
import healthRouter from './routes/health.js';
import maxRouter from './routes/max.js';

process.on('unhandledRejection', (reason)=> console.error('[FATAL] UnhandledRejection:', reason));
process.on('uncaughtException', (err)=> { console.error('[FATAL] UncaughtException:', err); process.exit(1); });
process.on('SIGINT', ()=> { console.log('[EXIT] SIGINT'); process.exit(0); });
process.on('SIGTERM', ()=> { console.log('[EXIT] SIGTERM'); process.exit(0); });

const app = express();
app.use(express.json());
// Allow custom headers for UI
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type','X-Api-Key','X-Tenant','X-Role','X-Preview','X-Client'],
  exposedHeaders: ['Content-Type']
}));
app.use(headers);
app.use((req,res,next)=>{ res.setHeader('Content-Type','application/json; charset=utf-8'); next(); });

// Define guardMode
const guardMode = (type) => checkModeWrite;

// Mount routes
app.use('/api', statusRouter);
app.use('/api', reportingRouter);
app.use('/api', askRouter);
app.use('/api/menu', menuRouter);
app.use('/api', actionsRouter);
app.use('/api/actions', auditRouter);
app.use('/api', tasksRouter);
app.use('/api', n8nRouter);
app.use('/api', modeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api', n8nTriggerRouter);
app.use('/api', importRouter);
app.use('/api', segmentsRouter);
app.use('/api', healthRouter);
app.use('/api/max', maxRouter);
app.use('/api', resolveRouter);
app.use('/api', resolveTenant(), agentRouter);
app.use('/api', resolveTenant(), chatRouter);
app.use('/api/brain', resolveTenant(), brainRouter);
app.use('/api/logs', logsRouter);
app.use('/api/crm', resolveTenant(), crmRouter);
// Ensure JSON type for all /api/*
app.use('/api', (req,res,next)=>{ res.type('application/json'); next(); });

// Mount métier routes behind tenant guard
app.use("/api", resolveTenant(), leadRoutes);
app.use("/api", resolveTenant(), tagsRoutes);
app.use("/api", resolveTenant(), triggerRoutes);

// Sanity ping
app.get('/api/ping', (req, res) => res.json({ ok: true, pong: true }));

// P0: actions sans aucun appel Espo
app.post('/api/actions/updateLead', checkModeWrite, async (req, res) => {
  const { id, fields } = req.body || {};
  if (!id || !fields) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
  // Pas d'appel Espo ici (P0) → on simule juste OK
  return res.json({ ok: true, updated: true, id, fields });
});

app.post('/api/actions/trigger', checkModeWrite, async (req, res) => {
  const { message, context } = req.body || {};
  if (!message) return res.status(400).json({ ok: false, error: 'MISSING_MESSAGE' });
  // Pas d'appel n8n ici (P0) → on simule juste OK
  return res.json({ ok: true, sent: true, context: context || 'generic' });
});

// AI function with Anthropic support
async function askAI(prompt) {
  const provider = process.env.AI_PROVIDER || 'openai';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (provider === 'anthropic') {
    const Anthropic = await import('@anthropic-ai/sdk');
    const client = new Anthropic.default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text;
  } else {
    // Fallback to OpenAI or other
    throw new Error('OpenAI not implemented in P0');
  }
}

// P0: Chat/Ask endpoint with basic interceptors
app.post('/api/ask', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message) return res.status(400).json({ ok: false, error: 'MISSING_MESSAGE' });

    // Basic interceptor for "dernier lead"
    if (/^\s*dernier\s+lead\s*$/i.test(message)) {
      return res.json({
        ok: true,
        reply: 'Dernier lead: Simulation P0 - Pas de données Espo connectées.'
      });
    }

    // Use AI
    const reply = await askAI(message);
    res.json({ ok: true, reply });
  } catch (e) {
    console.error('/api/ask error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Probes de diag
app.get("/api/__probe/espo", async (req,res) => {
  try { const r = await fetch(`${process.env.ESPO_BASE}/Lead?maxSize=1`); const j = await r.json(); res.json({ ok:r.ok, base:process.env.ESPO_BASE, total:j?.total ?? 0 }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.get("/api/__probe/n8n", async (req,res) => {
  try { const r = await fetch(`${process.env.N8N_BASE}/healthz`).catch(()=>({ ok:false, status:0 })); res.json({ ok: !!r?.ok, base:process.env.N8N_BASE }); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// 404 JSON guard for /api/*
app.use('/api', (req,res)=>{
  res.status(404).type('application/json').json({ ok:false, error:'API_NOT_FOUND', path:req.path });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`M.A.X. server P1 listening on http://127.0.0.1:${PORT}`);
});