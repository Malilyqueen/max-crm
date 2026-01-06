/**
 * Test FilesystemLayoutManager - POC E2E
 *
 * Test complet du driver système de gestion layouts
 */

require('dotenv').config();
const FilesystemLayoutManager = require('./lib/FilesystemLayoutManager.cjs');

async function runPOC() {
  console.log('='.repeat(60));
  console.log('POC E2E - FilesystemLayoutManager');
  console.log('='.repeat(60));

  // Initialize driver
  const layoutManager = new FilesystemLayoutManager({
    sshHost: process.env.ESPO_SSH_HOST || '51.159.170.20',
    sshUser: process.env.ESPO_SSH_USER || 'root',
    containerName: 'espocrm',
    backupDir: '/tmp/max-layout-backups'
  });

  try {
    // Test: Add secteurActivite to Lead layouts
    console.log('\n📝 Test: Add secteurActivite to Lead layouts\n');

    const result = await layoutManager.addFieldToLayouts(
      'Lead',
      'secteurActivite',
      ['detail', 'detailSmall', 'list']
    );

    console.log('\n✅ POC E2E Result:');
    console.log(JSON.stringify(result, null, 2));

    // List backups
    console.log('\n📦 Backups created:');
    const backups = await layoutManager.listBackups();
    console.log(backups);

    console.log('\n='.repeat(60));
    console.log('✅ POC E2E COMPLETED');
    console.log('='.repeat(60));
    console.log('\nNext: Verify field visible in EspoCRM UI');
    console.log('Login: https://crm.studiomacrea.cloud');
    console.log('Go to: CRM > Leads > Click any lead');
    console.log('Expected: secteurActivite field visible in detail form');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ POC E2E FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run POC
runPOC();
