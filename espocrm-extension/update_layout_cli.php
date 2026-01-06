<?php
/**
 * update_layout_cli.php
 *
 * CLI Script pour ajouter des champs aux layouts EspoCRM
 * WORKAROUND: Routing HTTP POST non supporté par EspoCRM
 *
 * Usage:
 *   php update_layout_cli.php <entity> <fieldName> <layoutTypes>
 *
 * Example:
 *   php update_layout_cli.php Lead secteurActivite detail,list,detailSmall
 */

if (php_sapi_name() !== 'cli') {
    die('This script must be run from CLI');
}

require_once 'bootstrap.php';

// Parse arguments
$entity = $argv[1] ?? null;
$fieldName = $argv[2] ?? null;
$layoutTypesStr = $argv[3] ?? 'detail,list';

if (!$entity || !$fieldName) {
    echo "Usage: php update_layout_cli.php <entity> <fieldName> <layoutTypes>\n";
    echo "Example: php update_layout_cli.php Lead secteurActivite detail,list\n";
    exit(1);
}

$layoutTypes = explode(',', $layoutTypesStr);

// Bootstrap EspoCRM
$app = new \Espo\Core\Application();
$container = $app->getContainer();

$layoutManager = $container->get('injectableFactory')
    ->create('Espo\\Tools\\LayoutManager\\LayoutManager');

$log = $container->get('log');

$modified = 0;
$skipped = 0;

foreach ($layoutTypes as $layoutType) {
    $layoutType = trim($layoutType);

    try {
        $layout = $layoutManager->get($entity, $layoutType);

        // Check if field already exists
        $layoutJson = json_encode($layout);
        if (strpos($layoutJson, '"name":"' . $fieldName . '"') !== false) {
            echo "⏭  {$layoutType}: field already exists, skipped\n";
            $skipped++;
            continue;
        }

        // Add field to layout
        $layout = addFieldToLayout($layout, $fieldName, $layoutType);

        // Save layout
        $layoutManager->set($entity, $layoutType, $layout);

        echo "✅ {$layoutType}: field added\n";
        $modified++;

    } catch (\Exception $e) {
        echo "❌ {$layoutType}: error - " . $e->getMessage() . "\n";
    }
}

echo "\nSummary:\n";
echo "  Modified: {$modified}\n";
echo "  Skipped: {$skipped}\n";

// Rebuild
echo "\n🔄 Rebuilding EspoCRM...\n";
$dataManager = $container->get('injectableFactory')->create('Espo\\Core\\DataManager');
$dataManager->clearCache();
$dataManager->rebuild();
echo "✅ Rebuild complete\n";

/**
 * Add field to layout helper
 */
function addFieldToLayout($layout, string $fieldName, string $layoutType)
{
    if ($layoutType === 'list' || $layoutType === 'listSmall') {
        // List layouts
        if (!isset($layout['layout'])) {
            $layout['layout'] = [];
        }
        $layout['layout'][] = ['name' => $fieldName];

    } elseif ($layoutType === 'detail' || $layoutType === 'detailSmall') {
        // Detail layouts
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

        if (empty($layout['layout'][$panelIndex]['rows'])) {
            $layout['layout'][$panelIndex]['rows'][] = [
                ['name' => $fieldName]
            ];
        } else {
            $lastRowIndex = count($layout['layout'][$panelIndex]['rows']) - 1;
            $lastRow = &$layout['layout'][$panelIndex]['rows'][$lastRowIndex];

            if (count($lastRow) >= 2) {
                $layout['layout'][$panelIndex]['rows'][] = [
                    ['name' => $fieldName]
                ];
            } else {
                $lastRow[] = ['name' => $fieldName];
            }
        }

    } else {
        // Other layouts
        if (!is_array($layout)) {
            $layout = [];
        }
        $layout[] = ['name' => $fieldName];
    }

    return $layout;
}
