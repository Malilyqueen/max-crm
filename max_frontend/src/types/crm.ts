/**
 * types/crm.ts
 * Types TypeScript pour le CRM MVP1
 */

/**
 * Statuts possibles d'un lead (clés EspoCRM)
 * Les labels FR sont définis dans les composants UI
 */
export type LeadStatus = 'New' | 'Assigned' | 'In Process' | 'Converted' | 'Recycled' | 'Dead';

/**
 * Mapping statut Espo → label FR (pour affichage)
 */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  'New': 'Nouveau',
  'Assigned': 'Assigné',
  'In Process': 'En cours',
  'Converted': 'Converti',
  'Recycled': 'Recyclé',
  'Dead': 'Perdu'
};

/**
 * Couleurs par statut
 */
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  'New': '#3B82F6',
  'Assigned': '#10B981',
  'In Process': '#F59E0B',
  'Converted': '#22C55E',
  'Recycled': '#6B7280',
  'Dead': '#EF4444'
};

// Lead
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  assignedTo?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  notes?: string;
  tags?: string[];
  score?: number; // 0-100
  // V1 Starter - 3 nouveaux champs
  industry?: string;
  website?: string;
  address?: string;
}

// Note sur un lead
export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  createdBy: string;
  createdAt: string; // ISO 8601
}

// Filtres de recherche
export interface LeadFilters {
  status?: LeadStatus[];
  search?: string;
  assignedTo?: string;
  source?: string;
  tags?: string[];
  minScore?: number;
  maxScore?: number;
  notContacted?: boolean; // Filtre leads sans message_event outbound
}

// Réponse API liste leads
export interface LeadsListResponse {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

// Réponse API détail lead
export interface LeadDetailResponse {
  lead: Lead;
  notes: LeadNote[];
  activities: LeadActivity[];
}

// Activité sur un lead
export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'status_change' | 'note_added' | 'email_sent' | 'call_made' | 'meeting_scheduled';
  description: string;
  createdBy: string;
  createdAt: string; // ISO 8601
  metadata?: Record<string, any>;
}

// Payload pour créer/modifier un lead
export interface CreateLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  source?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {
  id: string;
}

// Payload pour changer le statut
export interface UpdateLeadStatusPayload {
  leadId: string;
  status: LeadStatus;
}

// Payload pour ajouter une note
export interface AddLeadNotePayload {
  leadId: string;
  content: string;
}
