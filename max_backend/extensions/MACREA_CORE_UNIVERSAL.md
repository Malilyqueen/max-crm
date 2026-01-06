# 🌍 MaCréa CORE Extension - Structure Universelle (Non-Bridée)

## 🎯 Philosophie

**M.A.X. ne doit JAMAIS être bridé par des listes prédéfinies.**

Le CRM MaCréa s'adapte automatiquement à :
- ✅ Cosmétique (QMix, Michèle Care)
- ✅ Logistique diaspora (Damath)
- ✅ Coaching (Coach Vero)
- ✅ Assurance vie
- ✅ E-commerce (bijoux, gadgets, mode)
- ✅ Artisans (plombier, serrurier)
- ✅ Finance
- ✅ **N'importe quel secteur futur**

**Comment ?** En laissant M.A.X. **inventer, déduire et catégoriser librement**.

---

## 📋 Niveau 1 : Champs Totalement Libres (MAX invente)

### 1. `tagsIA` (Array<string>) - LIBRE

**Type** : `array` (multiEnum dynamique)
**Description** : Tags générés librement par M.A.X.
**Pas d'enum** : M.A.X. invente selon le contexte

**Exemples réels** :
```javascript
// Lead assurance vie
["#assurance-vie", "#PER", "#prospect-finance", "#lead-chaud", "#besoin_rappel"]

// Lead e-commerce bijoux Etsy
["#etsy", "#bijoux", "#fait-main", "#e-commerce", "#automation-whatsapp", "#créateur-indépendant"]

// Lead logistique diaspora
["#groupage", "#madagascar-france", "#diaspora-logistique", "#transport", "#lead-froid"]

// Lead cosmétique afro
["#cosmétique-afro", "#peau-noire", "#huiles-naturelles", "#e-commerce", "#instagram"]

// Lead coaching mindset
["#coaching", "#mindset", "#développement-personnel", "#séances-zoom", "#VIP"]
```

**Définition EspoCRM** :
```json
{
  "name": "tagsIA",
  "type": "array",
  "isCustom": true,
  "label": "Tags IA",
  "tooltip": "Tags générés automatiquement par M.A.X. selon le contexte du lead"
}
```

---

### 2. `notesIA` (Text) - LIBRE

**Type** : `text` (wysiwyg)
**Description** : Notes de contexte générées par M.A.X.
**Utilisation** : Synthèse intelligente du lead

**Exemples** :
```
Lead assurance vie :
"Prospect intéressé par un PER pour optimisation fiscale.
Hésitation entre assurance repos et PER classique.
À rappeler sous 48h. Budget estimé : 5k-10k€/an."

Lead e-commerce bijoux :
"Créatrice indépendante vendant sur Etsy.
Besoin d'automatiser messages clients et confirmations commandes.
Cible : automatisation WhatsApp + relances paniers abandonnés."

Lead logistique diaspora :
"Service groupage Madagascar-France.
Cherche CRM pour gérer les colis et tracking clients.
Concurrent : système Excel manuel. Volume : ~50 colis/mois."
```

**Définition EspoCRM** :
```json
{
  "name": "notesIA",
  "type": "text",
  "isCustom": true,
  "label": "Notes IA (M.A.X.)",
  "tooltip": "Synthèse intelligente générée par M.A.X."
}
```

---

### 3. `objectifsClient` (Text) - LIBRE

**Type** : `text`
**Description** : Objectifs déclarés ou déduits du lead

**Exemples** :
```
"Optimiser la gestion des leads + automatiser relances WhatsApp"
"Augmenter les ventes e-commerce de 30% en 6 mois"
"Professionnaliser le suivi colis et améliorer satisfaction client"
"Générer 50 leads qualifiés/mois via LinkedIn"
```

**Définition EspoCRM** :
```json
{
  "name": "objectifsClient",
  "type": "text",
  "isCustom": true,
  "label": "Objectifs Client",
  "tooltip": "Objectifs déclarés ou déduits par M.A.X."
}
```

---

### 4. `servicesSouhaites` (Text) - LIBRE

**Type** : `text`
**Description** : Services demandés (liste libre)

**Exemples** :
```
"CRM + automatisation WhatsApp + newsletters"
"Tracking colis + devis automatiques + relances clients"
"Site e-commerce + CRM + campagnes Instagram"
"Formation Excel + audit processus + accompagnement"
```

**Définition EspoCRM** :
```json
{
  "name": "servicesSouhaites",
  "type": "text",
  "isCustom": true,
  "label": "Services Souhaités",
  "tooltip": "Liste des services demandés (libre)"
}
```

---

## 📊 Niveau 2 : Champs Semi-Structurés (MAX déduit automatiquement)

### 5. `secteurInfere` (Varchar) - LIBRE (pas d'enum)

**Type** : `varchar` (255 char max)
**Description** : Secteur d'activité déduit par M.A.X.
**Pas d'enum** : M.A.X. écrit ce qu'il veut

**Exemples** :
- "Assurance vie / Finance"
- "E-commerce / Bijoux artisanaux"
- "Logistique diaspora / Groupage"
- "Cosmétique afro / Soins naturels"
- "Coaching / Développement personnel"
- "Artisan / Plomberie"
- "Auto-entrepreneur / Services digitaux"

**Définition EspoCRM** :
```json
{
  "name": "secteurInfere",
  "type": "varchar",
  "maxLength": 255,
  "isCustom": true,
  "label": "Secteur Inféré (IA)",
  "tooltip": "Secteur d'activité déduit automatiquement par M.A.X."
}
```

---

### 6. `typeClient` (Varchar) - LIBRE

**Type** : `varchar`
**Description** : Typologie client (libre)

**Exemples** :
- "B2B - PME"
- "B2C - Particuliers"
- "B2B2C - Marketplace"
- "Diaspora - Communauté"
- "Auto-entrepreneur"
- "Association / ONG"
- "Entreprise individuelle"

**Définition EspoCRM** :
```json
{
  "name": "typeClient",
  "type": "varchar",
  "maxLength": 100,
  "isCustom": true,
  "label": "Type Client",
  "tooltip": "Typologie client déduite par M.A.X."
}
```

---

### 7. `niveauMaturite` (Varchar) - LIBRE

**Type** : `varchar`
**Description** : Maturité commerciale (libre)

**Exemples** :
- "Froid"
- "Tiède"
- "Chaud"
- "VIP"
- "Dormant"
- "À relancer"
- "Peu probable"
- "En négociation"

**Définition EspoCRM** :
```json
{
  "name": "niveauMaturite",
  "type": "varchar",
  "maxLength": 50,
  "isCustom": true,
  "label": "Niveau Maturité",
  "tooltip": "Maturité commerciale déduite par M.A.X."
}
```

---

### 8. `canalPrefere` (Varchar) - LIBRE

**Type** : `varchar`
**Description** : Canal de communication préféré

**Exemples** :
- "WhatsApp"
- "Email"
- "Appel téléphonique"
- "Messenger"
- "Instagram DM"
- "LinkedIn"
- "SMS"
- "TikTok"
- "Discord"

**Définition EspoCRM** :
```json
{
  "name": "canalPrefere",
  "type": "varchar",
  "maxLength": 50,
  "isCustom": true,
  "label": "Canal Préféré",
  "tooltip": "Canal de communication préféré (déduit par M.A.X.)"
}
```

---

### 9. `prochaineAction` (Text) - LIBRE

**Type** : `text`
**Description** : Prochaine action à effectuer

**Exemples** :
```
"Rappeler pour devis PER"
"Envoyer démo CRM + tarifs"
"Relancer par WhatsApp pour confirmation"
"Planifier RDV Zoom présentation"
"Envoyer documentation technique groupage"
```

**Définition EspoCRM** :
```json
{
  "name": "prochaineAction",
  "type": "text",
  "isCustom": true,
  "label": "Prochaine Action",
  "tooltip": "Prochaine action recommandée par M.A.X."
}
```

---

### 10. `prochaineRelance` (Date)

**Type** : `date`
**Description** : Date de prochaine relance

**Définition EspoCRM** :
```json
{
  "name": "prochaineRelance",
  "type": "date",
  "isCustom": true,
  "label": "Prochaine Relance",
  "tooltip": "Date de prochaine relance planifiée"
}
```

---

## 🎯 Niveau 3 : Champs CRM Universels (optionnels, génériques)

### 11. `statutNurturing` (Enum) - GÉNÉRIQUE

**Type** : `enum` (mais générique, pas métier)
**Description** : Statut dans le parcours client

**Valeurs** (universelles, applicables à tous secteurs) :
- "Nouveau"
- "À qualifier"
- "Engagé"
- "Inactif"
- "Converti"

**Définition EspoCRM** :
```json
{
  "name": "statutNurturing",
  "type": "enum",
  "options": ["Nouveau", "À qualifier", "Engagé", "Inactif", "Converti"],
  "default": "Nouveau",
  "isCustom": true,
  "label": "Statut Nurturing",
  "tooltip": "Statut dans le parcours client (générique)"
}
```

---

### 12. `scoreIA` (Integer) - CALCULÉ

**Type** : `int`
**Description** : Score de priorité calculé par M.A.X. (0-100)

**Logique** :
- 0-30 : Lead froid / faible priorité
- 31-60 : Lead tiède / priorité moyenne
- 61-85 : Lead chaud / haute priorité
- 86-100 : VIP / priorité maximale

**Définition EspoCRM** :
```json
{
  "name": "scoreIA",
  "type": "int",
  "min": 0,
  "max": 100,
  "default": 50,
  "isCustom": true,
  "label": "Score IA",
  "tooltip": "Score de priorité calculé par M.A.X. (0-100)"
}
```

---

## 🧩 Entités Supplémentaires

### 13. Entité `MissionMAX`

**Description** : Historique des actions effectuées par M.A.X.

**Champs** :
```json
{
  "entityType": "MissionMAX",
  "fields": {
    "name": {
      "type": "varchar",
      "required": true,
      "label": "Titre Mission"
    },
    "typeAction": {
      "type": "varchar",
      "label": "Type Action",
      "comment": "enrichissement / création / suggestion / campagne / etc."
    },
    "description": {
      "type": "text",
      "label": "Description"
    },
    "resultat": {
      "type": "text",
      "label": "Résultat"
    },
    "lead": {
      "type": "link",
      "entity": "Lead",
      "label": "Lead Concerné"
    },
    "dateExecution": {
      "type": "datetime",
      "label": "Date Exécution"
    },
    "statutExecution": {
      "type": "enum",
      "options": ["En cours", "Réussi", "Échec", "Annulé"],
      "label": "Statut"
    }
  }
}
```

**Utilisation** :
```javascript
// M.A.X. enrichit un lead
await createMissionMAX({
  name: "Enrichissement IA - Lead Assurance Vie",
  typeAction: "enrichissement",
  description: "Analyse email + déduc secteur + tags + score",
  resultat: "Secteur: Assurance vie, Score: 75, Tags: #PER #finance #chaud",
  leadId: "abc123",
  statutExecution: "Réussi"
});
```

---

### 14. Entité `DiagnosticIA`

**Description** : Résumé IA d'un lead/compte

**Champs** :
```json
{
  "entityType": "DiagnosticIA",
  "fields": {
    "name": {
      "type": "varchar",
      "required": true,
      "label": "Titre Diagnostic"
    },
    "lead": {
      "type": "link",
      "entity": "Lead",
      "label": "Lead"
    },
    "syntheseIA": {
      "type": "text",
      "label": "Synthèse IA",
      "comment": "Résumé intelligent du lead généré par M.A.X."
    },
    "forcesDetectees": {
      "type": "text",
      "label": "Forces Détectées"
    },
    "opportunites": {
      "type": "text",
      "label": "Opportunités"
    },
    "risques": {
      "type": "text",
      "label": "Risques / Freins"
    },
    "recommandations": {
      "type": "text",
      "label": "Recommandations M.A.X."
    },
    "dateGeneration": {
      "type": "datetime",
      "label": "Date Génération"
    }
  }
}
```

---

## 📁 Structure Fichiers Extension

```
extensions/
└── macrea-core-universal/
    ├── config.json              # Métadata extension
    ├── metadata/
    │   ├── entityDefs/
    │   │   ├── Lead.json        # Champs custom Lead
    │   │   ├── MissionMAX.json  # Nouvelle entité
    │   │   └── DiagnosticIA.json
    │   └── layouts/
    │       └── Lead/
    │           └── detail.json  # Layout avec onglet MAX
    ├── tools.js                 # Tools M.A.X. pour cette extension
    └── prompts.txt              # Prompts spécialisés
```

---

## 🛠️ Tools M.A.X. pour Extension CORE

### Tool 1 : `enrich_lead_universal`

```javascript
{
  name: 'enrich_lead_universal',
  description: 'Enrichir un lead avec les champs CORE universels (non-bridés)',
  parameters: {
    type: 'object',
    properties: {
      leadId: {
        type: 'string',
        description: 'ID du lead à enrichir'
      },
      tagsIA: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags générés librement par M.A.X.'
      },
      secteurInfere: {
        type: 'string',
        description: 'Secteur déduit (texte libre, pas enum)'
      },
      typeClient: {
        type: 'string',
        description: 'Type client (B2B, B2C, etc. - libre)'
      },
      niveauMaturite: {
        type: 'string',
        description: 'Niveau maturité (froid, chaud, etc. - libre)'
      },
      canalPrefere: {
        type: 'string',
        description: 'Canal préféré (WhatsApp, Email, etc. - libre)'
      },
      objectifsClient: {
        type: 'string',
        description: 'Objectifs identifiés'
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
        description: 'Date de prochaine relance (YYYY-MM-DD)'
      },
      scoreIA: {
        type: 'integer',
        min: 0,
        max: 100,
        description: 'Score de priorité (0-100)'
      }
    },
    required: ['leadId']
  }
}
```

---

### Tool 2 : `create_mission_max`

```javascript
{
  name: 'create_mission_max',
  description: 'Enregistrer une mission effectuée par M.A.X.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Titre de la mission' },
      typeAction: { type: 'string', description: 'Type action (enrichissement, création, etc.)' },
      description: { type: 'string', description: 'Description détaillée' },
      resultat: { type: 'string', description: 'Résultat de la mission' },
      leadId: { type: 'string', description: 'ID du lead concerné' },
      statutExecution: {
        type: 'string',
        enum: ['En cours', 'Réussi', 'Échec', 'Annulé'],
        description: 'Statut de l\'exécution'
      }
    },
    required: ['name', 'typeAction', 'leadId']
  }
}
```

---

### Tool 3 : `generate_diagnostic_ia`

```javascript
{
  name: 'generate_diagnostic_ia',
  description: 'Générer un diagnostic IA complet d\'un lead',
  parameters: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'ID du lead' },
      syntheseIA: { type: 'string', description: 'Synthèse intelligente' },
      forcesDetectees: { type: 'string', description: 'Forces identifiées' },
      opportunites: { type: 'string', description: 'Opportunités commerciales' },
      risques: { type: 'string', description: 'Risques / freins détectés' },
      recommandations: { type: 'string', description: 'Recommandations stratégiques' }
    },
    required: ['leadId', 'syntheseIA']
  }
}
```

---

## 🎯 Exemples d'Utilisation

### Exemple 1 : Lead Assurance Vie

```javascript
User: "Enrichis le lead contact@assurancevie-expert.fr"

M.A.X. appelle enrich_lead_universal({
  leadId: "abc123",
  tagsIA: ["#assurance-vie", "#PER", "#prospect-finance", "#lead-chaud"],
  secteurInfere: "Assurance vie / Finance",
  typeClient: "B2C - Particuliers",
  niveauMaturite: "Chaud",
  canalPrefere: "Email",
  objectifsClient: "Optimisation fiscale PER + assurance repos",
  notesIA: "Prospect intéressé par PER. Budget 5-10k€/an. À rappeler sous 48h.",
  prochaineAction: "Envoyer devis PER comparatif",
  prochaineRelance: "2025-11-25",
  scoreIA: 75
});

✅ Lead enrichi avec ID: abc123
📊 Secteur: Assurance vie / Finance
🏷️ Tags: #assurance-vie, #PER, #prospect-finance, #lead-chaud
🎯 Score: 75/100 (Lead chaud)
```

---

### Exemple 2 : Lead E-commerce Bijoux

```javascript
User: "Analyse le lead hello@bijoux-etsy.com"

M.A.X. appelle enrich_lead_universal({
  leadId: "def456",
  tagsIA: ["#etsy", "#bijoux", "#fait-main", "#e-commerce", "#créateur"],
  secteurInfere: "E-commerce / Bijoux artisanaux",
  typeClient: "Auto-entrepreneur",
  niveauMaturite: "Tiède",
  canalPrefere: "WhatsApp",
  objectifsClient: "Automatiser messages clients + relances paniers",
  notesIA: "Créatrice Etsy. ~50 ventes/mois. Cherche automation WhatsApp.",
  prochaineAction: "Proposer démo CRM + automation",
  prochaineRelance: "2025-11-27",
  scoreIA: 60
});
```

---

## ✅ Avantages Extension CORE Universelle

1. **Zero bridage** : M.A.X. invente librement
2. **Adaptatif** : Fonctionne pour TOUS les secteurs
3. **Évolutif** : Nouveaux secteurs = nouvelles catégories auto
4. **Pas de maintenance** : Pas de liste enum à mettre à jour
5. **Intelligence réelle** : M.A.X. contextualise selon le métier
6. **Vendable partout** : Assurance, e-commerce, logistique, coaching...

---

**Prêt à implémenter cette structure CORE universelle ?** 🚀
