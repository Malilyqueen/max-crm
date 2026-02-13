/**
 * Migration 023: WhatsApp Multi-Tenant Provisioning
 *
 * Ajoute les champs nécessaires pour le provisioning per-tenant:
 * - whatsapp_status: statut officiel du tenant
 * - provisioned_at: date de provisioning par admin
 * - expires_at: date d'expiration (3 mois)
 * - phone_number: numéro demandé par le client
 */

-- Ajouter colonne whatsapp_status
ALTER TABLE tenant_provider_configs
  ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(30)
  DEFAULT 'not_requested'
  CHECK (whatsapp_status IN (
    'not_requested',
    'pending_provisioning',
    'qr_ready',
    'connected',
    'disabled',
    'expired'
  ));

-- Ajouter colonne provisioned_at
ALTER TABLE tenant_provider_configs
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP;

-- Ajouter colonne expires_at
ALTER TABLE tenant_provider_configs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Ajouter colonne phone_number (numéro demandé par le client)
ALTER TABLE tenant_provider_configs
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Index pour recherche rapide par statut WhatsApp
CREATE INDEX IF NOT EXISTS idx_provider_configs_wa_status
  ON tenant_provider_configs(tenant_id, whatsapp_status)
  WHERE provider_type = 'greenapi_whatsapp';

-- Mettre à jour les providers existants qui sont connectés
UPDATE tenant_provider_configs
  SET whatsapp_status = 'connected'
  WHERE provider_type = 'greenapi_whatsapp'
    AND is_active = true
    AND connection_status = 'success';

-- Mettre à jour les providers existants qui ne sont pas connectés
UPDATE tenant_provider_configs
  SET whatsapp_status = 'qr_ready'
  WHERE provider_type = 'greenapi_whatsapp'
    AND whatsapp_status = 'not_requested'
    AND encrypted_config IS NOT NULL
    AND encrypted_config != '';
