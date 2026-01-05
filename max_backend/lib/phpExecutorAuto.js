/**
 * phpExecutorAuto.js
 * Auto-détection: SSH (si hors Docker) ou Local (si dans Docker)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let detectedMode = null;
let containerName = null;

/**
 * Détecte si on est dans Docker ou pas
 * @returns {Promise<'local'|'ssh'>}
 */
async function detectMode() {
  if (detectedMode) return detectedMode;

  // Récupérer container name depuis env
  containerName = process.env.ESPO_CONTAINER_NAME || 'espocrm';

  // 🔧 FIX: Toujours utiliser SSH en production (même si on est dans Docker)
  // Car le backend max-backend tourne dans Docker et ne peut pas faire "docker exec" depuis l'intérieur
  const sshHost = process.env.ESPO_SSH_HOST;

  if (sshHost) {
    // SSH configuré → utiliser SSH (production ou dev avec SSH)
    detectedMode = 'ssh';
    const sshUser = process.env.ESPO_SSH_USER || 'root';
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  PHP EXECUTOR MODE: SSH (Remote)                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`[phpExecutorAuto] ✅ Mode: SSH (production/remote)`);
    console.log(`[phpExecutorAuto] 🌐 SSH target: ${sshUser}@${sshHost}`);
    console.log(`[phpExecutorAuto] 🐳 Target container: ${containerName}`);
    console.log(`[phpExecutorAuto] 📋 Command pattern: ssh ${sshUser}@${sshHost} "docker exec ${containerName} php command.php <cmd>"`);
  } else {
    // Pas de SSH configuré → local uniquement (dev Windows sans Docker)
    detectedMode = 'local';
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  PHP EXECUTOR MODE: LOCAL (Direct)                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`[phpExecutorAuto] ✅ Mode: LOCAL (dev local sans Docker)`);
    console.log(`[phpExecutorAuto] 🐳 Target container: ${containerName}`);
    console.log(`[phpExecutorAuto] 📋 Command pattern: docker exec ${containerName} php command.php <cmd>`);
  }

  return detectedMode;
}

/**
 * Importe le bon executor selon le mode
 */
async function getExecutor() {
  const mode = await detectMode();

  if (mode === 'local') {
    const { runPHP, espoClearCache, espoRebuild, espoCommand } = await import('./phpExecutorDockerLocal.js');
    return { runPHP, espoClearCache, espoRebuild, espoCommand };
  } else {
    const { runPHP, espoClearCache, espoRebuild, espoCommand } = await import('./phpExecutorDocker.js');
    return { runPHP, espoClearCache, espoRebuild, espoCommand };
  }
}

export async function runPHP(command, options) {
  const mode = await detectMode();
  console.log(`[phpExecutorAuto] 🔧 Executing PHP command (mode=${mode}, container=${containerName}): ${command}`);
  const executor = await getExecutor();
  return executor.runPHP(command, options);
}

export async function espoClearCache() {
  const mode = await detectMode();
  console.log(`[phpExecutorAuto] 🧹 Clearing cache (mode=${mode}, container=${containerName})`);
  const executor = await getExecutor();
  return executor.espoClearCache();
}

export async function espoRebuild() {
  const mode = await detectMode();
  console.log(`[phpExecutorAuto] 🔨 Rebuilding EspoCRM (mode=${mode}, container=${containerName})`);
  const executor = await getExecutor();
  return executor.espoRebuild();
}

export async function espoCommand(commandName, args) {
  const mode = await detectMode();
  console.log(`[phpExecutorAuto] 📋 Running command: ${commandName} (mode=${mode}, container=${containerName})`);
  const executor = await getExecutor();
  return executor.espoCommand(commandName, args);
}
