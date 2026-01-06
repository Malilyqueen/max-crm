<?php
/**
 * add-field-to-layouts.php
 *
 * Script PHP direct pour ajouter un champ aux layouts EspoCRM
 * Appelé par MAX via: docker exec espocrm php add-field-to-layouts.php Lead secteurActivite detail,list
 *
 * SÉCURISÉ: Validation inputs, pas d'eval, logs audit
 * CORRECTIF: Conversion objet->array pour éviter l'écrasement des layouts
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

if (php_sapi_name() !== 'cli') {
    die(json_encode(['error' => 'CLI only']));
}

try {
    require_once 'bootstrap.php';
} catch (\Exception $e) {
    die(json_encode(['success' => false, 'error' => 'Bootstrap failed: ' . $e->getMessage()]));
}

// Parse arguments
$entity = $argv[1] ?? null;
$fieldName = $argv[2] ?? null;
$layoutTypesStr = $argv[3] ?? 'detail,list';

// Validate inputs (security)
if (!$entity || !$fieldName) {
    die(json_encode([
        'success' => false,
        'error' => 'Usage: php add-field-to-layouts.php <entity> <fieldName> <layoutTypes>'
    ]));
}

if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $entity)) {
    die(json_encode(['success' => false, 'error' => 'Invalid entity name']));
}

if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $fieldName)) {
    die(json_encode(['success' => false, 'error' => 'Invalid field name']));
}

$layoutTypes = array_map('trim', explode(',', $layoutTypesStr));

// Bootstrap EspoCRM
try {
    $app = new \Espo\Core\Application();
    $container = $app->getContainer();

    $layoutManager = $container->get('injectableFactory')
        ->create('Espo\\Tools\\LayoutManager\\LayoutManager');

    $log = $container->get('log');

    $results = [];
    $modified = 0;
    $skipped = 0;

    foreach ($layoutTypes as $layoutType) {
        try {
            // Get current layout (returns JSON string)
            $layoutStr = $layoutManager->get($entity, $layoutType);

            // Check if field already exists BEFORE decoding
            if (strpos($layoutStr, '"name":"' . $fieldName . '"') !== false) {
                $results[] = ['layoutType' => $layoutType, 'status' => 'skipped', 'reason' => 'already exists'];
                $skipped++;
                $log->info("MAX LayoutManager: Field {$fieldName} already in {$entity}/{$layoutType}");
                continue;
            }

            // Decode to array (true = force associative arrays)
            $layout = json_decode($layoutStr, true);

            // Validate layout is an array
            if (!is_array($layout)) {
                $log->warning("MAX LayoutManager: Invalid layout for {$entity}/{$layoutType}, initializing empty");
                $layout = [];
            }

            // Add field to layout
            $layout = addFieldToLayout($layout, $fieldName, $layoutType);

            // Re-encode and save
            $layoutManager->set(json_encode($layout), $entity, $layoutType);

            $results[] = ['layoutType' => $layoutType, 'status' => 'added'];
            $modified++;
            $log->info("MAX LayoutManager: Added {$fieldName} to {$entity}/{$layoutType}");

        } catch (\Exception $e) {
            $results[] = [
                'layoutType' => $layoutType,
                'status' => 'error',
                'error' => $e->getMessage()
            ];
            $log->error("MAX LayoutManager: Error adding {$fieldName} to {$entity}/{$layoutType}: " . $e->getMessage());
        }
    }

    // Save all layout changes
    if ($modified > 0) {
        $layoutManager->save();
        $log->info("MAX LayoutManager: Saved {$modified} layout modifications");

        // Only clear cache, don't rebuild (rebuild resets layouts)
        $dataManager = $container->get('injectableFactory')->create('Espo\\Core\\DataManager');
        $dataManager->clearCache();
    }

    // Return JSON result
    echo json_encode([
        'success' => true,
        'entity' => $entity,
        'fieldName' => $fieldName,
        'layoutsModified' => $modified,
        'layoutsSkipped' => $skipped,
        'results' => $results,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

} catch (\Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
    exit(1);
}

/**
 * Add field to layout helper
 * @param array $layout - Layout as associative array (decoded with json_decode($str, true))
 * @param string $fieldName - Field name to add
 * @param string $layoutType - Layout type (list, detail, etc.)
 * @return array - Modified layout
 */
function addFieldToLayout(array $layout, string $fieldName, string $layoutType): array
{
    if ($layoutType === 'list' || $layoutType === 'listSmall') {
        // List layouts are simple arrays: [{"name":"field1"},{"name":"field2"}]

        // If layout is empty or invalid, initialize
        if (empty($layout) || !isset($layout[0])) {
            $layout = [];
        }

        // Add field at the end
        $layout[] = ['name' => $fieldName];

    } elseif ($layoutType === 'detail' || $layoutType === 'detailSmall') {
        // Detail layouts: [{"label":"Panel","rows":[[{"name":"field1"},{"name":"field2"}]]}]

        // If layout is empty, create default structure
        if (empty($layout)) {
            $layout = [
                [
                    'label' => 'Overview',
                    'rows' => [
                        [['name' => $fieldName]]
                    ]
                ]
            ];
            return $layout;
        }

        // Get first panel (most common case)
        $panelIndex = 0;

        // Ensure panel exists
        if (!isset($layout[$panelIndex]) || !is_array($layout[$panelIndex])) {
            $layout[$panelIndex] = [
                'label' => 'Overview',
                'rows' => []
            ];
        }

        // Ensure rows array exists
        if (!isset($layout[$panelIndex]['rows']) || !is_array($layout[$panelIndex]['rows'])) {
            $layout[$panelIndex]['rows'] = [];
        }

        // If no rows exist, create first row with the field
        if (empty($layout[$panelIndex]['rows'])) {
            $layout[$panelIndex]['rows'][] = [
                ['name' => $fieldName]
            ];
        } else {
            // Get last row
            $lastRowIndex = count($layout[$panelIndex]['rows']) - 1;

            // If last row has 2 fields already, create new row
            if (count($layout[$panelIndex]['rows'][$lastRowIndex]) >= 2) {
                $layout[$panelIndex]['rows'][] = [
                    ['name' => $fieldName]
                ];
            } else {
                // Add to last row
                $layout[$panelIndex]['rows'][$lastRowIndex][] = ['name' => $fieldName];
            }
        }

    } else {
        // Other layout types - simple array
        if (empty($layout)) {
            $layout = [];
        }
        $layout[] = ['name' => $fieldName];
    }

    return $layout;
}