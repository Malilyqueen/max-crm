import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface HistoryItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: string;
}

export function HistoryList() {
  const { flags } = useAppCtx();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Mock history data for now
    const mockHistory: HistoryItem[] = [
      {
        id: '1',
        title: 'Campagne email automatisée lancée',
        description: '1250 contacts ciblés',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        type: 'campaign'
      },
      {
        id: '2',
        title: 'Lead mis à jour via import CSV',
        description: '50 nouveaux leads ajoutés',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        type: 'import'
      },
      {
        id: '3',
        title: 'Workflow de relance activé',
        description: 'J+3 automatique configuré',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        type: 'workflow'
      }
    ];

    if (flags.useMocks) {
      setHistory(mockHistory);
    } else {
      // In real implementation, fetch from API
      setHistory([]);
    }
  }, [flags.useMocks]);

  return (
    <div className="space-y-3">
      {history.length === 0 ? (
        <div className="text-sm text-macrea-mute">Aucun historique disponible</div>
      ) : (
        history.map((item) => (
          <div key={item.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <div className="font-medium text-sm">{item.title}</div>
            {item.description && (
              <div className="text-macrea-mute text-xs mt-1">{item.description}</div>
            )}
            <div className="text-macrea-mute text-[10px] mt-2">
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}