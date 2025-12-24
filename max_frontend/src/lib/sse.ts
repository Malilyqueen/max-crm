export function connectTaskStream(apiBase: string, tenant: string, onEvent: (event: any) => void) {
  const url = `${apiBase}/api/tasks/stream`;
  const es = new EventSource(url, {
    withCredentials: false
  });

  // Listen for status updates
  es.addEventListener('status', (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent({
        type: 'status',
        data,
        ts: Date.now()
      });
    } catch (err) {
      console.warn('Failed to parse SSE status event:', err);
    }
  });

  // Listen for heartbeat
  es.addEventListener('heartbeat', (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent({
        type: 'heartbeat',
        data,
        ts: Date.now()
      });
    } catch (err) {
      console.warn('Failed to parse SSE heartbeat event:', err);
    }
  });

  es.onerror = (error) => {
    console.warn('SSE connection error:', error);
  };

  return es;
}