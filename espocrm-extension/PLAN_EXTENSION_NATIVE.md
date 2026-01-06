# Extension EspoCRM Native - MaxLayoutManager

**Date**: 26 décembre 2025
**Objectif**: Extension packageable installable via Extension Manager permettant à MAX de gérer les layouts automatiquement

---

## 1. ARBORESCENCE COMPLÈTE

```
MaxLayoutManager-1.0.0/
├── manifest.json                          # Metadata extension (version, auteur, dépendances)
├── README.md                              # Documentation installation
│
├── src/
│   └── files/
│       └── application/
│           └── Espo/
│               └── Modules/
│                   └── MaxLayoutManager/
│                       ├── Routes.php                    # Routes Slim POST
│                       ├── Controllers/
│                       │   └── MaxLayoutManager.php      # Controller actions
│                       ├── Services/
│                       │   └── LayoutService.php         # Business logic layouts
│                       ├── Core/
│                       │   └── Auth/
│                       │       └── PluginKeyAuth.php     # Authentication via X-Max-Plugin-Key
│                       └── Resources/
│                           └── metadata/
│                               ├── scopes/
│                               │   └── MaxLayoutManager.json
│                               └── app/
│                                   └── api.json          # Backup metadata (optionnel)
│
└── scripts/
    ├── BeforeInstall.php                  # Validation pré-install (EspoCRM version)
    ├── AfterInstall.php                   # Config injection (maxLayoutManagerApiKey)
    └── BeforeUninstall.php                # Cleanup
```

---

## 2. MANIFEST.JSON

```json
{
  "name": "MaxLayoutManager",
  "version": "1.0.0",
  "acceptableVersions": [
    ">=8.0.0"
  ],
  "author": "MACREA Studio",
  "description": "API REST sécurisée pour gestion automatique des layouts EspoCRM par MAX",
  "releaseDate": "2025-12-26",
  "php": [
    ">=8.1.0"
  ],
  "skipBackup": false,
  "checkModuleFiles": true
}
```

**Conventions**:
- `name`: Nom du module (doit matcher `Espo\Modules\{name}`)
- `acceptableVersions`: EspoCRM >= 8.0 (routing Slim moderne)
- `skipBackup`: false (EspoCRM backup avant install)
- `checkModuleFiles`: true (vérifie intégrité fichiers)

---

## 3. ROUTES.PHP (Clé du succès)

**Fichier**: `src/files/application/Espo/Modules/MaxLayoutManager/Routes.php`

```php
<?php
namespace Espo\Modules\MaxLayoutManager;

use Espo\Core\Api\Route;

class Routes
{
    /**
     * Enregistrement des routes POST dans Slim
     *
     * CRITICAL: C'est ICI que Slim apprend l'existence des routes POST
     * Sans ce fichier, metadata/app/api.json est ignoré pour POST
     */
    public function load(): array
    {
        return [
            // Route 1: Appliquer un layout complet
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/applyLayout',
                controller: 'Espo\Modules\MaxLayoutManager\Controllers\MaxLayoutManager',
                action: 'postApplyLayout',
                noAuth: true  // On gère auth custom via X-Max-Plugin-Key
            ),

            // Route 2: Ajouter un champ à des layouts
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/addField',
                controller: 'Espo\Modules\MaxLayoutManager\Controllers\MaxLayoutManager',
                action: 'postAddField',
                noAuth: true
            ),

            // Route 3: Rebuild + clear cache
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/rebuild',
                controller: 'Espo\Modules\MaxLayoutManager\Controllers\MaxLayoutManager',
                action: 'postRebuild',
                noAuth: true
            ),

            // Route 4: Health check plugin
            Route::createGet(
                route: '/api/v1/MaxLayoutManager/health',
                controller: 'Espo\Modules\MaxLayoutManager\Controllers\MaxLayoutManager',
                action: 'getHealth',
                noAuth: true
            ),
        ];
    }
}
```

**Pourquoi ça fonctionne**:
- EspoCRM scanne `Espo\Modules\*\Routes.php` au rebuild
- `Route::createPost()` enregistre la route dans Slim
- `noAuth: true` + validation custom dans Controller

---

## 4. CONTROLLER (Actions)

**Fichier**: `src/files/application/Espo/Modules/MaxLayoutManager/Controllers/MaxLayoutManager.php`

```php
<?php
namespace Espo\Modules\MaxLayoutManager\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Modules\MaxLayoutManager\Services\LayoutService;
use Espo\Modules\MaxLayoutManager\Core\Auth\PluginKeyAuth;

class MaxLayoutManager
{
    private $layoutService;
    private $pluginKeyAuth;
    private $log;

    public function __construct(
        LayoutService $layoutService,
        PluginKeyAuth $pluginKeyAuth,
        $log
    ) {
        $this->layoutService = $layoutService;
        $this->pluginKeyAuth = $pluginKeyAuth;
        $this->log = $log;
    }

    /**
     * POST /api/v1/MaxLayoutManager/applyLayout
     *
     * Applique un layout complet
     */
    public function postApplyLayout(Request $request): Response
    {
        $this->pluginKeyAuth->validate($request);

        $data = $request->getParsedBody();

        $entity = $data->entity ?? null;
        $layoutType = $data->layoutType ?? 'detail';
        $layout = $data->layout ?? null;

        if (!$entity || !$layout) {
            throw new BadRequest('Missing required: entity, layout');
        }

        $this->log->info("MaxLayoutManager: Applying {$layoutType} for {$entity}");

        $result = $this->layoutService->applyLayout($entity, $layoutType, $layout);

        return Response::fromString(json_encode([
            'success' => true,
            'entity' => $entity,
            'layoutType' => $layoutType,
            'fieldsAdded' => $result['fieldsAdded'] ?? 0,
            'timestamp' => date('Y-m-d H:i:s')
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * POST /api/v1/MaxLayoutManager/addField
     *
     * Ajoute un champ à plusieurs layouts
     */
    public function postAddField(Request $request): Response
    {
        $this->pluginKeyAuth->validate($request);

        $data = $request->getParsedBody();

        $entity = $data->entity ?? null;
        $fieldName = $data->fieldName ?? null;
        $layoutTypes = $data->layoutTypes ?? ['detail'];

        if (!$entity || !$fieldName) {
            throw new BadRequest('Missing required: entity, fieldName');
        }

        $this->log->info("MaxLayoutManager: Adding {$fieldName} to {$entity} layouts");

        $result = $this->layoutService->addFieldToLayouts($entity, $fieldName, $layoutTypes);

        return Response::fromString(json_encode([
            'success' => true,
            'entity' => $entity,
            'fieldName' => $fieldName,
            'layoutsModified' => $result['modified'],
            'layoutsSkipped' => $result['skipped'],
            'details' => $result['details'],
            'timestamp' => date('Y-m-d H:i:s')
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * POST /api/v1/MaxLayoutManager/rebuild
     *
     * Rebuild + clear cache
     */
    public function postRebuild(Request $request): Response
    {
        $this->pluginKeyAuth->validate($request);

        $this->log->info('MaxLayoutManager: Rebuild triggered');

        $result = $this->layoutService->rebuild();

        return Response::fromString(json_encode([
            'success' => true,
            'message' => 'Rebuild and cache clear completed',
            'timestamp' => date('Y-m-d H:i:s')
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * GET /api/v1/MaxLayoutManager/health
     *
     * Health check (no auth required)
     */
    public function getHealth(Request $request): Response
    {
        return Response::fromString(json_encode([
            'status' => 'ok',
            'module' => 'MaxLayoutManager',
            'version' => '1.0.0',
            'timestamp' => date('Y-m-d H:i:s')
        ]))->withHeader('Content-Type', 'application/json');
    }
}
```

**Retours JSON stricts**:
- Toujours `success: true/false`
- Details des actions (`layoutsModified`, `fieldsAdded`)
- Timestamp pour audit
- Pas de secrets dans logs

---

## 5. SERVICE (Business Logic)

**Fichier**: `src/files/application/Espo/Modules/MaxLayoutManager/Services/LayoutService.php`

```php
<?php
namespace Espo\Modules\MaxLayoutManager\Services;

use Espo\Core\InjectableFactory;

class LayoutService
{
    private $injectableFactory;
    private $log;

    public function __construct($injectableFactory, $log)
    {
        $this->injectableFactory = $injectableFactory;
        $this->log = $log;
    }

    /**
     * Applique un layout complet
     */
    public function applyLayout(string $entity, string $layoutType, $layout): array
    {
        $layoutManager = $this->injectableFactory->create('Espo\\Tools\\LayoutManager\\LayoutManager');

        $layoutArray = json_decode(json_encode($layout), true);

        $layoutManager->set($entity, $layoutType, $layoutArray);

        $this->log->info("Layout {$layoutType} applied for {$entity}");

        return [
            'fieldsAdded' => $this->countFields($layoutArray)
        ];
    }

    /**
     * Ajoute un champ à plusieurs layouts
     */
    public function addFieldToLayouts(string $entity, string $fieldName, array $layoutTypes): array
    {
        $layoutManager = $this->injectableFactory->create('Espo\\Tools\\LayoutManager\\LayoutManager');

        $modified = 0;
        $skipped = 0;
        $details = [];

        foreach ($layoutTypes as $layoutType) {
            try {
                $layout = $layoutManager->get($entity, $layoutType);

                if ($this->fieldExistsInLayout($layout, $fieldName)) {
                    $skipped++;
                    $details[] = "{$layoutType}: already exists";
                    $this->log->info("Field {$fieldName} already in {$layoutType}, skipped");
                    continue;
                }

                $layout = $this->addFieldToLayout($layout, $fieldName, $layoutType);
                $layoutManager->set($entity, $layoutType, $layout);

                $modified++;
                $details[] = "{$layoutType}: added";
                $this->log->info("Field {$fieldName} added to {$layoutType}");

            } catch (\Exception $e) {
                $details[] = "{$layoutType}: error - " . $e->getMessage();
                $this->log->error("Error adding to {$layoutType}: " . $e->getMessage());
            }
        }

        return [
            'modified' => $modified,
            'skipped' => $skipped,
            'details' => $details
        ];
    }

    /**
     * Rebuild + clear cache
     */
    public function rebuild(): array
    {
        $dataManager = $this->injectableFactory->create('Espo\\Core\\DataManager');

        $dataManager->clearCache();
        $this->log->info('Cache cleared');

        $dataManager->rebuild();
        $this->log->info('Rebuild completed');

        return ['success' => true];
    }

    /**
     * Vérifie si champ existe dans layout
     */
    private function fieldExistsInLayout($layout, string $fieldName): bool
    {
        $layoutJson = json_encode($layout);
        return strpos($layoutJson, '"name":"' . $fieldName . '"') !== false ||
               strpos($layoutJson, '"' . $fieldName . '"') !== false;
    }

    /**
     * Ajoute champ à un layout (logique smart)
     */
    private function addFieldToLayout($layout, string $fieldName, string $layoutType)
    {
        if ($layoutType === 'list' || $layoutType === 'listSmall') {
            // List layouts: ajouter à la fin
            if (!isset($layout['layout'])) {
                $layout['layout'] = [];
            }
            $layout['layout'][] = ['name' => $fieldName];

        } elseif ($layoutType === 'detail' || $layoutType === 'detailSmall') {
            // Detail layouts: ajouter au premier panel
            if (!isset($layout['layout'])) {
                $layout['layout'] = [];
            }

            if (empty($layout['layout'])) {
                $layout['layout'][] = [
                    'label' => 'Overview',
                    'rows' => []
                ];
            }

            $panelIndex = 0;
            if (!isset($layout['layout'][$panelIndex]['rows'])) {
                $layout['layout'][$panelIndex]['rows'] = [];
            }

            // Ajouter nouvelle ligne avec le champ
            if (empty($layout['layout'][$panelIndex]['rows'])) {
                $layout['layout'][$panelIndex]['rows'][] = [
                    ['name' => $fieldName]
                ];
            } else {
                // Ajouter à dernière ligne ou créer nouvelle ligne si pleine
                $lastRowIndex = count($layout['layout'][$panelIndex]['rows']) - 1;
                $lastRow = &$layout['layout'][$panelIndex]['rows'][$lastRowIndex];

                if (count($lastRow) >= 2) {
                    // Ligne pleine, créer nouvelle
                    $layout['layout'][$panelIndex]['rows'][] = [
                        ['name' => $fieldName]
                    ];
                } else {
                    // Ajouter à ligne existante
                    $lastRow[] = ['name' => $fieldName];
                }
            }

        } else {
            // Autres layouts: ajouter à racine
            if (!is_array($layout)) {
                $layout = [];
            }
            $layout[] = ['name' => $fieldName];
        }

        return $layout;
    }

    /**
     * Compte les champs dans un layout
     */
    private function countFields($layout): int
    {
        $count = 0;
        $layoutJson = json_encode($layout);
        preg_match_all('/"name":\s*"[^"]+"/i', $layoutJson, $matches);
        return count($matches[0]);
    }
}
```

**Multi-tenant safe**:
- Aucun userId hardcodé
- Pas de path OS
- Pas de localhost
- Entity name paramétré

---

## 6. AUTHENTICATION CUSTOM

**Fichier**: `src/files/application/Espo/Modules/MaxLayoutManager/Core/Auth/PluginKeyAuth.php`

```php
<?php
namespace Espo\Modules\MaxLayoutManager\Core\Auth;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\Error;

class PluginKeyAuth
{
    private $config;
    private $log;

    public function __construct($config, $log)
    {
        $this->config = $config;
        $this->log = $log;
    }

    /**
     * Valide le header X-Max-Plugin-Key
     *
     * CRITICAL: Pas de secret en logs
     */
    public function validate(Request $request): void
    {
        $providedKey = $request->getHeader('X-Max-Plugin-Key');
        $expectedKey = $this->config->get('maxLayoutManagerApiKey');

        if (!$expectedKey) {
            $this->log->error('MaxLayoutManager: API key not configured in config.php');
            throw new Error('MaxLayoutManager API key not configured');
        }

        if (!$providedKey) {
            $this->log->warning('MaxLayoutManager: Missing X-Max-Plugin-Key header');
            throw new Forbidden('X-Max-Plugin-Key header required');
        }

        if (!hash_equals($expectedKey, $providedKey)) {
            // CRITICAL: Ne jamais logger les clés
            $this->log->warning('MaxLayoutManager: Invalid API key attempt from ' .
                ($request->getServerParam('REMOTE_ADDR') ?? 'unknown'));
            throw new Forbidden('Invalid X-Max-Plugin-Key');
        }

        // Success (pas de log du secret)
        $this->log->debug('MaxLayoutManager: Authentication successful');
    }
}
```

**Sécurité**:
- `hash_equals()` (timing-attack safe)
- Pas de secret dans logs (jamais)
- IP logging pour audit

---

## 7. SCRIPTS INSTALL

### BeforeInstall.php

```php
<?php
namespace Espo\Modules\MaxLayoutManager;

class BeforeInstall
{
    public function run($container)
    {
        $config = $container->get('config');

        // Check EspoCRM version >= 8.0
        $version = $config->get('version');
        if (version_compare($version, '8.0.0', '<')) {
            throw new \Exception('MaxLayoutManager requires EspoCRM >= 8.0.0');
        }

        return true;
    }
}
```

### AfterInstall.php

```php
<?php
namespace Espo\Modules\MaxLayoutManager;

class AfterInstall
{
    public function run($container)
    {
        $config = $container->get('config');
        $log = $container->get('log');

        // Generate API key if not exists
        if (!$config->get('maxLayoutManagerApiKey')) {
            $apiKey = bin2hex(random_bytes(32));

            $config->set('maxLayoutManagerApiKey', $apiKey);
            $config->save();

            $log->info('MaxLayoutManager: API key generated and saved to config.php');
            $log->info('MaxLayoutManager: Add this to MAX backend .env: MAX_PLUGIN_KEY=' . $apiKey);
        }

        return true;
    }
}
```

### BeforeUninstall.php

```php
<?php
namespace Espo\Modules\MaxLayoutManager;

class BeforeUninstall
{
    public function run($container)
    {
        $config = $container->get('config');

        // Remove API key from config
        if ($config->get('maxLayoutManagerApiKey')) {
            $config->remove('maxLayoutManagerApiKey');
            $config->save();
        }

        return true;
    }
}
```

---

## 8. METADATA (Backup)

**Fichier**: `src/files/application/Espo/Modules/MaxLayoutManager/Resources/metadata/scopes/MaxLayoutManager.json`

```json
{
  "entity": false,
  "module": "MaxLayoutManager",
  "acl": false
}
```

---

## 9. PACKAGING

### Script de build

**Fichier**: `build-extension.sh`

```bash
#!/bin/bash

VERSION="1.0.0"
NAME="MaxLayoutManager"
OUTPUT="${NAME}-${VERSION}.zip"

echo "Building ${OUTPUT}..."

# Clean previous builds
rm -f *.zip

# Create zip with correct structure
cd MaxLayoutManager-1.0.0
zip -r "../${OUTPUT}" . -x "*.git*" -x "*.DS_Store"
cd ..

echo "✅ Extension packaged: ${OUTPUT}"
echo "📦 Ready for upload to EspoCRM Extension Manager"
```

### README.md

```markdown
# MaxLayoutManager Extension

Version 1.0.0

## Installation

1. Login to EspoCRM as admin
2. Go to **Administration > Extensions**
3. Click **Upload**
4. Select `MaxLayoutManager-1.0.0.zip`
5. Click **Install**
6. Rebuild (automatic)

## Configuration

After installation, the API key is generated automatically.

Check EspoCRM logs for:
```
MaxLayoutManager: Add this to MAX backend .env: MAX_PLUGIN_KEY=xxxxx
```

Add this key to `/opt/max-infrastructure/.env`:
```
MAX_PLUGIN_KEY=your_generated_key_here
```

Restart MAX backend:
```bash
docker compose restart max-backend
```

## API Endpoints

### POST /api/v1/MaxLayoutManager/addField

Add field to layouts.

**Headers**:
- `X-Max-Plugin-Key: your_key`

**Body**:
```json
{
  "entity": "Lead",
  "fieldName": "secteurActivite",
  "layoutTypes": ["detail", "detailSmall", "list"]
}
```

**Response**:
```json
{
  "success": true,
  "entity": "Lead",
  "fieldName": "secteurActivite",
  "layoutsModified": 3,
  "layoutsSkipped": 0,
  "details": [
    "detail: added",
    "detailSmall: added",
    "list: added"
  ]
}
```

## Uninstallation

1. Administration > Extensions
2. Find MaxLayoutManager
3. Click Uninstall
4. API key automatically removed from config

## Support

MACREA Studio - support@macrea.fr
```

---

## 10. PLAN DE TEST E2E

### Étape 1: Installation

```bash
# Upload MaxLayoutManager-1.0.0.zip via Extension Manager
# Vérifier logs:
grep "MaxLayoutManager" data/logs/espo-$(date +%Y-%m-%d).log
```

### Étape 2: Récupérer API Key

```bash
docker compose exec espocrm grep maxLayoutManagerApiKey data/config.php
# Copier la clé dans .env backend
```

### Étape 3: Test Health

```bash
curl "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/health"
# Expected: {"status":"ok","module":"MaxLayoutManager","version":"1.0.0"}
```

### Étape 4: Créer champ via MAX

```bash
curl -u "admin:Admin2025Secure" -X PUT \
  "https://crm.studiomacrea.cloud/api/v1/Admin/fieldManager/Lead/secteurActivite" \
  -d '{"type":"enum","options":["Artisanat","Commerce"]}'
```

### Étape 5: Ajouter aux layouts via extension

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/addField" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Lead",
    "fieldName": "secteurActivite",
    "layoutTypes": ["detail", "detailSmall", "list"]
  }'

# Expected:
# {
#   "success": true,
#   "layoutsModified": 3,
#   "details": ["detail: added", "detailSmall: added", "list: added"]
# }
```

### Étape 6: Rebuild

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "X-Max-Plugin-Key: VOTRE_CLE_ICI"

# Expected: {"success":true,"message":"Rebuild and cache clear completed"}
```

### Étape 7: Preuve visuelle

1. Login EspoCRM: `https://crm.studiomacrea.cloud`
2. CRM > Leads > Click any lead
3. **Vérifier**: Champ `secteurActivite` visible dans le formulaire detail
4. Edit lead > **Vérifier**: Champ visible et éditable
5. List view > **Vérifier**: Colonne `secteurActivite` présente

---

## 11. CONVENTIONS ESPOCRM RESPECTÉES

### Namespaces
- Format: `Espo\Modules\{ModuleName}\{Category}\{ClassName}`
- Example: `Espo\Modules\MaxLayoutManager\Controllers\MaxLayoutManager`

### Dependency Injection
- Constructor injection via InjectableFactory
- Services auto-wired par EspoCRM

### Logging
- Utiliser `$this->log->info()` / `warning()` / `error()`
- JAMAIS de secrets dans logs

### Configuration
- Clés stockées dans `data/config.php`
- Accès via `$config->get('key')`

### Routes
- `Routes.php` dans namespace racine module
- Retourne array de `Route::createPost()` / `createGet()`

### Packaging
- Manifest à la racine
- `src/files/application/` contient les sources
- Scripts dans `scripts/`

---

## LIVRABLE IMMÉDIAT

1. ✅ Plan détaillé (ce fichier)
2. ⏳ Code complet (prochaine étape)
3. ⏳ Package .zip
4. ⏳ POC E2E

**Next**: Générer tous les fichiers PHP + build .zip
