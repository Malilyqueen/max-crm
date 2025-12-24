/**
 * types/dashboard.ts
 * Types TypeScript pour le Dashboard MVP1
 */

// Statistiques KPI
export interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: number;
  activeWorkflows: number;
  pendingTasks: number;
  maxInteractions: number;
}

// Évolution des leads par jour
export interface LeadsTrend {
  date: string; // Format: YYYY-MM-DD
  count: number;
  converted: number;
}

// Activité récente
export interface RecentActivity {
  id: string;
  type: 'lead_created' | 'lead_converted' | 'workflow_triggered' | 'max_interaction';
  title: string;
  description: string;
  timestamp: string; // ISO 8601
  icon?: string;
}

// Répartition des leads par statut
export interface LeadsByStatus {
  status: string;
  count: number;
  color: string;
}

// Réponse API dashboard
export interface DashboardData {
  stats: DashboardStats;
  leadsTrend: LeadsTrend[];
  recentActivity: RecentActivity[];
  leadsByStatus: LeadsByStatus[];
}

// Action rapide
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color?: string;
}
