// migrate-greenapi-to-db.js - Migrer credentials Green-API vers DB chiffrée
import pg from 'pg';
import { encryptCredentials } from './lib/encryption.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateGreenAPI() {
  try {
    // Récupérer credentials depuis env
    const instanceId = process.env.GREENAPI_INSTANCE_ID;
    const token = process.env.GREENAPI_API_TOKEN;

    if (!instanceId || !token) {
      throw new Error('GREENAPI_INSTANCE_ID ou GREENAPI_API_TOKEN manquants');
    }

    console.log('📦 Credentials Green-API trouvés:', { instanceId });

    // Chiffrer per-tenant pour macrea
    const credentials = { instanceId, token };
    const encryptedConfig = encryptCredentials(credentials, 'macrea');

    console.log('🔐 Credentials chiffrés (per-tenant: macrea)');

    // Insérer en DB
    const result = await pool.query(
      `INSERT INTO tenant_provider_configs
        (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, provider_type, provider_name)
       DO UPDATE SET
         encrypted_config = EXCLUDED.encrypted_config,
         connection_status = EXCLUDED.connection_status,
         updated_at = NOW()
       RETURNING id, tenant_id, provider_type, provider_name`,
      [
        'macrea',
        'greenapi_whatsapp',
        'WhatsApp Green-API Production',
        encryptedConfig,
        'success',
        true,
        'migration_system'
      ]
    );

    console.log('✅ Green-API migré en DB chiffrée:');
    console.table(result.rows);

    // Vérifier déchiffrement
    const { decryptCredentials } = await import('./lib/encryption.js');
    const decrypted = decryptCredentials(encryptedConfig, 'macrea');
    console.log('🔓 Test déchiffrement:', decrypted.instanceId === instanceId ? '✅ OK' : '❌ ERREUR');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur migration:', error.message);
    await pool.end();
    process.exit(1);
  }
}

migrateGreenAPI();