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

// ============================================================
// BOOT GUARD: Verrou de sécurité Production
// Empêche tout mélange localhost/prod
// ============================================================
import fs from 'fs';
import path from 'path';

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.CRM_ENV === 'prod';

function bootGuard() {
  const errors = [];

  // 1. Vérifier que ESPO_BASE_URL ne pointe pas vers localhost en prod
  const espoUrl = process.env.ESPO_BASE_URL || '';
  if (IS_PRODUCTION) {
    if (espoUrl.includes('localhost') || espoUrl.includes('127.0.0.1')) {
      errors.push(`ESPO_BASE_URL pointe vers localhost en prod: ${espoUrl}`);
    }
  }

  // 2. Vérifier les chemins Windows en prod
  const pathsToCheck = [
    { name: 'TASKS_DIR', value: process.env.TASKS_DIR },
    { name: 'TASK_REGISTRY_PATH', value: process.env.TASK_REGISTRY_PATH },
  ];

  if (IS_PRODUCTION) {
    pathsToCheck.forEach(({ name, value }) => {
      if (value && (value.includes('D:\\') || value.includes('C:\\') || value.includes('D:/'))) {
        errors.push(`${name} contient un chemin Windows en prod: ${value}`);
      }
    });
  }

  // 3. Forcer ALLOW_RESET=false en prod
  if (IS_PRODUCTION && process.env.ALLOW_RESET === 'true') {
    console.warn('[BOOT GUARD] ⚠️  ALLOW_RESET=true détecté en prod - forcé à false');
    process.env.ALLOW_RESET = 'false';
  }

  // 4. Vérifier/créer le dossier /app/data en prod
  if (IS_PRODUCTION) {
    const dataDir = '/app/data';
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`[BOOT GUARD] 📁 Dossier ${dataDir} créé`);
      } catch (e) {
        errors.push(`Impossible de créer ${dataDir}: ${e.message}`);
      }
    }

    // Créer sous-dossiers nécessaires
    const subDirs = ['tasks_autogen', 'logs', 'conversations'];
    subDirs.forEach(sub => {
      const fullPath = path.join(dataDir, sub);
      if (!fs.existsSync(fullPath)) {
        try {
          fs.mkdirSync(fullPath, { recursive: true });
          console.log(`[BOOT GUARD] 📁 Dossier ${fullPath} créé`);
        } catch (e) {
          console.warn(`[BOOT GUARD] ⚠️  Impossible de créer ${fullPath}: ${e.message}`);
        }
      }
    });
  }

  // Si erreurs critiques en prod, crash immédiat
  if (errors.length > 0) {
    console.error('\n🚨 BOOT GUARD: Configuration invalide pour la production\n');
    errors.forEach(err => console.error(`   ❌ ${err}`));
    console.error('\n');
    process.exit(1);
  }
}

// Exécuter le BOOT GUARD
bootGuard();

// ============================================================
// LOGS DE BOOT (preuve de configuration)
// ============================================================
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                    M.A.X. BACKEND BOOT                      ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║ NODE_ENV:        ${(process.env.NODE_ENV || 'development').padEnd(40)}║`);
console.log(`║ CRM_ENV:         ${(process.env.CRM_ENV || 'dev').padEnd(40)}║`);
console.log(`║ ESPO_BASE_URL:   ${(process.env.ESPO_BASE_URL || 'NOT SET').padEnd(40)}║`);
console.log(`║ PORT:            ${(process.env.PORT || '3005').padEnd(40)}║`);

// Vérifier existence des paths
const tasksDir = process.env.TASKS_DIR || '/app/data/tasks_autogen';
const taskRegistry = process.env.TASK_REGISTRY_PATH || '/app/data/task_registry.json';
const tasksDirExists = fs.existsSync(tasksDir);
const taskRegistryDir = path.dirname(taskRegistry);
const taskRegistryDirExists = fs.existsSync(taskRegistryDir);

console.log(`║ TASKS_DIR:       ${tasksDir.substring(0, 35).padEnd(40)}║`);
console.log(`║   └─ exists:     ${String(tasksDirExists).padEnd(40)}║`);
console.log(`║ TASK_REGISTRY:   ${taskRegistry.substring(0, 35).padEnd(40)}║`);
console.log(`║   └─ dir exists: ${String(taskRegistryDirExists).padEnd(40)}║`);
console.log(`║ ALLOW_RESET:     ${(process.env.ALLOW_RESET || 'false').padEnd(40)}║`);
console.log('╚════════════════════════════════════════════════════════════╝\n');

import express from 'express';
import cors from 'cors';
import {
  globalLimiter,
  authLimiter,
  sensitiveLimiter,
  aiLimiter,
  webhookLimiter,
  getRateLimitStats
} from './middleware/rateLimiter.js';
import {
  initSentry,
  sentryRequestMiddleware,
  sentryErrorMiddleware,
  testSentry,
  getSentryStatus
} from './middleware/sentry.js';
import { checkModeWrite } from './middleware/checkMode.js';
import headers from './middleware/headers.js';
// GPT-4o-mini | Fenêtre glissante 72h + limite 100 messages | Newsletter COMPACT
import acl from './middleware/acl.js';
import { initialize as initializeSelfHealing } from './lib/selfHealing.js';
import { requeueStaleJobs } from './lib/batchJobEngine.js';
import { loadWhatsAppPresets } from './lib/whatsappPresetsLoader.js';
import brainRouter from './routes/brain.js';
import logsRouter from './routes/logs.js';
import brainConfig from './config/brain.config.js';
import leadRoutes from './routes/lead.js';
import triggerRoutes from './routes/trigger.js';
import tagsRoutes from './routes/tags.js';
import { resolveTenant } from './core/resolveTenant.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import crmRouter from './routes/crm.js';
import crmPublicRouter from './routes/crmPublic.js'; // ⚠️ Legacy name: Routes CRM sécurisées avec auth JWT + tenant
import resolveRouter from './routes/resolve.js';
import reportingRouter from './routes/reporting.js';
import agentRouter from './routes/agent.js';
import chatRouter from './routes/chat.js';
import consentTestRouter from './routes/consent-test.js';
import toolsRouter from './routes/tools.js';
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
import greenApiWebhookRouter from './routes/greenapi-webhook.js';
import twilioSmsWebhookRouter from './routes/twilio-sms-webhook.js';
import mailjetWebhookRouter from './routes/mailjet-webhook.js';
import eventsRouter from './routes/events.js';
import campaignsRouter from './routes/campaigns.js';
import authRouter from './routes/auth.js';
import chatMvp1Router from './routes/chatMvp1.js';
import dashboardMvp1Router from './routes/dashboardMvp1.js';
import crmMvp1Router from './routes/crmMvp1.js';
import automationMvp1Router from './routes/automationMvp1.js';
import tenantGoalsRouter from './routes/tenantGoals.js';
import testWhatsappStubRouter from './routes/test-whatsapp-stub.js';
import actionsApiRouter from './routes/actions-api.js';
import waInstanceRouter from './routes/wa-instance.js';
import waQrRouter from './routes/wa-qr.js';
import consentRouter from './routes/consent.js';
import activitiesRouter from './routes/activities.js';
import supportRouter from './routes/support.js';
import settingsRouter from './routes/settings.js';
import settingsTestRouter from './routes/settings-test.js';
import emailDomainsRouter from './routes/email-domains.js';
import smsSettingsRouter from './routes/sms-settings.js';
import whatsappBillingRouter from './routes/whatsapp-billing.js';
import templatesRouter from './routes/templates.js';
import automationsRouter from './routes/automations.js';
import recommendationsRouter from './routes/recommendations.js';
import importBatchRouter from './routes/import-batch.js'; // 📦 Import async batch (10k+ leads)
import batchJobsRouter from './routes/batch-jobs.js'; // 📦 Unified batch job engine (import + bulk_update)
import syncRouter from './routes/sync.js'; // 🔄 Sync EspoCRM → Supabase

process.on('unhandledRejection', (reason)=> console.error('[FATAL] UnhandledRejection:', reason));
process.on('uncaughtException', (err)=> { console.error('[FATAL] UncaughtException:', err); process.exit(1); });
process.on('SIGINT', ()=> { console.log('[EXIT] SIGINT'); process.exit(0); });
process.on('SIGTERM', ()=> { console.log('[EXIT] SIGTERM'); process.exit(0); });

const app = express();

// ============================================================
// POSTGRESQL / SUPABASE CLIENT (pour routes support, events, etc.)
// ============================================================
import pkg from 'pg';
const { Pool } = pkg;

// Supabase connection string format:
// postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// Extrait depuis SUPABASE_URL (https://jcegkuyagbthpbklyawz.supabase.co)
const supabaseRef = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const supabasePassword = process.env.DATABASE_PASSWORD || process.env.SUPABASE_PASSWORD || 'CHANGE_ME';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.${supabaseRef}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

// Configuration Pool avec IPv4 forcé pour Supabase
import dns from 'dns';
import { promisify } from 'util';
const resolve4 = promisify(dns.resolve4);

const poolConfig = {
  connectionString,
  ssl: { rejectUnauthorized: false }
};

// Force IPv4 pour éviter ENETUNREACH IPv6 sur serveurs sans IPv6
if (process.env.FORCE_IPV4 === 'true') {
  console.log('🔧 Mode IPv4 forcé activé - Résolution DNS IPv4...');

  // Extraire host, user, password, database du connectionString
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    const [, user, password, host, port, database] = match;

    try {
      // Résoudre l'hostname en IPv4 uniquement
      const ipv4Addresses = await resolve4(host);
      const ipv4 = ipv4Addresses[0];

      console.log(`✅ DNS résolu: ${host} → ${ipv4} (IPv4)`);

      poolConfig.user = user;
      poolConfig.password = password;
      poolConfig.host = ipv4; // Utiliser l'IP IPv4 directement
      poolConfig.port = parseInt(port);
      poolConfig.database = database;
      delete poolConfig.connectionString;
      poolConfig.connectionTimeoutMillis = 10000;
    } catch (dnsError) {
      console.error(`❌ Erreur résolution DNS IPv4 pour ${host}:`, dnsError.message);
      console.log('⚠️ Fallback sur connectionString standard');
    }
  }
}

const pool = new Pool(poolConfig);

// Expose db client pour les routes
app.locals.db = pool;

console.log(`✅ PostgreSQL client initialisé (Supabase ref: ${supabaseRef})`);

// ============================================================
// VALIDATION CLÉ DE CHIFFREMENT (pour credentials providers)
// ============================================================
import { validateEncryptionKey, testEncryption } from './lib/encryption.js';

try {
  validateEncryptionKey();
  testEncryption();
  console.log('✅ Système de chiffrement validé');
} catch (error) {
  console.warn('⚠️  CREDENTIALS_ENCRYPTION_KEY non configurée ou invalide');
  console.warn('   Les fonctionnalités de configuration de providers seront désactivées');
  console.warn('   Pour activer: générez une clé avec:');
  console.warn('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.warn('   Puis ajoutez dans .env: CREDENTIALS_ENCRYPTION_KEY=<votre_clé>');
}

// ============================================================
// SENTRY - Error Tracking (optionnel mais recommandé en prod)
// ============================================================
await initSentry();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ⚡ Support Twilio webhooks (application/x-www-form-urlencoded)
// Allow custom headers for UI
// CORS avec origin dynamique pour supporter Vercel + domaine principal
const allowedOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:5175', 'http://127.0.0.1:5175',
  'http://localhost:8081', 'http://127.0.0.1:8081',
  'https://max.studiomacrea.cloud',
  'https://max-app-frontend.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment
    if (origin.includes('vercel.app')) return callback(null, origin);
    // Allow listed origins
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    // Block others
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type','X-Api-Key','X-Tenant','X-Role','X-Preview','X-Client','Authorization'],
  exposedHeaders: ['Content-Type'],
  credentials: true
}));

// ============================================================
// SENTRY REQUEST MIDDLEWARE - Ajoute request_id et contexte
// ============================================================
app.use(sentryRequestMiddleware);

// ============================================================
// RATE LIMITING - Protection contre les abus
// "Un système qui refuse de servir (429) vaut mieux qu'un système qui tombe."
// ============================================================
// Global: 100 req/min par IP (sauf health/ping)
app.use((req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/ping' || req.path === '/api/boot-info') {
    return next();
  }
  return globalLimiter(req, res, next);
});

// Route Auth (publique, pas d'auth requise pour login) + rate limit strict
app.use('/api/auth', authLimiter, authRouter);

// Route Chat MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/chat-mvp1', chatMvp1Router);

// Route Dashboard MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/dashboard-mvp1', dashboardMvp1Router);

// Route CRM MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/crm-mvp1', crmMvp1Router);

// Route Automation MVP1 (protégé par auth JWT, AVANT headers middleware)
app.use('/api/automation-mvp1', automationMvp1Router);

// ============================================================================
// 🔒 ROUTES CRM SÉCURISÉES (Legacy name: /crm-public → secured routes)
// Auth JWT REQUIS + Tenant resolution
// ============================================================================
app.use('/api/crm-public', authMiddleware, resolveTenant(), crmPublicRouter);

// Routes M.A.X. Actions, Créa, Chat, Bubble, AI, Safe Actions, Layout ET Billing AVANT le middleware headers (pas besoin de tenant)
app.use('/api/max/actions', maxActionsRouter);
app.use('/api/max/crea', maxCreaRouter);
app.use('/api/max/bubble', bubbleRouter);
app.use('/api/ai', aiLimiter, aiRouter); // 🛡️ Rate limit AI: 20 req/min par tenant
app.use('/api/chat', aiLimiter, chatRouter); // 🛡️ Rate limit AI: 20 req/min par tenant
app.use('/api/chat', consentTestRouter); // 🧪 Test consentement E2E
app.use('/api/tools', toolsRouter); // 🧪 Test direct tools (bypass LLM)
app.use('/api/safe-actions', safeActionsRouter);
app.use('/api/layout', layoutRouter);
app.use('/api/billing', billingRouter);
app.use('/api/whatsapp', sensitiveLimiter, whatsappWebhookRouter); // 🛡️ Rate limit sensible: 30 req/min par tenant
app.use('/api/whatsapp', whatsappMessagesRouter); // API CRUD messages WhatsApp
app.use('/api/whatsapp/billing', whatsappBillingRouter); // 💰 WhatsApp Billing (abonnement + recharges)
app.use('/webhooks/greenapi', webhookLimiter, greenApiWebhookRouter); // 🛡️ Rate limit webhook: 60 req/min par IP
app.use('/webhooks/twilio-sms', webhookLimiter, twilioSmsWebhookRouter); // 🛡️ Rate limit webhook: 60 req/min par IP
app.use('/webhooks/mailjet', webhookLimiter, mailjetWebhookRouter); // 🛡️ Rate limit webhook: 60 req/min par IP
app.use('/api/tenant/goals', tenantGoalsRouter); // Routes tenant goals (mémoire longue durée)
app.use('/api/test', testWhatsappStubRouter); // 🧪 Endpoint de test WhatsApp stub (sans dépendre de Twilio Live)
app.use('/api/action-layer', actionsApiRouter); // 🎯 Action Layer - Endpoints pour tester les actions CRM manuellement (AVANT headers middleware)
app.use('/api/wa/instance', waInstanceRouter); // 📱 Green-API WhatsApp Instance Management (AVANT headers middleware)
app.use('/api/wa/qr', waQrRouter); // 💬 WhatsApp Pro QR-Only Flow (JWT + WhatsApp gate)
app.use('/api/consent', consentRouter); // 🔒 Système de consentement pour opérations sensibles (AVANT headers middleware)

// Sanity ping (AVANT headers middleware pour Cloudflare healthcheck)
app.get('/api/ping', (req, res) => res.json({ ok: true, pong: true }));

// Sentry status/test (publics - AVANT headers middleware)
app.get('/api/sentry/status', (req, res) => res.json(getSentryStatus()));
app.get('/api/sentry/test', (req, res) => {
  const result = testSentry();
  res.json({ ...result, status: getSentryStatus() });
});

// Servir les fichiers uploadés du support (pièces jointes)
app.use('/uploads/support', express.static('uploads/support'));

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

// ============================================================================
// 🔄 ROUTE SYNC - AVANT resolveRouter qui a authMiddleware global
// ============================================================================
app.use('/api/sync', sensitiveLimiter, syncRouter); // 🛡️ Rate limit sensible: 30 req/min par tenant

app.use('/api', resolveRouter);

// ============================================================================
// 🔓 ROUTE CRM ACTIVATION - AVANT resolveTenant() pour éviter dépendance circulaire
// Un tenant sans CRM doit pouvoir appeler /api/crm/request-activation
// ============================================================================
app.use('/api/crm', crmRouter); // Route CRM avec auth (nécessite JWT utilisateur)

app.use('/api', resolveTenant(), agentRouter);
app.use('/api/brain', resolveTenant(), brainRouter);
app.use('/api/logs', logsRouter);
app.use('/api/events', resolveTenant(), eventsRouter); // Routes events multi-canal (auth + tenant)
app.use('/api/campaigns', sensitiveLimiter, resolveTenant(), campaignsRouter); // 🛡️ Rate limit sensible: 30 req/min (bulk send)
app.use('/api/templates', resolveTenant(), templatesRouter); // Routes templates CRUD + MAX draft (auth + tenant)
app.use('/api/automations', resolveTenant(), automationsRouter); // Routes automations CRUD (auth + tenant)
app.use('/api/max/recommendations', resolveTenant(), recommendationsRouter); // Routes recommandations intelligentes MAX (auth + tenant)
app.use('/api/import', sensitiveLimiter, authMiddleware, resolveTenant(), importBatchRouter); // 🛡️ Rate limit sensible: 30 req/min (batch import)
app.use('/api/batch-jobs', sensitiveLimiter, batchJobsRouter); // 🛡️ Rate limit sensible: 30 req/min (batch jobs)
app.use('/api/support', authMiddleware, resolveTenant(), supportRouter); // Routes support lite MVP (auth + tenant)
// IMPORTANT: Routes spécifiques AVANT routes générales
app.use('/api/settings/sms', authMiddleware, resolveTenant(), smsSettingsRouter); // Routes SMS settings (auth + tenant)
app.use('/api/settings', authMiddleware, resolveTenant(), settingsRouter); // Routes settings self-service (auth + tenant)
app.use('/api/settings', authMiddleware, resolveTenant(), settingsTestRouter); // Routes settings test connection (auth + tenant)
app.use('/api/email', authMiddleware, resolveTenant(), emailDomainsRouter); // Routes email domain validation (auth + tenant)
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

  // Requeue stale batch jobs (crashed during previous run)
  try {
    await requeueStaleJobs();
  } catch (error) {
    console.error('[BATCH_ENGINE] ❌ Erreur requeue stale jobs:', error.message);
  }
})();

// ============================================================
// GLOBAL ERROR HANDLER - Capture toutes les erreurs non gérées
// DOIT être le DERNIER middleware
// ============================================================
app.use(sentryErrorMiddleware);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = req.requestId || 'N/A';

  console.error(`[GLOBAL_ERROR] ${requestId} - ${err.message}`);

  res.status(statusCode).json({
    ok: false,
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    code: err.code || 'UNKNOWN_ERROR',
    request_id: requestId,
  });
});

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Not Found',
    path: req.path,
    request_id: req.requestId,
  });
});

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
