<?php
/**
 * BeforeUninstall Script
 *
 * Cleanup config
 */

namespace Espo\Modules\MaxLayoutManager;

class BeforeUninstall
{
    public function run($container)
    {
        $config = $container->get('config');
        $log = $container->get('log');

        // Remove API key from config
        if ($config->get('maxLayoutManagerApiKey')) {
            $config->remove('maxLayoutManagerApiKey');
            $config->save();
            $log->info('MaxLayoutManager: API key removed from config.php');
        }

        $log->warning('MaxLayoutManager: Uninstalled. Remove MAX_PLUGIN_KEY from backend .env if no longer needed.');

        return true;
    }
}
