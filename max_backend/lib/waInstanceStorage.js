/**
 * WhatsApp Instance Storage
 *
 * Gestion du stockage des instances WhatsApp (Green-API)
 * MVP: Fichier JSON simple
 * TODO Phase 2: Migrer vers PostgreSQL/EspoCRM
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_FILE = path.join(__dirname, '../data/wa-instances.json');

/**
 * Charge les instances depuis le fichier JSON
 */
async function loadInstances() {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Fichier n'existe pas encore, retourner tableau vide
      return [];
    }
    throw error;
  }
}

/**
 * Sauvegarde les instances dans le fichier JSON
 */
async function saveInstances(instances) {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(instances, null, 2), 'utf-8');
}

/**
 * Enregistre une nouvelle instance WhatsApp
 *
 * @param {Object} instance - Données de l'instance
 * @param {string} instance.instanceId - ID Green-API
 * @param {string} instance.apiToken - Token API Green-API
 * @param {string} instance.tenant - Tenant/client associé
 * @param {string} instance.status - Statut (authorized, notAuthorized, etc.)
 * @returns {Promise<Object>} - Instance créée
 */
export async function saveInstance(instance) {
  const instances = await loadInstances();

  const newInstance = {
    ...instance,
    id: instance.instanceId, // Alias pour faciliter les recherches
    provider: 'greenapi',
    createdAt: instance.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Vérifier si l'instance existe déjà
  const existingIndex = instances.findIndex(i => i.instanceId === instance.instanceId);

  if (existingIndex >= 0) {
    // Mettre à jour
    instances[existingIndex] = {
      ...instances[existingIndex],
      ...newInstance
    };
  } else {
    // Ajouter
    instances.push(newInstance);
  }

  await saveInstances(instances);

  console.log('[WA-STORAGE] ✅ Instance sauvegardée:', newInstance.instanceId);
  return newInstance;
}

/**
 * Récupère une instance par son ID
 *
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<Object|null>} - Instance ou null si non trouvée
 */
export async function getInstance(instanceId) {
  const instances = await loadInstances();
  return instances.find(i => i.instanceId === instanceId) || null;
}

/**
 * Récupère toutes les instances d'un tenant
 *
 * @param {string} tenant - Nom du tenant
 * @returns {Promise<Array>} - Liste des instances
 */
export async function getInstancesByTenant(tenant) {
  const instances = await loadInstances();
  return instances.filter(i => i.tenant === tenant);
}

/**
 * Met à jour le statut d'une instance
 *
 * @param {string} instanceId - ID de l'instance
 * @param {string} status - Nouveau statut
 * @returns {Promise<Object|null>} - Instance mise à jour ou null
 */
export async function updateInstanceStatus(instanceId, status) {
  const instances = await loadInstances();
  const instance = instances.find(i => i.instanceId === instanceId);

  if (!instance) {
    return null;
  }

  instance.status = status;
  instance.updatedAt = new Date().toISOString();

  if (status === 'authorized') {
    instance.authorizedAt = new Date().toISOString();
  }

  await saveInstances(instances);

  console.log('[WA-STORAGE] ✅ Statut mis à jour:', instanceId, '→', status);
  return instance;
}

/**
 * Supprime une instance
 *
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<boolean>} - true si supprimée, false sinon
 */
export async function deleteInstance(instanceId) {
  const instances = await loadInstances();
  const initialLength = instances.length;

  const filtered = instances.filter(i => i.instanceId !== instanceId);

  if (filtered.length < initialLength) {
    await saveInstances(filtered);
    console.log('[WA-STORAGE] ✅ Instance supprimée:', instanceId);
    return true;
  }

  return false;
}
