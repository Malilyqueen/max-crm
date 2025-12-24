/**
 * components/crm/LeadsList.tsx
 * Liste des leads avec tableau
 */

import React from 'react';
import type { Lead, LeadStatus } from '../../types/crm';

interface LeadsListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  isLoading: boolean;
}

const statusColors: Record<LeadStatus, string> = {
  'Nouveau': 'bg-blue-100 text-blue-800',
  'Contacté': 'bg-green-100 text-green-800',
  'Qualifié': 'bg-yellow-100 text-yellow-800',
  'Proposition': 'bg-purple-100 text-purple-800',
  'Gagné': 'bg-emerald-100 text-emerald-800',
  'Perdu': 'bg-red-100 text-red-800'
};

export function LeadsList({ leads, onSelectLead, isLoading }: LeadsListProps) {
  // Fonction pour obtenir la couleur d'un statut (mapping dynamique pour EspoCRM)
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      // Valeurs EspoCRM en anglais
      'New': 'bg-blue-100 text-blue-800',
      'Assigned': 'bg-green-100 text-green-800',
      'In Process': 'bg-yellow-100 text-yellow-800',
      'Converted': 'bg-emerald-100 text-emerald-800',
      'Recycled': 'bg-gray-100 text-gray-800',
      'Dead': 'bg-red-100 text-red-800',
      // Fallback valeurs françaises
      'Nouveau': 'bg-blue-100 text-blue-800',
      'Contacté': 'bg-green-100 text-green-800',
      'Qualifié': 'bg-yellow-100 text-yellow-800',
      'Proposition': 'bg-purple-100 text-purple-800',
      'Gagné': 'bg-emerald-100 text-emerald-800',
      'Perdu': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun lead</h3>
        <p className="mt-1 text-sm text-gray-500">Aucun lead ne correspond aux filtres sélectionnés</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nom
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entreprise
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Créé le
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectLead(lead)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {lead.firstName} {lead.lastName}
                </div>
                {lead.phone && (
                  <div className="text-sm text-gray-500">{lead.phone}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{lead.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{lead.company || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}
                >
                  {lead.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {lead.score !== undefined && (
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">{lead.score}/100</div>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${lead.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(lead.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLead(lead);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Voir détail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
