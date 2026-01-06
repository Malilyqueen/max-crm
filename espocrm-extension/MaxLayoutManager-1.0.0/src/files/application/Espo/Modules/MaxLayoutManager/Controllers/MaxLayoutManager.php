<?php
/**
 * MaxLayoutManager Controller
 *
 * REST API endpoints pour gestion automatique des layouts
 * Secured by X-Max-Plugin-Key header
 */

namespace Espo\Modules\MaxLayoutManager\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Exceptions\BadRequest;
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

    /**
     * POST /api/v1/MaxLayoutManager/applyLayout
     *
     * Apply complete layout for entity
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
     * Add field to multiple layouts
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

        $this->log->info("MaxLayoutManager: Adding {$fieldName} to {$entity} layouts: " . implode(', ', $layoutTypes));

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
     * Rebuild EspoCRM + clear cache
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
}
