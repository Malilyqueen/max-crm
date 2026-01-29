import { useEffect } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';

interface HistoryItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: string;
}

export function HistoryList() {
  const { recentActivity, isLoading, loadDashboard } = useDashboardStore();

  // Charger le dashboard au montage si pas déjà chargé
  useEffect(() => {
    if (recentActivity.length === 0 && !isLoading) {
      loadDashboard();
    }
  }, [recentActivity.length, isLoading, loadDashboard]);

  // Mapper recentActivity vers HistoryItem format
  const history: HistoryItem[] = recentActivity.map((activity) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    timestamp: activity.timestamp,
    type: activity.type
  }));

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
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