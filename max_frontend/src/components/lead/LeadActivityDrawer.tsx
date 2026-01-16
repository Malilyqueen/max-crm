/**
 * components/lead/LeadActivityDrawer.tsx
 * Drawer latéral affichant le détail d'un lead + timeline unifiée
 */

import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { LeadCrmSummaryCard } from './LeadCrmSummaryCard';
import { UnifiedTimeline } from './UnifiedTimeline';
import { useEventsStore } from '../../stores/useEventsStore';
import type { Lead, LeadActivity } from '../../types/crm';

interface LeadActivityDrawerProps {
  lead: Lead;
  activities: LeadActivity[];
  isOpen: boolean;
  onClose: () => void;
}

export function LeadActivityDrawer({ lead, activities, isOpen, onClose }: LeadActivityDrawerProps) {
  const { events, isLoading, loadEventsByLead } = useEventsStore();

  // Charger les events du lead quand le drawer s'ouvre
  useEffect(() => {
    if (isOpen && lead.id) {
      loadEventsByLead(lead.id);
    }
  }, [isOpen, lead.id, loadEventsByLead]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-50 shadow-2xl z-50 flex flex-col animate-slide-in-right"
        style={{
          animation: 'slideInRight 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Détail du lead
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {lead.firstName} {lead.lastName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Lien vers page détail complète (si existe) */}
            <a
              href={`/crm/leads/${lead.id}`}
              className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ouvrir dans une nouvelle page"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Summary card */}
            <section>
              <LeadCrmSummaryCard lead={lead} />
            </section>

            {/* Timeline */}
            <section>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Historique d'activité
                </h3>
                <p className="text-sm text-gray-600">
                  Activités CRM et communications multi-canal
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <UnifiedTimeline
                  activities={activities}
                  events={events}
                  isLoading={isLoading}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
