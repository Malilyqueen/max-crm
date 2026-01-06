-- ============================================================================
-- Table: message_events
-- Description: Stockage de TOUS les events de communication (WhatsApp, SMS, Email)
-- Objectif: Queryable, corrélable, analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_events (
  -- Identifiants
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'macrea',

  -- Canal et provider
  channel VARCHAR(20) NOT NULL, -- 'whatsapp' | 'sms' | 'email'
  provider VARCHAR(20), -- 'greenapi' | 'twilio' | 'smtp' | 'sendgrid'

  -- Direction et statut
  direction VARCHAR(10) NOT NULL, -- 'in' | 'out'
  status VARCHAR(30) NOT NULL, -- sent, delivered, read, failed, received, received_unknown, etc.

  -- Corrélation Lead
  lead_id VARCHAR(17), -- ID EspoCRM Lead (si trouvé)
  phone_number VARCHAR(20), -- Numéro WhatsApp/SMS (format international +33...)
  email VARCHAR(255), -- Email (pour canal email)

  -- Identifiant provider
  provider_message_id VARCHAR(100), -- idMessage Green-API, MessageSid Twilio, Message-ID SMTP

  -- Contenu
  message_snippet TEXT, -- Aperçu message (max 200 chars)

  -- Payload brut (debug, analytics)
  raw_payload JSONB,

  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL, -- Timestamp de l'event (fourni par provider ou généré)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT message_events_channel_check CHECK (channel IN ('whatsapp', 'sms', 'email')),
  CONSTRAINT message_events_direction_check CHECK (direction IN ('in', 'out'))
);

-- ============================================================================
-- INDEXES pour performance
-- ============================================================================

-- Index principal: Recherche par lead
CREATE INDEX idx_message_events_lead_id ON message_events(lead_id);

-- Index: Recherche par numéro de téléphone (WhatsApp/SMS)
CREATE INDEX idx_message_events_phone ON message_events(phone_number);

-- Index: Recherche par email
CREATE INDEX idx_message_events_email ON message_events(email);

-- Index: Recherche par provider message ID (corrélation status)
CREATE INDEX idx_message_events_provider_msg_id ON message_events(provider_message_id);

-- Index: Recherche par canal + timestamp (analytics)
CREATE INDEX idx_message_events_channel_ts ON message_events(channel, event_timestamp DESC);

-- Index: Recherche par statut + timestamp (monitoring)
CREATE INDEX idx_message_events_status_ts ON message_events(status, event_timestamp DESC);

-- Index: Recherche par tenant + timestamp (multi-tenant)
CREATE INDEX idx_message_events_tenant_ts ON message_events(tenant_id, event_timestamp DESC);

-- Index composite: Analytics par canal/direction/statut
CREATE INDEX idx_message_events_analytics ON message_events(channel, direction, status, event_timestamp DESC);

-- ============================================================================
-- POLITIQUES RLS (Row Level Security) - Optionnel
-- ============================================================================

-- Activer RLS
-- ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture par tenant
-- CREATE POLICY "Users can read their tenant events"
--   ON message_events FOR SELECT
--   USING (tenant_id = current_setting('app.current_tenant')::text);

-- Politique: Insertion par tenant
-- CREATE POLICY "Users can insert their tenant events"
--   ON message_events FOR INSERT
--   WITH CHECK (tenant_id = current_setting('app.current_tenant')::text);

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Vue: Messages des dernières 24h
CREATE OR REPLACE VIEW message_events_last_24h AS
SELECT *
FROM message_events
WHERE event_timestamp > NOW() - INTERVAL '24 hours'
ORDER BY event_timestamp DESC;

-- Vue: Statistiques par canal
CREATE OR REPLACE VIEW message_events_stats_by_channel AS
SELECT
  channel,
  direction,
  status,
  COUNT(*) as count,
  DATE_TRUNC('hour', event_timestamp) as hour
FROM message_events
WHERE event_timestamp > NOW() - INTERVAL '7 days'
GROUP BY channel, direction, status, DATE_TRUNC('hour', event_timestamp)
ORDER BY hour DESC, channel, direction, status;

-- Vue: Messages non liés à un lead (à traiter)
CREATE OR REPLACE VIEW message_events_unlinked AS
SELECT *
FROM message_events
WHERE lead_id IS NULL
  AND direction = 'in'
  AND event_timestamp > NOW() - INTERVAL '7 days'
ORDER BY event_timestamp DESC;

-- ============================================================================
-- FONCTIONS UTILES
-- ============================================================================

-- Fonction: Taux de delivery par canal (dernières 24h)
CREATE OR REPLACE FUNCTION get_delivery_rate(channel_filter VARCHAR DEFAULT NULL)
RETURNS TABLE(channel VARCHAR, sent BIGINT, delivered BIGINT, delivery_rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.channel,
    COUNT(*) FILTER (WHERE me.status = 'sent') as sent,
    COUNT(*) FILTER (WHERE me.status = 'delivered') as delivered,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE me.status = 'delivered') /
      NULLIF(COUNT(*) FILTER (WHERE me.status = 'sent'), 0),
      2
    ) as delivery_rate
  FROM message_events me
  WHERE me.event_timestamp > NOW() - INTERVAL '24 hours'
    AND me.direction = 'out'
    AND (channel_filter IS NULL OR me.channel = channel_filter)
  GROUP BY me.channel
  ORDER BY delivery_rate DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Messages par lead (historique complet)
CREATE OR REPLACE FUNCTION get_lead_messages(lead_id_param VARCHAR)
RETURNS TABLE(
  id VARCHAR,
  channel VARCHAR,
  direction VARCHAR,
  status VARCHAR,
  message_snippet TEXT,
  event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.channel,
    me.direction,
    me.status,
    me.message_snippet,
    me.event_timestamp
  FROM message_events me
  WHERE me.lead_id = lead_id_param
  ORDER BY me.event_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EXEMPLES DE REQUÊTES
-- ============================================================================

-- Requête 1: Tous les messages WhatsApp reçus aujourd'hui
-- SELECT * FROM message_events
-- WHERE channel = 'whatsapp'
--   AND direction = 'in'
--   AND event_timestamp::date = CURRENT_DATE;

-- Requête 2: Taux de delivery WhatsApp
-- SELECT * FROM get_delivery_rate('whatsapp');

-- Requête 3: Messages d'un lead spécifique
-- SELECT * FROM get_lead_messages('691b2816e43817b92');

-- Requête 4: Messages non liés (leads inconnus)
-- SELECT * FROM message_events_unlinked;

-- Requête 5: Top 10 leads les plus actifs (24h)
-- SELECT
--   lead_id,
--   COUNT(*) as message_count,
--   COUNT(*) FILTER (WHERE direction = 'in') as received,
--   COUNT(*) FILTER (WHERE direction = 'out') as sent
-- FROM message_events
-- WHERE lead_id IS NOT NULL
--   AND event_timestamp > NOW() - INTERVAL '24 hours'
-- GROUP BY lead_id
-- ORDER BY message_count DESC
-- LIMIT 10;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Fonction: Archivage automatique (events > 90 jours)
-- À exécuter via cron/scheduler
CREATE OR REPLACE FUNCTION archive_old_message_events()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Copier dans table d'archive
  INSERT INTO message_events_archive
  SELECT * FROM message_events
  WHERE event_timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Supprimer de la table active
  DELETE FROM message_events
  WHERE event_timestamp < NOW() - INTERVAL '90 days';

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Table d'archive (même structure)
-- CREATE TABLE IF NOT EXISTS message_events_archive (LIKE message_events INCLUDING ALL);

-- ============================================================================

COMMENT ON TABLE message_events IS 'Events de communication tous canaux (WhatsApp, SMS, Email) - queryable et corrélable';
COMMENT ON COLUMN message_events.provider_message_id IS 'ID unique du provider (idMessage Green-API, MessageSid Twilio, Message-ID SMTP)';
COMMENT ON COLUMN message_events.raw_payload IS 'Payload brut du webhook (debug, analytics, audit)';