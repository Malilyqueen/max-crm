/**
 * layoutManager.js v2
 * Direct manipulation of EspoCRM layout JSON files with default layout protection
 * Ensures default fields are preserved when adding custom fields
 */

import fs from 'fs/promises';
import path from 'path';
import { getDefaultLayout as getDefaultLayoutTemplate, isLayoutValid, mergeCustomFields } from './defaultLayouts.js';

// EspoCRM custom layouts directory
// Use environment variable for production (mounted volume) or fallback to local dev path
const LAYOUTS_LEGACY_DIR = process.env.ESPO_LAYOUTS_PATH || 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts';

/**
 * Validate fieldName parameter
 * @param {string} fieldName - The field name to validate
 * @throws {Error} If fieldName is invalid
 */
function validateFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string' || fieldName.trim() === '') {
    throw new Error(`Invalid fieldName: "${fieldName}". Field name must be a non-empty string.`);
  }
  if (fieldName === 'undefined' || fieldName === 'null') {
    throw new Error(`Invalid fieldName: "${fieldName}". Field name cannot be "undefined" or "null".`);
  }
}

/**
 * Read layout JSON file
 * If corrupted or empty, restore from default template
 */
export async function readLayout(entity, layoutType) {
  const layoutPath = path.join(LAYOUTS_LEGACY_DIR, entity, `${layoutType}.json`);

  console.log(`[layoutManager] Reading layout: ${layoutPath}`);

  try {
    const content = await fs.readFile(layoutPath, 'utf-8');
    const layout = JSON.parse(content);

    // Check if layout is valid
    if (!isLayoutValid(layout, entity, layoutType)) {
      console.warn(`[layoutManager] Layout ${entity}/${layoutType} appears corrupted or empty, restoring defaults`);
      const defaultLayout = getDefaultLayoutTemplate(entity, layoutType);
      if (defaultLayout) {
        console.log(`[layoutManager] Restoring default layout for ${entity}/${layoutType}`);
        return defaultLayout;
      }
    }

    console.log(`[layoutManager] Successfully read ${entity} ${layoutType} layout`);
    return layout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[layoutManager] Layout file not found, using default template`);
      const defaultLayout = getDefaultLayoutTemplate(entity, layoutType);
      if (defaultLayout) {
        return defaultLayout;
      }
      return getDefaultLayout(layoutType);
    }
    throw new Error(`Failed to read layout: ${error.message}`);
  }
}

/**
 * Write layout JSON file
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
 * Add field to detail layout - PRESERVES DEFAULT FIELDS
 */
export async function addFieldToDetailLayout(entity, fieldName, options = {}) {
  const { fullWidth = true, panelIndex = 0 } = options;

  try {
    // Validate fieldName first
    validateFieldName(fieldName);

    let layout = await readLayout(entity, 'detail');

    // Ensure panels array exists
    if (!Array.isArray(layout)) {
      console.warn(`[layoutManager] Invalid layout structure, restoring defaults`);
      layout = getDefaultLayoutTemplate(entity, 'detail') || [{ rows: [] }];
    }

    // Ensure the target panel exists
    if (!layout[panelIndex]) {
      console.warn(`[layoutManager] Panel ${panelIndex} missing, restoring defaults`);
      const defaultLayout = getDefaultLayoutTemplate(entity, 'detail');
      if (defaultLayout && defaultLayout[panelIndex]) {
        layout[panelIndex] = defaultLayout[panelIndex];
      } else {
        layout[panelIndex] = { rows: [] };
      }
    }

    // Ensure rows array exists
    if (!layout[panelIndex].rows) {
      layout[panelIndex].rows = [];
    }

    // Check if field already exists in ALL panels
    const fieldExists = layout.some(panel =>
      panel.rows && panel.rows.some(row =>
        row.some(cell => cell && cell.name === fieldName)
      )
    );

    if (fieldExists) {
      console.log(`[layoutManager] Field ${fieldName} already exists in detail layout`);
      return { success: true, message: 'Field already exists', alreadyExists: true };
    }

    // Add field as new row
    const newRow = fullWidth
      ? [{ name: fieldName, fullWidth: true }, false]
      : [{ name: fieldName }, false];

    layout[panelIndex].rows.push(newRow);

    // Write back
    await writeLayout(entity, 'detail', layout);

    console.log(`[layoutManager] Added ${fieldName} to detail layout (panel ${panelIndex})`);
    return { success: true, message: 'Field added to detail layout' };
  } catch (error) {
    console.error(`[layoutManager] Error adding field to detail layout: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Add field to list layout - PRESERVES DEFAULT FIELDS
 */
export async function addFieldToListLayout(entity, fieldName, options = {}) {
  const { width = 15, link = false } = options;

  try {
    // Validate fieldName first
    validateFieldName(fieldName);

    let layout = await readLayout(entity, 'list');

    // Ensure layout is array
    if (!Array.isArray(layout)) {
      console.warn(`[layoutManager] Invalid layout structure, restoring defaults`);
      layout = getDefaultLayoutTemplate(entity, 'list') || [];
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
 * Add field to detailSmall layout - PRESERVES DEFAULT FIELDS
 */
export async function addFieldToDetailSmallLayout(entity, fieldName) {
  try {
    // Validate fieldName first
    validateFieldName(fieldName);

    let layout = await readLayout(entity, 'detailSmall');

    // Ensure panels array exists
    if (!Array.isArray(layout)) {
      console.warn(`[layoutManager] Invalid layout structure, restoring defaults`);
      layout = getDefaultLayoutTemplate(entity, 'detailSmall') || [{ rows: [] }];
    }

    // Ensure first panel exists
    if (!layout[0]) {
      const defaultLayout = getDefaultLayoutTemplate(entity, 'detailSmall');
      if (defaultLayout && defaultLayout[0]) {
        layout[0] = defaultLayout[0];
      } else {
        layout[0] = { rows: [] };
      }
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
    layout[0].rows.push([{ name: fieldName}, false]);

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
 */
export async function addFieldToAllLayouts(entity, fieldName, options = {}) {
  // Validate fieldName first
  validateFieldName(fieldName);

  console.log(`[layoutManager] Adding ${fieldName} to all layouts for ${entity}`);

  const results = {
    detail: await addFieldToDetailLayout(entity, fieldName, options),
    list: await addFieldToListLayout(entity, fieldName, { width: options.listWidth || 15 }),
    detailSmall: await addFieldToDetailSmallLayout(entity, fieldName)
  };

  const allSuccess = results.detail.success && results.list.success && results.detailSmall.success;

  return {
    success: allSuccess,
    results
  };
}

/**
 * Get default layout structure (fallback if no template)
 */
function getDefaultLayout(layoutType) {
  switch (layoutType) {
    case 'detail':
    case 'detailSmall':
      return [{ rows: [] }];
    case 'list':
      return [];
    default:
      return [];
  }
}

/**
 * Backup layout file before modification
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
