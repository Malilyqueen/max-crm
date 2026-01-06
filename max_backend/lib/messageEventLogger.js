/**
 * Message Event Logger - Persistence des events de communication
 *
 * Enregistre TOUS les events des canaux de communication:
 * - WhatsApp (Green-API, Twilio)
 * - SMS (Twilio)
 * - Email (SMTP, SendGrid futur)
 *
 * Format persisté: {channel, direction, leadId, providerMessageId, status, timestamp, raw}
 *
 * Modes de persistence (priorité):
 * 1. Supabase DB (si connecté) - queryable, corrélable
 * 2. JSON file logs (fallback) - lisible, debuggable
 * 3. Console structured (dernier recours) - temporaire
 */

import fs from 'fs/promises';
import path from 'path';

// Mode de persistence (à configurer via .env)
const PERSISTENCE_MODE = process.env.MESSAGE_EVENT_PERSISTENCE || 'json'; // 'supabase' | 'json' | 'console'
const LOGS_DIR = process.env.MESSAGE_EVENT_LOGS_DIR || './logs/message_events';

// Cache en mémoire pour performance
const EVENT_CACHE = [];
const MAX_CACHE_SIZE = 100;
const FLUSH_INTERVAL_MS = 10000; // Flush cache toutes les 10s

// Auto-flush périodique
setInterval(() => {
  if (EVENT_CACHE.length > 0) {
    flushCache().catch(err => console.error('[EVENT_LOGGER] ❌ Erreur flush:', err));
  }
}, FLUSH_INTERVAL_MS);

/**
 * Enregistre un event de message
 *
 * @param {Object} event - Event à enregistrer
 * @param {string} event.channel - 'whatsapp' | 'sms' | 'email'
 * @param {string} [event.provider] - 'greenapi' | 'twilio' | 'smtp' | 'sendgrid'
 * @param {string} event.direction - 'in' | 'out'
 * @param {string} [event.leadId] - ID du lead EspoCRM (si trouvé)
 * @param {string} [event.phoneNumber] - Numéro de téléphone (WhatsApp/SMS)
 * @param {string} [event.email] - Email (pour canal email)
 * @param {string} [event.providerMessageId] - ID message du provider (idMessage, MessageSid, etc.)
 * @param {string} event.status - Statut de l'event (sent, delivered, read, failed, received, etc.)
 * @param {string} [event.messageSnippet] - Aperçu du message (max 200 chars)
 * @param {Object} [event.rawPayload] - Payload brut du webhook
 * @param {string} [event.timestamp] - ISO timestamp (auto si absent)
 * @returns {Promise<void>}
 */
export async function logMessageEvent(event) {
  // Validation
  if (!event.channel || !event.direction || !event.status) {
    console.error('[EVENT_LOGGER] ⚠️  Event incomplet:', event);
    return;
  }

  // Enrichir l'event
  const enrichedEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    tenantId: event.tenantId || 'macrea', // Multi-tenant support
    createdAt: new Date().toISOString()
  };

  // Log console structuré (toujours)
  logToConsole(enrichedEvent);

  // Persister selon le mode
  switch (PERSISTENCE_MODE) {
    case 'supabase':
      await persistToSupabase(enrichedEvent);
      break;

    case 'json':
      await persistToJSON(enrichedEvent);
      break;

    case 'console':
      // Déjà fait ci-dessus
      break;

    default:
      console.error(`[EVENT_LOGGER] ⚠️  Mode persistence inconnu: ${PERSISTENCE_MODE}`);
  }
}

/**
 * Log console structuré JSON
 */
function logToConsole(event) {
  const emoji = {
    whatsapp: '💬',
    sms: '📱',
    email: '📧'
  };

  const directionEmoji = event.direction === 'in' ? '⬅️' : '➡️';

  console.log(`${emoji[event.channel] || '📨'} ${directionEmoji} [${event.status.toUpperCase()}]`, {
    channel: event.channel,
    provider: event.provider,
    leadId: event.leadId || 'unknown',
    messageId: event.providerMessageId,
    contact: event.phoneNumber || event.email,
    snippet: event.messageSnippet?.substring(0, 50),
    timestamp: event.timestamp
  });
}

/**
 * Persiste dans Supabase (mode production)
 */
async function persistToSupabase(event) {
  try {
    // Import dynamique pour éviter erreur si Supabase pas configuré
    const { default: supabase } = await import('../lib/supabaseClient.js');

    const { error } = await supabase
      .from('message_events')
      .insert({
        id: event.id,
        tenant_id: event.tenantId,
        channel: event.channel,
        provider: event.provider,
        direction: event.direction,
        lead_id: event.leadId,
        phone_number: event.phoneNumber,
        email: event.email,
        provider_message_id: event.providerMessageId,
        status: event.status,
        message_snippet: event.messageSnippet,
        raw_payload: event.rawPayload,
        timestamp: event.timestamp,
        created_at: event.createdAt
      });

    if (error) {
      console.error('[EVENT_LOGGER] ❌ Erreur Supabase:', error);

      // Fallback sur JSON en cas d'erreur
      await persistToJSON(event);
    } else {
      console.log(`[EVENT_LOGGER] ✅ Event ${event.id} sauvegardé (Supabase)`);
    }
  } catch (error) {
    console.error('[EVENT_LOGGER] ❌ Erreur import Supabase:', error.message);

    // Fallback sur JSON
    await persistToJSON(event);
  }
}

/**
 * Persiste dans fichier JSON (fallback + développement)
 */
async function persistToJSON(event) {
  try {
    // Créer le répertoire si absent
    await fs.mkdir(LOGS_DIR, { recursive: true });

    // Fichier par jour : message_events_2026-01-06.json
    const date = new Date().toISOString().split('T')[0];
    const filename = `message_events_${date}.json`;
    const filepath = path.join(LOGS_DIR, filename);

    // Ajouter au cache
    EVENT_CACHE.push(event);

    // Flush si cache plein
    if (EVENT_CACHE.length >= MAX_CACHE_SIZE) {
      await flushCache();
    } else {
      console.log(`[EVENT_LOGGER] 📝 Event ${event.id} ajouté au cache (${EVENT_CACHE.length}/${MAX_CACHE_SIZE})`);
    }
  } catch (error) {
    console.error('[EVENT_LOGGER] ❌ Erreur persistence JSON:', error.message);
  }
}

/**
 * Flush le cache vers le fichier JSON
 */
async function flushCache() {
  if (EVENT_CACHE.length === 0) return;

  const date = new Date().toISOString().split('T')[0];
  const filename = `message_events_${date}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  try {
    // Lire le fichier existant
    let existingEvents = [];
    try {
      const content = await fs.readFile(filepath, 'utf8');
      existingEvents = JSON.parse(content);
    } catch (readError) {
      // Fichier n'existe pas encore, c'est OK
    }

    // Ajouter les nouveaux events
    const allEvents = [...existingEvents, ...EVENT_CACHE];

    // Écrire le fichier
    await fs.writeFile(filepath, JSON.stringify(allEvents, null, 2), 'utf8');

    console.log(`[EVENT_LOGGER] 💾 ${EVENT_CACHE.length} event(s) flushés vers ${filename}`);

    // Vider le cache
    EVENT_CACHE.length = 0;
  } catch (error) {
    console.error('[EVENT_LOGGER] ❌ Erreur flush cache:', error.message);
  }
}

/**
 * Requête les events (pour debug/analytics)
 *
 * @param {Object} filters - Filtres de recherche
 * @param {string} [filters.channel] - Filtrer par canal
 * @param {string} [filters.leadId] - Filtrer par lead
 * @param {string} [filters.status] - Filtrer par statut
 * @param {string} [filters.startDate] - Date début (ISO)
 * @param {string} [filters.endDate] - Date fin (ISO)
 * @param {number} [filters.limit] - Limite de résultats (défaut: 100)
 * @returns {Promise<Array>}
 */
export async function queryMessageEvents(filters = {}) {
  if (PERSISTENCE_MODE === 'supabase') {
    return await queryFromSupabase(filters);
  } else if (PERSISTENCE_MODE === 'json') {
    return await queryFromJSON(filters);
  } else {
    console.warn('[EVENT_LOGGER] ⚠️  Query non disponible en mode console');
    return [];
  }
}

/**
 * Requête depuis Supabase
 */
async function queryFromSupabase(filters) {
  try {
    const { default: supabase } = await import('../lib/supabaseClient.js');

    let query = supabase
      .from('message_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(filters.limit || 100);

    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.leadId) query = query.eq('lead_id', filters.leadId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('timestamp', filters.startDate);
    if (filters.endDate) query = query.lte('timestamp', filters.endDate);

    const { data, error } = await query;

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[EVENT_LOGGER] ❌ Erreur query Supabase:', error.message);
    return [];
  }
}

/**
 * Requête depuis fichiers JSON
 */
async function queryFromJSON(filters) {
  try {
    // Lire tous les fichiers JSON du répertoire
    const files = await fs.readdir(LOGS_DIR);
    const jsonFiles = files.filter(f => f.startsWith('message_events_') && f.endsWith('.json'));

    let allEvents = [];

    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf8');
      const events = JSON.parse(content);
      allEvents = allEvents.concat(events);
    }

    // Filtrer
    let filtered = allEvents;

    if (filters.channel) {
      filtered = filtered.filter(e => e.channel === filters.channel);
    }
    if (filters.leadId) {
      filtered = filtered.filter(e => e.leadId === filters.leadId);
    }
    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    if (filters.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate);
    }

    // Trier par timestamp décroissant
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limiter
    return filtered.slice(0, filters.limit || 100);
  } catch (error) {
    console.error('[EVENT_LOGGER] ❌ Erreur query JSON:', error.message);
    return [];
  }
}

/**
 * Statistiques rapides
 */
export async function getMessageStats(filters = {}) {
  const events = await queryMessageEvents(filters);

  const stats = {
    total: events.length,
    byChannel: {},
    byStatus: {},
    byDirection: {}
  };

  events.forEach(event => {
    // Par canal
    stats.byChannel[event.channel] = (stats.byChannel[event.channel] || 0) + 1;

    // Par statut
    stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;

    // Par direction
    stats.byDirection[event.direction] = (stats.byDirection[event.direction] || 0) + 1;
  });

  return stats;
}

// Cleanup au shutdown
process.on('SIGINT', async () => {
  console.log('[EVENT_LOGGER] 🔄 Flush cache avant shutdown...');
  await flushCache();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[EVENT_LOGGER] 🔄 Flush cache avant shutdown...');
  await flushCache();
  process.exit(0);
});