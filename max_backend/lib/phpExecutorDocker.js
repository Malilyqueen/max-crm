/**
 * phpExecutorDocker.js
 * Executes PHP commands in Docker container environment for M.A.X.
 * Production-ready: SSH + docker exec (NO Windows dependencies)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// SSH configuration for production
const SSH_HOST = process.env.ESPO_SSH_HOST || '51.159.170.20';
const SSH_USER = process.env.ESPO_SSH_USER || 'root';
const CONTAINER_NAME = process.env.ESPO_CONTAINER_NAME || 'espocrm';

/**
 * Execute SSH command with Docker exec
 * Si SSH_HOST=localhost, exécute directement sans SSH
 * @private
 */
async function execSSH(command, description = 'SSH command') {
  // 🔧 FIX: Si localhost, exécuter directement (même machine)
  const isLocalhost = SSH_HOST === 'localhost' || SSH_HOST === '127.0.0.1';
  const fullCommand = isLocalhost
    ? command // Direct execution on same machine
    : `ssh ${SSH_USER}@${SSH_HOST} "${command}"`; // SSH to remote

  console.log(`[phpExecutorDocker] ${description}...`);
  console.log(`[phpExecutorDocker] Mode: ${isLocalhost ? 'LOCAL (same host)' : 'SSH (remote)'}`);
  console.log(`[phpExecutorDocker] Command: ${fullCommand}`);

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout: 120000, // 2 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    if (stderr && !stderr.includes('warning')) {
      console.warn(`[phpExecutorDocker] Warnings: ${stderr}`);
    }

    console.log(`[phpExecutorDocker] ✅ ${description} succeeded`);
    return { stdout: stdout.trim(), stderr, success: true };
  } catch (error) {
    console.error(`[phpExecutorDocker] ❌ ${description} failed:`, error.message);
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false,
      error: error.message
    };
  }
}

/**
 * Execute Docker command in EspoCRM container
 * @private
 */
async function execDocker(command, description = 'Docker command') {
  const dockerCmd = `docker exec ${CONTAINER_NAME} ${command}`;
  return execSSH(dockerCmd, description);
}

/**
 * Run a PHP command in the EspoCRM container
 * @param {string} command - PHP command to execute (e.g., "command.php rebuild")
 * @param {object} options - Execution options
 * @returns {Promise<{stdout: string, stderr: string, success: boolean}>}
 */
export async function runPHP(command, options = {}) {
  const {
    description = 'PHP command',
    timeout = 120000
  } = options;

  console.log(`[phpExecutorDocker] Executing PHP: ${command}`);

  const phpCommand = `php ${command}`;
  return execDocker(phpCommand, description);
}

/**
 * Clear EspoCRM cache
 * @returns {Promise<object>}
 */
export async function espoClearCache() {
  console.log('[phpExecutorDocker] 🧹 Clearing EspoCRM cache...');

  const result = await runPHP('command.php clear-cache', {
    description: 'Clear cache'
  });

  if (result.success) {
    console.log('[phpExecutorDocker] ✅ Cache cleared successfully');
    return {
      success: true,
      output: result.stdout,
      message: 'Cache cleared'
    };
  } else {
    console.error('[phpExecutorDocker] ❌ Clear cache failed:', result.error);
    return {
      success: false,
      output: result.stderr,
      error: result.error,
      message: 'Failed to clear cache'
    };
  }
}

/**
 * Rebuild EspoCRM (metadata, layouts, etc.)
 * @returns {Promise<object>}
 */
export async function espoRebuild() {
  console.log('[phpExecutorDocker] 🔨 Rebuilding EspoCRM...');

  const result = await runPHP('command.php rebuild', {
    description: 'Rebuild'
  });

  if (result.success) {
    console.log('[phpExecutorDocker] ✅ Rebuild completed successfully');
    return {
      success: true,
      output: result.stdout,
      message: 'Rebuild completed'
    };
  } else {
    console.error('[phpExecutorDocker] ❌ Rebuild failed:', result.error);
    return {
      success: false,
      output: result.stderr,
      error: result.error,
      message: 'Failed to rebuild'
    };
  }
}

/**
 * Run any EspoCRM command.php command
 * @param {string} commandName - Command name (e.g., "rebuild", "clear-cache")
 * @param {Array<string>} args - Additional arguments
 * @returns {Promise<object>}
 */
export async function espoCommand(commandName, args = []) {
  const argsString = args.join(' ');
  const command = `command.php ${commandName} ${argsString}`.trim();

  console.log(`[phpExecutorDocker] Running EspoCRM command: ${commandName}`);

  const result = await runPHP(command, {
    description: `Command: ${commandName}`
  });

  return {
    success: result.success,
    output: result.stdout,
    error: result.error,
    message: result.success ? `Command ${commandName} completed` : `Command ${commandName} failed`
  };
}
