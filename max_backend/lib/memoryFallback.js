/**
 * Fallback mémoire local (en mémoire RAM) si Supabase indisponible
 *
 * Permet à M.A.X. de se souvenir des informations utilisateur
 * même quand Supabase n'est pas accessible
 */

// Store en mémoire pour la mémoire tenant
const localMemoryStore = new Map();

/**
 * Sauvegarder une mémoire localement
 */
export function setLocalMemory(tenantId, key, value, type = 'identity') {
  const memoryKey = `${tenantId}:${key}`;

  localMemoryStore.set(memoryKey, {
    tenant_id: tenantId,
    memory_key: key,
    memory_value: value,
    memory_type: type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  console.log(`[MEMORY_FALLBACK] 💾 Mémoire sauvegardée localement: ${memoryKey} = ${value}`);
}

/**
 * Récupérer une mémoire localement
 */
export function getLocalMemory(tenantId, key) {
  const memoryKey = `${tenantId}:${key}`;
  const memory = localMemoryStore.get(memoryKey);

  if (memory) {
    console.log(`[MEMORY_FALLBACK] 📖 Mémoire récupérée: ${memoryKey}`);
    return memory.memory_value;
  }

  return null;
}

/**
 * Lister toutes les mémoires d'un tenant
 */
export function getAllTenantMemories(tenantId) {
  const memories = {};

  for (const [key, value] of localMemoryStore.entries()) {
    if (key.startsWith(`${tenantId}:`)) {
      const memoryKey = key.split(':')[1];
      memories[memoryKey] = value.memory_value;
    }
  }

  return memories;
}

/**
 * Initialiser avec des données par défaut pour Macrea
 */
export function initializeDefaultMemories() {
  console.log('[MEMORY_FALLBACK] 🌟 Initialisation mémoire locale par défaut...');

  // Données par défaut pour le tenant 'macrea'
  setLocalMemory('macrea', 'user_name', 'Jules', 'identity');
  setLocalMemory('macrea', 'project_name', 'Macrea CRM', 'identity');
  setLocalMemory('macrea', 'business_model', 'Solution CRM SaaS pour PME', 'business_context');
  setLocalMemory('macrea', 'secteur', 'Technologie / SaaS', 'business_context');

  console.log('[MEMORY_FALLBACK] ✅ Mémoire locale initialisée avec données par défaut');
}

// Initialiser automatiquement au chargement
initializeDefaultMemories();

export default {
  setLocalMemory,
  getLocalMemory,
  getAllTenantMemories,
  initializeDefaultMemories
};
