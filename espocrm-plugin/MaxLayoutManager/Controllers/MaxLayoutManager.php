<?php
/**
 * MaxLayoutManager Controller
 *
 * API pour gérer les layouts EspoCRM de manière programmatique
 * Sécurisé par X-Max-Plugin-Key
 */

namespace Espo\Modules\MaxLayoutManager\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\Error;

class MaxLayoutManager
{
    private $config;
    private $injectableFactory;
    private $log;

    public function __construct($config, $injectableFactory, $log)
    {
        $this->config = $config;
        $this->injectableFactory = $injectableFactory;
        $this->log = $log;
    }

    /**
     * Vérifier la clé d'API plugin
     */
    private function validatePluginKey(Request $request): void
    {
        $providedKey = $request->getHeader('X-Max-Plugin-Key');
        $expectedKey = $this->config->get('maxLayoutManagerApiKey');

        if (!$expectedKey) {
            throw new Error('MAX_LAYOUT_MANAGER_API_KEY not configured in EspoCRM');
        }

        if (!$providedKey || $providedKey !== $expectedKey) {
            $this->log->warning('MaxLayoutManager: Invalid API key attempt');
            throw new Forbidden('Invalid X-Max-Plugin-Key');
        }
    }

    /**
     * POST /api/v1/MaxLayoutManager/applyLayout
     *
     * Applique un layout complet pour une entité
     */
    public function postActionApplyLayout(Request $request): Response
    {
        $this->validatePluginKey($request);

        $data = $request->getParsedBody();
        $entity = $data->entity ?? null;
        $layoutType = $data->layoutType ?? 'detail';
        $layout = $data->layout ?? null;

        if (!$entity || !$layout) {
            throw new BadRequest('Missing required fields: entity, layout');
        }

        $this->log->info("MaxLayoutManager: Applying {$layoutType} layout for {$entity}");

        // Utiliser le LayoutManager EspoCRM natif
        $layoutManager = $this->injectableFactory->create('Espo\\Tools\\Layout\\LayoutManager');

        // Convertir stdClass en array si nécessaire
        $layoutArray = json_decode(json_encode($layout), true);

        // Sauvegarder le layout
        $layoutManager->set($entity, $layoutType, $layoutArray);

        $this->log->info("MaxLayoutManager: Layout {$layoutType} applied successfully for {$entity}");

        return Response::fromString(json_encode([
            'success' => true,
            'entity' => $entity,
            'layoutType' => $layoutType,
            'message' => 'Layout applied successfully'
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * POST /api/v1/MaxLayoutManager/addField
     *
     * Ajoute un champ à un ou plusieurs layouts
     */
    public function postActionAddField(Request $request): Response
    {
        $this->validatePluginKey($request);

        $data = $request->getParsedBody();
        $entity = $data->entity ?? null;
        $fieldName = $data->fieldName ?? null;
        $layoutTypes = $data->layoutTypes ?? ['detail'];
        $position = $data->position ?? null;

        if (!$entity || !$fieldName) {
            throw new BadRequest('Missing required fields: entity, fieldName');
        }

        $this->log->info("MaxLayoutManager: Adding field {$fieldName} to {$entity} layouts");

        $layoutManager = $this->injectableFactory->create('Espo\\Tools\\Layout\\LayoutManager');
        $modified = 0;

        foreach ($layoutTypes as $layoutType) {
            try {
                // Récupérer le layout actuel
                $layout = $layoutManager->get($entity, $layoutType);

                // Vérifier si le champ existe déjà
                if ($this->fieldExistsInLayout($layout, $fieldName)) {
                    $this->log->info("Field {$fieldName} already exists in {$layoutType} layout, skipping");
                    continue;
                }

                // Ajouter le champ
                $layout = $this->addFieldToLayout($layout, $fieldName, $position, $layoutType);

                // Sauvegarder
                $layoutManager->set($entity, $layoutType, $layout);
                $modified++;

                $this->log->info("Field {$fieldName} added to {$layoutType} layout");

            } catch (\Exception $e) {
                $this->log->error("Error adding field to {$layoutType}: " . $e->getMessage());
            }
        }

        return Response::fromString(json_encode([
            'success' => true,
            'entity' => $entity,
            'fieldName' => $fieldName,
            'layoutsModified' => $modified,
            'message' => "Field added to {$modified} layout(s)"
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * POST /api/v1/MaxLayoutManager/rebuild
     *
     * Rebuild EspoCRM + clear cache
     */
    public function postActionRebuild(Request $request): Response
    {
        $this->validatePluginKey($request);

        $this->log->info('MaxLayoutManager: Starting rebuild');

        // Clear cache
        $dataManager = $this->injectableFactory->create('Espo\\Core\\DataManager');
        $dataManager->clearCache();

        $this->log->info('MaxLayoutManager: Cache cleared');

        // Rebuild
        $dataManager->rebuild();

        $this->log->info('MaxLayoutManager: Rebuild completed');

        return Response::fromString(json_encode([
            'success' => true,
            'message' => 'Rebuild and cache clear completed',
            'timestamp' => date('Y-m-d H:i:s')
        ]))->withHeader('Content-Type', 'application/json');
    }

    /**
     * Vérifie si un champ existe déjà dans un layout
     */
    private function fieldExistsInLayout($layout, string $fieldName): bool
    {
        $layoutJson = json_encode($layout);
        return strpos($layoutJson, '"name":"' . $fieldName . '"') !== false ||
               strpos($layoutJson, '"' . $fieldName . '"') !== false;
    }

    /**
     * Ajoute un champ à un layout
     */
    private function addFieldToLayout($layout, string $fieldName, $position, string $layoutType)
    {
        if ($layoutType === 'list' || $layoutType === 'listSmall') {
            // Pour les layouts list, ajouter à la fin
            if (!isset($layout['layout'])) {
                $layout['layout'] = [];
            }
            $layout['layout'][] = ['name' => $fieldName];

        } elseif ($layoutType === 'detail' || $layoutType === 'detailSmall') {
            // Pour les layouts detail, ajouter dans les rows
            if (!isset($layout['layout'])) {
                $layout['layout'] = [];
            }

            // Trouver le premier panel
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

            // Ajouter le champ à la première ligne disponible
            if (empty($layout['layout'][$panelIndex]['rows'])) {
                $layout['layout'][$panelIndex]['rows'][] = [
                    ['name' => $fieldName]
                ];
            } else {
                // Ajouter à la dernière ligne
                $lastRowIndex = count($layout['layout'][$panelIndex]['rows']) - 1;
                $lastRow = &$layout['layout'][$panelIndex]['rows'][$lastRowIndex];

                // Si la dernière ligne a déjà 2 champs, créer une nouvelle ligne
                if (count($lastRow) >= 2) {
                    $layout['layout'][$panelIndex]['rows'][] = [
                        ['name' => $fieldName]
                    ];
                } else {
                    $lastRow[] = ['name' => $fieldName];
                }
            }

        } else {
            // Pour autres types de layouts, ajouter à la racine
            if (!is_array($layout)) {
                $layout = [];
            }
            $layout[] = ['name' => $fieldName];
        }

        return $layout;
    }
}
