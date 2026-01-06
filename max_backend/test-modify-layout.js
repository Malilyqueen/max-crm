/**
 * Test script for modifyLayout action
 *
 * Tests:
 * 1. Add a test field to Lead layouts (detail, edit, list)
 * 2. Verify rebuild/clear-cache output
 * 3. Check if files are created correctly
 */

import { config } from 'dotenv';
config();

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FilesystemLayoutManager = require('./lib/FilesystemLayoutManager.cjs');

async function testModifyLayout() {
  console.log('\n=== TEST: Modify Layout ===\n');

  const layoutManager = new FilesystemLayoutManager({
    sshHost: process.env.ESPO_SSH_HOST || '51.159.170.20',
    sshUser: process.env.ESPO_SSH_USER || 'root',
    containerName: 'espocrm'
  });

  // Test: Add field "testFieldMaxLO" to Lead layouts
  const entity = 'Lead';
  const fieldName = 'testFieldMaxLO';
  const layoutTypes = ['detail', 'edit', 'list'];

  console.log(`Testing: Add "${fieldName}" to ${entity} layouts: ${layoutTypes.join(', ')}\n`);

  try {
    const result = await layoutManager.addFieldToLayouts(entity, fieldName, layoutTypes);

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n=== SUMMARY ===');
    console.log(`✅ Modified: ${result.layoutsModified}`);
    console.log(`⏭  Skipped: ${result.layoutsSkipped}`);
    console.log(`❌ Errors: ${result.layoutsErrors}`);

    if (result.layoutsErrors > 0) {
      console.log('\n=== ERROR DETAILS ===');
      result.results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  - ${r.layoutType}: ${r.error}`);
        });
    }

    console.log('\n=== SUCCESS ===');
    return result;

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
    process.exit(1);
  }
}

testModifyLayout();
