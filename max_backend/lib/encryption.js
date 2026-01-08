/**
 * Encryption utilities for sensitive credentials
 *
 * Utilise AES-256-GCM pour chiffrer/déchiffrer les credentials des providers
 * de manière sécurisée. La clé est stockée dans CREDENTIALS_ENCRYPTION_KEY (.env).
 *
 * ⚠️ SÉCURITÉ CRITIQUE:
 * - Jamais logger les credentials déchiffrés
 * - Jamais stocker les credentials en plaintext en DB
 * - Toujours valider que CREDENTIALS_ENCRYPTION_KEY existe au démarrage
 */

import crypto from 'crypto';

// Algorithme et paramètres
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Pour AES-GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Récupère la clé de chiffrement depuis l'environnement
 * @returns {Buffer} Clé de 32 bytes
 * @throws {Error} Si CREDENTIALS_ENCRYPTION_KEY manquant ou invalide
 */
function getEncryptionKey() {
  const keyHex = process.env.CREDENTIALS_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY manquant dans .env. ' +
      'Générez-en une avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Convertir hex en buffer
  const key = Buffer.from(keyHex, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY doit faire ${KEY_LENGTH} bytes (64 caractères hex). ` +
      `Actuellement: ${key.length} bytes.`
    );
  }

  return key;
}

/**
 * Chiffre un objet JSON en string chiffrée
 *
 * @param {Object} data - L'objet à chiffrer (ex: {apiKey: "...", apiSecret: "..."})
 * @returns {string} String au format: iv:authTag:encryptedData (tout en hex)
 * @throws {Error} Si le chiffrement échoue
 *
 * @example
 * const encrypted = encryptCredentials({ apiKey: "abc123", apiSecret: "xyz789" });
 * // Retourne: "a1b2c3d4e5f6....:f7e8d9c0b1a2....:9f8e7d6c5b4a...."
 */
export function encryptCredentials(data) {
  try {
    const key = getEncryptionKey();

    // Générer un IV aléatoire (JAMAIS réutiliser le même IV!)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Sérialiser l'objet en JSON puis chiffrer
    const jsonString = JSON.stringify(data);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Récupérer l'auth tag (pour GCM)
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (tout en hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Erreur chiffrement:', error.message);
    throw new Error(`Échec du chiffrement: ${error.message}`);
  }
}

/**
 * Déchiffre une string chiffrée en objet JSON
 *
 * @param {string} encryptedString - String au format iv:authTag:encryptedData (hex)
 * @returns {Object} L'objet déchiffré
 * @throws {Error} Si le déchiffrement échoue (clé invalide, données corrompues, etc.)
 *
 * @example
 * const credentials = decryptCredentials("a1b2c3d4e5f6....:f7e8d9c0b1a2....:9f8e7d6c5b4a....");
 * // Retourne: { apiKey: "abc123", apiSecret: "xyz789" }
 */
export function decryptCredentials(encryptedString) {
  try {
    const key = getEncryptionKey();

    // Parser le format iv:authTag:encryptedData
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Format de données chiffrées invalide (attendu: iv:authTag:encryptedData)');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Déchiffrer
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Parser le JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[Encryption] Erreur déchiffrement:', error.message);
    throw new Error(`Échec du déchiffrement: ${error.message}`);
  }
}

/**
 * Valide que la clé de chiffrement est correctement configurée
 * À appeler au démarrage du serveur pour fail-fast
 *
 * @returns {boolean} true si la clé est valide
 * @throws {Error} Si la clé est manquante ou invalide
 */
export function validateEncryptionKey() {
  try {
    const key = getEncryptionKey();
    console.log(`[Encryption] ✅ Clé de chiffrement valide (${key.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`[Encryption] ❌ ${error.message}`);
    throw error;
  }
}

/**
 * Génère une nouvelle clé de chiffrement (utilitaire pour setup initial)
 * À NE PAS appeler en production! Utiliser uniquement pour générer une clé initiale.
 *
 * @returns {string} Clé hex de 64 caractères
 */
export function generateEncryptionKey() {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('hex');
}

/**
 * Redacte les credentials sensibles pour les logs
 *
 * @param {Object} credentials - Objet contenant des credentials
 * @returns {Object} Objet avec credentials masqués
 *
 * @example
 * const safe = redactCredentials({ apiKey: "abc123xyz", apiSecret: "secret789" });
 * // Retourne: { apiKey: "abc***xyz", apiSecret: "sec***789" }
 */
export function redactCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') {
    return credentials;
  }

  const redacted = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && value.length > 6) {
      // Montrer premiers 3 et derniers 3 caractères
      redacted[key] = `${value.slice(0, 3)}***${value.slice(-3)}`;
    } else if (typeof value === 'string' && value.length > 0) {
      redacted[key] = '***';
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Test rapide du système de chiffrement
 * Utile pour vérifier que tout fonctionne au démarrage
 *
 * @returns {boolean} true si le test réussit
 * @throws {Error} Si le test échoue
 */
export function testEncryption() {
  try {
    const testData = {
      apiKey: 'test-key-123',
      apiSecret: 'test-secret-456',
      nested: {
        value: 'test-nested-789'
      }
    };

    // Chiffrer
    const encrypted = encryptCredentials(testData);

    // Déchiffrer
    const decrypted = decryptCredentials(encrypted);

    // Vérifier
    if (JSON.stringify(testData) !== JSON.stringify(decrypted)) {
      throw new Error('Les données déchiffrées ne correspondent pas aux données originales');
    }

    console.log('[Encryption] ✅ Test de chiffrement/déchiffrement réussi');
    return true;
  } catch (error) {
    console.error('[Encryption] ❌ Test de chiffrement échoué:', error.message);
    throw error;
  }
}