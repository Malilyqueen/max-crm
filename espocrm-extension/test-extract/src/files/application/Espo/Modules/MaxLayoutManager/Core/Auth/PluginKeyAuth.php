<?php
/**
 * PluginKeyAuth
 *
 * Authentication via X-Max-Plugin-Key header
 * CRITICAL: Pas de secrets dans les logs
 */

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
     * Validate X-Max-Plugin-Key header
     *
     * @throws Forbidden if key invalid
     * @throws Error if key not configured
     */
    public function validate(Request $request): void
    {
        $providedKey = $request->getHeader('X-Max-Plugin-Key');
        $expectedKey = $this->config->get('maxLayoutManagerApiKey');

        if (!$expectedKey) {
            $this->log->error('MaxLayoutManager: API key not configured in data/config.php');
            throw new Error('MaxLayoutManager API key not configured. Run AfterInstall script.');
        }

        if (!$providedKey) {
            $this->log->warning('MaxLayoutManager: Missing X-Max-Plugin-Key header');
            throw new Forbidden('X-Max-Plugin-Key header required');
        }

        // Timing-attack safe comparison
        if (!hash_equals($expectedKey, $providedKey)) {
            // NEVER log the actual keys
            $remoteAddr = $request->getServerParam('REMOTE_ADDR') ?? 'unknown';
            $this->log->warning("MaxLayoutManager: Invalid API key attempt from {$remoteAddr}");
            throw new Forbidden('Invalid X-Max-Plugin-Key');
        }

        // Success - minimal logging
        $this->log->debug('MaxLayoutManager: Authentication successful');
    }
}
