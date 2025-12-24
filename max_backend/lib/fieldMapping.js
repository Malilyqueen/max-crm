/**
 * fieldMapping.js
 * Mapping clair et figé : données front → champs EspoCRM
 * INTERDIT les concaténations libres dans description
 */

/**
 * Mapping des champs (standardisé)
 */
export const FIELD_MAPPING = {
  // Champs de base
  'Prénom': 'firstName',
  'Nom': 'lastName',
  'Email': 'emailAddress',
  'Téléphone': 'phoneNumber',
  'Entreprise': 'accountName',
  'Site web': 'website',
  'Poste': 'title',

  // Champs métier
  'Secteur': 'industry',
  'Origine': 'source',
  'Statut': 'status',
  'Adresse': 'addressStreet',
  'Ville': 'addressCity',
  'Code postal': 'addressPostalCode',
  'Pays': 'addressCountry',

  // Champs personnalisés (à adapter selon votre EspoCRM)
  'Objectifs': 'description',  // Temporaire si pas de champ dédié
  'Budget': 'opportunityAmount',

  // Tags : utilise relation Tags (recommandé) ou enumMulti segments (fallback)
  'Tags': 'tagsIds',  // Relation many-to-many avec entité Tag
  'Segments': 'segments'  // Fallback: champ enumMulti si Tags non disponible
};

/**
 * Champs interdits pour écriture libre
 */
const FORBIDDEN_FREEFORM_FIELDS = ['description'];

/**
 * Applique le mapping sur un objet de données
 * @param {object} data - Données brutes
 * @returns {object} { mapped: {}, unmapped: [], warnings: [] }
 */
export function applyFieldMapping(data) {
  const mapped = {};
  const unmapped = [];
  const warnings = [];

  for (const [key, value] of Object.entries(data)) {
    const targetField = FIELD_MAPPING[key];

    if (targetField) {
      // Champ mappé
      if (FORBIDDEN_FREEFORM_FIELDS.includes(targetField) && typeof value === 'object') {
        warnings.push(`⚠️ Tentative d'écriture structurée dans ${targetField} (interdit)`);
      } else {
        mapped[targetField] = value;
      }
    } else {
      // Champ non mappé
      unmapped.push(key);
    }
  }

  return { mapped, unmapped, warnings };
}

/**
 * Gère les tags proprement (relation Tags ou enumMulti)
 * @param {array} tags - Liste de tags (strings)
 * @param {string} mode - 'relation' (Tags) ou 'enum' (segments)
 * @returns {object} Champs à ajouter au lead
 */
export async function prepareTags(tags, mode = 'relation') {
  if (!tags || tags.length === 0) {
    return {};
  }

  if (mode === 'relation') {
    // Utiliser la relation Tags (recommandé)
    // On retourne les IDs des tags à relier
    // Note: nécessite de créer/récupérer les tags d'abord
    return {
      tagsIds: tags  // Si tags sont déjà des IDs, sinon voir prepareTagRelations()
    };
  } else if (mode === 'enum') {
    // Fallback: champ enumMulti segments
    return {
      segments: tags
    };
  }

  return {};
}

/**
 * Prépare les relations Tags (crée si n'existe pas)
 * @param {array} tagNames - Noms des tags
 * @returns {array} IDs des tags
 */
export async function prepareTagRelations(tagNames) {
  // TODO: Implémenter recherche/création tags dans EspoCRM
  // Pour l'instant, retourner les noms (à compléter selon API EspoCRM)
  console.warn('[Mapping] prepareTagRelations non implémenté, utiliser mode enum');
  return tagNames;
}

/**
 * Champs EspoCRM natifs à préserver tel quels (pas besoin de mapping)
 */
const ESPO_NATIVE_FIELDS = [
  'id', 'name', 'firstName', 'lastName', 'emailAddress', 'phoneNumber',
  'accountName', 'website', 'industry', 'source', 'status', 'description',
  'addressStreet', 'addressCity', 'addressPostalCode', 'addressCountry',
  'createdAt', 'modifiedAt', 'assignedUserId', 'teamsIds',
  // Champs customisés M.A.X.
  'maxTags', 'objectifsBusiness', 'servicesSouhaites', 'statutActions',
  'prochainesEtapes', 'segments', 'tagsIds'
];

/**
 * Extrait les données d'enrichissement sans polluer description
 * @param {object} enrichmentData - Données enrichies
 * @returns {object} Lead formaté proprement
 */
export function formatEnrichedLead(enrichmentData) {
  const lead = {};

  // Appliquer mapping
  const { mapped, unmapped, warnings } = applyFieldMapping(enrichmentData);

  // Log warnings
  warnings.forEach(w => console.warn(w));

  // Préserver les champs EspoCRM natifs non mappés
  const preservedFields = {};
  for (const field of unmapped) {
    if (ESPO_NATIVE_FIELDS.includes(field) && enrichmentData[field] !== undefined) {
      preservedFields[field] = enrichmentData[field];
    }
  }

  // Log unmapped non préservés
  const trulyUnmapped = unmapped.filter(f => !ESPO_NATIVE_FIELDS.includes(f));
  if (trulyUnmapped.length > 0) {
    console.log(`[Mapping] Champs non mappés (ignorés) : ${trulyUnmapped.join(', ')}`);
  }

  // Tags : mode enum par défaut (plus simple)
  if (enrichmentData.Tags) {
    const tagFields = prepareTags(enrichmentData.Tags, 'enum');
    Object.assign(lead, tagFields);
    delete mapped.tagsIds;  // Éviter double emploi
  }

  // Fusionner : preserved fields (natifs) + mapped
  Object.assign(lead, preservedFields, mapped);

  // RÈGLE: description ne doit JAMAIS contenir de tags
  if (lead.description && typeof lead.description === 'string') {
    // Nettoyer description si elle contient "TAGS:"
    lead.description = lead.description.replace(/TAGS:\s*#[^\n]+/g, '').trim();
  }

  return lead;
}

/**
 * Génère un diff de mise à jour (prévisualisation)
 * @param {object} existingLead - Lead actuel
 * @param {object} updates - Mises à jour proposées
 * @returns {object} { added: {}, modified: {}, unchanged: [] }
 */
export function generateUpdateDiff(existingLead, updates) {
  const diff = {
    added: {},
    modified: {},
    unchanged: []
  };

  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = existingLead[field];

    if (oldValue === undefined || oldValue === null || oldValue === '') {
      // Champ ajouté
      diff.added[field] = newValue;
    } else if (oldValue !== newValue) {
      // Champ modifié
      diff.modified[field] = { old: oldValue, new: newValue };
    } else {
      // Champ inchangé
      diff.unchanged.push(field);
    }
  }

  return diff;
}
