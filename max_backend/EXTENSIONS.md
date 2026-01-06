# 🧩 Système d'Extensions M.A.X. - Version BETA

## 📋 Vue d'ensemble

Le système d'extensions permet d'ajouter des **capacités métier spécialisées** à M.A.X. sans modifier le cœur du système. Chaque extension apporte des **tools supplémentaires** que M.A.X. peut utiliser.

---

## 🎯 Architecture Extensions

```
M.A.X. Core (BETA)
    ↓
Extensions System (modular)
    ↓
    ├── Extension Standard (✅ INCLUS)
    ├── Extension Logistique (🚧 Future PRO)
    ├── Extension E-commerce (🚧 Future PRO)
    ├── Extension Coaching (🚧 Future PRO)
    └── Extension Beauté (🚧 Future PRO)
```

---

## ✅ BETA : Ce qui est FAISABLE maintenant

### 1. **Extension Standard** (déjà implémenté)

**Capacités actuelles** :
- ✅ CRUD Leads (query_espo_leads, update_leads_in_espo)
- ✅ Enrichissement IA (analyze_and_enrich_leads)
- ✅ Champs personnalisés (create_custom_field, delete_custom_field)
- ✅ Layouts (update_layout, reorganize_layout)
- ✅ Dashboards (add_dashlet, update_dashlet, delete_dashlet)
- ✅ Newsletters (génération HTML via prompt)

**Tools disponibles (25 actuellement)** :
```javascript
// Déjà dans chat.js
- query_espo_leads
- update_leads_in_espo
- analyze_and_enrich_leads
- create_custom_field
- delete_custom_field
- update_layout
- reorganize_layout
- add_dashlet
- update_dashlet
- delete_dashlet
// ... + 15 autres
```

---

### 2. **Système d'Extensions Modulaires** (à créer)

#### Structure proposée :

```
max_backend/
├── extensions/
│   ├── standard/
│   │   ├── tools.js           # Tools de base (déjà implémentés)
│   │   ├── prompts.txt        # Prompts spécialisés
│   │   └── config.json        # Metadata extension
│   │
│   ├── logistique/            # 🚧 Future PRO
│   │   ├── tools.js           # Tools logistique
│   │   ├── prompts.txt        # Vocabulaire métier
│   │   └── config.json
│   │
│   ├── ecommerce/             # 🚧 Future PRO
│   │   ├── tools.js
│   │   ├── prompts.txt
│   │   └── config.json
│   │
│   └── registry.js            # Chargement dynamique des extensions
```

---

## 🚀 Implémentation pour BETA

### Phase 1 : Système de base (cette semaine)

#### 1.1 Créer le registry d'extensions

**Fichier : `extensions/registry.js`**

```javascript
/**
 * Extension Registry - Charge dynamiquement les extensions activées
 */
import fs from 'fs';
import path from 'path';

export class ExtensionRegistry {
  constructor() {
    this.extensions = new Map();
  }

  /**
   * Charger une extension depuis son dossier
   */
  async loadExtension(extensionName) {
    const extensionPath = path.join(__dirname, extensionName);

    // Lire config.json
    const config = JSON.parse(
      fs.readFileSync(path.join(extensionPath, 'config.json'), 'utf-8')
    );

    // Charger les tools
    const tools = await import(path.join(extensionPath, 'tools.js'));

    // Charger les prompts
    const prompts = fs.readFileSync(
      path.join(extensionPath, 'prompts.txt'),
      'utf-8'
    );

    this.extensions.set(extensionName, {
      config,
      tools: tools.default,
      prompts
    });

    console.log(`[ExtensionRegistry] Extension chargée: ${extensionName}`);
    return this.extensions.get(extensionName);
  }

  /**
   * Obtenir tous les tools de toutes les extensions actives
   */
  getAllTools() {
    const allTools = [];

    for (const [name, ext] of this.extensions) {
      allTools.push(...ext.tools);
    }

    return allTools;
  }

  /**
   * Obtenir tous les prompts concaténés
   */
  getAllPrompts() {
    let combinedPrompts = '';

    for (const [name, ext] of this.extensions) {
      combinedPrompts += `\n\n═══ Extension: ${name} ═══\n${ext.prompts}`;
    }

    return combinedPrompts;
  }
}

export default new ExtensionRegistry();
```

#### 1.2 Créer la structure de l'extension Standard

**Fichier : `extensions/standard/config.json`**

```json
{
  "name": "standard",
  "version": "1.0.0",
  "displayName": "M.A.X. Standard",
  "description": "Extension de base pour gestion CRM standard",
  "enabled": true,
  "pricing": {
    "plan": "free",
    "tokensIncluded": 100
  },
  "capabilities": [
    "leads_management",
    "custom_fields",
    "layouts",
    "dashboards",
    "newsletters"
  ],
  "modes": {
    "conseil": true,
    "assisté": true,
    "automatique": false
  }
}
```

**Fichier : `extensions/standard/prompts.txt`**

```
# Extension M.A.X. Standard

Tu es M.A.X. (MaCréa Assistant eXpert) en mode Standard.

## Capacités Standard :
- Gestion des leads (CRUD, enrichissement, segmentation)
- Création de champs personnalisés
- Modification des layouts CRM
- Gestion des dashboards
- Génération de newsletters HTML

## Limitations Standard :
- ❌ Pas d'appels téléphoniques IA
- ❌ Pas de workflows n8n complexes
- ❌ Pas de modification du schéma sans validation

## Mode actuel : Assisté
- Tu DOIS toujours utiliser les tools disponibles
- Tu DOIS afficher les résultats réels (IDs, noms, etc.)
- Tu NE DOIS JAMAIS halluciner ou inventer des données
```

**Fichier : `extensions/standard/tools.js`**

```javascript
/**
 * Tools de l'extension Standard
 * Ces tools sont déjà implémentés dans chat.js
 */

export default [
  {
    type: 'function',
    function: {
      name: 'query_espo_leads',
      description: 'Rechercher et lister des leads dans EspoCRM',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filtres de recherche'
          },
          limit: {
            type: 'number',
            description: 'Nombre max de résultats'
          }
        }
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'update_leads_in_espo',
      description: 'Créer ou mettre à jour des leads',
      parameters: {
        type: 'object',
        properties: {
          leads: {
            type: 'array',
            description: 'Liste des leads à créer/modifier'
          }
        },
        required: ['leads']
      }
    }
  },

  // ... Ajouter les 23 autres tools ici
];
```

#### 1.3 Modifier chat.js pour utiliser le registry

**Dans `routes/chat.js`** :

```javascript
import extensionRegistry from '../extensions/registry.js';

// Au démarrage, charger l'extension Standard
await extensionRegistry.loadExtension('standard');

// Dans la route POST /chat, récupérer les tools dynamiquement
const tools = extensionRegistry.getAllTools();
const extensionPrompts = extensionRegistry.getAllPrompts();

// Combiner les prompts
const FULL_SYSTEM_PROMPT = `
${PROMPT_SYSTEM_MAX}
${extensionPrompts}
${ULTRA_PRIORITY_RULES}
`;
```

---

## 🎁 Extensions FUTURES (PRO)

### Extension Logistique

**Nouveau tools proposés** :

```javascript
- calculate_shipping_cost    // Calcul frais de port
- track_shipment             // Suivi colis
- generate_quote             // Génération devis transport
- update_delivery_status     // MAJ statut livraison
- schedule_pickup            // Planification enlèvement
```

**Champs métier automatiques** :
- Incoterm (Enum: EXW, FOB, CIF, DAP...)
- Poids (Float)
- Volume (Float)
- Date enlèvement (Date)
- Date livraison estimée (Date)
- Statut colis (Enum: En préparation, Enlevé, En transit, Livré)

**Prix** : 99€/mois + 500 tokens

---

### Extension E-commerce

**Nouveau tools proposés** :

```javascript
- sync_shopify_products      // Sync catalogue Shopify
- track_abandoned_cart       // Suivi paniers abandonnés
- send_product_recom         // Recommandations produits
- update_stock_alert         // Alertes stock
- generate_invoice           // Génération factures
```

**Champs métier automatiques** :
- SKU Produit (Varchar)
- Prix (Currency)
- Stock disponible (Integer)
- Date dernier achat (Date)
- Panier abandonné (Boolean)

**Prix** : 99€/mois + 500 tokens

---

## 📊 Comparatif Extensions

| Extension | Prix | Tokens/mois | Appels IA | Fields Builder | Workflows n8n |
|-----------|------|-------------|-----------|----------------|---------------|
| **Standard (BETA)** | Gratuit | 100 | ❌ | ❌ | Simple |
| **Logistique (PRO)** | 99€ | 500 | ✅ 1h | ✅ Assisté | Avancé |
| **E-commerce (PRO)** | 99€ | 500 | ✅ 1h | ✅ Assisté | Avancé |
| **Coaching (PRO)** | 99€ | 500 | ✅ 1h | ✅ Assisté | Avancé |

---

## ✅ TODO BETA - Système d'Extensions

### Semaine 1 : Infrastructure de base
- [ ] Créer dossier `extensions/`
- [ ] Implémenter `ExtensionRegistry` (registry.js)
- [ ] Créer extension Standard (config.json + prompts.txt + tools.js)
- [ ] Modifier chat.js pour charger extensions dynamiquement
- [ ] Tester avec extension Standard uniquement

### Semaine 2 : Tenant System
- [ ] Ajouter table `tenants` dans la DB
- [ ] Chaque tenant a une liste d'extensions activées
- [ ] M.A.X. charge extensions selon le tenant connecté
- [ ] Interface pour activer/désactiver extensions

### Future (PRO) :
- [ ] Extension Logistique
- [ ] Extension E-commerce
- [ ] Extension Coaching
- [ ] Marketplace d'extensions tierces

---

## 🎯 Avantages du Système d'Extensions

1. **Modularité** : Ajouter/retirer des capacités sans toucher au core
2. **Évolutivité** : Créer de nouvelles extensions facilement
3. **Tarification flexible** : Facturer selon les extensions activées
4. **Personnalisation** : Chaque client a son propre mix d'extensions
5. **Maintenance** : Bugs isolés par extension

---

## 🔒 Sécurité Extensions

- ✅ Chaque extension déclare ses capabilities dans config.json
- ✅ Le registry vérifie les permissions avant d'exécuter un tool
- ✅ Mode "Assisté" par défaut pour les actions critiques
- ✅ Logs d'activité par extension

---

## 💡 Exemple d'Usage

```javascript
// Client Standard (BETA)
const client = {
  id: 'client_001',
  plan: 'standard',
  extensions: ['standard']
};

// M.A.X. charge uniquement les 25 tools Standard
const tools = extensionRegistry.getToolsForClient(client);
// → 25 tools de gestion CRM de base

// Client PRO Logistique
const proClient = {
  id: 'client_002',
  plan: 'pro',
  extensions: ['standard', 'logistique']
};

// M.A.X. charge 25 tools Standard + 10 tools Logistique
const proTools = extensionRegistry.getToolsForClient(proClient);
// → 35 tools au total
```

---

## 📝 Notes Importantes

1. **BETA** = Extension Standard uniquement (déjà implémenté dans chat.js)
2. **PRO** = Standard + 1 extension métier au choix
3. **Studio** = Standard + toutes les extensions
4. Les extensions futures nécessitent n8n pour les workflows avancés
5. Chaque extension peut avoir ses propres prompts spécialisés

---

**Prêt à implémenter le système d'extensions pour la BETA ?** 🚀
