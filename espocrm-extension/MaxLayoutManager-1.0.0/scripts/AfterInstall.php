<?php
/**
 * AfterInstall Script
 *
 * Generate API key and inject into config.php
 */

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

            $log->info('MaxLayoutManager: API key generated and saved to data/config.php');
            $log->warning('========================================');
            $log->warning('MaxLayoutManager Installation Complete');
            $log->warning('========================================');
            $log->warning('');
            $log->warning('ACTION REQUIRED: Add this to MAX backend .env:');
            $log->warning('');
            $log->warning("MAX_PLUGIN_KEY={$apiKey}");
            $log->warning('');
            $log->warning('Then restart MAX backend:');
            $log->warning('docker compose restart max-backend');
            $log->warning('');
            $log->warning('========================================');
        } else {
            $log->info('MaxLayoutManager: API key already exists, keeping it');
        }

        return true;
    }
}
