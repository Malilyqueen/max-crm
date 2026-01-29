/**
 * maxTools.js
 * Définition des Tools (Function Calling) pour M.A.X. Admin Opérateur
 */

export const MAX_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_espo_leads',
      description: '📋 UTILISER UNIQUEMENT si: (1) User demande EXPLICITEMENT une LISTE ("montre-moi", "affiche", "liste les leads"), (2) Chercher UN lead SPÉCIFIQUE par NOM ("enrichis Casa Bella" → cherche ID par nom). ⛔ NE JAMAIS utiliser avant actions GLOBALES ("enrichis tous les leads", "mets à jour les tags" → appelle DIRECTEMENT auto_enrich_missing_leads ou update_lead_fields qui gèrent eux-mêmes la recherche).',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filtres EspoCRM. Exemples: {createdAt: {$gte: "2025-01-01"}, isEmpty: true (pour leads vides)}'
          },
          limit: {
            type: 'number',
            description: 'Nombre max de résultats (OBLIGATOIRE - spécifier combien de leads récupérer, ex: 10, 50, 100)'
          },
          sortBy: {
            type: 'string',
            description: 'Champ de tri (ex: "createdAt", "name"). Si non spécifié, pas de tri particulier.'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Ordre de tri : asc (croissant) ou desc (décroissant). Doit être spécifié si sortBy est utilisé.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_leads_in_espo',
      description: '🎯 TOOL PRINCIPAL POUR CRÉATION/IMPORT DE LEADS - UTILISATIONS: 1) force_create + leadData: CRÉER UN LEAD depuis données conversationnelles (quand l\'utilisateur dit "intègre un prospect", "crée un lead" avec nom/email/téléphone). 2) force_create seul: CRÉER depuis fichier CSV uploadé. 3) update_only: mettre à jour leads existants. Retourne rapport détaillé (created/updated/failed).',
      parameters: {
        type: 'object',
        properties: {
          leadIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des leads à mettre à jour (mode update_only uniquement).'
          },
          updates: {
            type: 'object',
            description: 'Champs à modifier en mode update_only.'
          },
          mode: {
            type: 'string',
            enum: ['update_only', 'upsert_with_confirmation', 'force_create'],
            description: 'force_create = CRÉER leads (avec leadData pour création conversationnelle, ou depuis fichier CSV si pas de leadData). update_only = mettre à jour leads existants.',
            default: 'update_only'
          },
          leadData: {
            type: 'object',
            description: '🚨 OBLIGATOIRE pour création conversationnelle: Données du lead à créer. Utiliser les champs EspoCRM: firstName, lastName (ou name), email (ou emailAddress), phone (ou phoneNumber), company (ou accountName), etc.',
            properties: {
              name: { type: 'string', description: 'Nom complet (alternative à firstName/lastName)' },
              firstName: { type: 'string', description: 'Prénom' },
              lastName: { type: 'string', description: 'Nom de famille' },
              email: { type: 'string', description: 'Email (alias emailAddress)' },
              emailAddress: { type: 'string', description: 'Email' },
              phone: { type: 'string', description: 'Téléphone (alias phoneNumber)' },
              phoneNumber: { type: 'string', description: 'Téléphone' },
              company: { type: 'string', description: 'Entreprise (alias accountName)' },
              accountName: { type: 'string', description: 'Entreprise' },
              source: { type: 'string', description: 'Source du lead' },
              status: { type: 'string', description: 'Statut (New, Assigned, In Process, etc.)' },
              industry: { type: 'string', description: 'Secteur d\'activité (champ standard EspoCRM)' },
              secteurActivite: {
                type: 'string',
                description: 'Secteur d\'activité du lead (valeur LIBRE - MAX peut créer de nouvelles valeurs si nécessaire via add_enum_option). Exemples: Tech, Services, Industrie, Commerce, Finance, Consulting, Immobilier, Santé, etc.'
              },
              description: { type: 'string', description: 'Notes/Description' },
              maxTags: { type: 'array', items: { type: 'string' }, description: 'Tags personnalisés (array de strings)' },
              canalPrefere: { type: 'string', description: 'Canal préféré de contact' }
            }
          }
        },
        required: []
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
      name: 'add_enum_option',
      description: `🔧 AJOUTER UNE OPTION À UN ENUM EXISTANT - Utiliser quand une valeur n'existe pas dans un champ enum/multiEnum.

UTILISATIONS:
- Quand EspoCRM rejette une valeur enum inexistante
- Quand MAX doit créer une nouvelle catégorie (ex: "Consulting" pour secteurActivite)
- Pour étendre dynamiquement les listes déroulantes

EXEMPLES:
- Ajouter "Consulting" à secteurActivite
- Ajouter "Immobilier" à industry
- Ajouter "WhatsApp Business" à canalPrefere

⚠️ AUTONOMIE MAX: Ce tool permet à MAX de ne JAMAIS être bloqué par des enums restrictifs.
MAX peut décider d'ajouter une nouvelle valeur si elle est pertinente pour le business.`,
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Entity EspoCRM (Lead, Contact, Account, etc.)',
            default: 'Lead'
          },
          fieldName: {
            type: 'string',
            description: 'Nom du champ enum à modifier (ex: "secteurActivite", "industry", "status")'
          },
          newOption: {
            type: 'string',
            description: 'Nouvelle valeur à ajouter à l\'enum (ex: "Consulting", "Immobilier")'
          },
          newOptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Liste de nouvelles valeurs à ajouter (alternative à newOption pour ajout multiple)'
          }
        },
        required: ['fieldName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_fields',
      description: 'Met à jour des champs spécifiques sur des leads QUI EXISTENT DÉJÀ dans EspoCRM. Résolution intelligente par nom/email. PATCH partiel. Pour: Tags, Objectifs, Services souhaités, Statut, Prochaines étapes. ⚠️ NE PAS UTILISER POUR IMPORT CSV - utilise update_leads_in_espo({mode: "force_create"}) à la place.',
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
            description: 'Champs à mettre à jour (PATCH partiel). Ex: { "tags": ["Cosmétique", "E-commerce", "B2B"], "objectifsBusiness": "Croissance", "servicesSouhaites": "CRM", "statutActions": "En cours", "prochainesEtapes": "Appel suivi" }. IMPORTANT: Utiliser "tags" pour les tags personnalisés (array JSON libre, pas de limitation).',
            properties: {
              tags: { type: 'array', items: { type: 'string' }, description: 'Tags personnalisés complètement libres (n\'importe quelle valeur)' },
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
  },
  {
    type: 'function',
    function: {
      name: 'analyze_and_enrich_leads',
      description: 'ENRICHISSEMENT INTELLIGENT : Analyse automatiquement les emails des leads pour déduire leur secteur d\'activité, services potentiellement intéressants, et tags appropriés. Utilise l\'IA pour comprendre le contexte métier. Parfait pour les demandes type "enrichis à partir des emails", "trouve ce qui pourrait les intéresser", "déduis leurs besoins". Fonctionne sur tous les leads ou sur une sélection spécifique.',
      parameters: {
        type: 'object',
        properties: {
          leadIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des leads à enrichir (depuis query_espo_leads ou contexte mémorisé). Si omis, enrichit TOUS les leads du contexte.'
          },
          applyUpdates: {
            type: 'boolean',
            description: 'true = Applique directement les enrichissements au CRM, false = Prévisualisation seulement',
            default: false
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'auto_enrich_missing_leads',
      description: 'AUTO-ENRICHISSEMENT COMPLET : Trouve automatiquement TOUS les leads qui n\'ont pas de secteur et les enrichit en une seule opération. Aucun argument nécessaire, tout est automatique. Parfait pour "enrichis tous les leads sans secteur", "enrichis les leads vides", "trouve et enrichis les leads manquants". Retourne un rapport détaillé avec le nombre exact de leads traités.',
      parameters: {
        type: 'object',
        properties: {
          dryRun: {
            type: 'boolean',
            description: 'true = Prévisualisation uniquement sans modification, false = Applique les enrichissements (défaut: false)',
            default: false
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Crée une tâche dans EspoCRM liée à un Lead, Contact ou Account. Utilise ce tool pour créer des tâches de suivi après enrichissement (ex: "À relancer dans 3 jours", "Envoyer email Black Friday", "Qualifier pour offre premium"). La tâche apparaîtra dans le panel "Tâches" du lead.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Titre de la tâche (ex: "Relancer Casa Bella Design", "Envoyer offre Black Friday")'
          },
          description: {
            type: 'string',
            description: 'Description détaillée de la tâche avec contexte'
          },
          status: {
            type: 'string',
            description: 'Statut de la tâche',
            enum: ['Not Started', 'Started', 'Completed', 'Canceled', 'Deferred'],
            default: 'Not Started'
          },
          priority: {
            type: 'string',
            description: 'Priorité de la tâche',
            enum: ['Low', 'Normal', 'High', 'Urgent'],
            default: 'Normal'
          },
          dateStart: {
            type: 'string',
            description: 'Date de début au format YYYY-MM-DD (optionnel)'
          },
          dateEnd: {
            type: 'string',
            description: 'Date d\'échéance au format YYYY-MM-DD (optionnel)'
          },
          parentType: {
            type: 'string',
            description: 'Type d\'entité parente',
            enum: ['Lead', 'Contact', 'Account', 'Opportunity'],
            default: 'Lead'
          },
          parentId: {
            type: 'string',
            description: 'ID de l\'entité parente (Lead ID, Contact ID, etc.)'
          },
          assignedUserId: {
            type: 'string',
            description: 'ID de l\'utilisateur assigné (optionnel, sinon assigné à l\'admin)'
          }
        },
        required: ['name', 'parentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_empty_fields',
      description: 'ANALYSE CHAMPS VIDES : Analyse automatiquement quels champs sont vides dans les leads/contacts. Utilise ce tool quand l\'utilisateur demande "quels champs sont vides", "montre-moi les champs vides", "détaille les champs vides". Retourne statistiques détaillées avec pourcentage de remplissage pour chaque champ.',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Nom de l\'entité à analyser',
            default: 'Lead',
            enum: ['Lead', 'Contact', 'Account', 'Opportunity']
          },
          sampleSize: {
            type: 'number',
            description: 'Nombre de records à analyser (défaut: 20)',
            default: 20
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_available_fields',
      description: 'Liste TOUS les champs disponibles sur une entité (Lead, Contact, Account, etc.) incluant les champs custom créés par le client. Utilise ce tool pour découvrir quels champs tu peux lire/modifier avant de faire des opérations. Retourne le nom, type et description de chaque champ.',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Nom de l\'entité à inspecter',
            default: 'Lead',
            enum: ['Lead', 'Contact', 'Account', 'Opportunity']
          }
        },
        required: ['entity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_custom_field',
      description: '🗑️ SUPPRESSION SÉCURISÉE DE CHAMPS CUSTOM : Supprime définitivement un champ personnalisé d\'une entité. ⚠️ GARDE-FOUS STRICTS : (1) Ne supprime QUE les champs avec isCustom=true (impossible de supprimer des champs système comme "name", "email", "status"), (2) Vérifie si le champ contient des données avant suppression, (3) Demande TOUJOURS confirmation utilisateur explicite (userConfirmed=true), (4) Effectue backup automatique avant suppression, (5) Nettoie automatiquement layouts/clientDefs/filters. UTILISATIONS: "supprime le champ X", "retire le champ Y", "nettoie les champs inutilisés".',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Nom de l\'entité (Lead, Contact, Account, etc.)',
            default: 'Lead',
            enum: ['Lead', 'Contact', 'Account', 'Opportunity', 'Task', 'Meeting', 'Call', 'Email']
          },
          fieldName: {
            type: 'string',
            description: 'Nom technique du champ à supprimer (ex: "tags", "maxTags", "customField1"). IMPORTANT: Sera validé pour s\'assurer qu\'il est custom.'
          },
          userConfirmed: {
            type: 'boolean',
            description: 'Confirmation explicite de l\'utilisateur. OBLIGATOIRE. Si false, retourne un message de confirmation à l\'utilisateur avec impact estimé.',
            default: false
          },
          forceDelete: {
            type: 'boolean',
            description: 'Force la suppression même si le champ contient des données. Par défaut false (suppression refusée si données présentes).',
            default: false
          }
        },
        required: ['entity', 'fieldName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reorganize_layout',
      description: '🎨 RÉORGANISATION LAYOUTS : Réorganise l\'ordre des champs dans les layouts (detail/list). Permet de déplacer un champ avant/après un autre champ. UTILISATIONS : "déplace X avant Y", "mets les champs d\'adresse avant description", "réorganise le layout pour mettre Z en premier".',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Nom de l\'entité (Lead, Contact, Account, etc.)',
            default: 'Lead',
            enum: ['Lead', 'Contact', 'Account', 'Opportunity', 'Task', 'Meeting', 'Call']
          },
          layoutType: {
            type: 'string',
            description: 'Type de layout à modifier',
            enum: ['detail', 'list'],
            default: 'detail'
          },
          fieldToMove: {
            type: 'string',
            description: 'Nom du champ à déplacer (ex: "addressStreet", "description")'
          },
          position: {
            type: 'string',
            description: 'Position: "before" ou "after"',
            enum: ['before', 'after']
          },
          referenceField: {
            type: 'string',
            description: 'Champ de référence (ex: "description"). Le champ sera déplacé avant/après ce champ.'
          }
        },
        required: ['entity', 'layoutType', 'fieldToMove', 'position', 'referenceField']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dashlets',
      description: '📊 LISTER DASHLETS : Récupère la configuration actuelle du dashboard EspoCRM (widgets affichés). Utilise pour voir les dashlets existants avant d\'en ajouter, éviter les doublons, ou pour réorganiser. UTILISATIONS : "montre-moi mon dashboard", "quels widgets j\'ai", "liste les dashlets".',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID de l\'utilisateur (optionnel, par défaut utilisateur courant)'
          },
          page: {
            type: 'string',
            description: 'Nom de la page du dashboard (ex: "Home", "MyHomepage")',
            default: 'Home'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_dashlet',
      description: '➕ AJOUTER DASHLET : Ajoute un nouveau widget au dashboard EspoCRM. Types disponibles : Calendar, Activities, List, ReportChart, Stream. UTILISATIONS : "ajoute un calendrier", "ajoute mes activités", "ajoute un graphique".',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'Page du dashboard',
            default: 'Home'
          },
          type: {
            type: 'string',
            description: 'Type de dashlet',
            enum: ['Calendar', 'Activities', 'List', 'ReportChart', 'Stream', 'Leads', 'Cases', 'Opportunities']
          },
          title: {
            type: 'string',
            description: 'Titre du dashlet (ex: "Mes Activités", "Calendrier", "Opportunités par source")'
          },
          position: {
            type: 'object',
            description: 'Position du dashlet sur la grille (colonne 0-2, ligne 0+, largeur 1-3, hauteur 1-4)',
            properties: {
              column: { type: 'number', description: 'Colonne (0=gauche, 1=centre, 2=droite)', minimum: 0, maximum: 2 },
              row: { type: 'number', description: 'Ligne (0=haut, 1, 2...)', minimum: 0 },
              width: { type: 'number', description: 'Largeur en colonnes (1-3)', minimum: 1, maximum: 3, default: 2 },
              height: { type: 'number', description: 'Hauteur en lignes (1-4)', minimum: 1, maximum: 4, default: 2 }
            }
          },
          options: {
            type: 'object',
            description: 'Options spécifiques au type de dashlet',
            properties: {
              entity: { type: 'string', description: 'Pour List: entité à afficher (Lead, Case, Opportunity...)' },
              filter: { type: 'string', description: 'Pour List: filtre à appliquer (ex: myCases, myLeads)' },
              reportId: { type: 'string', description: 'Pour ReportChart: ID du rapport à afficher' },
              scope: { type: 'array', items: { type: 'string' }, description: 'Pour Calendar: entités à afficher (Meeting, Call, Task)' }
            }
          }
        },
        required: ['type', 'title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_dashlet',
      description: '✏️ MODIFIER DASHLET : Modifie un widget existant (titre, position, options). UTILISATIONS : "déplace le calendrier en haut", "renomme le widget", "change la position".',
      parameters: {
        type: 'object',
        properties: {
          dashletId: {
            type: 'string',
            description: 'ID du dashlet à modifier'
          },
          title: {
            type: 'string',
            description: 'Nouveau titre (optionnel)'
          },
          position: {
            type: 'object',
            description: 'Nouvelle position (optionnel)',
            properties: {
              column: { type: 'number', minimum: 0, maximum: 2 },
              row: { type: 'number', minimum: 0 },
              width: { type: 'number', minimum: 1, maximum: 3 },
              height: { type: 'number', minimum: 1, maximum: 4 }
            }
          },
          options: {
            type: 'object',
            description: 'Nouvelles options (optionnel)'
          }
        },
        required: ['dashletId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_dashlet',
      description: '🗑️ SUPPRIMER DASHLET : Supprime un widget du dashboard. UTILISATIONS : "supprime le calendrier", "retire ce widget", "enlève le graphique".',
      parameters: {
        type: 'object',
        properties: {
          dashletId: {
            type: 'string',
            description: 'ID du dashlet à supprimer'
          }
        },
        required: ['dashletId']
      }
    }
  },

  // ========== EXTENSION MACREA CORE UNIVERSAL ==========
  {
    type: 'function',
    function: {
      name: 'enrich_lead_universal',
      description: '🌍 ENRICHIR LEAD UNIVERSEL : Enrichit un lead avec les champs CORE universels (adaptatif tous secteurs). UTILISATIONS : "Enrichis le lead X", "Analyse ce lead", "Déduis le secteur de ce lead".',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead à enrichir'
          },
          source: {
            type: 'string',
            description: 'Origine du lead (LIBRE : Facebook Ads, Google, Salon, Bouche-à-oreille, etc.)'
          },
          tagsIA: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags générés LIBREMENT par M.A.X. selon le contexte (ex: #assurance-vie, #e-commerce, #coaching, etc.)'
          },
          secteurInfere: {
            type: 'string',
            description: 'Secteur déduit LIBREMENT (JAMAIS bridé : "Assurance vie", "E-commerce bijoux", "Logistique diaspora", etc.)'
          },
          typeClient: {
            type: 'string',
            description: 'Type client LIBRE (B2B, B2C, Diaspora, Auto-entrepreneur, etc.)'
          },
          niveauMaturite: {
            type: 'string',
            description: 'Maturité commerciale LIBRE (Froid, Tiède, Chaud, VIP, Dormant, etc.)'
          },
          canalPrefere: {
            type: 'string',
            description: 'Canal préféré LIBRE (WhatsApp, Email, Téléphone, Instagram DM, etc.)'
          },
          objectifsClient: {
            type: 'string',
            description: 'Objectifs déclarés ou déduits du client'
          },
          servicesSouhaites: {
            type: 'string',
            description: 'Services demandés par le client'
          },
          notesIA: {
            type: 'string',
            description: 'Synthèse intelligente du lead généré par M.A.X.'
          },
          prochaineAction: {
            type: 'string',
            description: 'Prochaine action recommandée (Rappeler, Envoyer devis, Relancer, etc.)'
          },
          prochaineRelance: {
            type: 'string',
            description: 'Date de prochaine relance (format YYYY-MM-DD)'
          },
          scoreIA: {
            type: 'integer',
            description: 'Score de priorité 0-100 (0-30: froid, 31-60: tiède, 61-85: chaud, 86-100: VIP)',
            minimum: 0,
            maximum: 100
          }
        },
        required: ['leadId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_mission_max',
      description: '📋 CRÉER MISSION M.A.X. : Enregistre une mission effectuée par M.A.X. pour traçabilité. UTILISATIONS : Après chaque enrichissement, diagnostic, ou action significative.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom de la mission (ex: "Enrichissement IA - Lead Assurance Vie")'
          },
          typeAction: {
            type: 'string',
            description: 'Type d\'action (enrichissement, diagnostic, analyse, automation, etc.)'
          },
          description: {
            type: 'string',
            description: 'Description détaillée de la mission'
          },
          resultat: {
            type: 'string',
            description: 'Résultat de la mission'
          },
          leadId: {
            type: 'string',
            description: 'ID du lead concerné (optionnel)'
          },
          accountId: {
            type: 'string',
            description: 'ID du compte concerné (optionnel)'
          },
          statutExecution: {
            type: 'string',
            description: 'Statut d\'exécution (Réussi, Échoué, Partiel, etc.)'
          },
          tokensUtilises: {
            type: 'integer',
            description: 'Nombre de tokens utilisés pour cette mission'
          },
          dureeExecution: {
            type: 'integer',
            description: 'Durée d\'exécution en secondes'
          }
        },
        required: ['name', 'typeAction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_diagnostic_ia',
      description: '🔍 GÉNÉRER DIAGNOSTIC IA : Génère un diagnostic complet d\'un lead (SWOT-style). UTILISATIONS : "Fais-moi un diagnostic du lead X", "Analyse en profondeur ce prospect".',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead à diagnostiquer'
          },
          syntheseIA: {
            type: 'string',
            description: 'Synthèse intelligente du lead'
          },
          forcesDetectees: {
            type: 'string',
            description: 'Forces et points forts détectés'
          },
          opportunites: {
            type: 'string',
            description: 'Opportunités commerciales identifiées'
          },
          risques: {
            type: 'string',
            description: 'Risques ou freins détectés'
          },
          recommandations: {
            type: 'string',
            description: 'Recommandations stratégiques de M.A.X.'
          },
          scoreConfiance: {
            type: 'integer',
            description: 'Score de confiance du diagnostic (0-100)',
            minimum: 0,
            maximum: 100,
            default: 70
          }
        },
        required: ['leadId', 'syntheseIA']
      }
    }
  },

  // ========== TOOLS BULLE M.A.X. & EMAIL ==========
  {
    type: 'function',
    function: {
      name: 'create_email_template',
      description: '📧 CRÉER TEMPLATE EMAIL : Crée un template d\'email dans EspoCRM (catégorie MaCréa CORE). UTILISATIONS : "Crée un template pour relance lead", "Génère un email de bienvenue".',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du template (ex: "Relance Lead Chaud", "Bienvenue Nouveau Client")'
          },
          subject: {
            type: 'string',
            description: 'Sujet de l\'email'
          },
          bodyHtml: {
            type: 'string',
            description: 'Corps de l\'email en HTML'
          },
          category: {
            type: 'string',
            description: 'Catégorie du template',
            default: 'MaCréa CORE'
          }
        },
        required: ['name', 'subject', 'bodyHtml']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_missions_for_lead',
      description: '📋 LIRE MISSIONS LEAD : Récupère toutes les missions M.A.X. associées à un lead. UTILISATIONS : "Qu\'ai-je fait pour ce lead ?", "Historique des actions M.A.X.".',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead'
          },
          limit: {
            type: 'integer',
            description: 'Nombre maximum de missions à retourner',
            default: 10
          },
          orderBy: {
            type: 'string',
            description: 'Champ de tri (dateExecution, name, etc.)',
            default: 'dateExecution'
          },
          order: {
            type: 'string',
            description: 'Ordre de tri (asc ou desc)',
            default: 'desc'
          }
        },
        required: ['leadId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: `📱 ENVOYER MESSAGE WHATSAPP PERSONNALISÉ : Envoie un message WhatsApp TOTALEMENT PERSONNALISÉ et UNIQUE via n8n.

⚠️ QUAND UTILISER CET OUTIL:
- L'utilisateur demande un message PERSONNALISÉ spécifique (ex: "Dis-lui bonjour et demande-lui si tout va bien")
- Le message NE CORRESPOND PAS à un template existant (confirmation, relance, etc.)
- L'utilisateur dit explicitement le CONTENU EXACT du message à envoyer

❌ NE PAS utiliser pour:
- Confirmations de rendez-vous → utiliser send_whatsapp_template avec "Confirmation RDV"
- Relances commerciales → utiliser send_whatsapp_template avec "Relance J+3"
- Messages récurrents → utiliser send_whatsapp_template

💡 STRATÉGIE: Toujours vérifier d'abord avec list_whatsapp_templates si un template existe avant d'utiliser cet outil.`,
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead à contacter (doit avoir un numéro de téléphone)'
          },
          message: {
            type: 'string',
            description: 'Message à envoyer (peut inclure des emojis). Exemple: "Bonjour {nom}, je reviens vers vous concernant votre demande..."'
          },
          delayMinutes: {
            type: 'number',
            description: 'Délai avant envoi en minutes (0 = immédiat, 60 = dans 1h, 4320 = dans 3 jours)',
            default: 0
          }
        },
        required: ['leadId', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_whatsapp_templates',
      description: '📋 LISTER TEMPLATES WHATSAPP : Liste tous les messages WhatsApp disponibles (approuvés par Twilio). UTILISATIONS : "Quels messages WhatsApp je peux envoyer ?", "Montre-moi les templates WhatsApp", "Liste les messages disponibles". Retourne les templates avec leur nom, type, variables attendues et status.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filtrer par type de message (appointment, follow_up, cart, promo, etc.). Optionnel.',
            enum: ['appointment', 'follow_up', 'cart', 'promo', 'notification', 'all']
          },
          status: {
            type: 'string',
            description: 'Filtrer par statut (active, draft, archived). Par défaut: active',
            enum: ['active', 'draft', 'archived', 'all'],
            default: 'active'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_template',
      description: `📱 ENVOYER TEMPLATE WHATSAPP (OUTIL PRIORITAIRE) : Envoie un message WhatsApp professionnel via un template Twilio approuvé.

✅ TOUJOURS UTILISER CET OUTIL POUR:
- Confirmations de rendez-vous (ex: "Envoie une confirmation RDV à Jean")
- Relances commerciales (ex: "Relance ce lead", "Fais un suivi")
- Rappels (ex: "Rappelle-lui son RDV demain")
- Messages récurrents ou professionnels
- Quand l'utilisateur mentionne: confirmation, relance, rappel, suivi, panier, événement, commande

💡 AUTO-RÉSOLUTION: M.A.X. extrait automatiquement les infos du lead (nom, date RDV, produits, etc.)

🎯 STRATÉGIE D'UTILISATION:
1. L'utilisateur demande un envoi WhatsApp → TOUJOURS chercher d'abord un template correspondant
2. Si aucun template ne correspond → utiliser send_whatsapp_message en dernier recours`,
      parameters: {
        type: 'object',
        properties: {
          messageName: {
            type: 'string',
            description: 'Nom du template WhatsApp à utiliser (ex: "Confirmation RDV", "Relance J+3", "Panier abandonné"). M.A.X. cherche le template par son nom.'
          },
          leadIdentifier: {
            type: 'string',
            description: 'ID du lead OU nom complet du lead (ex: "69272eee2a489f7a6" ou "Jean Dupont"). M.A.X. résout automatiquement le lead.'
          },
          variables: {
            type: 'object',
            description: 'Variables optionnelles à envoyer au template. Si non fourni, M.A.X. les extrait automatiquement du lead. Exemples: {"prenom": "Jean", "date": "15/12/2025", "heure": "14h30", "produits": "Crème hydratante", "montant": "45€"}'
          },
          autoResolve: {
            type: 'boolean',
            description: 'Si true (défaut), M.A.X. extrait automatiquement les variables depuis EspoCRM. Si false, utilise uniquement les variables fournies.',
            default: true
          }
        },
        required: ['messageName', 'leadIdentifier']
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧠 TOOLS MÉMOIRE LONGUE DURÉE (Phase 2B+ - Objectifs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'function',
    function: {
      name: 'store_tenant_goal',
      description: `🎯 Enregistrer un objectif business mesurable dans la mémoire long terme.

UTILISATION:
- Quand l'utilisateur dit: "Note que mon objectif est...", "Retiens mon objectif...", "Je veux atteindre..."
- Détection implicite: "Mon objectif cette année est 5000 clients" → objectif détecté

CLASSIFICATION OBJECTIF:
✅ Contient un résultat mesurable (ex: "5000 clients", "50k€", "20%")
✅ A une métrique/KPI/valeur cible
✅ Notion de progression (avant/après)
✅ Peut avoir une deadline
✅ Ambition business claire

EXEMPLES:
- "Atteindre 5000 clients" → goal_text, target_value: 5000, unit: "clients"
- "Augmenter conversions de 20%" → goal_category: "conversion", target_value: 20, unit: "pourcentage"
- "Automatiser relances avant mars" → goal_text, deadline: "2025-03-31"

CONFIRMATION OBLIGATOIRE:
Après enregistrement, tu DOIS confirmer à l'utilisateur:
"✅ Objectif enregistré : [goal_text]
Je vais suivre ta progression et adapter mes recommandations."`,
      parameters: {
        type: 'object',
        properties: {
          goal_text: {
            type: 'string',
            description: 'Description complète de l\'objectif (ex: "Atteindre 5000 clients actifs")'
          },
          goal_category: {
            type: 'string',
            enum: ['acquisition', 'conversion', 'retention', 'automation', 'revenue', 'other'],
            description: 'Catégorie de l\'objectif'
          },
          target_value: {
            type: 'number',
            description: 'Valeur cible à atteindre (ex: 5000 pour "5000 clients")'
          },
          current_value: {
            type: 'number',
            description: 'Progression actuelle (optionnel, default: 0)'
          },
          unit: {
            type: 'string',
            description: 'Unité de mesure (ex: "clients", "euros", "pourcentage", "leads")'
          },
          deadline: {
            type: 'string',
            description: 'Date limite au format ISO 8601 (ex: "2025-03-31T23:59:59Z")'
          },
          priority: {
            type: 'integer',
            description: 'Priorité de 1 à 100 (défaut: 50, max: 100)',
            minimum: 1,
            maximum: 100
          }
        },
        required: ['goal_text']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'update_tenant_goal',
      description: `🔄 Mettre à jour un objectif existant (progression, statut, deadline).

UTILISATION:
- Progression mise à jour: "J'ai atteint 3500 clients" (cherche objectif avec target_value clients)
- Changement deadline: "Finalement, mon objectif c'est avant juin"
- Modification: "Mon objectif est maintenant 6000 clients" (après confirmation utilisateur)

RÈGLE IMPORTANTE:
⚠️ Si l'objectif à mettre à jour CONTREDIT un objectif existant, tu DOIS demander confirmation:
"Ton objectif actuel : [ancien]
Nouvel objectif : [nouveau]
Options:
1️⃣ Remplacer l'ancien
2️⃣ Ajouter un objectif distinct
3️⃣ Archiver l'ancien et créer le nouveau
Quelle option préfères-tu?"

N'enregistre qu'après confirmation.`,
      parameters: {
        type: 'object',
        properties: {
          goal_id: {
            type: 'string',
            description: 'ID de l\'objectif à mettre à jour (obtenu via get_tenant_context)'
          },
          goal_text: {
            type: 'string',
            description: 'Nouvelle description (optionnel)'
          },
          current_value: {
            type: 'number',
            description: 'Nouvelle progression actuelle'
          },
          target_value: {
            type: 'number',
            description: 'Nouvelle valeur cible'
          },
          deadline: {
            type: 'string',
            description: 'Nouvelle deadline ISO 8601'
          },
          status: {
            type: 'string',
            enum: ['actif', 'atteint', 'abandonné', 'archivé'],
            description: 'Nouveau statut'
          },
          priority: {
            type: 'integer',
            description: 'Nouvelle priorité (1-100)',
            minimum: 1,
            maximum: 100
          }
        },
        required: ['goal_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'archive_tenant_goal',
      description: `🗑️ Archiver un objectif (soft delete).

UTILISATION:
- "Supprime mon objectif de 5000 clients"
- "Oublie cet objectif"
- "Je n'ai plus cet objectif"
- "Retire l'objectif X"

CONFIRMATION OBLIGATOIRE:
Après archivage, tu DOIS confirmer:
"✅ J'ai archivé ton objectif '[goal_text]'.
Je ne le prendrai plus en compte dans mes recommandations."

RÈGLE:
L'objectif n'est PAS supprimé définitivement, il est marqué comme archivé (archived=true).
Il n'apparaîtra plus dans tes recommandations futures.`,
      parameters: {
        type: 'object',
        properties: {
          goal_id: {
            type: 'string',
            description: 'ID de l\'objectif à archiver'
          },
          reason: {
            type: 'string',
            description: 'Raison de l\'archivage (optionnel, ex: "Objectif abandonné", "Objectif atteint")'
          }
        },
        required: ['goal_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'get_tenant_context',
      description: `🧠 Charger la mémoire longue durée complète du tenant (objectifs + profil + notes).

UTILISATION AUTOMATIQUE:
⚠️ Tu DOIS appeler ce tool AUTOMATIQUEMENT (silencieusement) pour CHAQUE question stratégique:
- "Comment améliorer mes ventes ?"
- "Quelle stratégie me recommandes-tu ?"
- "Aide-moi à qualifier mes leads"
- "Comment atteindre mes objectifs ?"

RÈGLE CRITIQUE:
✅ TOUJOURS charger le contexte en début de réponse stratégique
✅ ADAPTER ta réponse pour renforcer les objectifs actifs
✅ RESPECTER les préférences et contraintes du profil
✅ NE JAMAIS mentionner que tu as chargé ces données (invisible pour l'utilisateur)

EXEMPLE:
User: "Comment améliorer mes ventes ?"

[Tu charges silencieusement:]
- Objectifs: "Atteindre 5000 clients"
- Profil: "Canal préféré = WhatsApp", "Budget limité"
- Notes: "En plein pivot B2B"

[Ta réponse intègre tout sans le mentionner:]
"Pour atteindre tes 5000 clients, voici ce que je recommande:
1️⃣ Segmenter tes leads B2B
2️⃣ Prioriser WhatsApp pour relances
3️⃣ Automatiser via n8n (pas de coût pub)"`,
      parameters: {
        type: 'object',
        properties: {
          include_goals: {
            type: 'boolean',
            description: 'Inclure objectifs actifs (défaut: true)',
            default: true
          },
          include_profile: {
            type: 'boolean',
            description: 'Inclure profil complet (défaut: true)',
            default: true
          },
          include_notes: {
            type: 'boolean',
            description: 'Inclure notes longues récentes (défaut: true)',
            default: true
          },
          notes_limit: {
            type: 'integer',
            description: 'Nombre max de notes à charger (défaut: 10)',
            default: 10
          }
        }
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'store_tenant_profile',
      description: `🔧 Enregistrer une préférence, contrainte, ou information de profil durable.

UTILISATION:
- Quand l'utilisateur dit: "Retiens que je préfère...", "Note que je ne fais jamais...", "Je travaille avec..."
- Détection implicite: "Ma cible c'est...", "Je préfère WhatsApp", "Je tutoie mes prospects"

CLASSIFICATION PROFIL:
✅ Préférence stable (canal, méthode, style)
✅ Contrainte/interdiction métier
✅ Style de communication
✅ Cible client
✅ Information business stable

EXEMPLES:
- "Je préfère WhatsApp" → profile_key: "canal_contact_prefere", profile_value: "WhatsApp"
- "Je ne fais jamais de pub Facebook" → profile_key: "contrainte_marketing", profile_value: {"interdiction": "publicité Facebook", "raison": "budget limité"}
- "Je tutoie mes prospects" → profile_key: "style_communication", profile_value: "tutoiement"
- "Ma cible = mamans entrepreneures" → profile_key: "cible_client", profile_value: "mamans entrepreneures"

CONFIRMATION OBLIGATOIRE:
"✅ Préférence enregistrée :

📝 [Ce qui a été retenu]

Je privilégierai ceci dans toutes mes suggestions futures."`,
      parameters: {
        type: 'object',
        properties: {
          profile_key: {
            type: 'string',
            description: 'Clé identifiant la préférence (ex: canal_contact_prefere, style_communication, contrainte_marketing, cible_client)'
          },
          profile_value: {
            description: 'Valeur de la préférence (peut être string, object, ou array)'
          },
          category: {
            type: 'string',
            enum: ['canal', 'style_communication', 'contrainte', 'cible_client', 'methode_travail', 'secteur', 'other'],
            description: 'Catégorie de la préférence'
          },
          priority: {
            type: 'integer',
            description: 'Priorité (1-100, défaut: 80)',
            minimum: 1,
            maximum: 100,
            default: 80
          }
        },
        required: ['profile_key', 'profile_value']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'update_tenant_profile',
      description: `🔄 Mettre à jour une préférence existante.

UTILISATION:
- "Finalement, je préfère les emails" (après avoir dit "je préfère WhatsApp")
- "Ma cible c'est maintenant les entreprises B2B" (après avoir dit "mamans entrepreneures")

RÈGLE IMPORTANTE:
⚠️ Si la préférence CONTREDIT une préférence existante, tu DOIS demander confirmation:
"J'ai actuellement : [ancienne préférence]
Tu viens de dire : [nouvelle préférence]

Souhaites-tu mettre à jour cette préférence ?"

N'enregistre qu'après confirmation.`,
      parameters: {
        type: 'object',
        properties: {
          profile_key: {
            type: 'string',
            description: 'Clé de la préférence à mettre à jour'
          },
          profile_value: {
            description: 'Nouvelle valeur (peut être string, object, ou array)'
          }
        },
        required: ['profile_key', 'profile_value']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'archive_tenant_profile',
      description: `🗑️ Supprimer une préférence (soft delete).

UTILISATION:
- "Oublie ma préférence pour WhatsApp"
- "Supprime la contrainte sur Facebook"
- "Retire ça de mon profil"

CONFIRMATION OBLIGATOIRE:
"✅ J'ai supprimé la préférence '[profile_key]'.
Je ne la prendrai plus en compte."`,
      parameters: {
        type: 'object',
        properties: {
          profile_key: {
            type: 'string',
            description: 'Clé de la préférence à supprimer'
          }
        },
        required: ['profile_key']
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📝 NOTES LONGUES (tenant_memory avec memory_type='note')
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'function',
    function: {
      name: 'store_long_term_note',
      description: `📝 Enregistrer une note contextuelle, réflexion, ou information longue durée.

CLASSIFICATION NOTE LONGUE:
✅ Contexte business temporaire mais important
✅ Pivot stratégique en cours
✅ Réflexion / nuance importante
✅ Situation particulière à retenir
✅ Pas une préférence stable (→ profil) ni un objectif mesurable (→ goal)

EXEMPLES:
- "Je suis en plein pivot vers le B2B" → note contextuelle sur changement stratégique
- "Période difficile, je cherche des revenus rapides" → note sur contrainte temporelle
- "Je teste une nouvelle approche LinkedIn" → note sur expérimentation
- "Mon concurrent principal vient de fermer" → note sur contexte marché
- "Je viens de recruter un commercial" → note sur changement organisationnel

DIFFÉRENCE avec PROFIL:
❌ PROFIL = stable, permanent (ex: "Je travaille avec des PME")
✅ NOTE = contextuel, évolutif (ex: "Je suis en pivot B2B")`,
      parameters: {
        type: 'object',
        properties: {
          note_title: {
            type: 'string',
            description: 'Titre court de la note (ex: "Pivot vers B2B en cours")'
          },
          note_content: {
            type: 'string',
            description: 'Contenu détaillé de la note'
          },
          note_category: {
            type: 'string',
            enum: ['pivot_business', 'contrainte_temporelle', 'experimentation', 'contexte_marche', 'changement_organisation', 'reflexion_strategique', 'other'],
            description: 'Catégorie de la note'
          },
          priority: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 60,
            description: 'Priorité (1-100, défaut 60)'
          }
        },
        required: ['note_title', 'note_content']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'archive_long_term_note',
      description: `🗑️ Supprimer une note longue durée (soft delete).

Utiliser quand :
- L'utilisateur demande d'oublier la note
- La note n'est plus pertinente
- Le contexte a changé`,
      parameters: {
        type: 'object',
        properties: {
          note_title: {
            type: 'string',
            description: 'Titre de la note à archiver'
          }
        },
        required: ['note_title']
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔧 TOOLS SELF-HEALING & TROUBLESHOOTING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'function',
    function: {
      name: 'consult_troubleshooting_playbook',
      description: `🔧 CONSULTER GUIDE DE DÉPANNAGE : Consulte un playbook de troubleshooting quand M.A.X. rencontre un problème technique. Les playbooks contiennent des diagnostics étape par étape, solutions alternatives, et messages formatés pour l'utilisateur.

UTILISATIONS AUTOMATIQUES:
- Après 2 tentatives échouées d'une opération
- Quand une vérification post-opération détecte une anomalie
- Quand M.A.X. ne sait pas comment procéder face à une erreur

PLAYBOOKS DISPONIBLES:
- field_update_failed : Champ CRM ne se met pas à jour
- whatsapp_send_failed : Envoi WhatsApp échoue (n8n, Twilio, template)
- email_send_failed : Envoi email échoue
- crm_connection_failed : Connexion EspoCRM timeout/auth

EXEMPLE D'USAGE:
Utilisateur: "Mets à jour le nom de famille à RAMAHA"
M.A.X.: *tente mise à jour* ✅ "Mis à jour"
M.A.X.: *vérifie* ❌ "Valeur toujours 'AI Studio'"
M.A.X.: *consulte playbook* → trouve solution → "Je vais essayer avec le champ API exact..."

Le playbook retourne:
1. Diagnostic du problème
2. 2-3 solutions alternatives par ordre de priorité
3. Message formaté à afficher à l'utilisateur
4. Code d'implémentation si applicable`,
      parameters: {
        type: 'object',
        properties: {
          issue: {
            type: 'string',
            description: 'Type de problème rencontré',
            enum: [
              'field_update_failed',
              'whatsapp_send_failed',
              'email_send_failed',
              'lead_import_failed',
              'crm_sync_failed',
              'enrichment_failed',
              'workflow_n8n_failed',
              'search_no_results',
              'general_error'
            ]
          },
          context: {
            type: 'object',
            description: 'Contexte additionnel pour aider au diagnostic. Exemples: {field: "lastName", expectedValue: "RAMAHA", actualValue: "AI Studio", leadId: "123"} ou {error: "ECONNREFUSED", template: "Confirmation RDV"}'
          },
          getUserFacing: {
            type: 'boolean',
            description: 'Si true, retourne un message formaté prêt à afficher à l\'utilisateur. Si false, retourne le diagnostic technique complet.',
            default: true
          }
        },
        required: ['issue']
      }
    }
  },

  // ============================================================
  // TEMPLATE CREATION - MAX peut créer des brouillons de templates
  // ============================================================
  {
    type: 'function',
    function: {
      name: 'create_template_draft',
      description: `📝 CRÉER UN BROUILLON DE TEMPLATE (Email/SMS/WhatsApp) - Utiliser quand l'utilisateur demande:
- "crée un email de relance"
- "génère un template WhatsApp pour les RDV"
- "fais-moi un SMS de rappel"
- "prépare un message de bienvenue"

Le template est créé en status='draft' et visible dans Pilote Automatique > Modèles de Templates.
L'utilisateur devra l'activer manuellement avant utilisation.

IMPORTANT: Génère un contenu professionnel avec des variables {{firstName}}, {{company}}, etc.`,
      parameters: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            enum: ['email', 'sms', 'whatsapp'],
            description: 'Canal de communication'
          },
          name: {
            type: 'string',
            description: 'Nom du template (court et descriptif). Ex: "Relance Lead J+3", "Confirmation RDV"'
          },
          subject: {
            type: 'string',
            description: 'Sujet de l\'email (OBLIGATOIRE pour channel=email). Peut contenir des variables {{...}}'
          },
          content: {
            type: 'string',
            description: 'Contenu du message. Utiliser des variables {{firstName}}, {{lastName}}, {{company}}, {{email}}, {{phone}}, {{appointmentDate}}, {{appointmentTime}}, {{salesRep}}, etc.'
          },
          category: {
            type: 'string',
            enum: ['vente', 'support', 'marketing', 'facturation', 'securite', 'general'],
            description: 'Catégorie du template',
            default: 'general'
          }
        },
        required: ['channel', 'name', 'content']
      }
    }
  },

  // ==========================================================================
  // UPDATE TEMPLATE - Modifier un template de message (WhatsApp/Email/SMS)
  // ==========================================================================
  {
    type: 'function',
    function: {
      name: 'update_template',
      description: `✏️ MODIFIER UN TEMPLATE DE MESSAGE WhatsApp/Email/SMS

⚠️ CE TOOL EST POUR LES TEMPLATES DE MESSAGES M.A.X. (table message_templates)
   PAS pour les templates EspoCRM !

UTILISER OBLIGATOIREMENT quand l'utilisateur demande de modifier un template créé par MAX:
- "modifie le template a43b7aef"
- "change le contenu du template Relance Devis"
- "mets à jour le template WhatsApp"
- "ajoute un emoji au template"
- "améliore ce template de relance"

L'ID peut être complet (UUID) ou les 8 premiers caractères comme "a43b7aef".
Le template sera mis à jour dans la base de données Supabase.`,
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template de message à modifier. Peut être l\'UUID complet ou les 8 premiers caractères (ex: "a43b7aef")'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du template (optionnel)'
          },
          subject: {
            type: 'string',
            description: 'Nouveau sujet - uniquement pour les templates EMAIL'
          },
          content: {
            type: 'string',
            description: 'Nouveau contenu du message WhatsApp/Email/SMS. Utiliser {{firstName}}, {{company}}, etc. pour les variables.'
          },
          category: {
            type: 'string',
            enum: ['vente', 'support', 'marketing', 'facturation', 'securite', 'general'],
            description: 'Nouvelle catégorie du template'
          }
        },
        required: ['template_id']
      }
    }
  },

  // ==========================================================================
  // LIST TEMPLATES - Lister les templates de messages disponibles
  // ==========================================================================
  {
    type: 'function',
    function: {
      name: 'list_templates',
      description: `📋 LISTER LES TEMPLATES DE MESSAGES (WhatsApp/Email/SMS)

UTILISER quand l'utilisateur demande:
- "montre-moi les templates"
- "quels templates existent"
- "liste les modèles de messages"
- "trouve le template de relance"
- AVANT de modifier un template si l'ID n'est pas connu

Retourne la liste des templates avec leur ID, nom, canal et statut.`,
      parameters: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            enum: ['email', 'sms', 'whatsapp'],
            description: 'Filtrer par canal (optionnel)'
          },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'archived'],
            description: 'Filtrer par statut (optionnel)'
          },
          search: {
            type: 'string',
            description: 'Rechercher par nom (optionnel)'
          }
        },
        required: []
      }
    }
  }
];

export default MAX_TOOLS;
