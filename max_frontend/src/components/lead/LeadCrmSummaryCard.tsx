/**
 * components/lead/LeadCrmSummaryCard.tsx
 * Carte résumé des infos CRM d'un lead (status, tags, notes, assigné)
 */

import React from 'react';
import { User, Tag, FileText, Calendar, Mail, Phone, Building2 } from 'lucide-react';
import type { Lead } from '../../types/crm';

interface LeadCrmSummaryCardProps {
  lead: Lead;
}

export function LeadCrmSummaryCard({ lead }: LeadCrmSummaryCardProps) {
  // Status color mapping
  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'Nouveau': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      'Contacté': { bg: '#e0e7ff', text: '#4338ca', border: '#6366f1' },
      'Qualifié': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      'Proposition': { bg: '#fce7f3', text: '#831843', border: '#ec4899' },
      'Gagné': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      'Perdu': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
    };
    return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
  };

  const statusColors = getStatusColor(lead.status);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header avec statut */}
      <div
        className="px-6 py-4 border-l-4"
        style={{
          backgroundColor: statusColors.bg,
          borderLeftColor: statusColors.border
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
              style={{
                backgroundColor: statusColors.border,
                color: 'white'
              }}
            >
              {lead.firstName?.[0]}{lead.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text
                  }}
                >
                  {lead.status}
                </span>
                {lead.score !== undefined && (
                  <span className="text-xs text-gray-600">
                    Score: <span className="font-medium">{lead.score}/100</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corps avec infos contact */}
      <div className="px-6 py-4 space-y-3">
        {/* Email */}
        {lead.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a
              href={`mailto:${lead.email}`}
              className="text-cyan-600 hover:text-cyan-700 hover:underline"
            >
              {lead.email}
            </a>
          </div>
        )}

        {/* Téléphone */}
        {lead.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a
              href={`tel:${lead.phone}`}
              className="text-gray-900 hover:text-cyan-600"
            >
              {lead.phone}
            </a>
          </div>
        )}

        {/* Entreprise */}
        {lead.company && (
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-900">{lead.company}</span>
          </div>
        )}

        {/* Source */}
        {lead.source && (
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">Source: <span className="text-gray-900">{lead.source}</span></span>
          </div>
        )}

        {/* Assigné à */}
        {lead.assignedTo && (
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">Assigné à: <span className="text-gray-900">{lead.assignedTo}</span></span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600">
            Créé le {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-violet-100 text-violet-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Notes</span>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}
