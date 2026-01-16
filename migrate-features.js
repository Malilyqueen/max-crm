// migrate-features.js - Script temporaire pour migration 005
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS tenant_features (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL UNIQUE,
  whatsapp_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  campaigns_enabled BOOLEAN DEFAULT false,
  whatsapp_monthly_limit INTEGER DEFAULT NULL,
  sms_monthly_limit INTEGER DEFAULT NULL,
  email_monthly_limit INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);

INSERT INTO tenant_features (tenant_id, whatsapp_enabled, sms_enabled, email_enabled, campaigns_enabled)
VALUES ('macrea', true, true, true, true)
ON CONFLICT (tenant_id) DO UPDATE SET
  whatsapp_enabled = true,
  sms_enabled = true,
  email_enabled = true,
  campaigns_enabled = true,
  updated_at = NOW();
`;

pool.query(sql)
  .then(() => {
    console.log('✅ Migration 005 tenant_features OK');
    return pool.query('SELECT tenant_id, whatsapp_enabled, sms_enabled, email_enabled FROM tenant_features');
  })
  .then(result => {
    console.log('📊 Features actives:');
    console.log(result.rows);
    pool.end();
  })
  .catch(error => {
    console.error('❌ Erreur migration:', error.message);
    pool.end();
    process.exit(1);
  });