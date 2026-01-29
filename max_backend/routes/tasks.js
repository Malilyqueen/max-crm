import express from 'express';

const router = express.Router();
const clients = new Map(); // tenant -> Set<response>

// Stockage des tâches actives par tenant
const activeTasks = new Map(); // tenant -> Map<taskId, taskData>

router.get('/tasks/stream', (req, res) => {
  // SECURITY: tenantId UNIQUEMENT depuis JWT
  const tenant = req.tenantId;
  if (!tenant) {
    return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Ajouter le client
  if (!clients.has(tenant)) {
    clients.set(tenant, new Set());
  }
  clients.get(tenant).add(res);

  // Envoyer les tâches actives existantes
  const tenantTasks = activeTasks.get(tenant) || new Map();
  for (const [taskId, taskData] of tenantTasks) {
    res.write(`event: status\ndata: ${JSON.stringify({ id: taskId, ...taskData })}\n\n`);
  }

  req.on('close', () => {
    const tenantClients = clients.get(tenant);
    if (tenantClients) {
      tenantClients.delete(res);
      if (tenantClients.size === 0) {
        clients.delete(tenant);
      }
    }
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (!res.destroyed) {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

function pushToTenant(tenant, event, data) {
  const tenantClients = clients.get(tenant);
  if (!tenantClients) return;

  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of tenantClients) {
    if (!client.destroyed) {
      client.write(line);
    }
  }
}

export function updateTaskStatus(tenant, taskId, status, data = {}) {
  if (!activeTasks.has(tenant)) {
    activeTasks.set(tenant, new Map());
  }

  const tenantTasks = activeTasks.get(tenant);

  if (status === 'done' || status === 'failed') {
    tenantTasks.delete(taskId);
  } else {
    tenantTasks.set(taskId, { status, ...data, updatedAt: Date.now() });
  }

  pushToTenant(tenant, 'status', { id: taskId, status, ...data });
}

export function createTask(tenant, taskId, label, type = 'workflow') {
  updateTaskStatus(tenant, taskId, 'queued', { label, type, progress: 0 });
}

export function startTask(tenant, taskId) {
  updateTaskStatus(tenant, taskId, 'running', { progress: 10 });
}

export function progressTask(tenant, taskId, progress) {
  const tenantTasks = activeTasks.get(tenant);
  if (tenantTasks?.has(taskId)) {
    const taskData = tenantTasks.get(taskId);
    updateTaskStatus(tenant, taskId, 'running', { ...taskData, progress });
  }
}

export function completeTask(tenant, taskId, result = {}) {
  updateTaskStatus(tenant, taskId, 'done', { result });
}

export function failTask(tenant, taskId, error = {}) {
  updateTaskStatus(tenant, taskId, 'failed', { error });
}

// Cleanup périodique des tâches anciennes
setInterval(() => {
  const now = Date.now();
  for (const [tenant, tenantTasks] of activeTasks) {
    for (const [taskId, taskData] of tenantTasks) {
      if (now - taskData.updatedAt > 3600000) { // 1 heure
        tenantTasks.delete(taskId);
      }
    }
    if (tenantTasks.size === 0) {
      activeTasks.delete(tenant);
    }
  }
}, 300000); // 5 minutes

export default router;