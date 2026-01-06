# 📋 Récapitulatif Session - Extension MaCréa CORE Universelle

**Date** : 23 Novembre 2025
**Objectif** : Implémenter l'Extension MaCréa CORE Universelle (non-bridée) pour M.A.X.

---

## ✅ 1. Optimisations M.A.X. BETA Effectuées

### 1.1 Fenêtre Glissante 72h + Limite 100 Messages

**Problème résolu** : M.A.X. chargeait TOUT l'historique à chaque message → explosion tokens

**Solution implémentée** :
- **Fichier modifié** : [lib/conversationService.js](D:\Macrea\CRM\max_backend\lib\conversationService.js)
- **Lignes 22-24** : Ajout des constantes `MAX_HISTORY_DURATION_HOURS=72` et `MAX_HISTORY_MESSAGES=100`
- **Lignes 105-132** : Nouvelle fonction `getContextMessages` avec fenêtre glissante

**Comment ça marche** :
```javascript
// Messages > 72h → EXPIRÉS (supprimés du contexte)
// Messages < 72h ET > 100 → Garde seulement les 100 derniers
// Résultat : Maximum 100 messages envoyés à GPT-4o-mini
```

**Variables d'environnement ajoutées** ([.env](D:\Macrea\CRM\max_backend\.env#L17-L21)) :
```env
MAX_HISTORY_DURATION_HOURS=72
MAX_HISTORY_MESSAGES=100
```

**Avantages** :
- ✅ Économie de tokens (pas + de 100 messages chargés)
- ✅ Contexte conservé sur 72h (l'utilisateur peut revenir le lendemain)
- ✅ Compatible GPT-4o-mini (pas de dépassement context window 16k)

---

### 1.2 Newsletter COMPACT

**Problème** : NEWSLETTER_CREATION.txt faisait ~10k chars → surcharge GPT-4o-mini

**Solution** :
- **Fichier créé** : [prompts/NEWSLETTER_CREATION_COMPACT.txt](D:\Macrea\CRM\max_backend\prompts\NEWSLETTER_CREATION_COMPACT.txt)
- **Réduction** : 10 000+ chars → ~2 000 chars
- **Fichier modifié** : [routes/chat.js:82](D:\Macrea\CRM\max_backend\routes\chat.js#L82) - Charge maintenant la version COMPACT

---

## ✅ 2. Extension MaCréa CORE Universelle - Fichiers Créés

### 2.1 Structure de l'Extension

```
extensions/
└── macrea-core-universal/
    ├── config.json                  ✅ CRÉÉ
    ├── prompts.txt                  ✅ CRÉÉ
    └── metadata/
        └── entityDefs/
            ├── Lead.json            ✅ CRÉÉ
            ├── MissionMAX.json      ✅ CRÉÉ
            └── DiagnosticIA.json    ✅ CRÉÉ
```

---

### 2.2 Champs CORE Lead (13 champs)

**Fichier** : [extensions/macrea-core-universal/metadata/entityDefs/Lead.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\Lead.json)

| # | Champ | Type | Description | Bridé ? |
|---|-------|------|-------------|---------|
| 1 | `source` | varchar | Origine du lead (Facebook Ads, Google, etc.) | ❌ LIBRE |
| 2 | `tagsIA` | array | Tags générés par M.A.X. | ❌ LIBRE |
| 3 | `notesIA` | text | Synthèse intelligente du lead | ❌ LIBRE |
| 4 | `objectifsClient` | text | Objectifs déclarés ou déduits | ❌ LIBRE |
| 5 | `servicesSouhaites` | text | Services demandés | ❌ LIBRE |
| 6 | `secteurInfere` | varchar | Secteur déduit (PAS D'ENUM !) | ❌ LIBRE |
| 7 | `typeClient` | varchar | Typologie (B2B, B2C, diaspora, etc.) | ❌ LIBRE |
| 8 | `niveauMaturite` | varchar | Maturité (froid, chaud, VIP, etc.) | ❌ LIBRE |
| 9 | `canalPrefere` | varchar | Canal préféré (WhatsApp, Email, etc.) | ❌ LIBRE |
| 10 | `prochaineAction` | text | Action recommandée | ❌ LIBRE |
| 11 | `prochaineRelance` | date | Date de prochaine relance | - |
| 12 | `statutNurturing` | enum | Statut parcours (Nouveau, Engagé, etc.) | ⚠️ Enum générique |
| 13 | `scoreIA` | int | Score priorité 0-100 | - |

**Philosophie** : AUCUN champ bridé → M.A.X. invente librement selon le secteur du lead

---

### 2.3 Nouvelle Entité : MissionMAX

**Fichier** : [extensions/macrea-core-universal/metadata/entityDefs/MissionMAX.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\MissionMAX.json)

**But** : Tracker toutes les actions effectuées par M.A.X.

**Champs principaux** :
- `name` : Titre de la mission
- `typeAction` : enrichissement, création, suggestion, campagne, etc.
- `description` : Description détaillée
- `resultat` : Résultat de l'action
- `lead` : Lien vers Lead concerné
- `dateExecution` : Date/heure d'exécution
- `statutExecution` : En cours, Réussi, Échec, Annulé
- `tokensUtilises` : Nombre de tokens consommés
- `dureeExecution` : Durée en secondes

**Relation** : Lead ↔ MissionMAX (1-n)

---

### 2.4 Nouvelle Entité : DiagnosticIA

**Fichier** : [extensions/macrea-core-universal/metadata/entityDefs/DiagnosticIA.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\DiagnosticIA.json)

**But** : Générer des diagnostics complets de leads

**Champs principaux** :
- `name` : Titre du diagnostic
- `lead` : Lead concerné
- `syntheseIA` : Résumé intelligent
- `forcesDetectees` : Points forts
- `opportunites` : Opportunités commerciales
- `risques` : Risques/freins
- `recommandations` : Recommandations stratégiques
- `scoreConfiance` : Score confiance du diagnostic (0-100)
- `dateGeneration` : Date de génération

**Relation** : Lead ↔ DiagnosticIA (1-n)

---

### 2.5 Configuration Extension

**Fichier** : [extensions/macrea-core-universal/config.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\config.json)

```json
{
  "name": "macrea-core-universal",
  "version": "1.0.0",
  "displayName": "MaCréa CORE Extension Universelle",
  "enabled": true,
  "pricing": {
    "plan": "included",
    "tokensIncluded": 100
  },
  "capabilities": [
    "leads_enrichment_universal",
    "missions_tracking",
    "diagnostic_ia",
    "tags_ia_dynamic",
    "scoring_ia"
  ],
  "entities": {
    "extended": ["Lead"],
    "new": ["MissionMAX", "DiagnosticIA"]
  },
  "tools": [
    "enrich_lead_universal",
    "create_mission_max",
    "generate_diagnostic_ia"
  ]
}
```

---

### 2.6 Prompts Spécialisés

**Fichier** : [extensions/macrea-core-universal/prompts.txt](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\prompts.txt)

**Contenu** :
- Philosophie : ZERO bridage
- Description de chaque champ CORE
- Exemples par secteur :
  - Assurance vie
  - E-commerce bijoux
  - Logistique diaspora
  - Cosmétique afro
  - Coaching
- Utilisation des 3 nouveaux tools
- Règles absolues pour M.A.X.

---

## 🛠️ 3. Tools à Implémenter (TODO)

### 3.1 Tool : `enrich_lead_universal`

**But** : Enrichir un lead avec les champs CORE

**Paramètres** :
```javascript
{
  leadId: string,              // ID du lead
  source: string,              // LIBRE
  tagsIA: array<string>,       // LIBRE
  secteurInfere: string,       // LIBRE (pas enum)
  typeClient: string,          // LIBRE
  niveauMaturite: string,      // LIBRE
  canalPrefere: string,        // LIBRE
  objectifsClient: string,     // LIBRE
  notesIA: string,             // LIBRE
  prochaineAction: string,     // LIBRE
  prochaineRelance: date,
  scoreIA: int                 // 0-100
}
```

**Exemple d'appel** :
```javascript
enrich_lead_universal({
  leadId: "abc123",
  source: "Facebook Lead Ads",
  tagsIA: ["#assurance-vie", "#PER", "#lead-chaud"],
  secteurInfere: "Assurance vie / Finance",
  typeClient: "B2C - Particuliers",
  niveauMaturite: "Chaud",
  canalPrefere: "Email",
  scoreIA: 75
});
```

**À implémenter dans** :
1. [lib/maxTools.js](D:\Macrea\CRM\max_backend\lib\maxTools.js) - Ajouter définition tool
2. [routes/chat.js](D:\Macrea\CRM\max_backend\routes\chat.js) - Ajouter handler dans `executeToolCall`

---

### 3.2 Tool : `create_mission_max`

**But** : Enregistrer une mission effectuée par M.A.X.

**Paramètres** :
```javascript
{
  name: string,
  typeAction: string,
  description: string,
  resultat: string,
  leadId: string,
  statutExecution: "En cours" | "Réussi" | "Échec" | "Annulé",
  tokensUtilises: int,
  dureeExecution: int
}
```

**Exemple** :
```javascript
create_mission_max({
  name: "Enrichissement IA - Lead Assurance Vie",
  typeAction: "enrichissement",
  resultat: "Secteur: Assurance vie, Score: 75",
  leadId: "abc123",
  statutExecution: "Réussi"
});
```

---

### 3.3 Tool : `generate_diagnostic_ia`

**But** : Générer un diagnostic complet

**Paramètres** :
```javascript
{
  leadId: string,
  syntheseIA: string,
  forcesDetectees: string,
  opportunites: string,
  risques: string,
  recommandations: string
}
```

---

## 📝 4. Prochaines Étapes (TODO)

### Étape 1 : Ajouter les 3 Tools

**Fichier** : [lib/maxTools.js](D:\Macrea\CRM\max_backend\lib\maxTools.js)

Ajouter avant la ligne 606 (`];`) :

```javascript
  // 🌍 Extension MaCréa CORE Universelle - Tools
  {
    type: 'function',
    function: {
      name: 'enrich_lead_universal',
      description: '🌍 ENRICHIR LEAD UNIVERSELLEMENT (non-bridé) : Enrichit un lead avec les champs CORE adaptatifs. M.A.X. invente librement tags, secteur, typologie selon le contexte. Fonctionne pour TOUS secteurs (assurance, e-commerce, logistique, coaching, etc.). UTILISATIONS : "Enrichis le lead X", "Analyse ce prospect", "Catégorise ce lead".',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID du lead à enrichir'
          },
          source: {
            type: 'string',
            description: 'Origine du lead (Facebook Ads, Google, Salon, etc.) - LIBRE'
          },
          tagsIA: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags générés LIBREMENT par M.A.X. selon contexte (ex: #assurance-vie, #etsy, #groupage)'
          },
          secteurInfere: {
            type: 'string',
            description: 'Secteur déduit LIBREMENT (ex: "Assurance vie / Finance", "E-commerce / Bijoux") - PAS D\'ENUM'
          },
          typeClient: {
            type: 'string',
            description: 'Typologie client LIBRE (ex: "B2B - PME", "B2C - Particuliers", "Diaspora")'
          },
          niveauMaturite: {
            type: 'string',
            description: 'Maturité commerciale LIBRE (ex: "Froid", "Chaud", "VIP", "Dormant")'
          },
          canalPrefere: {
            type: 'string',
            description: 'Canal préféré LIBRE (ex: "WhatsApp", "Email", "Appel", "Instagram DM")'
          },
          objectifsClient: {
            type: 'string',
            description: 'Objectifs identifiés - LIBRE'
          },
          servicesSouhaites: {
            type: 'string',
            description: 'Services demandés - LIBRE'
          },
          notesIA: {
            type: 'string',
            description: 'Synthèse intelligente du lead'
          },
          prochaineAction: {
            type: 'string',
            description: 'Prochaine action recommandée'
          },
          prochaineRelance: {
            type: 'string',
            format: 'date',
            description: 'Date prochaine relance (YYYY-MM-DD)'
          },
          statutNurturing: {
            type: 'string',
            enum: ['Nouveau', 'À qualifier', 'Engagé', 'Inactif', 'Converti'],
            description: 'Statut nurturing (enum générique)'
          },
          scoreIA: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Score priorité (0-100)'
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
      description: '📝 CRÉER MISSION M.A.X. : Enregistre une action effectuée par M.A.X. dans l\'historique. UTILISATIONS : Après enrichissement lead, après diagnostic, après toute action significative. Permet de tracker les activités IA.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Titre de la mission (ex: "Enrichissement IA - Lead Assurance Vie")'
          },
          typeAction: {
            type: 'string',
            description: 'Type action (enrichissement, création, suggestion, diagnostic, campagne, etc.)'
          },
          description: {
            type: 'string',
            description: 'Description détaillée de l\'action'
          },
          resultat: {
            type: 'string',
            description: 'Résultat de la mission'
          },
          leadId: {
            type: 'string',
            description: 'ID du lead concerné'
          },
          accountId: {
            type: 'string',
            description: 'ID du compte concerné (optionnel)'
          },
          statutExecution: {
            type: 'string',
            enum: ['En cours', 'Réussi', 'Échec', 'Annulé'],
            description: 'Statut de l\'exécution'
          },
          tokensUtilises: {
            type: 'integer',
            description: 'Nombre de tokens consommés'
          },
          dureeExecution: {
            type: 'integer',
            description: 'Durée d\'exécution en secondes'
          }
        },
        required: ['name', 'typeAction', 'leadId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_diagnostic_ia',
      description: '🧠 GÉNÉRER DIAGNOSTIC IA : Crée un diagnostic complet d\'un lead avec analyse SWOT (forces, opportunités, risques, recommandations). UTILISATIONS : "Fais-moi un diagnostic du lead X", "Analyse en profondeur ce prospect", "Donne-moi un rapport stratégique".',
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
            description: 'Forces et points forts identifiés'
          },
          opportunites: {
            type: 'string',
            description: 'Opportunités commerciales identifiées'
          },
          risques: {
            type: 'string',
            description: 'Risques, freins ou obstacles détectés'
          },
          recommandations: {
            type: 'string',
            description: 'Recommandations stratégiques de M.A.X.'
          },
          scoreConfiance: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Score de confiance du diagnostic (0-100)'
          }
        },
        required: ['leadId', 'syntheseIA']
      }
    }
  }
```

---

### Étape 2 : Implémenter Handlers

**Fichier** : [routes/chat.js](D:\Macrea\CRM\max_backend\routes\chat.js)

Dans la fonction `executeToolCall`, ajouter ces 3 case :

```javascript
case 'enrich_lead_universal': {
  const {
    leadId,
    source,
    tagsIA,
    secteurInfere,
    typeClient,
    niveauMaturite,
    canalPrefere,
    objectifsClient,
    servicesSouhaites,
    notesIA,
    prochaineAction,
    prochaineRelance,
    statutNurturing,
    scoreIA
  } = args;

  try {
    // Préparer les données à mettre à jour
    const updateData = {};

    if (source) updateData.source = source;
    if (tagsIA && tagsIA.length > 0) updateData.tagsIA = tagsIA;
    if (secteurInfere) updateData.secteurInfere = secteurInfere;
    if (typeClient) updateData.typeClient = typeClient;
    if (niveauMaturite) updateData.niveauMaturite = niveauMaturite;
    if (canalPrefere) updateData.canalPrefere = canalPrefere;
    if (objectifsClient) updateData.objectifsClient = objectifsClient;
    if (servicesSouhaites) updateData.servicesSouhaites = servicesSouhaites;
    if (notesIA) updateData.notesIA = notesIA;
    if (prochaineAction) updateData.prochaineAction = prochaineAction;
    if (prochaineRelance) updateData.prochaineRelance = prochaineRelance;
    if (statutNurturing) updateData.statutNurturing = statutNurturing;
    if (scoreIA !== undefined) updateData.scoreIA = scoreIA;

    // Appeler l'API EspoCRM pour mettre à jour le lead
    const response = await espoFetch(`/Lead/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    return {
      success: true,
      leadId,
      fieldsUpdated: Object.keys(updateData).length,
      fields: Object.keys(updateData),
      message: `✅ Lead ${leadId} enrichi avec ${Object.keys(updateData).length} champs CORE`
    };

  } catch (error) {
    console.error('[enrich_lead_universal] Erreur:', error);
    return {
      success: false,
      error: error.message,
      leadId
    };
  }
}

case 'create_mission_max': {
  const {
    name,
    typeAction,
    description,
    resultat,
    leadId,
    accountId,
    statutExecution = 'Réussi',
    tokensUtilises,
    dureeExecution
  } = args;

  try {
    const missionData = {
      name,
      typeAction,
      description,
      resultat,
      leadId,
      dateExecution: new Date().toISOString(),
      statutExecution
    };

    if (accountId) missionData.accountId = accountId;
    if (tokensUtilises) missionData.tokensUtilises = tokensUtilises;
    if (dureeExecution) missionData.dureeExecution = dureeExecution;

    const response = await espoFetch('/MissionMAX', {
      method: 'POST',
      body: JSON.stringify(missionData)
    });

    return {
      success: true,
      missionId: response.id,
      name,
      typeAction,
      message: `✅ Mission M.A.X. créée avec ID: ${response.id}`
    };

  } catch (error) {
    console.error('[create_mission_max] Erreur:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

case 'generate_diagnostic_ia': {
  const {
    leadId,
    syntheseIA,
    forcesDetectees,
    opportunites,
    risques,
    recommandations,
    scoreConfiance = 70
  } = args;

  try {
    // Récupérer le nom du lead pour le titre
    const lead = await espoFetch(`/Lead/${leadId}`);
    const leadName = lead.name || lead.emailAddress || leadId;

    const diagnosticData = {
      name: `Diagnostic IA - ${leadName}`,
      leadId,
      syntheseIA,
      forcesDetectees,
      opportunites,
      risques,
      recommandations,
      scoreConfiance,
      dateGeneration: new Date().toISOString()
    };

    const response = await espoFetch('/DiagnosticIA', {
      method: 'POST',
      body: JSON.stringify(diagnosticData)
    });

    return {
      success: true,
      diagnosticId: response.id,
      leadName,
      scoreConfiance,
      message: `✅ Diagnostic IA créé pour ${leadName} avec ID: ${response.id}`
    };

  } catch (error) {
    console.error('[generate_diagnostic_ia] Erreur:', error);
    return {
      success: false,
      error: error.message,
      leadId
    };
  }
}
```

---

### Étape 3 : Créer Script d'Installation

**Créer** : `D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\install.js`

Ce script doit :
1. Copier les entityDefs vers EspoCRM
2. Exécuter `php command.php rebuild`
3. Exécuter `php command.php clear-cache`

---

### Étape 4 : Tester

```javascript
// Test 1 : Enrichir un lead
User: "Enrichis le lead abc123 : secteur assurance vie, tags #PER #finance"

// Test 2 : Créer mission
User: "Liste les 5 derniers leads"
// M.A.X. doit automatiquement créer une MissionMAX après l'action

// Test 3 : Diagnostic
User: "Fais-moi un diagnostic complet du lead abc123"
```

---

## 📊 Résumé des Modifications

### Fichiers Modifiés :
1. ✅ [lib/conversationService.js](D:\Macrea\CRM\max_backend\lib\conversationService.js) - Fenêtre glissante 72h
2. ✅ [.env](D:\Macrea\CRM\max_backend\.env) - Variables MAX_HISTORY_*
3. ✅ [routes/chat.js:82](D:\Macrea\CRM\max_backend\routes\chat.js#L82) - Newsletter COMPACT
4. ✅ [server.js:6](D:\Macrea\CRM\max_backend\server.js#L6) - Commentaire trigger reload

### Fichiers Créés :
1. ✅ [extensions/macrea-core-universal/config.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\config.json)
2. ✅ [extensions/macrea-core-universal/prompts.txt](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\prompts.txt)
3. ✅ [extensions/macrea-core-universal/metadata/entityDefs/Lead.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\Lead.json)
4. ✅ [extensions/macrea-core-universal/metadata/entityDefs/MissionMAX.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\MissionMAX.json)
5. ✅ [extensions/macrea-core-universal/metadata/entityDefs/DiagnosticIA.json](D:\Macrea\CRM\max_backend\extensions\macrea-core-universal\metadata\entityDefs\DiagnosticIA.json)
6. ✅ [EXTENSIONS.md](D:\Macrea\CRM\max_backend\EXTENSIONS.md)
7. ✅ [extensions/MACREA_CORE_UNIVERSAL.md](D:\Macrea\CRM\max_backend\extensions\MACREA_CORE_UNIVERSAL.md)

### Fichiers À Modifier (TODO) :
1. ⏳ [lib/maxTools.js](D:\Macrea\CRM\max_backend\lib\maxTools.js) - Ajouter 3 tools
2. ⏳ [routes/chat.js](D:\Macrea\CRM\max_backend\routes\chat.js) - Ajouter 3 handlers

---

## 🎯 Prochaine Session

**Tâches prioritaires** :
1. Ajouter les 3 tools dans maxTools.js
2. Implémenter les handlers dans chat.js
3. Créer script d'installation
4. Tester enrichissement avec lead réel

**Temps estimé** : 2-3 heures

---

**Session terminée avec succès !** ✅
**Budget tokens utilisé** : ~99k / 200k (49.5%)
**Fichiers créés** : 7
**Fichiers modifiés** : 4
