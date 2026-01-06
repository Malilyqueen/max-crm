<?php
/**
 * BeforeInstall Script
 *
 * Validation pre-installation
 */

namespace Espo\Modules\MaxLayoutManager;

class BeforeInstall
{
    public function run($container)
    {
        $config = $container->get('config');
        $log = $container->get('log');

        // Check EspoCRM version >= 8.0
        $version = $config->get('version');
        if (version_compare($version, '8.0.0', '<')) {
            $log->error("MaxLayoutManager requires EspoCRM >= 8.0.0, found {$version}");
            throw new \Exception("MaxLayoutManager requires EspoCRM >= 8.0.0 (current: {$version})");
        }

        $log->info("MaxLayoutManager: Pre-install checks passed (EspoCRM {$version})");

        return true;
    }
}
