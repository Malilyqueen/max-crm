/**
 * maxTools.js
 * Définition des Tools (Function Calling) pour M.A.X. Admin Opérateur
 */

export const MAX_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_espo_leads',
      description: 'Liste ou cherche des leads dans EspoCRM avec filtres précis. Retourne liste avec IDs + total count. Utilise pour "montre les X derniers leads", "liste les leads avant injection", "trouve les leads vides", etc. MÉMORISE les IDs retournés pour actions futures.',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filtres EspoCRM. Exemples: {createdAt: {$gte: "2025-01-01"}, isEmpty: true (pour leads vides)}'
          },
          limit: {
            type: 'number',
            description: 'Nombre max de résultats',
            default: 10
          },
          sortBy: {
            type: 'string',
            description: 'Champ de tri (ex: "createdAt", "name")',
            default: 'createdAt'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_leads_in_espo',
      description: 'Met à jour des leads existants. Par défaut UPDATE ONLY (0 création). Upsert intelligent avec match email/phone/website. UTILISE TOUJOURS CE TOOL au lieu de import_leads_to_crm quand on modifie/enrichit/tague des leads existants. Retourne rapport détaillé (updated/created/skipped).',
      parameters: {
        type: 'object',
        properties: {
          leadIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des leads à mettre à jour (depuis query_espo_leads ou contexte mémorisé). Si omis, utilise contexte mémorisé.'
          },
          updates: {
            type: 'object',
            description: 'Champs à modifier. Utilise mapping correct: industry (secteur), segments (tags), source (origine), etc. INTERDIT: écrire tags dans description. Format tags: segments: ["Cosmétique", "Prospection-IA"]'
          },
          mode: {
            type: 'string',
            enum: ['update_only', 'upsert_with_confirmation', 'force_create'],
            description: 'update_only (défaut, 0 création), upsert_with_confirmation (demande avant créer), force_create (crée sans demander)',
            default: 'update_only'
          }
        },
        required: ['updates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_leads_from_espo',
      description: 'Supprime des leads par IDs. Mode correctif (cleanup, purge, effacer leads vides). Demande confirmation avant exécution. Retourne rapport (deleted/errors).',
      parameters: {
        type: 'object',
        properties: {
          leadIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des leads à supprimer'
          },
          confirm: {
            type: 'boolean',
            description: 'Confirmation utilisateur (true = exécuter suppression)',
            default: false
          }
        },
        required: ['leadIds']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_lead_diff',
      description: 'Génère prévisualisation avant/après pour un lead. Affiche diff des champs modifiés (added/modified/unchanged). APPELLE TOUJOURS CE TOOL AVANT update_leads_in_espo pour montrer à l\'utilisateur ce qui va changer.',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead'
          },
          proposedUpdates: {
            type: 'object',
            description: 'Modifications proposées'
          }
        },
        required: ['leadId', 'proposedUpdates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_uploaded_file_data',
      description: 'Récupère les données du fichier CSV précédemment uploadé. Utilise quand utilisateur fait référence au fichier uploadé.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'import_leads_to_crm',
      description: 'Importe de NOUVEAUX leads dans EspoCRM (premier import de fichier CSV). À utiliser UNIQUEMENT pour premier import de fichier, JAMAIS pour modifier/enrichir leads existants. Si leads existent déjà, utilise update_leads_in_espo à la place.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_custom_field',
      description: 'Crée un champ personnalisé dans EspoCRM (nécessite droits admin). Utilise pour ajouter des champs custom aux entities (Lead, Contact, etc.) selon les besoins du client. Types supportés: varchar, text, int, float, bool, date, datetime, enum, multiEnum, array.',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Entity EspoCRM (Lead, Contact, Account, Opportunity, etc.)',
            default: 'Lead'
          },
          fieldName: {
            type: 'string',
            description: 'Nom technique du champ (camelCase, ex: "secteurActivite", "objetifsBusiness")'
          },
          label: {
            type: 'string',
            description: 'Label affiché (ex: "Secteur d\'activité", "Objectifs business")'
          },
          type: {
            type: 'string',
            enum: ['varchar', 'text', 'int', 'float', 'bool', 'date', 'datetime', 'enum', 'multiEnum', 'array'],
            description: 'Type de champ. varchar=texte court, text=texte long, enum=liste déroulante, multiEnum=multi-sélection, array=tableau'
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Options pour type enum/multiEnum (ex: ["Option1", "Option2"])'
          },
          maxLength: {
            type: 'number',
            description: 'Longueur max pour varchar (défaut: 255)'
          },
          min: {
            type: 'number',
            description: 'Valeur minimale pour int/float'
          },
          max: {
            type: 'number',
            description: 'Valeur maximale pour int/float'
          }
        },
        required: ['fieldName', 'label', 'type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_fields',
      description: 'Met à jour des champs spécifiques sur un ou plusieurs leads. Résolution intelligente par nom/email si ID non fiable. PATCH partiel sans exiger tous les champs. Pour: Tags, Objectifs, Services souhaités, Statut, Prochaines étapes. Crée automatiquement les champs manquants.',
      parameters: {
        type: 'object',
        properties: {
          leads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID du lead (optionnel si nom/email fournis)' },
                name: { type: 'string', description: 'Nom complet du lead (pour résolution)' },
                email: { type: 'string', description: 'Email du lead (pour résolution)' }
              }
            },
            description: 'Liste des leads à mettre à jour. Fournir id OU (name/email) pour résolution'
          },
          fields: {
            type: 'object',
            description: 'Champs à mettre à jour (PATCH partiel). Ex: { "maxTags": ["VIP"], "objectifsBusiness": "Croissance", "servicesSouhaites": "CRM", "statutActions": "En cours", "prochainesEtapes": "Appel suivi" }',
            properties: {
              maxTags: { type: 'array', items: { type: 'string' }, description: 'Tags personnalisés' },
              objectifsBusiness: { type: 'string', description: 'Objectifs business du client' },
              servicesSouhaites: { type: 'string', description: 'Services souhaités par le client' },
              statutActions: { type: 'string', description: 'Statut des actions en cours' },
              prochainesEtapes: { type: 'string', description: 'Prochaines étapes à réaliser' }
            }
          }
        },
        required: ['leads', 'fields']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_lead_snapshot',
      description: 'Affiche un snapshot (panneau récapitulatif) des leads avec les 5 champs clés, sans dépendre du layout EspoCRM. Lit directement via API. Continue même si certains champs sont vides.',
      parameters: {
        type: 'object',
        properties: {
          leads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID du lead' },
                name: { type: 'string', description: 'Nom du lead (pour résolution si pas d\'ID)' },
                email: { type: 'string', description: 'Email du lead (pour résolution si pas d\'ID)' }
              }
            },
            description: 'Liste des leads à afficher. Fournir id OU (name/email)'
          }
        },
        required: ['leads']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'configure_entity_layout',
      description: 'OPÉRATION STRUCTURELLE (PHP): Crée un champ personnalisé ET/OU l\'ajoute aux layouts (list/detail/detailSmall). Utilise UNIQUEMENT pour CRÉER/MODIFIER LA STRUCTURE du CRM, JAMAIS pour lire/lister des données. Pour lister des leads, utilise query_espo_leads à la place.',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Nom de l\'entité (Lead, Contact, Account, etc.)',
            default: 'Lead'
          },
          fieldName: {
            type: 'string',
            description: 'Nom technique du champ à créer/modifier (OBLIGATOIRE). Exemples: "tagsEnrichis", "secteurActivite". Ne JAMAIS passer undefined/null/empty.'
          },
          createField: {
            type: 'boolean',
            description: 'true = créer le champ avant de l\'ajouter aux layouts, false = juste ajouter aux layouts (champ existe déjà)',
            default: false
          },
          fieldDefinition: {
            type: 'object',
            description: 'Définition du champ si createField=true. Ex: {type: "array", maxLength: 255}',
            properties: {
              type: { type: 'string', description: 'Type: varchar, text, array, int, float, bool, date, datetime, enum, multiEnum' },
              maxLength: { type: 'number', description: 'Longueur max pour varchar' },
              options: { type: 'array', items: { type: 'string' }, description: 'Options pour enum/multiEnum' }
            }
          }
        },
        required: ['entity', 'fieldName']
      }
    }
  }
];
