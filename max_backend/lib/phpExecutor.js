/**
 * phpExecutor.js
 * Executes PHP commands in XAMPP environment for M.A.X.
 * Allows full local administrator access to EspoCRM via PHP CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// XAMPP PHP executable path
const PHP_PATH = process.env.PHP_PATH || 'D:\\Macrea\\xampp\\php\\php.exe';

// EspoCRM installation directory
const ESPOCRM_DIR = process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm';

/**
 * Run a PHP command in the EspoCRM directory context
 * @param {string} command - PHP command to execute (e.g., "command.php rebuild")
 * @param {object} options - Execution options
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function runPHP(command, options = {}) {
  const {
    cwd = ESPOCRM_DIR,
    timeout = 120000, // 2 minutes default timeout
    env = process.env
  } = options;

  const fullCommand = `"${PHP_PATH}" ${command}`;

  console.log(`[phpExecutor] Executing: ${fullCommand}`);
  console.log(`[phpExecutor] Working directory: ${cwd}`);

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd,
      timeout,
      env,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log(`[phpExecutor] Success: ${stdout.substring(0, 200)}...`);
    if (stderr) {
      console.warn(`[phpExecutor] Warnings: ${stderr}`);
    }

    return { stdout, stderr, success: true };
  } catch (error) {
    console.error(`[phpExecutor] Error: ${error.message}`);
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false,
      error: error.message
    };
  }
}

/**
 * Execute EspoCRM rebuild command
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function espoRebuild() {
  console.log('[phpExecutor] Starting EspoCRM rebuild...');

  const result = await runPHP('command.php rebuild', {
    timeout: 180000 // 3 minutes for rebuild
  });

  return {
    success: result.success,
    output: result.stdout + (result.stderr ? `\n\nWarnings:\n${result.stderr}` : ''),
    error: result.error
  };
}

/**
 * Execute EspoCRM clear cache command
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function espoClearCache() {
  console.log('[phpExecutor] Clearing EspoCRM cache...');

  const result = await runPHP('command.php clear-cache', {
    timeout: 60000 // 1 minute for cache clear
  });

  return {
    success: result.success,
    output: result.stdout + (result.stderr ? `\n\nWarnings:\n${result.stderr}` : ''),
    error: result.error
  };
}

/**
 * Execute custom PHP script in EspoCRM directory
 * @param {string} scriptPath - Path to PHP script relative to EspoCRM directory
 * @param {array} args - Command line arguments
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function runCustomScript(scriptPath, args = []) {
  console.log(`[phpExecutor] Running custom script: ${scriptPath}`);

  const argsString = args.map(arg => `"${arg}"`).join(' ');
  const command = `${scriptPath} ${argsString}`;

  const result = await runPHP(command);

  return {
    success: result.success,
    output: result.stdout + (result.stderr ? `\n\nWarnings:\n${result.stderr}` : ''),
    error: result.error
  };
}

/**
 * Test if PHP is available and accessible
 * @returns {Promise<{available: boolean, version: string}>}
 */
export async function testPHP() {
  try {
    const result = await runPHP('--version', {
      cwd: process.cwd(),
      timeout: 5000
    });

    if (result.success) {
      const version = result.stdout.split('\n')[0];
      console.log(`[phpExecutor] PHP available: ${version}`);
      return { available: true, version };
    } else {
      console.error('[phpExecutor] PHP not available');
      return { available: false, version: null };
    }
  } catch (error) {
    console.error(`[phpExecutor] PHP test failed: ${error.message}`);
    return { available: false, version: null, error: error.message };
  }
}

export default {
  runPHP,
  espoRebuild,
  espoClearCache,
  runCustomScript,
  testPHP
};
