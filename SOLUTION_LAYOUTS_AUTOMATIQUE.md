# 🎯 SOLUTION LAYOUTS AUTOMATIQUE - Sans Intervention Humaine

**Date**: 26 décembre 2025
**Objectif**: MAX crée champs ET layouts automatiquement
**Contrainte**: Zéro action manuelle requise du client

---

## 📊 ANALYSE DES OPTIONS

### ❌ Option Rejetée: API EspoCRM `/Admin/layoutManager`

**Verdict**: N'existe pas (404 Not Found confirmé)

```bash
curl -u "admin:Admin2025Secure" \
  -X PUT "https://crm.studiomacrea.cloud/api/v1/Admin/layoutManager/Lead/detail"
# HTTP/1.1 404 Not Found
```

---

## ✅ OPTION A: Plugin EspoCRM "MAX Layout Manager" (RECOMMANDÉE)

### Avantages
- ✅ **API REST sécurisée** (contrôle d'accès granulaire)
- ✅ **Pas de filesystem** (fonctionne en Docker read-only)
- ✅ **Multi-tenant safe** (isolation par tenant)
- ✅ **Maintenable** (code EspoCRM natif)
- ✅ **Scalable** (pas de volumes partagés)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MAX Backend                             │
│                                                             │
│  POST /api/max/apply-layout                                │
│    ↓                                                        │
│  espoAdminFetch('/MaxLayoutManager/applyLayout')           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              EspoCRM avec Plugin MAX                        │
│                                                             │
│  📦 MaxLayoutManager Extension                             │
│     ├─ API Endpoints:                                      │
│     │   POST /api/v1/MaxLayoutManager/applyLayout         │
│     │   POST /api/v1/MaxLayoutManager/addField            │
│     │   POST /api/v1/MaxLayoutManager/rebuild             │
│     │                                                      │
│     └─ Actions:                                            │
│         1. Lire layout actuel                              │
│         2. Modifier JSON (ajouter champs)                  │
│         3. Sauvegarder (filesystem interne)                │
│         4. Clear cache + rebuild                           │
│         5. Retourner succès                                │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints du Plugin

```php
// POST /api/v1/MaxLayoutManager/applyLayout
{
  "entity": "Lead",
  "layoutType": "detail",
  "layout": {
    "rows": [
      [{"name": "firstName"}, {"name": "lastName"}],
      [{"name": "email"}, {"name": "phone"}],
      [{"name": "secteur"}, {"name": "tags"}]
    ]
  }
}
// Response: 200 OK { "success": true, "rebuilded": true }

// POST /api/v1/MaxLayoutManager/addField
{
  "entity": "Lead",
  "fieldName": "secteur",
  "layoutTypes": ["detail", "list", "detailSmall"],
  "position": {"row": 2, "column": 0}
}
// Response: 200 OK { "success": true, "layoutsModified": 3 }

// POST /api/v1/MaxLayoutManager/rebuild
{}
// Response: 200 OK { "success": true, "cache_cleared": true }
```

### Structure du Plugin

```
espocrm/
└── custom/
    └── Espo/
        └── Modules/
            └── MaxLayoutManager/
                ├── Resources/
                │   └── metadata/
                │       ├── scopes/
                │       │   └── MaxLayoutManager.json
                │       └── app/
                │           └── api.json
                ├── Controllers/
                │   └── MaxLayoutManager.php
                ├── Services/
                │   └── MaxLayoutManager.php
                └── Core/
                    └── LayoutManager.php
```

### Code Clé du Plugin

**Controllers/MaxLayoutManager.php**:
```php
<?php
namespace Espo\Modules\MaxLayoutManager\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;

class MaxLayoutManager
{
    private $layoutManager;
    private $config;

    public function __construct($layoutManager, $config) {
        $this->layoutManager = $layoutManager;
        $this->config = $config;
    }

    public function postActionApplyLayout(Request $request, Response $response): Response
    {
        if (!$request->getUser()->isAdmin()) {
            throw new Forbidden('Admin access required');
        }

        $data = $request->getParsedBody();
        $entity = $data->entity ?? null;
        $layoutType = $data->layoutType ?? 'detail';
        $layout = $data->layout ?? null;

        if (!$entity || !$layout) {
            throw new BadRequest('Missing entity or layout');
        }

        // Appliquer le layout
        $this->layoutManager->set($entity, $layoutType, $layout);
        $this->layoutManager->save();

        // Rebuild
        $this->layoutManager->clearCache();

        return $response->writeBody(json_encode([
            'success' => true,
            'entity' => $entity,
            'layoutType' => $layoutType
        ]));
    }

    public function postActionAddField(Request $request, Response $response): Response
    {
        if (!$request->getUser()->isAdmin()) {
            throw new Forbidden();
        }

        $data = $request->getParsedBody();
        $entity = $data->entity;
        $fieldName = $data->fieldName;
        $layoutTypes = $data->layoutTypes ?? ['detail'];

        $modified = 0;
        foreach ($layoutTypes as $layoutType) {
            $layout = $this->layoutManager->get($entity, $layoutType);

            // Ajouter le champ s'il n'existe pas déjà
            if (!$this->fieldExistsInLayout($layout, $fieldName)) {
                $layout = $this->addFieldToLayout($layout, $fieldName, $data->position ?? null);
                $this->layoutManager->set($entity, $layoutType, $layout);
                $modified++;
            }
        }

        if ($modified > 0) {
            $this->layoutManager->save();
            $this->layoutManager->clearCache();
        }

        return $response->writeBody(json_encode([
            'success' => true,
            'layoutsModified' => $modified
        ]));
    }
}
```

### Plan d'Implémentation (4-6 heures)

**Phase 1: Squelette Plugin (1h)**
```bash
# 1. Créer structure de dossiers
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose exec espocrm bash

mkdir -p custom/Espo/Modules/MaxLayoutManager/{Controllers,Services,Core,Resources/metadata/{scopes,app}}

# 2. Fichier metadata minimal
cat > custom/Espo/Modules/MaxLayoutManager/Resources/metadata/scopes/MaxLayoutManager.json << 'EOF'
{
  "entity": false,
  "module": "MaxLayoutManager",
  "acl": "boolean",
  "aclActionList": ["read", "edit"],
  "aclLevelList": ["no", "yes"]
}
EOF

# 3. Enregistrer l'API
cat > custom/Espo/Modules/MaxLayoutManager/Resources/metadata/app/api.json << 'EOF'
{
  "POST api/v1/MaxLayoutManager/:action": {
    "controller": "MaxLayoutManager"
  }
}
EOF

# 4. Rebuild EspoCRM
php command.php rebuild
```

**Phase 2: Controller + Service (2h)**
- Copier code PHP ci-dessus
- Tester endpoints avec curl

**Phase 3: Integration MAX Backend (1h)**
```javascript
// max_backend/lib/espoLayoutManager.js (nouveau fichier)
export async function applyLayoutViaPlugin(entity, layoutType, layout) {
  const response = await espoAdminFetch('/MaxLayoutManager/applyLayout', {
    method: 'POST',
    body: JSON.stringify({ entity, layoutType, layout })
  });

  if (!response.success) {
    throw new Error(`Failed to apply layout: ${response.error}`);
  }

  return response;
}

export async function addFieldToLayouts(entity, fieldName, layoutTypes = ['detail', 'list']) {
  const response = await espoAdminFetch('/MaxLayoutManager/addField', {
    method: 'POST',
    body: JSON.stringify({ entity, fieldName, layoutTypes })
  });

  return response;
}
```

**Phase 4: Tests E2E (1h)**
```bash
# Test 1: Créer champ + layout via MAX
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -d '{"message":"Crée un champ secteur_test et ajoute-le aux layouts detail et list"}'

# Test 2: Vérifier dans EspoCRM UI
# → Aller sur https://crm.studiomacrea.cloud
# → Lead > Detail > Voir champ secteur_test ✅
```

### Coût Total

- **Développement**: 4-6 heures
- **Maintenance**: Faible (code EspoCRM natif)
- **Risques**: Faibles (API interne, pas d'exposition externe)

---

## ⚠️ OPTION B: Volume Filesystem Docker (FALLBACK)

### Architecture

```yaml
# docker-compose.yml
services:
  espocrm:
    volumes:
      - espocrm_data:/var/www/html
      - espocrm_custom:/var/www/html/custom  # ← Layouts ici

  max-backend:
    volumes:
      - espocrm_custom:/espocrm_custom:rw  # ← Accès partagé
```

### Avantages
- ✅ Pas de plugin EspoCRM
- ✅ Implémentation rapide (1-2h)

### Inconvénients
- ❌ **Coupling fort** (backend doit connaître structure EspoCRM)
- ❌ **Race conditions** (2 containers écrivent en même temps)
- ❌ **Sécurité** (filesystem partagé = risque)
- ❌ **Scaling** (volumes partagés = goulot d'étranglement)

### Code

```javascript
// lib/layoutManager.js (modifié)
import fs from 'fs/promises';
import path from 'path';

const ESPOCRM_CUSTOM_ROOT = process.env.ESPOCRM_CUSTOM_ROOT || '/espocrm_custom';
const LAYOUTS_DIR = path.join(ESPOCRM_CUSTOM_ROOT, 'Espo/Custom/Resources/layouts');

export async function applyLayout(entity, layoutType, layout) {
  const layoutPath = path.join(LAYOUTS_DIR, entity, `${layoutType}.json`);

  // Créer dossier si nécessaire
  await fs.mkdir(path.dirname(layoutPath), { recursive: true });

  // Écrire layout
  await fs.writeFile(layoutPath, JSON.stringify(layout, null, 2));

  // Rebuild via API Admin
  await espoAdminFetch('/Admin/rebuild', { method: 'POST' });

  return { success: true };
}
```

**docker-compose.yml**:
```yaml
services:
  max-backend:
    environment:
      - ESPOCRM_CUSTOM_ROOT=/espocrm_custom
    volumes:
      - espocrm_custom:/espocrm_custom:rw

volumes:
  espocrm_custom:
```

### Plan d'Implémentation (2 heures)

1. Modifier `docker-compose.yml` (15min)
2. Corriger `lib/layoutManager.js` chemins (30min)
3. Tests volume monté (30min)
4. Tests création champ + layout (45min)

### Coût Total

- **Développement**: 2 heures
- **Maintenance**: Moyenne (gestion volumes)
- **Risques**: Moyens (race conditions, permissions)

---

## 🎯 RECOMMANDATION FERME

### ✅ OPTION A: Plugin EspoCRM (PRÉFÉRÉE)

**Pourquoi**:
1. **Scalable**: Pas de volumes partagés (fonctionne avec 2000 clients)
2. **Sécurisé**: API avec contrôle d'accès EspoCRM natif
3. **Maintenable**: Code PHP standard EspoCRM
4. **Multi-tenant ready**: Isolation complète par tenant
5. **Production-grade**: Pas de hacks filesystem

**Contre-indication**: Aucune

**Effort**: 4-6 heures (acceptable pour solution pérenne)

### ⚠️ Option B acceptable SI:
- Besoin immédiat (<24h)
- MVP avec <10 tenants
- Migration vers Option A prévue Q1 2026

---

## 📋 PLAN D'ACTION RECOMMANDÉ

### Immédiat (Aujourd'hui)

**JE RECOMMANDE: Option A (Plugin)**

**Actions**:
1. Créer squelette plugin (30min)
2. Implémenter endpoint `/applyLayout` (1h)
3. Implémenter endpoint `/addField` (1h)
4. Intégrer dans MAX backend (1h)
5. Tests E2E (1h)

**Timeline**: 4-6 heures

### Si Contrainte Temps (<2h disponibles)

**Temporaire: Option B (Volume)**

**Actions**:
1. Modifier `docker-compose.yml` (15min)
2. Corriger `lib/layoutManager.js` (1h)
3. Tests (45min)

**Timeline**: 2 heures

**Migration vers Option A**: Q1 2026

---

## 🧪 POC MINIMAL - Option A (Plugin)

### Étape 1: Créer Plugin Minimal (30min)

```bash
# SSH sur serveur
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose exec espocrm bash

# Créer structure
mkdir -p custom/Espo/Modules/MaxLayoutManager/{Controllers,Services,Resources/metadata/app}

# Controller minimal
cat > custom/Espo/Modules/MaxLayoutManager/Controllers/MaxLayoutManager.php << 'PHPEOF'
<?php
namespace Espo\Modules\MaxLayoutManager\Controllers;

class MaxLayoutManager extends \Espo\Core\Templates\Controllers\Base
{
    public function postActionApplyLayout($params, $data, $request)
    {
        if (!$this->getUser()->isAdmin()) {
            throw new \Espo\Core\Exceptions\Forbidden();
        }

        $entity = $data->entity ?? null;
        $layoutType = $data->layoutType ?? 'detail';
        $layout = $data->layout ?? null;

        if (!$entity || !$layout) {
            throw new \Espo\Core\Exceptions\BadRequest();
        }

        // Utiliser LayoutManager EspoCRM natif
        $layoutManager = $this->getContainer()->get('injectableFactory')
            ->create('Espo\\Core\\Utils\\Layout\\Manager');

        $layoutManager->set($entity, $layoutType, $layout);
        $layoutManager->save();

        // Clear cache
        $this->getContainer()->get('dataManager')->clearCache();

        return [
            'success' => true,
            'entity' => $entity,
            'layoutType' => $layoutType
        ];
    }
}
PHPEOF

# Metadata API
cat > custom/Espo/Modules/MaxLayoutManager/Resources/metadata/app/api.json << 'EOF'
{
  "POST api/v1/MaxLayoutManager/:action": {
    "controller": "MaxLayoutManager"
  }
}
EOF

# Rebuild
php command.php rebuild
php command.php clear-cache
```

### Étape 2: Tester Plugin (15min)

```bash
# Test direct endpoint
curl -u "admin:Admin2025Secure" \
  -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/applyLayout" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Lead",
    "layoutType": "detail",
    "layout": {
      "rows": [
        [{"name": "firstName"}, {"name": "lastName"}],
        [{"name": "email"}, {"name": "phone"}]
      ]
    }
  }'

# Attendu: HTTP 200 OK { "success": true, ... }
```

### Étape 3: Intégration MAX Backend (30min)

```javascript
// max_backend/lib/espoLayoutManager.js (nouveau)
import { espoAdminFetch } from './espoClient.js';

export async function applyLayoutViaPlugin(entity, layoutType, layout) {
  console.log(`[LayoutManager] Applying ${layoutType} layout for ${entity}`);

  const response = await espoAdminFetch('/MaxLayoutManager/applyLayout', {
    method: 'POST',
    body: JSON.stringify({ entity, layoutType, layout })
  });

  console.log('[LayoutManager] ✅ Layout applied successfully');
  return response;
}

export async function addFieldToAllLayouts(entity, fieldName) {
  const layoutTypes = ['detail', 'list', 'detailSmall'];

  for (const layoutType of layoutTypes) {
    // Récupérer layout actuel
    const currentLayout = await getLayout(entity, layoutType);

    // Ajouter champ si pas déjà présent
    if (!layoutContainsField(currentLayout, fieldName)) {
      const newLayout = addFieldToLayout(currentLayout, fieldName);
      await applyLayoutViaPlugin(entity, layoutType, newLayout);
    }
  }

  console.log(`[LayoutManager] ✅ Field ${fieldName} added to all layouts`);
}

async function getLayout(entity, layoutType) {
  // Lire layout actuel depuis EspoCRM
  const response = await espoFetch(`/Layout/${entity}/${layoutType}`);
  return response;
}

function layoutContainsField(layout, fieldName) {
  return JSON.stringify(layout).includes(`"${fieldName}"`);
}

function addFieldToLayout(layout, fieldName) {
  // Ajouter à la première ligne disponible
  if (!layout.rows) layout.rows = [];
  if (layout.rows.length === 0) layout.rows.push([]);

  layout.rows[0].push({ name: fieldName });
  return layout;
}
```

### Étape 4: Test E2E (30min)

```bash
# Via MAX Chat
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Crée un champ secteur_poc de type varchar pour Lead et ajoute-le aux layouts detail et list"
  }'

# Vérification visuelle
# 1. Aller sur https://crm.studiomacrea.cloud
# 2. Lead > Créer nouveau > Vérifier champ secteur_poc apparaît ✅
```

---

## 📊 COMPARAISON FINALE

| Critère | Option A (Plugin) | Option B (Volume) |
|---------|------------------|-------------------|
| **Scalabilité** | ✅ Excellente (2000+ tenants) | ⚠️ Limitée (volumes partagés) |
| **Sécurité** | ✅ API EspoCRM native | ⚠️ Filesystem partagé |
| **Maintenance** | ✅ Code standard | ⚠️ Hack filesystem |
| **Multi-tenant** | ✅ Isolation complète | ❌ Volumes partagés |
| **Effort initial** | ⚠️ 4-6h | ✅ 2h |
| **Dette technique** | ✅ Aucune | ❌ Élevée |
| **Production ready** | ✅ Oui | ⚠️ MVP seulement |

**VERDICT FINAL**: ✅ **OPTION A (Plugin EspoCRM)**

---

## 🚀 NEXT STEPS

Voulez-vous que je:
1. ✅ **Implémente le POC Plugin maintenant** (4-6h, solution pérenne)
2. ⚠️ **Implémente Option B temporaire** (2h, dette technique)

**Ma recommandation forte**: Option 1 (Plugin), investissement rentabilisé dès 10+ clients.
