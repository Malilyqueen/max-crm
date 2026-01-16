/**
 * components/campaigns/SegmentBuilderModal.tsx
 * Modal de construction de segment pour campagnes bulk
 */

import React, { useState } from 'react';
import { X, Users, Tag, TrendingUp, Search, Plus, Trash2 } from 'lucide-react';
import type { LeadStatus } from '../../types/crm';

interface SegmentCriteria {
  status?: LeadStatus[];
  tags?: string[];
  source?: string;
  leadIds?: string[];
}

interface SegmentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (segment: SegmentCriteria) => void;
}

export function SegmentBuilderModal({ isOpen, onClose, onConfirm }: SegmentBuilderModalProps) {
  const [mode, setMode] = useState<'criteria' | 'manual'>('criteria');
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [manualLeadIds, setManualLeadIds] = useState<string>('');
  const [estimatedCount, setEstimatedCount] = useState<number>(0);

  const availableStatuses: LeadStatus[] = ['Nouveau', 'Contacté', 'Qualifié', 'Proposition', 'Gagné', 'Perdu'];
  const availableTags = ['VIP', 'Newsletter', 'Webinar', 'Demo', 'Trial'];
  const availableSources = ['Website', 'LinkedIn', 'Google Ads', 'Referral', 'Event'];

  const handleStatusToggle = (status: LeadStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleConfirm = () => {
    const segment: SegmentCriteria = {};

    if (mode === 'criteria') {
      if (selectedStatuses.length > 0) segment.status = selectedStatuses;
      if (selectedTags.length > 0) segment.tags = selectedTags;
      if (selectedSource) segment.source = selectedSource;
    } else {
      // Manual mode
      const leadIds = manualLeadIds
        .split(/[\n,;]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (leadIds.length > 0) segment.leadIds = leadIds;
    }

    onConfirm(segment);
    onClose();
  };

  const hasSelection = mode === 'criteria'
    ? selectedStatuses.length > 0 || selectedTags.length > 0 || selectedSource
    : manualLeadIds.trim().length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-cyan-500 to-violet-600">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Créer un segment</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode selector */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('criteria')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'criteria'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Search className="inline w-4 h-4 mr-2" />
                Filtres automatiques
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Plus className="inline w-4 h-4 mr-2" />
                Sélection manuelle
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {mode === 'criteria' ? (
              <>
                {/* Statuts */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <TrendingUp className="w-4 h-4" />
                    Statuts
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusToggle(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedStatuses.includes(status)
                            ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Tag className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Toutes les sources</option>
                    {availableSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Manuel IDs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Liste d'IDs de leads
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Entrez les IDs de leads, un par ligne ou séparés par des virgules.
                  </p>
                  <textarea
                    value={manualLeadIds}
                    onChange={(e) => setManualLeadIds(e.target.value)}
                    placeholder="6584dea9c1e2f&#10;6584deb0c1e30&#10;6584deb7c1e31"
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {manualLeadIds.split(/[\n,;]+/).filter(id => id.trim()).length} lead(s) sélectionné(s)
                  </p>
                </div>
              </>
            )}

            {/* Résumé */}
            {hasSelection && (
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                <h4 className="text-sm font-semibold text-cyan-900 mb-2">Segment sélectionné:</h4>
                <div className="space-y-1 text-sm text-cyan-800">
                  {mode === 'criteria' ? (
                    <>
                      {selectedStatuses.length > 0 && (
                        <p>• Statuts: {selectedStatuses.join(', ')}</p>
                      )}
                      {selectedTags.length > 0 && (
                        <p>• Tags: {selectedTags.join(', ')}</p>
                      )}
                      {selectedSource && (
                        <p>• Source: {selectedSource}</p>
                      )}
                    </>
                  ) : (
                    <p>• {manualLeadIds.split(/[\n,;]+/).filter(id => id.trim()).length} leads sélectionnés manuellement</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasSelection}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirmer le segment
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
