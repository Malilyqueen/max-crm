/**
 * espoLayoutManager.js
 *
 * MAX backend wrapper pour ajouter des champs aux layouts EspoCRM
 * Utilise le script PHP add-field-to-layouts.php via docker exec
 *
 * Architecture:
 * MAX Backend → SSH → Docker → EspoCRM Container → PHP Script → LayoutManager API
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Add a field to EspoCRM layouts
 *
 * @param {string} entity - Entity name (e.g., 'Lead')
 * @param {string} fieldName - Field name to add
 * @param {string[]} layoutTypes - Layout types (default: ['detail', 'detailSmall', 'list'])
 * @returns {Promise<Object>} Result with success status and details
 */
async function addFieldToLayouts(entity, fieldName, layoutTypes = ['detail', 'detailSmall', 'list']) {
    console.log(`[MAX LayoutManager] Adding ${fieldName} to ${entity} layouts: ${layoutTypes.join(', ')}`);

    try {
        // Build SSH command to execute PHP script in EspoCRM container
        const layoutTypesStr = layoutTypes.join(',');
        const sshCommand = `ssh root@51.159.170.20 "docker exec espocrm bash -c 'cd /var/www/html && php add-field-to-layouts.php ${entity} ${fieldName} ${layoutTypesStr}'"`;

        const { stdout, stderr } = await execPromise(sshCommand, {
            timeout: 60000, // 60 seconds timeout
            maxBuffer: 1024 * 1024 // 1MB buffer
        });

        if (stderr && stderr.trim().length > 0) {
            console.warn(`[MAX LayoutManager] Warning: ${stderr}`);
        }

        // Parse JSON output from PHP script
        const result = JSON.parse(stdout);

        if (result.success) {
            console.log(`[MAX LayoutManager] ✅ Success: ${result.layoutsModified} layouts modified`);
            return result;
        } else {
            console.error(`[MAX LayoutManager] ❌ Error: ${result.error}`);
            return result;
        }

    } catch (error) {
        console.error(`[MAX LayoutManager] ❌ Exception:`, error.message);

        // Try to parse error output as JSON
        if (error.stdout) {
            try {
                const errorResult = JSON.parse(error.stdout);
                return errorResult;
            } catch (parseError) {
                // Not JSON, return raw error
            }
        }

        return {
            success: false,
            error: error.message,
            stderr: error.stderr
        };
    }
}

/**
 * Complete workflow: Create field + Add to layouts
 *
 * Workflow:
 * 1. Create field via /Admin/fieldManager API
 * 2. Add field to layouts via PHP script
 * 3. Rebuild EspoCRM
 *
 * @param {Object} fieldDef - Field definition
 * @param {string} fieldDef.entity - Entity name
 * @param {string} fieldDef.fieldName - Field name
 * @param {string} fieldDef.type - Field type (e.g., 'enum', 'varchar')
 * @param {Object} fieldDef.options - Field options (type-specific)
 * @param {string[]} fieldDef.layoutTypes - Layout types to add to
 * @returns {Promise<Object>} Combined result
 */
async function createFieldWithLayouts(fieldDef) {
    const { entity, fieldName, type, options = {}, layoutTypes = ['detail', 'detailSmall', 'list'] } = fieldDef;

    console.log(`[MAX LayoutManager] Complete workflow: Create field ${fieldName} and add to layouts`);

    try {
        // Step 1: Create the field via EspoCRM API
        const { espoAdminFetch } = await import('./espoClient.js');

        const fieldData = {
            type,
            ...options
        };

        console.log(`[MAX LayoutManager] Step 1/3: Creating field ${fieldName} via API...`);
        await espoAdminFetch(`/Admin/fieldManager/${entity}/${fieldName}`, {
            method: 'PUT',
            body: JSON.stringify(fieldData)
        });
        console.log(`[MAX LayoutManager] ✅ Field ${fieldName} created`);

        // Step 2: Add field to layouts
        console.log(`[MAX LayoutManager] Step 2/3: Adding field to layouts...`);
        const layoutResult = await addFieldToLayouts(entity, fieldName, layoutTypes);

        // Step 3: Rebuild EspoCRM
        console.log(`[MAX LayoutManager] Step 3/3: Rebuilding EspoCRM...`);
        await espoAdminFetch('/Admin/rebuild', {
            method: 'POST'
        });
        console.log(`[MAX LayoutManager] ✅ Rebuild complete`);

        return {
            success: true,
            field: { entity, fieldName, type },
            layouts: layoutResult,
            message: `✅ Field ${fieldName} created and added to ${layoutResult.layoutsModified} layouts`
        };

    } catch (error) {
        console.error(`[MAX LayoutManager] ❌ Workflow failed:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

export {
    addFieldToLayouts,
    createFieldWithLayouts
};
