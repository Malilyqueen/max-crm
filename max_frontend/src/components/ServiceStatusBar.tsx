import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface ServiceStatus {
  espo: boolean;
  n8n: boolean;
  sse: boolean;
}

export function ServiceStatusBar() {
  const { apiBase, tenant, role, preview } = useAppCtx();
  const [services, setServices] = useState<ServiceStatus>({ espo: true, n8n: true, sse: true });
  const [loading, setLoading] = useState(true);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${apiBase}/api/health`, {
          headers: {
            'X-Tenant': tenant,
            'X-Role': role,
            'X-Preview': String(preview),
            'X-Client': 'max-ui'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setServices(data.services || { espo: false, n8n: false, sse: false });
        }
      } catch (error) {
        console.warn('Health check failed:', error);
        setServices({ espo: false, n8n: false, sse: false });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [apiBase, tenant, role, preview]);

  const getStatusColor = (status: boolean) => status ? 'bg-green-500' : 'bg-red-500';
  const getStatusText = (status: boolean) => status ? 'Online' : 'Offline';

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
          <span className="text-macrea-mute">API</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
          <span className="text-macrea-mute">n8n</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
          <span className="text-macrea-mute">Chat</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1" title={`EspoCRM: ${getStatusText(services.espo)}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(services.espo)}`}></div>
        <span className="text-macrea-mute">API</span>
      </div>
      <div className="flex items-center gap-1" title={`n8n: ${getStatusText(services.n8n)}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(services.n8n)}`}></div>
        <span className="text-macrea-mute">n8n</span>
      </div>
      <div className="flex items-center gap-1" title={`SSE: ${getStatusText(services.sse)}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(services.sse)}`}></div>
        <span className="text-macrea-mute">Chat</span>
      </div>
    </div>
  );
}