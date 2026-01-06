/**
 * phpExecutorDockerLocal.js
 * Executes PHP commands in Docker container environment for M.A.X.
 * PRODUCTION MODE: docker exec LOCAL (pas de SSH, déjà dans Docker)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Container name (depuis docker-compose.yml)
const CONTAINER_NAME = process.env.ESPO_CONTAINER_NAME || 'espocrm';

/**
 * Execute Docker command LOCALEMENT (depuis container max-backend)
 * @private
 */
async function execDocker(command, description = 'Docker command') {
  const fullCommand = `docker exec ${CONTAINER_NAME} ${command}`;

  console.log(`[phpExecutorDockerLocal] ${description}...`);
  console.log(`[phpExecutorDockerLocal] Command: ${fullCommand}`);

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout: 120000, // 2 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    if (stderr && !stderr.includes('warning')) {
      console.warn(`[phpExecutorDockerLocal] Warnings: ${stderr}`);
    }

    console.log(`[phpExecutorDockerLocal] ✅ ${description} succeeded`);
    return { stdout: stdout.trim(), stderr, success: true };
  } catch (error) {
    console.error(`[phpExecutorDockerLocal] ❌ ${description} failed:`, error.message);
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false,
      error: error.message
    };
  }
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

  console.log(`[phpExecutorDockerLocal] Executing PHP: ${command}`);

  const phpCommand = `php ${command}`;
  return execDocker(phpCommand, description);
}

/**
 * Clear EspoCRM cache
 * @returns {Promise<object>}
 */
export async function espoClearCache() {
  console.log('[phpExecutorDockerLocal] 🧹 Clearing EspoCRM cache...');

  const result = await runPHP('command.php clear-cache', {
    description: 'Clear cache'
  });

  if (result.success) {
    console.log('[phpExecutorDockerLocal] ✅ Cache cleared successfully');
    return {
      success: true,
      output: result.stdout,
      message: 'Cache cleared'
    };
  } else {
    console.error('[phpExecutorDockerLocal] ❌ Clear cache failed:', result.error);
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
  console.log('[phpExecutorDockerLocal] 🔨 Rebuilding EspoCRM...');

  const result = await runPHP('command.php rebuild', {
    description: 'Rebuild'
  });

  if (result.success) {
    console.log('[phpExecutorDockerLocal] ✅ Rebuild completed successfully');
    return {
      success: true,
      output: result.stdout,
      message: 'Rebuild completed'
    };
  } else {
    console.error('[phpExecutorDockerLocal] ❌ Rebuild failed:', result.error);
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

  console.log(`[phpExecutorDockerLocal] Running EspoCRM command: ${commandName}`);

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
