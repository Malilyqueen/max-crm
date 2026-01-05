/**
 * FilesystemLayoutManager - Driver Système Officiel MAX
 *
 * Gestion automatique des layouts EspoCRM via manipulation filesystem directe
 *
 * ARCHITECTURE:
 * - MAX Backend → SSH → Docker → Filesystem JSON layouts
 * - Backup automatique avant toute modification
 * - Rebuild + clearCache systématique
 * - Aucune exposition client
 *
 * SÉCURITÉ:
 * - SSH keys dédiées et restreintes
 * - Manipulation limitée aux fichiers layouts/*.json
 * - Validation stricte des inputs (entity, fieldName)
 * - Logs audit de toutes opérations
 *
 * @version 1.0.0
 * @author MAX System
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execPromise = util.promisify(exec);

class FilesystemLayoutManager {
  constructor(config = {}) {
    this.sshHost = config.sshHost || process.env.ESPO_SSH_HOST;
    this.sshUser = config.sshUser || process.env.ESPO_SSH_USER || 'root';
    this.sshKey = config.sshKey || process.env.ESPO_SSH_KEY;
    this.containerName = config.containerName || 'espocrm';
    this.backupDir = config.backupDir || '/tmp/max-layout-backups';

    if (!this.sshHost) {
      throw new Error('ESPO_SSH_HOST required in config or .env');
    }

    console.log(`[FilesystemLayoutManager] Initialized for ${this.sshUser}@${this.sshHost}`);
  }

  /**
   * Execute SSH command with security restrictions
   * @private
   */
  async _execSSH(command, description = 'SSH command') {
    const sshKeyArg = this.sshKey ? `-i ${this.sshKey}` : '';
    // Use single quotes around command to avoid Windows SSH client interpretation
    const escapedCommand = command.replace(/'/g, "'\\''");
    const fullCommand = `ssh ${sshKeyArg} ${this.sshUser}@${this.sshHost} '${escapedCommand}'`;

    console.log(`[FilesystemLayoutManager] ${description}...`);

    try {
      const { stdout, stderr } = await execPromise(fullCommand, {
        timeout: 30000 // 30s timeout
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn(`[FilesystemLayoutManager] Warning: ${stderr}`);
      }

      return stdout.trim();
    } catch (error) {
      console.error(`[FilesystemLayoutManager] Error: ${error.message}`);
      throw new Error(`SSH command failed: ${description} - ${error.message}`);
    }
  }

  /**
   * Execute Docker command in EspoCRM container
   * @private
   */
  async _execDocker(command, description = 'Docker command') {
    const dockerCmd = `docker exec ${this.containerName} ${command}`;
    return this._execSSH(dockerCmd, description);
  }

  /**
   * Validate entity and field names (security)
   * @private
   */
  _validateIdentifier(identifier, type = 'identifier') {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error(`Invalid ${type}: must be non-empty string`);
    }

    // Only alphanumeric and underscore (prevent injection)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid ${type}: "${identifier}" - only alphanumeric and underscore allowed`);
    }

    return identifier;
  }

  /**
   * Backup layout file before modification
   * @private
   */
  async _backupLayout(entity, layoutType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.backupDir}/${entity}-${layoutType}-${timestamp}.json`;

    const customLayoutPath = `/var/www/html/custom/Espo/Custom/Resources/layouts/${entity}/${layoutType}.json`;

    console.log(`[FilesystemLayoutManager] 💾 Backing up ${entity}/${layoutType}...`);

    try {
      // Create backup directory
      await this._execDocker(`mkdir -p ${this.backupDir}`, 'Create backup dir');

      // Copy layout to backup (custom layout only, if exists)
      await this._execDocker(`cp ${customLayoutPath} ${backupPath}`, 'Backup layout');

      console.log(`[FilesystemLayoutManager] ✅ Backup saved: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.warn(`[FilesystemLayoutManager] ⚠️  Backup skipped (custom layout doesn't exist yet): ${error.message}`);
      return null;
    }
  }

  /**
   * Read layout JSON from filesystem
   * @private
   */
  async _readLayout(entity, layoutType) {
    // Try custom layout first
    const customPath = `/var/www/html/custom/Espo/Custom/Resources/layouts/${entity}/${layoutType}.json`;

    // Then try default EspoCRM layout
    const defaultPaths = [
      `/var/www/html/application/Espo/Modules/Crm/Resources/layouts/${entity}/${layoutType}.json`,
      `/var/www/html/application/Espo/Resources/layouts/${entity}/${layoutType}.json`
    ];

    console.log(`[FilesystemLayoutManager] 📖 Reading ${entity}/${layoutType}...`);

    // Try custom layout
    try {
      const layoutJson = await this._execDocker(`cat ${customPath}`, `Read custom ${layoutType} layout`);
      console.log(`[FilesystemLayoutManager] ✅ Found custom layout`);
      return JSON.parse(layoutJson);
    } catch (error) {
      console.log(`[FilesystemLayoutManager] Custom layout not found, trying default...`);
    }

    // Try default layouts
    for (const defaultPath of defaultPaths) {
      try {
        const layoutJson = await this._execDocker(`cat ${defaultPath}`, `Read default ${layoutType} layout`);
        console.log(`[FilesystemLayoutManager] ✅ Found default layout at ${defaultPath}`);
        return JSON.parse(layoutJson);
      } catch (error) {
        // Continue to next path
      }
    }

    // No layout found - return empty structure
    console.log(`[FilesystemLayoutManager] ⚠️ No layout found, using empty structure`);
    return this._getEmptyLayout(layoutType);
  }

  /**
   * Get empty layout structure by type
   * @private
   */
  _getEmptyLayout(layoutType) {
    if (layoutType === 'list' || layoutType === 'listSmall') {
      return [];
    } else if (layoutType === 'detail' || layoutType === 'detailSmall' || layoutType === 'edit') {
      return [
        {
          label: 'Overview',
          rows: []
        }
      ];
    } else {
      return [];
    }
  }

  /**
   * Write layout JSON to filesystem
   * @private
   */
  async _writeLayout(entity, layoutType, layout) {
    // Write to custom layouts directory (not cache)
    const layoutPath = `/var/www/html/custom/Espo/Custom/Resources/layouts/${entity}/${layoutType}.json`;
    const layoutDir = `/var/www/html/custom/Espo/Custom/Resources/layouts/${entity}`;

    console.log(`[FilesystemLayoutManager] ✍️  Writing ${entity}/${layoutType}...`);

    // Create directory if doesn't exist
    await this._execDocker(`mkdir -p ${layoutDir}`, 'Create layout dir');

    // Write JSON to file using temporary file approach (escaping-free)
    const layoutJson = JSON.stringify(layout, null, 2);
    const base64Content = Buffer.from(layoutJson).toString('base64');
    const tmpFile = `/tmp/max-layout-${Date.now()}.json.b64`;

    // Write base64 to temp file, decode, move to final location, fix permissions
    await this._execDocker(
      `sh -c "echo ${base64Content} > ${tmpFile} && base64 -d ${tmpFile} > ${layoutPath} && rm ${tmpFile} && chown www-data:www-data ${layoutPath} && chmod 664 ${layoutPath}"`,
      `Write ${layoutType} layout`
    );

    console.log(`[FilesystemLayoutManager] ✅ Layout written: ${layoutPath}`);
  }

  /**
   * Check if field already exists in layout
   * @private
   */
  _fieldExistsInLayout(layout, fieldName) {
    const layoutJson = JSON.stringify(layout);
    return layoutJson.includes(`"name":"${fieldName}"`) || layoutJson.includes(`"${fieldName}"`);
  }

  /**
   * Add field to layout object (smart positioning)
   * @private
   */
  _addFieldToLayout(layout, fieldName, layoutType) {
    if (layoutType === 'list' || layoutType === 'listSmall') {
      // List layouts are arrays: append to end
      if (!Array.isArray(layout)) layout = [];
      layout.push({ name: fieldName });

    } else if (layoutType === 'detail' || layoutType === 'detailSmall' || layoutType === 'edit') {
      // Detail/Edit layouts are arrays of panels
      if (!Array.isArray(layout)) layout = [];

      if (layout.length === 0) {
        layout.push({
          label: 'Overview',
          rows: []
        });
      }

      const panel = layout[0];
      if (!panel.rows) panel.rows = [];

      if (panel.rows.length === 0) {
        // First row
        panel.rows.push([{ name: fieldName }]);
      } else {
        // Add to last row or create new row if full
        const lastRow = panel.rows[panel.rows.length - 1];

        if (lastRow.length >= 2) {
          // Row full (2 columns), create new row
          panel.rows.push([{ name: fieldName }]);
        } else {
          // Add to existing row
          lastRow.push({ name: fieldName });
        }
      }

    } else {
      // Other layouts: append to root array
      if (!Array.isArray(layout)) layout = [];
      layout.push({ name: fieldName });
    }

    return layout;
  }

  /**
   * Rebuild EspoCRM + clear cache
   * @private
   */
  async _rebuild() {
    console.log('[FilesystemLayoutManager] 🔄 Rebuilding EspoCRM...');

    try {
      // Clear cache avec logging détaillé
      const clearCacheResult = await this._execDockerDetailed('php command.php clear-cache');
      console.log('[FilesystemLayoutManager] Clear cache result:', {
        exitCode: clearCacheResult.exitCode,
        stdout: clearCacheResult.stdout,
        stderr: clearCacheResult.stderr
      });

      // Rebuild avec logging détaillé
      const rebuildResult = await this._execDockerDetailed('php command.php rebuild');
      console.log('[FilesystemLayoutManager] Rebuild result:', {
        exitCode: rebuildResult.exitCode,
        stdout: rebuildResult.stdout,
        stderr: rebuildResult.stderr
      });

      console.log('[FilesystemLayoutManager] ✅ Rebuild complete');

      return {
        clearCache: clearCacheResult,
        rebuild: rebuildResult
      };

    } catch (error) {
      console.error('[FilesystemLayoutManager] ❌ Rebuild failed:', error);
      throw error;
    }
  }

  /**
   * Execute Docker command with detailed output (exitCode, stdout, stderr)
   * @private
   */
  async _execDockerDetailed(command, description = 'Docker command') {
    const dockerCmd = `docker exec ${this.containerName} ${command}`;
    const sshKeyArg = this.sshKey ? `-i ${this.sshKey}` : '';
    // Use single quotes to avoid Windows SSH client interpretation
    const escapedDockerCmd = dockerCmd.replace(/'/g, "'\\''");
    const fullCommand = `ssh ${sshKeyArg} ${this.sshUser}@${this.sshHost} '${escapedDockerCmd}'`;

    console.log(`[FilesystemLayoutManager] ${description}...`);

    try {
      const { stdout, stderr } = await execPromise(fullCommand, {
        timeout: 60000 // 60s timeout pour rebuild
      });

      return {
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };

    } catch (error) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout ? error.stdout.trim() : '',
        stderr: error.stderr ? error.stderr.trim() : error.message
      };
    }
  }

  /**
   * PUBLIC API: Add field to multiple layouts
   *
   * @param {string} entity - Entity name (e.g., "Lead")
   * @param {string} fieldName - Field name (e.g., "secteurActivite")
   * @param {string[]} layoutTypes - Layout types (e.g., ["detail", "edit", "list"])
   * @returns {Promise<object>} Result summary
   */
  async addFieldToLayouts(entity, fieldName, layoutTypes = ['detail', 'edit', 'list']) {
    // Validate inputs (security)
    entity = this._validateIdentifier(entity, 'entity');
    fieldName = this._validateIdentifier(fieldName, 'fieldName');

    console.log(`\n[FilesystemLayoutManager] 🚀 Adding field "${fieldName}" to ${entity} layouts: ${layoutTypes.join(', ')}`);

    const results = [];

    for (const layoutType of layoutTypes) {
      try {
        // 1. Backup layout
        const backupPath = await this._backupLayout(entity, layoutType);

        // 2. Read current layout
        const layout = await this._readLayout(entity, layoutType);

        // 3. Check if field already exists
        if (this._fieldExistsInLayout(layout, fieldName)) {
          console.log(`[FilesystemLayoutManager] ⏭  ${layoutType}: field already exists, skipped`);
          results.push({
            layoutType,
            status: 'skipped',
            reason: 'field already exists',
            backupPath
          });
          continue;
        }

        // 4. Add field to layout
        const updatedLayout = this._addFieldToLayout(layout, fieldName, layoutType);

        // 5. Write back to filesystem
        await this._writeLayout(entity, layoutType, updatedLayout);

        console.log(`[FilesystemLayoutManager] ✅ ${layoutType}: field added`);

        results.push({
          layoutType,
          status: 'added',
          backupPath
        });

      } catch (error) {
        console.error(`[FilesystemLayoutManager] ❌ ${layoutType}: ${error.message}`);
        results.push({
          layoutType,
          status: 'error',
          error: error.message
        });
      }
    }

    // 6. Rebuild EspoCRM (systématique)
    await this._rebuild();

    const summary = {
      success: true,
      entity,
      fieldName,
      layoutsModified: results.filter(r => r.status === 'added').length,
      layoutsSkipped: results.filter(r => r.status === 'skipped').length,
      layoutsErrors: results.filter(r => r.status === 'error').length,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`\n[FilesystemLayoutManager] 📊 Summary:
  ✅ Modified: ${summary.layoutsModified}
  ⏭  Skipped: ${summary.layoutsSkipped}
  ❌ Errors: ${summary.layoutsErrors}
`);

    return summary;
  }

  /**
   * PUBLIC API: Restore layout from backup
   *
   * @param {string} backupPath - Path to backup file
   * @param {string} entity - Entity name
   * @param {string} layoutType - Layout type
   */
  async restoreLayout(backupPath, entity, layoutType) {
    entity = this._validateIdentifier(entity, 'entity');

    console.log(`[FilesystemLayoutManager] 🔙 Restoring ${entity}/${layoutType} from ${backupPath}...`);

    const layoutPath = `/var/www/html/custom/Espo/Custom/Resources/layouts/${entity}/${layoutType}.json`;

    await this._execDocker(`cp ${backupPath} ${layoutPath}`, 'Restore layout');
    await this._rebuild();

    console.log('[FilesystemLayoutManager] ✅ Layout restored');
  }

  /**
   * PUBLIC API: List available backups
   */
  async listBackups() {
    const backups = await this._execDocker(`ls -lah ${this.backupDir}`, 'List backups');
    return backups;
  }
}

module.exports = FilesystemLayoutManager;
