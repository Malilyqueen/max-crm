/**
 * layoutManager.js
 * Direct manipulation of EspoCRM layout JSON files
 * Allows M.A.X. to modify layouts without using the UI
 */

import fs from 'fs/promises';
import path from 'path';

// EspoCRM custom layouts directory
const LAYOUTS_DIR = process.env.LAYOUTS_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\metadata\\clientDefs';
const LAYOUTS_LEGACY_DIR = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts';

/**
 * Read layout JSON file
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} layoutType - Layout type (e.g., "detail", "list", "detailSmall")
 * @returns {Promise<object>} - Parsed JSON layout
 */
export async function readLayout(entity, layoutType) {
  const layoutPath = path.join(LAYOUTS_LEGACY_DIR, entity, `${layoutType}.json`);

  console.log(`[layoutManager] Reading layout: ${layoutPath}`);

  try {
    const content = await fs.readFile(layoutPath, 'utf-8');
    const layout = JSON.parse(content);
    console.log(`[layoutManager] Successfully read ${entity} ${layoutType} layout`);
    return layout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[layoutManager] Layout file not found, returning default structure`);
      return getDefaultLayout(layoutType);
    }
    throw new Error(`Failed to read layout: ${error.message}`);
  }
}

/**
 * Write layout JSON file
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} layoutType - Layout type (e.g., "detail", "list")
 * @param {object} layoutData - Layout data to write
 * @returns {Promise<void>}
 */
export async function writeLayout(entity, layoutType, layoutData) {
  const layoutDir = path.join(LAYOUTS_LEGACY_DIR, entity);
  const layoutPath = path.join(layoutDir, `${layoutType}.json`);

  console.log(`[layoutManager] Writing layout: ${layoutPath}`);

  try {
    // Ensure directory exists
    await fs.mkdir(layoutDir, { recursive: true });

    // Write JSON with pretty formatting
    const jsonContent = JSON.stringify(layoutData, null, 2);
    await fs.writeFile(layoutPath, jsonContent, 'utf-8');

    console.log(`[layoutManager] Successfully wrote ${entity} ${layoutType} layout`);
  } catch (error) {
    throw new Error(`Failed to write layout: ${error.message}`);
  }
}

/**
 * Add field to detail layout
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} fieldName - Field name to add
 * @param {object} options - Field options (fullWidth, etc.)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addFieldToDetailLayout(entity, fieldName, options = {}) {
  const { fullWidth = true, panelIndex = 0 } = options;

  try {
    const layout = await readLayout(entity, 'detail');

    // Ensure panels array exists
    if (!Array.isArray(layout)) {
      throw new Error('Invalid layout structure: expected array of panels');
    }

    // Ensure the target panel exists
    if (!layout[panelIndex]) {
      layout[panelIndex] = { rows: [] };
    }

    // Ensure rows array exists
    if (!layout[panelIndex].rows) {
      layout[panelIndex].rows = [];
    }

    // Check if field already exists
    const fieldExists = layout[panelIndex].rows.some(row => {
      return row.some(cell => cell && cell.name === fieldName);
    });

    if (fieldExists) {
      console.log(`[layoutManager] Field ${fieldName} already exists in detail layout`);
      return { success: true, message: 'Field already exists', alreadyExists: true };
    }

    // Add field as new row
    const newRow = fullWidth
      ? [{ name: fieldName, fullWidth: true }, false]
      : [{ name: fieldName }];

    layout[panelIndex].rows.push(newRow);

    // Write back
    await writeLayout(entity, 'detail', layout);

    console.log(`[layoutManager] Added ${fieldName} to detail layout`);
    return { success: true, message: 'Field added to detail layout' };
  } catch (error) {
    console.error(`[layoutManager] Error adding field to detail layout: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Add field to list layout
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} fieldName - Field name to add
 * @param {object} options - Field options (width, link, etc.)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addFieldToListLayout(entity, fieldName, options = {}) {
  const { width = 10, link = false } = options;

  try {
    const layout = await readLayout(entity, 'list');

    // Ensure layout is array
    if (!Array.isArray(layout)) {
      throw new Error('Invalid layout structure: expected array');
    }

    // Check if field already exists
    const fieldExists = layout.some(field => field.name === fieldName);

    if (fieldExists) {
      console.log(`[layoutManager] Field ${fieldName} already exists in list layout`);
      return { success: true, message: 'Field already exists', alreadyExists: true };
    }

    // Add field
    const newField = { name: fieldName, width };
    if (link) {
      newField.link = true;
    }

    layout.push(newField);

    // Write back
    await writeLayout(entity, 'list', layout);

    console.log(`[layoutManager] Added ${fieldName} to list layout`);
    return { success: true, message: 'Field added to list layout' };
  } catch (error) {
    console.error(`[layoutManager] Error adding field to list layout: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Add field to detailSmall layout
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} fieldName - Field name to add
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addFieldToDetailSmallLayout(entity, fieldName) {
  try {
    const layout = await readLayout(entity, 'detailSmall');

    // Ensure panels array exists
    if (!Array.isArray(layout)) {
      throw new Error('Invalid layout structure: expected array of panels');
    }

    // Ensure first panel exists
    if (!layout[0]) {
      layout[0] = { rows: [] };
    }

    // Ensure rows array exists
    if (!layout[0].rows) {
      layout[0].rows = [];
    }

    // Check if field already exists
    const fieldExists = layout[0].rows.some(row => {
      return row.some(cell => cell && cell.name === fieldName);
    });

    if (fieldExists) {
      console.log(`[layoutManager] Field ${fieldName} already exists in detailSmall layout`);
      return { success: true, message: 'Field already exists', alreadyExists: true };
    }

    // Add field
    layout[0].rows.push([{ name: fieldName, fullWidth: true }, false]);

    // Write back
    await writeLayout(entity, 'detailSmall', layout);

    console.log(`[layoutManager] Added ${fieldName} to detailSmall layout`);
    return { success: true, message: 'Field added to detailSmall layout' };
  } catch (error) {
    console.error(`[layoutManager] Error adding field to detailSmall layout: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Add field to all layouts (detail, detailSmall, list)
 * @param {string} entity - Entity name (e.g., "Lead")
 * @param {string} fieldName - Field name to add
 * @param {object} options - Field options
 * @returns {Promise<{success: boolean, results: object}>}
 */
export async function addFieldToAllLayouts(entity, fieldName, options = {}) {
  console.log(`[layoutManager] Adding ${fieldName} to all layouts for ${entity}`);

  const results = {
    detail: await addFieldToDetailLayout(entity, fieldName, options),
    list: await addFieldToListLayout(entity, fieldName, { width: options.listWidth || 10 }),
    detailSmall: await addFieldToDetailSmallLayout(entity, fieldName)
  };

  const allSuccess = results.detail.success && results.list.success && results.detailSmall.success;

  return {
    success: allSuccess,
    results
  };
}

/**
 * Get default layout structure
 * @param {string} layoutType - Layout type
 * @returns {object} - Default layout structure
 */
function getDefaultLayout(layoutType) {
  switch (layoutType) {
    case 'detail':
    case 'detailSmall':
      return [
        {
          rows: []
        }
      ];
    case 'list':
      return [];
    default:
      return [];
  }
}

/**
 * Backup layout file before modification
 * @param {string} entity - Entity name
 * @param {string} layoutType - Layout type
 * @returns {Promise<string>} - Backup file path
 */
export async function backupLayout(entity, layoutType) {
  const layoutPath = path.join(LAYOUTS_LEGACY_DIR, entity, `${layoutType}.json`);
  const backupPath = `${layoutPath}.backup_${Date.now()}`;

  try {
    await fs.copyFile(layoutPath, backupPath);
    console.log(`[layoutManager] Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.warn(`[layoutManager] Could not create backup: ${error.message}`);
    return null;
  }
}

export default {
  readLayout,
  writeLayout,
  addFieldToDetailLayout,
  addFieldToListLayout,
  addFieldToDetailSmallLayout,
  addFieldToAllLayouts,
  backupLayout
};
