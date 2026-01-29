/**
 * types/automation.ts
 * Types TypeScript pour les automatisations et workflows MVP1
 */

export type WorkflowStatus = 'active' | 'inactive' | 'draft';
export type WorkflowTriggerType = 'lead_created' | 'lead_status_changed' | 'lead_scored' | 'time_based' | 'lead_updated' | 'tag_added' | 'manual';
export type WorkflowActionType = 'send_email' | 'update_field' | 'create_task' | 'add_tag' | 'assign_to' | 'wait' | 'notify';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  label: string;
  config?: Record<string, any>;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  label: string;
  description: string;
  config: Record<string, any>;
  order: number;
}

export interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  lastExecuted?: string;
  averageDuration?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  stats: WorkflowStats;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AutomationFilters {
  status?: WorkflowStatus[];
  triggerType?: WorkflowTriggerType[];
  search?: string;
}
