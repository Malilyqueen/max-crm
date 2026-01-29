/**
 * stores/useTemplatesStore.ts
 * Store Zustand pour la gestion des templates Email/SMS/WhatsApp
 *
 * Remplace les templates hardcodés de TemplatesSection.tsx
 * par des données provenant de l'API /api/templates
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

// Types
export interface MessageTemplate {
  id: string;
  tenant_id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  name: string;
  category: 'vente' | 'support' | 'marketing' | 'facturation' | 'securite' | 'general';
  subject?: string | null;
  content: string;
  variables: string[];
  whatsapp_from?: string | null;
  whatsapp_content_sid?: string | null;
  status: 'draft' | 'active' | 'archived';
  created_by: 'user' | 'max' | 'system';
  created_at: string;
  updated_at: string;
}

export interface TemplatesGrouped {
  email: MessageTemplate[];
  sms: MessageTemplate[];
  whatsapp: MessageTemplate[];
}

export interface TemplatesCounts {
  email: number;
  sms: number;
  whatsapp: number;
}

interface TemplatesState {
  // Data
  templates: MessageTemplate[];
  grouped: TemplatesGrouped;
  counts: TemplatesCounts;
  selectedTemplate: MessageTemplate | null;

  // Filters
  channelFilter: 'all' | 'email' | 'sms' | 'whatsapp';
  statusFilter: 'all' | 'draft' | 'active';
  searchTerm: string;

  // UI State
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  loadTemplateById: (id: string) => Promise<void>;
  createTemplate: (data: CreateTemplateData) => Promise<MessageTemplate | null>;
  updateTemplate: (id: string, data: Partial<CreateTemplateData>) => Promise<MessageTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  activateTemplate: (id: string) => Promise<boolean>;

  // Filter actions
  setChannelFilter: (channel: 'all' | 'email' | 'sms' | 'whatsapp') => void;
  setStatusFilter: (status: 'all' | 'draft' | 'active') => void;
  setSearchTerm: (term: string) => void;
  clearFilters: () => void;

  // Selection
  selectTemplate: (template: MessageTemplate | null) => void;
  clearError: () => void;
}

export interface CreateTemplateData {
  channel: 'email' | 'sms' | 'whatsapp';
  name: string;
  category?: string;
  subject?: string;
  content: string;
  whatsapp_from?: string;
  whatsapp_content_sid?: string;
  status?: 'draft' | 'active';
}

// API Response types
interface TemplatesResponse {
  ok: boolean;
  templates: MessageTemplate[];
  grouped: TemplatesGrouped;
  counts: TemplatesCounts;
  total: number;
}

interface TemplateResponse {
  ok: boolean;
  template: MessageTemplate;
  message?: string;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  // Initial state
  templates: [],
  grouped: { email: [], sms: [], whatsapp: [] },
  counts: { email: 0, sms: 0, whatsapp: 0 },
  selectedTemplate: null,

  channelFilter: 'all',
  statusFilter: 'all',
  searchTerm: '',

  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,

  // Load all templates
  loadTemplates: async () => {
    set({ isLoading: true, error: null });

    try {
      const { channelFilter, statusFilter, searchTerm } = get();

      // Build query params
      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.append('channel', channelFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const queryString = params.toString();
      const url = `/templates${queryString ? `?${queryString}` : ''}`;

      console.log('[TEMPLATES STORE] Loading templates:', url);

      const response = await apiClient.get<TemplatesResponse>(url);

      if (response.ok) {
        set({
          templates: response.templates,
          grouped: response.grouped,
          counts: response.counts,
          isLoading: false
        });
        console.log(`[TEMPLATES STORE] Loaded ${response.templates.length} templates`);
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error loading templates:', error);
      set({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement des templates'
      });
    }
  },

  // Load single template
  loadTemplateById: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.get<TemplateResponse>(`/templates/${id}`);

      if (response.ok) {
        set({
          selectedTemplate: response.template,
          isLoading: false
        });
      } else {
        throw new Error('Template not found');
      }
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error loading template:', error);
      set({
        isLoading: false,
        error: error.message || 'Template introuvable'
      });
    }
  },

  // Create new template
  createTemplate: async (data: CreateTemplateData) => {
    set({ isCreating: true, error: null });

    try {
      console.log('[TEMPLATES STORE] Creating template:', data.name);

      const response = await apiClient.post<TemplateResponse>('/templates', data);

      if (response.ok) {
        // Reload templates to get updated list
        await get().loadTemplates();
        set({ isCreating: false });
        console.log(`[TEMPLATES STORE] Template created: ${response.template.id}`);
        return response.template;
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error creating template:', error);
      set({
        isCreating: false,
        error: error.message || 'Erreur lors de la création'
      });
      return null;
    }
  },

  // Update template
  updateTemplate: async (id: string, data: Partial<CreateTemplateData>) => {
    set({ isUpdating: true, error: null });

    try {
      console.log('[TEMPLATES STORE] Updating template:', id);

      const response = await apiClient.patch<TemplateResponse>(`/templates/${id}`, data);

      if (response.ok) {
        // Update in local state
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? response.template : t
          ),
          selectedTemplate: state.selectedTemplate?.id === id
            ? response.template
            : state.selectedTemplate,
          isUpdating: false
        }));
        console.log(`[TEMPLATES STORE] Template updated: ${id}`);
        return response.template;
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error updating template:', error);
      set({
        isUpdating: false,
        error: error.message || 'Erreur lors de la mise à jour'
      });
      return null;
    }
  },

  // Delete (archive) template
  deleteTemplate: async (id: string) => {
    try {
      console.log('[TEMPLATES STORE] Deleting template:', id);

      const response = await apiClient.delete<{ ok: boolean }>(`/templates/${id}`);

      if (response.ok) {
        // Remove from local state
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          selectedTemplate: state.selectedTemplate?.id === id
            ? null
            : state.selectedTemplate
        }));
        // Reload to update grouped/counts
        await get().loadTemplates();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error deleting template:', error);
      set({ error: error.message || 'Erreur lors de la suppression' });
      return false;
    }
  },

  // Activate template (draft → active)
  activateTemplate: async (id: string) => {
    try {
      console.log('[TEMPLATES STORE] Activating template:', id);

      const response = await apiClient.post<TemplateResponse>(`/templates/${id}/activate`, {});

      if (response.ok) {
        // Update in local state
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, status: 'active' as const } : t
          ),
          selectedTemplate: state.selectedTemplate?.id === id
            ? { ...state.selectedTemplate, status: 'active' as const }
            : state.selectedTemplate
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[TEMPLATES STORE] Error activating template:', error);
      set({ error: error.message || 'Erreur lors de l\'activation' });
      return false;
    }
  },

  // Filter actions
  setChannelFilter: (channel) => {
    set({ channelFilter: channel });
    get().loadTemplates();
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().loadTemplates();
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    // Debounce search - don't reload immediately
  },

  clearFilters: () => {
    set({
      channelFilter: 'all',
      statusFilter: 'all',
      searchTerm: ''
    });
    get().loadTemplates();
  },

  // Selection
  selectTemplate: (template) => {
    set({ selectedTemplate: template });
  },

  clearError: () => {
    set({ error: null });
  }
}));
