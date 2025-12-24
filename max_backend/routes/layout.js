/**
 * layout.js
 * Routes for layout management and rebuild operations
 * Allows M.A.X. to modify layouts and trigger rebuild
 */

import express from 'express';
import { espoRebuild, espoClearCache, testPHP } from '../lib/phpExecutor.js';
import {
  addFieldToDetailLayout,
  addFieldToListLayout,
  addFieldToDetailSmallLayout,
  addFieldToAllLayouts,
  readLayout,
  backupLayout
} from '../lib/layoutManager.js';

const router = express.Router();

/**
 * POST /api/layout/rebuild
 * Execute EspoCRM rebuild command
 */
router.post('/rebuild', async (req, res) => {
  try {
    console.log('[layout] Rebuild requested');

    const result = await espoRebuild();

    if (result.success) {
      res.json({
        ok: true,
        message: 'Rebuild completed successfully',
        output: result.output
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Rebuild failed',
        message: result.error,
        output: result.output
      });
    }
  } catch (error) {
    console.error('[layout] Rebuild error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/layout/clear-cache
 * Execute EspoCRM clear cache command
 */
router.post('/clear-cache', async (req, res) => {
  try {
    console.log('[layout] Clear cache requested');

    const result = await espoClearCache();

    if (result.success) {
      res.json({
        ok: true,
        message: 'Cache cleared successfully',
        output: result.output
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Clear cache failed',
        message: result.error,
        output: result.output
      });
    }
  } catch (error) {
    console.error('[layout] Clear cache error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/layout/add-field
 * Add a field to layouts
 * Body: { entity, field, layouts: ['detail', 'list', 'detailSmall'], options }
 */
router.post('/add-field', async (req, res) => {
  try {
    const { entity, field, layouts = ['detail', 'list', 'detailSmall'], options = {} } = req.body;

    if (!entity || !field) {
      return res.status(400).json({
        ok: false,
        error: 'Missing entity or field'
      });
    }

    console.log(`[layout] Adding field ${field} to ${entity} layouts: ${layouts.join(', ')}`);

    const results = {};

    // Add to requested layouts
    for (const layoutType of layouts) {
      switch (layoutType) {
        case 'detail':
          results.detail = await addFieldToDetailLayout(entity, field, options);
          break;
        case 'list':
          results.list = await addFieldToListLayout(entity, field, options);
          break;
        case 'detailSmall':
          results.detailSmall = await addFieldToDetailSmallLayout(entity, field);
          break;
      }
    }

    const allSuccess = Object.values(results).every(r => r.success);

    res.json({
      ok: allSuccess,
      message: allSuccess ? 'Field added to layouts' : 'Some layouts failed',
      results
    });
  } catch (error) {
    console.error('[layout] Add field error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/layout/add-field-complete
 * Add field to all layouts and rebuild
 * Body: { entity, field, options }
 */
router.post('/add-field-complete', async (req, res) => {
  try {
    const { entity, field, options = {} } = req.body;

    if (!entity || !field) {
      return res.status(400).json({
        ok: false,
        error: 'Missing entity or field'
      });
    }

    console.log(`[layout] Complete field addition: ${field} to ${entity}`);

    // Step 1: Backup layouts
    const backups = {};
    for (const layoutType of ['detail', 'list', 'detailSmall']) {
      backups[layoutType] = await backupLayout(entity, layoutType).catch(() => null);
    }

    // Step 2: Add to all layouts
    const layoutResult = await addFieldToAllLayouts(entity, field, options);

    if (!layoutResult.success) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to add field to layouts',
        results: layoutResult.results,
        backups
      });
    }

    // Step 3: Clear cache
    const cacheResult = await espoClearCache();

    // Step 4: Rebuild
    const rebuildResult = await espoRebuild();

    if (!rebuildResult.success) {
      return res.status(500).json({
        ok: false,
        error: 'Field added to layouts but rebuild failed',
        layoutResults: layoutResult.results,
        cacheResult,
        rebuildResult,
        backups
      });
    }

    res.json({
      ok: true,
      message: `Field ${field} successfully added to ${entity} and rebuild completed`,
      layoutResults: layoutResult.results,
      cacheResult,
      rebuildResult,
      backups
    });
  } catch (error) {
    console.error('[layout] Complete field addition error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/layout/read
 * Read a layout file
 * Query: entity, layoutType
 */
router.get('/read', async (req, res) => {
  try {
    const { entity, layoutType } = req.query;

    if (!entity || !layoutType) {
      return res.status(400).json({
        ok: false,
        error: 'Missing entity or layoutType'
      });
    }

    console.log(`[layout] Reading ${entity} ${layoutType} layout`);

    const layout = await readLayout(entity, layoutType);

    res.json({
      ok: true,
      entity,
      layoutType,
      layout
    });
  } catch (error) {
    console.error('[layout] Read layout error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/layout/test-php
 * Test if PHP is available
 */
router.get('/test-php', async (req, res) => {
  try {
    const result = await testPHP();

    res.json({
      ok: result.available,
      available: result.available,
      version: result.version,
      error: result.error
    });
  } catch (error) {
    console.error('[layout] Test PHP error:', error);
    res.status(500).json({
      ok: false,
      available: false,
      error: error.message
    });
  }
});

export default router;
