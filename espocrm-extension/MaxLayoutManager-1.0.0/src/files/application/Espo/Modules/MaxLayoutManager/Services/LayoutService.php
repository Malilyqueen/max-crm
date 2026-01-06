<?php
/**
 * LayoutService
 *
 * Business logic pour gestion des layouts EspoCRM
 * Multi-tenant safe (aucun hardcode)
 */

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
     * Apply complete layout
     */
    public function applyLayout(string $entity, string $layoutType, $layout): array
    {
        $layoutManager = $this->injectableFactory->create('Espo\\Tools\\LayoutManager\\LayoutManager');

        // Convert stdClass to array
        $layoutArray = json_decode(json_encode($layout), true);

        $layoutManager->set($entity, $layoutType, $layoutArray);

        $this->log->info("MaxLayoutManager: Layout {$layoutType} applied for {$entity}");

        return [
            'fieldsAdded' => $this->countFields($layoutArray)
        ];
    }

    /**
     * Add field to multiple layouts
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
                    $this->log->info("MaxLayoutManager: Field {$fieldName} already in {$layoutType}, skipped");
                    continue;
                }

                $layout = $this->addFieldToLayout($layout, $fieldName, $layoutType);
                $layoutManager->set($entity, $layoutType, $layout);

                $modified++;
                $details[] = "{$layoutType}: added";
                $this->log->info("MaxLayoutManager: Field {$fieldName} added to {$layoutType}");

            } catch (\Exception $e) {
                $details[] = "{$layoutType}: error - " . $e->getMessage();
                $this->log->error("MaxLayoutManager: Error adding to {$layoutType}: " . $e->getMessage());
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
        $this->log->info('MaxLayoutManager: Cache cleared');

        $dataManager->rebuild();
        $this->log->info('MaxLayoutManager: Rebuild completed');

        return ['success' => true];
    }

    /**
     * Check if field exists in layout
     */
    private function fieldExistsInLayout($layout, string $fieldName): bool
    {
        $layoutJson = json_encode($layout);
        return strpos($layoutJson, '"name":"' . $fieldName . '"') !== false ||
               strpos($layoutJson, '"' . $fieldName . '"') !== false;
    }

    /**
     * Add field to layout (smart logic by layout type)
     */
    private function addFieldToLayout($layout, string $fieldName, string $layoutType)
    {
        if ($layoutType === 'list' || $layoutType === 'listSmall') {
            // List layouts: append to end
            if (!isset($layout['layout'])) {
                $layout['layout'] = [];
            }
            $layout['layout'][] = ['name' => $fieldName];

        } elseif ($layoutType === 'detail' || $layoutType === 'detailSmall') {
            // Detail layouts: add to first panel
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

            // Add new row with field
            if (empty($layout['layout'][$panelIndex]['rows'])) {
                $layout['layout'][$panelIndex]['rows'][] = [
                    ['name' => $fieldName]
                ];
            } else {
                // Add to last row or create new row if full
                $lastRowIndex = count($layout['layout'][$panelIndex]['rows']) - 1;
                $lastRow = &$layout['layout'][$panelIndex]['rows'][$lastRowIndex];

                if (count($lastRow) >= 2) {
                    // Row full, create new
                    $layout['layout'][$panelIndex]['rows'][] = [
                        ['name' => $fieldName]
                    ];
                } else {
                    // Add to existing row
                    $lastRow[] = ['name' => $fieldName];
                }
            }

        } else {
            // Other layouts: add to root
            if (!is_array($layout)) {
                $layout = [];
            }
            $layout[] = ['name' => $fieldName];
        }

        return $layout;
    }

    /**
     * Count fields in layout
     */
    private function countFields($layout): int
    {
        $layoutJson = json_encode($layout);
        preg_match_all('/"name":\s*"[^"]+"/i', $layoutJson, $matches);
        return count($matches[0]);
    }
}
