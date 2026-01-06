# MaxLayoutManager Plugin pour EspoCRM

Plugin EspoCRM qui expose des endpoints API sécurisés pour gérer les layouts de manière programmatique.

## Installation

### 1. Copier les fichiers dans EspoCRM

```bash
# Sur le serveur de production
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Créer la structure du plugin
docker compose exec espocrm mkdir -p custom/Espo/Modules/MaxLayoutManager/{Controllers,Resources/metadata/{app,scopes}}

# Copier les fichiers (depuis votre machine locale)
# Fichier 1: Controller
scp d:\Macrea\CRM\espocrm-plugin\MaxLayoutManager\Controllers\MaxLayoutManager.php \
  root@51.159.170.20:/tmp/MaxLayoutManager.php

ssh root@51.159.170.20 "docker cp /tmp/MaxLayoutManager.php espocrm:/var/www/html/custom/Espo/Modules/MaxLayoutManager/Controllers/MaxLayoutManager.php"

# Fichier 2: API metadata
scp d:\Macrea\CRM\espocrm-plugin\MaxLayoutManager\Resources\metadata\app\api.json \
  root@51.159.170.20:/tmp/api.json

ssh root@51.159.170.20 "docker cp /tmp/api.json espocrm:/var/www/html/custom/Espo/Modules/MaxLayoutManager/Resources/metadata/app/api.json"

# Fichier 3: Scopes metadata
scp d:\Macrea\CRM\espocrm-plugin\MaxLayoutManager\Resources\metadata\scopes\MaxLayoutManager.json \
  root@51.159.170.20:/tmp/scopes.json

ssh root@51.159.170.20 "docker cp /tmp/scopes.json espocrm:/var/www/html/custom/Espo/Modules/MaxLayoutManager/Resources/metadata/scopes/MaxLayoutManager.json"
```

### 2. Configurer la clé API

```bash
# Générer une clé API sécurisée
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Exemple: a8f3d2c9e1b4f7a6d3c2e9f1b8a4d7c3e2f9a1b6d4c8e3f2a9b7d1c6e4f3a2b9

# Ajouter dans la config EspoCRM
ssh root@51.159.170.20
docker compose exec espocrm bash

cat >> data/config.php << 'EOF'
<?php
return [
    'maxLayoutManagerApiKey' => 'VOTRE_CLE_GENEREE_ICI',
];
EOF
```

### 3. Rebuild EspoCRM

```bash
docker compose exec espocrm php command.php rebuild
docker compose exec espocrm php command.php clear-cache
```

## Configuration Backend MAX

### Ajouter la clé dans .env

```bash
# Sur le serveur
cd /opt/max-infrastructure

cat >> .env << 'EOF'

# MaxLayoutManager Plugin
MAX_PLUGIN_KEY=VOTRE_CLE_GENEREE_ICI
EOF

# Redémarrer backend
docker compose restart max-backend
```

## API Endpoints

### 1. Apply Layout

Applique un layout complet pour une entité.

**Endpoint**: `POST /api/v1/MaxLayoutManager/applyLayout`

**Headers**:
```
Content-Type: application/json
X-Max-Plugin-Key: <votre_clé_api>
```

**Payload**:
```json
{
  "entity": "Lead",
  "layoutType": "detail",
  "layout": {
    "layout": [
      {
        "label": "Overview",
        "rows": [
          [{"name": "firstName"}, {"name": "lastName"}],
          [{"name": "email"}, {"name": "phone"}],
          [{"name": "secteur_activite"}, {"name": "status"}]
        ]
      }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "entity": "Lead",
  "layoutType": "detail",
  "message": "Layout applied successfully"
}
```

**Test curl**:
```bash
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/applyLayout" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{
    "entity": "Lead",
    "layoutType": "detail",
    "layout": {
      "layout": [
        {
          "label": "Overview",
          "rows": [
            [{"name": "firstName"}, {"name": "lastName"}],
            [{"name": "email"}, {"name": "phone"}]
          ]
        }
      ]
    }
  }'
```

### 2. Add Field

Ajoute un champ à un ou plusieurs layouts.

**Endpoint**: `POST /api/v1/MaxLayoutManager/addField`

**Headers**:
```
Content-Type: application/json
X-Max-Plugin-Key: <votre_clé_api>
```

**Payload**:
```json
{
  "entity": "Lead",
  "fieldName": "secteur_activite",
  "layoutTypes": ["detail", "detailSmall", "list"]
}
```

**Response**:
```json
{
  "success": true,
  "entity": "Lead",
  "fieldName": "secteur_activite",
  "layoutsModified": 3,
  "message": "Field added to 3 layout(s)"
}
```

**Test curl**:
```bash
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/addField" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{
    "entity": "Lead",
    "fieldName": "secteur_activite",
    "layoutTypes": ["detail", "list"]
  }'
```

### 3. Rebuild

Rebuild EspoCRM et clear cache.

**Endpoint**: `POST /api/v1/MaxLayoutManager/rebuild`

**Headers**:
```
Content-Type: application/json
X-Max-Plugin-Key: <votre_clé_api>
```

**Payload**:
```json
{}
```

**Response**:
```json
{
  "success": true,
  "message": "Rebuild and cache clear completed",
  "timestamp": "2025-12-26 15:30:00"
}
```

**Test curl**:
```bash
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{}'
```

## Intégration MAX Backend

### Créer le module espoLayoutManager

**Fichier**: `max_backend/lib/espoLayoutManager.js`

```javascript
import { espoAdminFetch } from './espoClient.js';

const MAX_PLUGIN_KEY = process.env.MAX_PLUGIN_KEY;

if (!MAX_PLUGIN_KEY) {
  throw new Error('MAX_PLUGIN_KEY manquant dans .env');
}

/**
 * Applique un layout via le plugin MaxLayoutManager
 */
export async function applyLayoutViaPlugin(entity, layoutType, layout) {
  console.log(`[LayoutManager] Applying ${layoutType} layout for ${entity}`);

  const response = await espoAdminFetch('/MaxLayoutManager/applyLayout', {
    method: 'POST',
    headers: {
      'X-Max-Plugin-Key': MAX_PLUGIN_KEY
    },
    body: JSON.stringify({ entity, layoutType, layout })
  });

  if (!response.success) {
    throw new Error(`Failed to apply layout: ${response.message}`);
  }

  console.log('[LayoutManager] ✅ Layout applied successfully');
  return response;
}

/**
 * Ajoute un champ aux layouts via le plugin
 */
export async function addFieldToLayouts(entity, fieldName, layoutTypes = ['detail', 'list']) {
  console.log(`[LayoutManager] Adding field ${fieldName} to ${entity} layouts: ${layoutTypes.join(', ')}`);

  const response = await espoAdminFetch('/MaxLayoutManager/addField', {
    method: 'POST',
    headers: {
      'X-Max-Plugin-Key': MAX_PLUGIN_KEY
    },
    body: JSON.stringify({ entity, fieldName, layoutTypes })
  });

  if (!response.success) {
    throw new Error(`Failed to add field: ${response.message}`);
  }

  console.log(`[LayoutManager] ✅ Field added to ${response.layoutsModified} layout(s)`);
  return response;
}

/**
 * Rebuild EspoCRM via le plugin
 */
export async function rebuildViaPlugin() {
  console.log('[LayoutManager] Starting rebuild');

  const response = await espoAdminFetch('/MaxLayoutManager/rebuild', {
    method: 'POST',
    headers: {
      'X-Max-Plugin-Key': MAX_PLUGIN_KEY
    },
    body: JSON.stringify({})
  });

  if (!response.success) {
    throw new Error(`Failed to rebuild: ${response.message}`);
  }

  console.log('[LayoutManager] ✅ Rebuild completed');
  return response;
}
```

### Utilisation dans create_custom_field tool

```javascript
// Dans maxTools.js ou le tool create_custom_field
import { addFieldToLayouts, rebuildViaPlugin } from './lib/espoLayoutManager.js';

// Après création du champ
await addFieldToLayouts('Lead', fieldName, ['detail', 'detailSmall', 'list']);
await rebuildViaPlugin();
```

## Sécurité

### Validation de la clé

Le plugin vérifie la clé API à chaque requête:

```php
$providedKey = $request->getHeader('X-Max-Plugin-Key');
$expectedKey = $this->config->get('maxLayoutManagerApiKey');

if (!$providedKey || $providedKey !== $expectedKey) {
    throw new Forbidden('Invalid X-Max-Plugin-Key');
}
```

### Logs

- ✅ Logs de toutes les actions (info level)
- ✅ Logs des tentatives d'accès invalides (warning level)
- ❌ JAMAIS de secrets dans les logs

### Multi-tenant

Le plugin agit uniquement sur l'instance EspoCRM où il est installé.
Chaque tenant a son propre EspoCRM avec son propre plugin.

## Tests E2E

### Test complet secteur_activite

```bash
# 1. Créer le champ via API EspoCRM
curl -u "admin:Admin2025Secure" \
  -X PUT "https://crm.studiomacrea.cloud/api/v1/Admin/fieldManager/Lead/secteur_activite" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "enum",
    "options": ["Transport", "Logistique", "E-commerce", "BTP", "Services"],
    "default": ""
  }'

# 2. Ajouter aux layouts via plugin
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/addField" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{
    "entity": "Lead",
    "fieldName": "secteur_activite",
    "layoutTypes": ["detail", "list"]
  }'

# 3. Rebuild
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{}'

# 4. Vérifier dans l'UI
# Aller sur https://crm.studiomacrea.cloud
# Lead > Créer nouveau > Vérifier secteur_activite apparaît ✅
```

## Troubleshooting

### Erreur 404 Not Found

Le plugin n'est pas correctement installé ou le rebuild n'a pas été fait.

```bash
docker compose exec espocrm ls -la custom/Espo/Modules/MaxLayoutManager/
docker compose exec espocrm php command.php rebuild
```

### Erreur 403 Forbidden

La clé API est invalide ou manquante.

```bash
# Vérifier la clé dans config.php
docker compose exec espocrm cat data/config.php | grep maxLayoutManagerApiKey

# Vérifier header X-Max-Plugin-Key dans la requête
```

### Champ non visible après addField

Le rebuild n'a pas été exécuté.

```bash
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -d '{}'
```

## Roadmap

- [x] Endpoints applyLayout, addField, rebuild
- [x] Sécurité par X-Max-Plugin-Key
- [x] Logs sans secrets
- [ ] Support positions custom pour addField
- [ ] Validation schema layouts
- [ ] API pour lire layouts actuels
