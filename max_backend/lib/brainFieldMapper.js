/**
 * Brain Field Mapper - Intelligence pour M.A.X.
 *
 * Ce module permet à M.A.X. de suggérer automatiquement les champs custom
 * nécessaires selon le cerveau vertical actif (transport, e-commerce, etc.)
 */

// Définition des champs par vertical
const BRAIN_FIELDS = {
  logistique: [
    {
      name: 'typeMarchandise',
      type: 'enum',
      label: 'Type de marchandise',
      options: ['Palette', 'Colis', 'Vrac', 'Conteneur', 'Frigorifique', 'Dangereuse'],
      required: false
    },
    {
      name: 'volumeEstime',
      type: 'varchar',
      label: 'Volume estimé',
      required: false
    },
    {
      name: 'trajetFrequent',
      type: 'varchar',
      label: 'Trajet fréquent',
      required: false
    },
    {
      name: 'urgence',
      type: 'enum',
      label: 'Urgence',
      options: ['Express 24h', 'Standard', 'Flexible'],
      required: false
    }
  ],

  ecommerce: [
    {
      name: 'categorieInteret',
      type: 'enum',
      label: 'Catégorie d\'intérêt',
      options: ['Cosmétiques', 'Soins', 'Parfums', 'Accessoires'],
      required: false
    },
    {
      name: 'budgetMoyen',
      type: 'currency',
      label: 'Budget moyen',
      required: false
    },
    {
      name: 'frequenceAchat',
      type: 'enum',
      label: 'Fréquence d\'achat',
      options: ['Hebdo', 'Mensuel', 'Trimestriel', 'Occasionnel'],
      required: false
    }
  ],

  coach: [
    {
      name: 'objectifPrincipal',
      type: 'text',
      label: 'Objectif principal',
      required: false
    },
    {
      name: 'niveauExperience',
      type: 'enum',
      label: 'Niveau d\'expérience',
      options: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
      required: false
    },
    {
      name: 'disponibilite',
      type: 'enum',
      label: 'Disponibilité',
      options: ['Temps plein', 'Mi-temps', 'Week-end', 'Soirées'],
      required: false
    }
  ],

  b2b: [
    {
      name: 'secteurActivite',
      type: 'enum',
      label: 'Secteur d\'activité',
      options: ['Tech', 'Services', 'Industrie', 'Commerce', 'Finance'],
      required: false
    },
    {
      name: 'tailleEntreprise',
      type: 'enum',
      label: 'Taille entreprise',
      options: ['1-10', '11-50', '51-200', '201-500', '500+'],
      required: false
    },
    {
      name: 'budgetAnnuel',
      type: 'currency',
      label: 'Budget annuel',
      required: false
    }
  ],

  btp: [
    {
      name: 'typeProjet',
      type: 'enum',
      label: 'Type de projet',
      options: ['Résidentiel', 'Commercial', 'Industriel', 'Rénovation'],
      required: false
    },
    {
      name: 'surfaceM2',
      type: 'int',
      label: 'Surface (m²)',
      required: false
    },
    {
      name: 'delaiSouhaite',
      type: 'date',
      label: 'Délai souhaité',
      required: false
    }
  ]
};

// Champs communs à tous les cerveaux
const COMMON_FIELDS = [
  {
    name: 'maxScore',
    type: 'int',
    label: 'Score M.A.X.',
    min: 0,
    max: 100,
    required: false
  },
  {
    name: 'lastMaxAnalysis',
    type: 'datetime',
    label: 'Dernière analyse M.A.X.',
    required: false
  },
  {
    name: 'maxRecommendations',
    type: 'text',
    label: 'Recommandations M.A.X.',
    required: false
  }
];

/**
 * Suggère les champs nécessaires pour un cerveau donné
 * @param {string} brainType - Type de cerveau (logistique, ecommerce, etc.)
 * @param {string} entity - Entité EspoCRM (Lead, Contact, Account)
 * @returns {Array} Liste des champs suggérés
 */
export function suggestFields(brainType, entity = 'Lead') {
  const brainFields = BRAIN_FIELDS[brainType] || [];
  const allFields = [...brainFields, ...COMMON_FIELDS];

  return allFields.map(field => ({
    ...field,
    entity,
    isCustom: true
  }));
}

/**
 * Détecte automatiquement le type de cerveau basé sur des données
 * @param {Array} leads - Leads à analyser
 * @returns {string} Type de cerveau détecté
 */
export function detectBrainType(leads) {
  const keywords = {
    logistique: ['transport', 'livraison', 'palette', 'fret', 'cargo', 'logistique', 'colis'],
    ecommerce: ['commande', 'boutique', 'produit', 'panier', 'achat', 'cosmétique'],
    coach: ['formation', 'coaching', 'objectif', 'développement', 'accompagnement'],
    b2b: ['entreprise', 'b2b', 'professionnel', 'partenariat', 'solution'],
    btp: ['construction', 'bâtiment', 'chantier', 'travaux', 'rénovation']
  };

  const scores = {};

  for (const [type, words] of Object.entries(keywords)) {
    scores[type] = 0;

    for (const lead of leads) {
      const text = JSON.stringify(lead).toLowerCase();
      for (const word of words) {
        if (text.includes(word)) {
          scores[type]++;
        }
      }
    }
  }

  // Retourner le type avec le score le plus élevé
  const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return detected[1] > 0 ? detected[0] : 'logistique'; // Default
}

/**
 * Analyse les leads et suggère les champs manquants
 * @param {Array} leads - Leads à analyser
 * @param {string} entity - Entité EspoCRM
 * @returns {Object} Analyse et suggestions
 */
export function analyzeAndSuggest(leads, entity = 'Lead') {
  const brainType = detectBrainType(leads);
  const suggestedFields = suggestFields(brainType, entity);

  // Analyser quelles propriétés sont présentes dans les leads
  const existingFields = new Set();
  for (const lead of leads) {
    for (const key of Object.keys(lead)) {
      existingFields.add(key);
    }
  }

  // Identifier les champs manquants
  const missingFields = suggestedFields.filter(
    field => !existingFields.has(field.name)
  );

  return {
    detectedBrain: brainType,
    totalLeads: leads.length,
    existingFields: Array.from(existingFields),
    suggestedFields,
    missingFields,
    recommendation: `M.A.X. a détecté un contexte "${brainType}" et suggère ${missingFields.length} champs personnalisés pour optimiser l'analyse.`
  };
}

/**
 * Génère la configuration de mapping pour un cerveau
 * @param {string} brainType - Type de cerveau
 * @returns {Object} Configuration de mapping
 */
export function generateBrainMapping(brainType) {
  const fields = suggestFields(brainType);

  return {
    brain: brainType,
    entity: 'Lead',
    fields: fields.map(f => ({
      name: f.name,
      type: f.type,
      label: f.label,
      mapping: {
        source: 'csv',
        transform: f.type === 'enum' ? 'normalize' : 'direct'
      }
    })),
    rules: {
      scoring: {
        weights: {
          urgence: 30,
          volumeEstime: 20,
          typeMarchandise: 10
        }
      },
      tagging: {
        auto: true,
        triggers: fields.filter(f => f.type === 'enum').map(f => f.name)
      }
    }
  };
}

export default {
  suggestFields,
  detectBrainType,
  analyzeAndSuggest,
  generateBrainMapping,
  BRAIN_FIELDS,
  COMMON_FIELDS
};
