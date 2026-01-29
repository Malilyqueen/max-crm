/**
 * components/automation/TemplatesSection.tsx
 * Section affichant tous les templates disponibles (WhatsApp/Email/SMS)
 *
 * V2: Consomme l'API /api/templates via useTemplatesStore
 * Les templates sont stockés en base de données, plus hardcodés.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Smartphone, ChevronDown, ChevronUp, Loader2, CheckCircle, Edit3, DollarSign, LifeBuoy, Megaphone, CreditCard, Lock, FileText } from 'lucide-react';
import { useTemplatesStore, MessageTemplate } from '../../stores/useTemplatesStore';

export function TemplatesSection() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Store
  const {
    templates,
    counts,
    isLoading,
    error,
    loadTemplates,
    activateTemplate
  } = useTemplatesStore();

  // Charger les templates au mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const toggleTemplate = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const handleAskMaxToModify = (template: MessageTemplate) => {
    const channelLabel = template.channel === 'whatsapp' ? 'WhatsApp' : template.channel === 'email' ? 'Email' : 'SMS';
    const prompt = `Peux-tu m'aider à modifier le template "${template.name}" (${channelLabel}) ? ID: ${template.id.substring(0, 8)}`;
    sessionStorage.setItem('pendingPrompt', prompt);
    navigate('/chat');
  };

  const handleActivate = async (template: MessageTemplate) => {
    const success = await activateTemplate(template.id);
    if (success) {
      console.log(`[TemplatesSection] Template ${template.id} activé`);
    }
  };

  const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    vente: { label: 'Vente', color: 'bg-emerald-100 text-emerald-700', icon: <DollarSign className="w-4 h-4" /> },
    support: { label: 'Support', color: 'bg-sky-100 text-sky-700', icon: <LifeBuoy className="w-4 h-4" /> },
    marketing: { label: 'Marketing', color: 'bg-violet-100 text-violet-700', icon: <Megaphone className="w-4 h-4" /> },
    facturation: { label: 'Facturation', color: 'bg-amber-100 text-amber-700', icon: <CreditCard className="w-4 h-4" /> },
    securite: { label: 'Sécurité', color: 'bg-red-100 text-red-700', icon: <Lock className="w-4 h-4" /> },
    general: { label: 'Général', color: 'bg-gray-100 text-gray-700', icon: <FileText className="w-4 h-4" /> }
  };

  const channelConfig = {
    whatsapp: {
      icon: MessageSquare,
      label: 'WhatsApp',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconBg: 'bg-green-100',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700'
    },
    email: {
      icon: Mail,
      label: 'Email',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-100',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    sms: {
      icon: Smartphone,
      label: 'SMS',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      iconBg: 'bg-purple-100',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    }
  };

  // Grouper les templates par canal
  const groupedTemplates = {
    whatsapp: templates.filter(t => t.channel === 'whatsapp'),
    email: templates.filter(t => t.channel === 'email'),
    sms: templates.filter(t => t.channel === 'sms')
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(0, 145, 255, 0.05)',
        border: '1px solid rgba(0, 145, 255, 0.1)'
      }}
    >
      {/* Gradient border top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #0091ff 30%, #00cfff 50%, #0091ff 70%, transparent 100%)',
          opacity: 0.4
        }}
      />

      {/* Header - Cliquable pour rabattre/déplier */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between transition-all duration-300 group relative"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.03), rgba(0, 207, 255, 0.02))'
            : 'transparent'
        }}
      >
        {/* Hover effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 145, 255, 0.05) 0%, transparent 70%)'
          }}
        />

        <div className="flex items-center gap-4 relative z-10">
          <div
            className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))',
              boxShadow: '0 4px 12px rgba(0, 145, 255, 0.15)'
            }}
          >
            <Mail className="w-6 h-6" style={{ color: '#0091ff' }} />
          </div>
          <div className="text-left">
            <h2
              className="text-xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Modèles de Templates
            </h2>
            <p className="text-sm text-gray-600 mt-1 font-medium">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Chargement...
                </span>
              ) : (
                <>{templates.length} template{templates.length > 1 ? 's' : ''} configuré{templates.length > 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex gap-2">
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#059669'
              }}
            >
              <Smartphone className="w-3 h-3 inline mr-1" /> {counts.whatsapp}
            </span>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))',
                border: '1px solid rgba(0, 145, 255, 0.3)',
                color: '#0091ff'
              }}
            >
              <Mail className="w-3 h-3" /> {counts.email}
            </span>
            {counts.sms > 0 && (
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#7c3aed'
                }}
              >
                <MessageSquare className="w-3 h-3" /> {counts.sms}
              </span>
            )}
          </div>
          <div className="transition-transform duration-300 group-hover:scale-110">
            {isOpen ? (
              <ChevronUp className="w-5 h-5" style={{ color: '#0091ff' }} />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Templates Grid - Afficher seulement si ouvert */}
      {isOpen && (
        <div className="p-6 pt-0 space-y-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Chargement des templates...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => loadTemplates()}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && templates.length === 0 && (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Aucun template configuré</p>
              <p className="text-sm text-gray-500 mt-1">
                Demandez à M.A.X. de créer un template : "MAX, crée un email de relance"
              </p>
            </div>
          )}

          {/* Templates list */}
          {!isLoading && templates.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map((template) => {
                const config = channelConfig[template.channel];
                const catConfig = categoryConfig[template.category] || categoryConfig.general;
                const Icon = config.icon;
                const isExpanded = expandedTemplates.has(template.id);
                const isDraft = template.status === 'draft';
                const isMaxGenerated = template.created_by === 'max';

                return (
                  <div
                    key={template.id}
                    className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98))',
                      border: `1px solid ${isDraft ? 'rgba(245, 158, 11, 0.3)' : config.borderColor.includes('green') ? 'rgba(16, 185, 129, 0.2)' : config.borderColor.includes('blue') ? 'rgba(0, 145, 255, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    {/* Template Header */}
                    <div className="p-4 bg-gradient-to-br from-white to-gray-50 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                            style={{
                              background: config.textColor.includes('green')
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))'
                                : config.textColor.includes('blue')
                                ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.15), rgba(0, 207, 255, 0.15))'
                                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.15))',
                              boxShadow: '0 2px 8px rgba(0, 145, 255, 0.1)'
                            }}
                          >
                            <Icon className={`w-5 h-5 ${config.textColor}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {template.name}
                              </h3>
                              {/* Status badge */}
                              {isDraft && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                  Brouillon
                                </span>
                              )}
                              {isMaxGenerated && (
                                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full">
                                  MAX
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <span
                                className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  background: config.textColor.includes('green')
                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))'
                                    : config.textColor.includes('blue')
                                    ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))'
                                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                                  border: `1px solid ${config.textColor.includes('green') ? 'rgba(16, 185, 129, 0.3)' : config.textColor.includes('blue') ? 'rgba(0, 145, 255, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                                  color: config.textColor.includes('green') ? '#059669' : config.textColor.includes('blue') ? '#0091ff' : '#7c3aed'
                                }}
                              >
                                {config.label}
                              </span>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${catConfig.color}`}>
                                {catConfig.icon} {catConfig.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleTemplate(template.id)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-300 hover:scale-110"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                          )}
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        {template.whatsapp_from && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">De:</span>
                            <span className="font-mono text-gray-900">{template.whatsapp_from}</span>
                          </div>
                        )}
                        {template.subject && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Sujet:</span>
                            <span className="text-gray-900">{template.subject}</span>
                          </div>
                        )}
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">Variables:</span>
                            {template.variables.map((v, i) => (
                              <code key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                {`{{${v}}}`}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Template Body (expandable) */}
                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Message Preview */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">APERÇU DU MESSAGE:</p>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                              {template.content}
                            </p>
                          </div>
                        </div>

                        {/* ID et info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: <code className="font-mono">{template.id.substring(0, 8)}</code></span>
                          <span>Créé: {new Date(template.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-gray-200 flex gap-2">
                          {isDraft && (
                            <button
                              onClick={() => handleActivate(template)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Activer ce template
                            </button>
                          )}
                          <button
                            onClick={() => handleAskMaxToModify(template)}
                            className={`${isDraft ? '' : 'flex-1'} px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2`}
                          >
                            <Edit3 className="w-4 h-4" />
                            {isDraft ? 'Modifier' : 'Demander à M.A.X. de modifier'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Info box */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Comment créer ou modifier un template ?</h4>
                <p className="text-sm text-blue-700">
                  Demandez à M.A.X. dans le chat :
                  <span className="italic font-medium"> "MAX, crée un email de relance pour les leads silencieux"</span> ou
                  <span className="italic font-medium"> "MAX, modifie le template de confirmation RDV"</span>.
                  Les brouillons créés par MAX apparaissent ici avec un badge "Brouillon".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
