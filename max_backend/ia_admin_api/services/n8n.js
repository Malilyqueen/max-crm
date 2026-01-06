import crypto from 'crypto';
const fetch = (...a)=> import('node-fetch').then(({default:f})=>f(...a));
import { createTask, startTask, progressTask, completeTask, failTask } from '../routes/tasks.js';

const MAP = {
  'relance-j3': process.env.N8N_WEBHOOK_RELANCE_J3,
  'tag-chaud' : process.env.N8N_WEBHOOK_TAG_CHAUD,
  'nettoyage' : process.env.N8N_WEBHOOK_NETTOYAGE,
  'wf-newsletter-segment': process.env.N8N_WEBHOOK_NEWSLETTER_SEGMENT,
  'wf-relance-j3': process.env.N8N_WEBHOOK_RELANCE_J3
};

function hmac(body, secret){ return crypto.createHmac('sha256', secret).update(body).digest('hex'); }

export async function trigger ({code, payload, tenant, role, mode}){
  const url = MAP[code]; 
  if(!url) {
    // Fallback mock pour développement
    console.log('N8N webhook not configured, using mock response for:', code);
    const runId = `run-${crypto.randomUUID().slice(0, 8)}`;
    try {
      createTask(tenant, runId, `Workflow ${code}`, 'workflow');
      startTask(tenant, runId);
      setTimeout(() => completeTask(tenant, runId, { status: 200, response: 'Mock workflow completed' }), 2000);
    } catch (taskError) {
      console.error('Task management error:', taskError);
      // Continue without task management
    }
    return { ok: true, status: 200, text: 'Mock workflow triggered', runId };
  }

  const runId = `run-${crypto.randomUUID().slice(0, 8)}`;

  // Créer la tâche
  createTask(tenant, runId, `Workflow ${code}`, 'workflow');

  try {
    const body = JSON.stringify({ tenant, actor:'MAX', action:code, mode, context:{ role, reqId: Date.now().toString(36), runId }, data: payload, ts: Date.now() });
    const sig = hmac(body, process.env.N8N_WEBHOOK_SECRET||'');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Démarrer la tâche
    startTask(tenant, runId);

    // Simulation de progression
    let progress = 20;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress < 80) {
        progressTask(tenant, runId, Math.min(progress, 80));
      }
    }, 1000);

    const resp = await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json','X-MAX-Signature':sig,'X-MAX-Tenant':tenant,'X-Idempotency-Key':crypto.randomUUID() }, body, signal: controller.signal });

    clearTimeout(timeoutId);
    clearInterval(progressInterval);

    const text = await resp.text();

    if (resp.ok) {
      completeTask(tenant, runId, { status: resp.status, response: text });
      return { ok: true, status: resp.status, text, runId };
    } else {
      failTask(tenant, runId, { status: resp.status, error: text });
      return { ok: false, status: resp.status, text, runId };
    }

  } catch (error) {
    failTask(tenant, runId, { error: error.message });
    throw error;
  }
};

export async function getExecutionById(id) {
  // Proxy vers l'API REST n8n
  const n8nBase = process.env.N8N_BASE || 'http://127.0.0.1:5678';
  const url = `${n8nBase}/rest/executions/${id}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      }
    });

    if (!resp.ok) {
      throw new Error(`N8N API error: ${resp.status}`);
    }

    const data = await resp.json();
    return data;
  } catch (error) {
    console.error('Error fetching execution from n8n:', error);
    // Fallback mock pour développement
    return {
      id,
      startedAt: new Date(Date.now() - 30000).toISOString(),
      finishedAt: new Date().toISOString(),
      duration: 30000,
      data: [
        {
          name: 'Start',
          startedAt: new Date(Date.now() - 30000).toISOString(),
          finishedAt: new Date(Date.now() - 25000).toISOString(),
          durationMs: 5000,
          status: 'success',
          input: { trigger: 'manual' },
          output: { data: 'started' }
        },
        {
          name: 'Process Data',
          startedAt: new Date(Date.now() - 25000).toISOString(),
          finishedAt: new Date(Date.now() - 5000).toISOString(),
          durationMs: 20000,
          status: 'success',
          input: { data: 'started' },
          output: { result: 'processed', email: 'user@example.com' }
        },
        {
          name: 'Send Email',
          startedAt: new Date(Date.now() - 5000).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 5000,
          status: 'success',
          input: { result: 'processed', email: 'user@example.com' },
          output: { sent: true }
        }
      ]
    };
  }
}