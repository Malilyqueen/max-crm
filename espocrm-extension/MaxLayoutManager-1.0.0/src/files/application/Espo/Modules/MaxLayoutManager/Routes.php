<?php
/**
 * MaxLayoutManager Routes
 *
 * Enregistre les routes POST dans Slim Framework
 * CRITICAL: Sans ce fichier, les routes POST sont rejetées avec 405
 */

namespace Espo\Modules\MaxLayoutManager;

use Espo\Core\Api\Route;

class Routes
{
    /**
     * Load custom routes pour MaxLayoutManager
     *
     * @return Route[]
     */
    public function load(): array
    {
        return [
            // Health check (no auth)
            Route::createGet(
                route: '/api/v1/MaxLayoutManager/health',
                controller: 'Espo\\Modules\\MaxLayoutManager\\Controllers\\MaxLayoutManager',
                action: 'getHealth',
                noAuth: true
            ),

            // Apply complete layout
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/applyLayout',
                controller: 'Espo\\Modules\\MaxLayoutManager\\Controllers\\MaxLayoutManager',
                action: 'postApplyLayout',
                noAuth: true
            ),

            // Add field to layouts
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/addField',
                controller: 'Espo\\Modules\\MaxLayoutManager\\Controllers\\MaxLayoutManager',
                action: 'postAddField',
                noAuth: true
            ),

            // Rebuild + clear cache
            Route::createPost(
                route: '/api/v1/MaxLayoutManager/rebuild',
                controller: 'Espo\\Modules\\MaxLayoutManager\\Controllers\\MaxLayoutManager',
                action: 'postRebuild',
                noAuth: true
            ),
        ];
    }
}
