import 'dotenv/config';

// ============================================================
// VALIDATION .ENV OBLIGATOIRE
// ============================================================
const REQUIRED_ENV = [
  'ESPO_BASE_URL',
  'ESPO_API_KEY',
  'ESPO_USERNAME',
  'ESPO_PASSWORD',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ ERREUR: Variables .env manquantes:\n');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\n📋 Action requise:');
  console.error('   1. Copier .env.example vers .env');
  console.error('   2. Renseigner les valeurs manquantes');
  console.error('   3. Redémarrer le backend\n');
  process.exit(1);
}

console.log('✅ Variables .env validées');

import express from 'express';
import cors from 'cors';
import { checkModeWrite } from './middleware/checkMode.js';
import headers from './middleware/headers.js';
// GPT-4o-mini | Fenêtre glissante 72h + limite 100 messages | Newsletter COMPACT
import acl from './middleware/acl.js';
import { initialize as initializeSelfHealing } from './lib/selfHealing.js';
import { loadWhatsAppPresets } from './lib/whatsappPresetsLoader.js';
import brainRouter from './routes/brain.js';
import logsRouter from './routes/logs.js';
import brainConfig from './config/brain.config.js';
import leadRoutes from './routes/lead.js';
import triggerRoutes from './routes/trigger.js';
import tagsRoutes from './routes/tags.js';
import { resolveTenant } from './core/resolveTenant.js';
import crmRouter from './routes/crm.js';
import crmPublicRouter from './routes/crmPublic.js'; // ⚠️ TEMPORAIRE: Route CRM sans auth
import resolveRouter from './routes/resolve.js';
import reportingRouter from './routes/reporting.js';
import agentRouter from './routes/agent.js';
import chatRouter from './routes/chat.js';
import consentTestRouter from './routes/consent-test.js';
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
import maxActionsRouter from './routes/maxActions.js';
import maxCreaRouter from './routes/maxCrea.js';
import bubbleRouter from './routes/bubble.js';
import aiRouter from './routes/ai.js';
import safeActionsRouter from './routes/safeActions.js';
import layoutRouter from './routes/layout.js';
import billingRouter from './routes/billing.js';
import whatsappWebhookRouter from './routes/whatsapp-webhook.js';
import whatsappMessagesRouter from './routes/whatsapp-messages.js';
import authRouter from './routes/auth.js';
import chatMvp1Router from './routes/chatMvp1.js';
import dashboardMvp1Router from './routes/dashboardMvp1.js';
import crmMvp1Router from './routes/crmMvp1.js';
import automationMvp1Router from './routes/automationMvp1.js';
import tenantGoalsRouter from './routes/tenantGoals.js';
import testWhatsappStubRouter from './routes/test-whatsapp-stub.js';
import actionsApiRouter from './routes/actions-api.js';
import waInstanceRouter from './routes/wa-instance.js';
import consentRouter from './routes/consent.js';
import activitiesRouter from './routes/activities.js';

process.on('unhandledRejection', (reason)=> console.error('[FATAL] UnhandledRejection:', reason));
process.on('uncaughtException', (err)=> { console.error('[FATAL] UncaughtException:', err); process.exit(1); });
process.on('SIGINT', ()=> { console.log('[EXIT] SIGINT'); process.exit(0); });
process.on('SIGTERM', ()=> { console.log('[EXIT] SIGTERM'); process.exit(0); });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ⚡ Support Twilio webhooks (application/x-www-form-urlencoded)
// Allow custom headers for UI
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    'http://localhost:5175', 'http://127.0.0.1:5175',
    'http://localhost:8081', 'http://127.0.0.1:8081',
    'https://max.studiomacrea.cloud'
  ],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type','X-Api-Key','X-Tenant','X-Role','X-Preview','X-Client','Authorization'],
  exposedHeaders: ['Content-Type'],
  credentials: true
}));

// Route Auth (publique, pas d'auth requise pour login)
app.use('/api/auth', authRouter);

// Route Chat MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/chat-mvp1', chatMvp1Router);

// Route Dashboard MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/dashboard-mvp1', dashboardMvp1Router);

// Route CRM MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/crm-mvp1', crmMvp1Router);

// Route Automation MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/automation-mvp1', automationMvp1Router);

// ============================================================================
// ⚠️ ROUTE CRM PUBLIQUE - DOIT ÊTRE AVANT TOUS LES MIDDLEWARES GLOBAUX
// Cette route DOIT être ici pour éviter les middlewares headers/resolveTenant
// TODO Phase 3: Supprimer crmPublicRouter et utiliser crmRouter avec auth
// ============================================================================
app.use('/api/crm-public', crmPublicRouter);

// Routes M.A.X. Actions, Créa, Chat, Bubble, AI, Safe Actions, Layout ET Billing AVANT le middleware headers (pas besoin de tenant)
app.use('/api/max/actions', maxActionsRouter);
app.use('/api/max/crea', maxCreaRouter);
app.use('/api/max/bubble', bubbleRouter);
app.use('/api/ai', aiRouter);
app.use('/api/chat', chatRouter);
app.use('/api/chat', consentTestRouter); // 🧪 Test consentement E2E
app.use('/api/safe-actions', safeActionsRouter);
app.use('/api/layout', layoutRouter);
app.use('/api/billing', billingRouter);
app.use('/api/whatsapp', whatsappWebhookRouter); // Webhook entrant WhatsApp (Twilio)
app.use('/api/whatsapp', whatsappMessagesRouter); // API CRUD messages WhatsApp
app.use('/api/tenant/goals', tenantGoalsRouter); // Routes tenant goals (mémoire longue durée)
app.use('/api/test', testWhatsappStubRouter); // 🧪 Endpoint de test WhatsApp stub (sans dépendre de Twilio Live)
app.use('/api/action-layer', actionsApiRouter); // 🎯 Action Layer - Endpoints pour tester les actions CRM manuellement (AVANT headers middleware)
app.use('/api/wa', waInstanceRouter); // 📱 Green-API WhatsApp Instance Management (AVANT headers middleware)
app.use('/api/consent', consentRouter); // 🔒 Système de consentement pour opérations sensibles (AVANT headers middleware)

// Sanity ping (AVANT headers middleware pour Cloudflare healthcheck)
app.get('/api/ping', (req, res) => res.json({ ok: true, pong: true }));

app.use(headers);
app.use((req,res,next)=>{ res.setHeader('Content-Type','application/json; charset=utf-8'); next(); });

// Define guardMode
const guardMode = (type) => checkModeWrite;

// Mount routes (AFTER headers middleware for tenant resolution)
app.use('/api/activities', activitiesRouter); // 🔔 Système d'alertes vivantes M.A.X.
app.use('/api/alerts', activitiesRouter); // 🔔 Alias pour /activities (GET /api/alerts/active)
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
app.use('/api/brain', resolveTenant(), brainRouter);
app.use('/api/logs', logsRouter);
app.use('/api/crm', crmRouter); // Route CRM avec auth (nécessite JWT utilisateur)
// Ensure JSON type for all /api/*
app.use('/api', (req,res,next)=>{ res.type('application/json'); next(); });

// Mount métier routes behind tenant guard
app.use("/api", resolveTenant(), leadRoutes);
app.use("/api", resolveTenant(), tagsRoutes);
app.use("/api", resolveTenant(), triggerRoutes);

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

// Initialiser le self-healing et les presets WhatsApp au démarrage
(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 M.A.X. SELF-HEALING SYSTEM - Initialisation');
    console.log('='.repeat(80));
    await initializeSelfHealing();
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('[SELF_HEALING] ❌ Erreur lors de l\'initialisation:', error.message);
  }

  // Charger les presets WhatsApp
  try {
    await loadWhatsAppPresets();
  } catch (error) {
    console.error('[WHATSAPP_PRESETS] ❌ Erreur lors du chargement:', error.message);
  }
})();

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`M.A.X. server P1 listening on http://127.0.0.1:${PORT}`);

  // ✅ Green-API Configuration Check
  const greenApiBaseUrl = process.env.GREENAPI_BASE_URL || 'https://api.green-api.com';
  console.log(`\n🌐 Green-API Configuration:`);
  console.log(`   Base URL: ${greenApiBaseUrl}`);

  // ⚠️ Validation: Interdire localhost/127.0.0.1 en production
  if (greenApiBaseUrl.includes('127.0.0.1') || greenApiBaseUrl.includes('localhost')) {
    console.error(`\n❌ ERREUR CONFIGURATION GREEN-API:`);
    console.error(`   GREENAPI_BASE_URL pointe vers localhost (${greenApiBaseUrl})`);
    console.error(`   Green-API est un service EXTERNE - utiliser https://api.green-api.com`);
    console.error(`   Corrigez le .env: GREENAPI_BASE_URL=https://api.green-api.com\n`);
  } else {
    console.log(`   ✅ URL valide (service externe)\n`);
  }

  // 🩺 Green-API Health Check
  try {
    const { validateGreenApiConfig } = await import('./providers/greenapi/greenapi.config.js');
    const configCheck = validateGreenApiConfig();

    if (!configCheck.isValid) {
      console.log(`⚠️  Green-API: Variables manquantes (non-bloquant): ${configCheck.missing.join(', ')}`);
    } else {
      console.log(`✅ Green-API: Configuration complète`);
    }
  } catch (error) {
    console.log(`⚠️  Green-API: Impossible de valider la config (${error.message})`);
  }

  console.log(''); // Ligne vide pour lisibilité
});
