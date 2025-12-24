/**
 * FIELD VALIDATOR - Normalisation intelligente des champs M.A.X.
 *
 * Objectif: M.A.X. reste LIBRE dans son analyse, mais STRICT dans l'écriture EspoCRM
 *
 * Principes:
 * 1. Validation automatique: Vérifie que les champs utilisés sont dans le mapping officiel
 * 2. Normalisation: Convertit les anciens noms de champs vers les nouveaux
 * 3. Rejet strict: Refuse toute écriture dans des champs non mappés
 * 4. Auto-détection: Détecte les changements de schéma EspoCRM
 * 5. Self-healing: Propose des corrections automatiques
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MAPPING OFFICIEL - Source de vérité pour les champs M.A.X.
 * NE JAMAIS MODIFIER sans mettre à jour docs/ESPOCRM_FIELD_MAPPING.md
 */
const OFFICIAL_FIELDS = {
  // Champs M.A.X. Custom (IA)
  tagsIA: {
    type: 'array',
    required: false,
    description: 'Tags générés par l\'IA pour catégoriser le lead'
  },
  secteurInfere: {
    type: 'text',
    required: false,
    description: 'Secteur d\'activité détecté par l\'IA'
  },
  scoreIA: {
    type: 'int',
    required: false,
    min: 0,
    max: 100,
    description: 'Score de qualification (0-100)'
  },
  servicesSouhaites: {
    type: 'text',
    required: false,
    description: 'Services identifiés comme pertinents'
  },
  notesIA: {
    type: 'text',
    required: false,
    description: 'Notes et observations de M.A.X.'
  },

  // Champs EspoCRM standard (utilisables par M.A.X.)
  description: { type: 'text', required: false },
  status: { type: 'enum', required: false },
  accountName: { type: 'varchar', required: false },
  firstName: { type: 'varchar', required: false },
  lastName: { type: 'varchar', required: false },
  emailAddress: { type: 'email', required: false },
  phoneNumber: { type: 'phone', required: false },
  industry: { type: 'enum', required: false },
  website: { type: 'url', required: false }
};

/**
 * CHAMPS DÉPRÉCIÉS - NE PLUS UTILISER
 * Mapping vers les nouveaux champs pour auto-migration
 */
const DEPRECATED_FIELDS = {
  secteur: 'secteurInfere',
  maxTags: 'tagsIA'
};

/**
 * CHAMPS INTERDITS - M.A.X. ne peut JAMAIS écrire dedans
 */
const FORBIDDEN_FIELDS = [
  'id',
  'deleted',
  'createdAt',
  'modifiedAt',
  'createdBy',
  'modifiedById',
  'createdById',
  'modifiedBy'
];

/**
 * Valide un objet de mise à jour avant envoi à EspoCRM
 * @param {Object} updateData - Données à valider
 * @param {Object} options - Options de validation
 * @returns {Object} { valid: boolean, normalized: Object, errors: Array, warnings: Array }
 */
export function validateLeadUpdate(updateData, options = {}) {
  const result = {
    valid: true,
    normalized: {},
    errors: [],
    warnings: [],
    deprecated: []
  };

  for (const [fieldName, value] of Object.entries(updateData)) {
    // 1. Vérifier si le champ est interdit
    if (FORBIDDEN_FIELDS.includes(fieldName)) {
      result.errors.push({
        field: fieldName,
        reason: 'FORBIDDEN',
        message: `Le champ "${fieldName}" est en lecture seule et ne peut pas être modifié`
      });
      result.valid = false;
      continue;
    }

    // 2. Vérifier si le champ est déprécié
    if (DEPRECATED_FIELDS[fieldName]) {
      const newFieldName = DEPRECATED_FIELDS[fieldName];
      result.warnings.push({
        field: fieldName,
        reason: 'DEPRECATED',
        message: `Le champ "${fieldName}" est déprécié, utiliser "${newFieldName}" à la place`,
        migration: { from: fieldName, to: newFieldName }
      });
      result.deprecated.push(fieldName);

      // Auto-migration: Utiliser le nouveau nom de champ
      if (options.autoMigrate !== false) {
        result.normalized[newFieldName] = value;
        continue;
      }
    }

    // 3. Vérifier si le champ est dans le mapping officiel
    if (!OFFICIAL_FIELDS[fieldName]) {
      result.errors.push({
        field: fieldName,
        reason: 'UNKNOWN',
        message: `Le champ "${fieldName}" n'est pas dans le mapping officiel M.A.X.`,
        suggestion: 'Vérifier docs/ESPOCRM_FIELD_MAPPING.md pour les champs autorisés'
      });
      result.valid = false;
      continue;
    }

    // 4. Valider le type de données
    const fieldDef = OFFICIAL_FIELDS[fieldName];
    const typeValidation = validateFieldType(fieldName, value, fieldDef);

    if (!typeValidation.valid) {
      result.errors.push({
        field: fieldName,
        reason: 'TYPE_MISMATCH',
        message: typeValidation.message,
        expected: fieldDef.type,
        received: typeof value
      });
      result.valid = false;
      continue;
    }

    // 5. Ajouter au résultat normalisé
    result.normalized[fieldName] = typeValidation.normalized || value;
  }

  return result;
}

/**
 * Valide le type d'un champ
 */
function validateFieldType(fieldName, value, fieldDef) {
  if (value === null || value === undefined) {
    return { valid: true, normalized: null };
  }

  switch (fieldDef.type) {
    case 'array':
      if (!Array.isArray(value)) {
        return {
          valid: false,
          message: `Le champ "${fieldName}" doit être un array, reçu: ${typeof value}`
        };
      }
      return { valid: true };

    case 'int':
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        return {
          valid: false,
          message: `Le champ "${fieldName}" doit être un entier, reçu: ${value}`
        };
      }
      if (fieldDef.min !== undefined && num < fieldDef.min) {
        return {
          valid: false,
          message: `Le champ "${fieldName}" doit être >= ${fieldDef.min}, reçu: ${num}`
        };
      }
      if (fieldDef.max !== undefined && num > fieldDef.max) {
        return {
          valid: false,
          message: `Le champ "${fieldName}" doit être <= ${fieldDef.max}, reçu: ${num}`
        };
      }
      return { valid: true, normalized: num };

    case 'text':
    case 'varchar':
    case 'enum':
    case 'url':
    case 'email':
    case 'phone':
      if (typeof value !== 'string') {
        return {
          valid: false,
          message: `Le champ "${fieldName}" doit être une chaîne, reçu: ${typeof value}`
        };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Vérifie que les champs metadata EspoCRM correspondent au mapping officiel
 * @returns {Object} { consistent: boolean, issues: Array }
 */
export async function checkSchemaConsistency() {
  const metadataPath = path.join(
    process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm',
    'custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json'
  );

  if (!fs.existsSync(metadataPath)) {
    return {
      consistent: false,
      issues: [{
        type: 'MISSING_METADATA',
        message: 'Fichier metadata Lead.json introuvable',
        path: metadataPath
      }]
    };
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const metadataFields = metadata.fields || {};
  const issues = [];

  // Vérifier que tous les champs M.A.X. custom sont définis dans metadata
  const maxCustomFields = ['tagsIA', 'secteurInfere', 'scoreIA', 'servicesSouhaites', 'notesIA'];

  for (const fieldName of maxCustomFields) {
    if (!metadataFields[fieldName]) {
      issues.push({
        type: 'MISSING_FIELD',
        field: fieldName,
        message: `Champ M.A.X. "${fieldName}" absent de metadata`,
        action: 'Créer le champ dans EspoCRM Admin → Entity Manager → Lead → Fields'
      });
    } else if (!metadataFields[fieldName].isCustom) {
      issues.push({
        type: 'MISSING_CUSTOM_FLAG',
        field: fieldName,
        message: `Champ "${fieldName}" doit avoir isCustom: true dans metadata`,
        action: 'Ajouter "isCustom": true dans Lead.json'
      });
    }
  }

  // Vérifier les champs dépréciés
  for (const deprecatedField of Object.keys(DEPRECATED_FIELDS)) {
    if (metadataFields[deprecatedField]) {
      issues.push({
        type: 'DEPRECATED_FIELD',
        field: deprecatedField,
        message: `Champ déprécié "${deprecatedField}" encore présent dans metadata`,
        action: `Migrer vers "${DEPRECATED_FIELDS[deprecatedField]}" puis supprimer`
      });
    }
  }

  return {
    consistent: issues.length === 0,
    issues
  };
}

/**
 * Middleware pour intercepter et valider toutes les écritures M.A.X. → EspoCRM
 * @param {Object} updateData - Données à écrire
 * @param {Object} options - Options
 * @returns {Object} Données normalisées prêtes pour EspoCRM
 */
export function normalizeLeadUpdate(updateData, options = {}) {
  const validation = validateLeadUpdate(updateData, {
    autoMigrate: true,
    ...options
  });

  if (!validation.valid) {
    const error = new Error('Validation des champs échouée');
    error.code = 'FIELD_VALIDATION_ERROR';
    error.details = validation;
    throw error;
  }

  // Logger les warnings (champs dépréciés)
  if (validation.warnings.length > 0 && !options.silent) {
    console.warn('[FIELD_VALIDATOR] ⚠️  Warnings:', validation.warnings);
  }

  return validation.normalized;
}

/**
 * Obtenir la liste des champs autorisés pour M.A.X.
 */
export function getAllowedFields() {
  return Object.keys(OFFICIAL_FIELDS);
}

/**
 * Vérifier si un champ est autorisé
 */
export function isFieldAllowed(fieldName) {
  return OFFICIAL_FIELDS.hasOwnProperty(fieldName);
}

/**
 * Obtenir les champs dépréciés
 */
export function getDeprecatedFields() {
  return { ...DEPRECATED_FIELDS };
}

export default {
  validateLeadUpdate,
  normalizeLeadUpdate,
  checkSchemaConsistency,
  getAllowedFields,
  isFieldAllowed,
  getDeprecatedFields,
  OFFICIAL_FIELDS,
  DEPRECATED_FIELDS,
  FORBIDDEN_FIELDS
};
