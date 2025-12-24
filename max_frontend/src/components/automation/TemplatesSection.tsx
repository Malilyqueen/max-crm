/**
 * components/automation/TemplatesSection.tsx
 * Section affichant tous les templates disponibles (WhatsApp/Email/SMS)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'sms';
  category: 'vente' | 'support' | 'marketing' | 'facturation' | 'securite';
  from?: string;
  subject?: string;
  preview: string;
  usedIn: string[];
}

const templates: Template[] = [
  // Templates WhatsApp
  {
    id: 'confirmation-rdv-whatsapp',
    name: 'Confirmation de Rendez-vous',
    channel: 'whatsapp',
    category: 'vente',
    from: 'whatsapp:+14155238886',
    preview: 'Bonjour {{firstName}} 👋\n\nVotre rendez-vous est confirmé pour le {{appointmentDate}} à {{appointmentTime}}.\n\n📍 Lieu: {{location}}\n👤 Avec: {{salesRep}}\n\nRépondez OUI pour confirmer ou ANNULER pour reporter.',
    usedIn: ['Confirmation automatique RDV']
  },
  {
    id: 'validation-panier-whatsapp',
    name: 'Validation de Panier Abandonné',
    channel: 'whatsapp',
    category: 'vente',
    from: 'whatsapp:+14155238886',
    preview: 'Bonjour {{firstName}} 🛒\n\nVous avez {{itemCount}} articles dans votre panier pour un montant de {{cartTotal}}€.\n\nSouhaitez-vous finaliser votre commande ? Cliquez ici: {{checkoutLink}}\n\n✨ Offre spéciale: -10% si vous commandez aujourd\'hui avec le code CART10',
    usedIn: ['Récupération panier abandonné']
  },
  {
    id: 'relance-j3-whatsapp',
    name: 'Relance Lead Froid J+3',
    channel: 'whatsapp',
    category: 'vente',
    from: 'whatsapp:+14155238886',
    preview: 'Bonjour {{firstName}},\n\nJe remarque que nous n\'avons pas eu de nouvelles depuis notre dernier échange. Y a-t-il des questions auxquelles je peux répondre pour vous aider dans votre décision ?\n\nJe reste à votre disposition.',
    usedIn: ['Relance WhatsApp J+3']
  },
  {
    id: 'rappel-facture-whatsapp',
    name: 'Rappel Facture Impayée',
    channel: 'whatsapp',
    category: 'facturation',
    from: 'whatsapp:+14155238886',
    preview: 'Bonjour {{firstName}},\n\nNous constatons que la facture n°{{invoiceNumber}} du {{invoiceDate}} ({{amount}}€) n\'a pas encore été réglée.\n\nEchéance: {{dueDate}}\n\nPour tout règlement, utilisez ce lien: {{paymentLink}}',
    usedIn: ['Rappel factures impayées']
  },

  // Templates Email
  {
    id: 'relance-j3',
    name: 'Relance Lead J+3 Email',
    channel: 'email',
    category: 'vente',
    subject: 'Suite à notre échange - {{companyName}}',
    preview: 'Bonjour {{firstName}},\n\nNous n\'avons pas eu de retour de votre part depuis {{daysAgo}} jours suite à notre dernier échange concernant {{product}}.\n\nSouhaitez-vous que nous reprogrammions un échange pour discuter de vos besoins ?\n\nJe reste à votre entière disposition.',
    usedIn: ['Relance automatique J+3']
  },
  {
    id: 'newsletter',
    name: 'Newsletter Segmentée',
    channel: 'email',
    category: 'marketing',
    subject: 'Votre newsletter {{month}} - Actualités {{sector}}',
    preview: 'Bonjour {{firstName}},\n\nDécouvrez les dernières actualités et tendances de votre secteur {{sector}}. Nous avons sélectionné pour vous :\n\n✓ {{article1}}\n✓ {{article2}}\n✓ {{article3}}\n\nBonne lecture !',
    usedIn: ['Newsletter segmentée automatique']
  },
  {
    id: 'lead-chaud-notification',
    name: 'Alerte Lead Chaud (Commercial)',
    channel: 'email',
    category: 'vente',
    subject: '🔥 ALERTE: Lead chaud détecté - {{leadName}}',
    preview: 'Un nouveau lead chaud a été détecté !\n\n👤 Contact: {{leadName}}\n🏢 Société: {{companyName}}\n📊 Score: {{score}}/100\n📅 Dernière interaction: {{lastInteraction}}\n\n⚡ Action recommandée: Contact sous 24h\n\nConsulter la fiche: {{leadUrl}}',
    usedIn: ['Tag automatique leads chauds']
  },
  {
    id: 'bienvenue-nouveau-client',
    name: 'Bienvenue Nouveau Client',
    channel: 'email',
    category: 'support',
    subject: 'Bienvenue chez {{companyName}} 🎉',
    preview: 'Bonjour {{firstName}},\n\nBienvenue dans la famille {{companyName}} !\n\nVoici vos premiers pas :\n1. Accédez à votre espace client: {{portalLink}}\n2. Téléchargez nos ressources: {{resourcesLink}}\n3. Contactez votre conseiller dédié: {{salesRep}}\n\nNous sommes ravis de vous accompagner.',
    usedIn: ['Onboarding nouveau client']
  },
  {
    id: 'confirmation-commande',
    name: 'Confirmation de Commande',
    channel: 'email',
    category: 'vente',
    subject: 'Commande n°{{orderNumber}} confirmée ✓',
    preview: 'Bonjour {{firstName}},\n\nVotre commande n°{{orderNumber}} a bien été enregistrée.\n\n📦 Récapitulatif:\n{{orderItems}}\n\n💰 Total: {{orderTotal}}€\n📅 Livraison estimée: {{deliveryDate}}\n\nSuivre ma commande: {{trackingLink}}',
    usedIn: ['Confirmation commandes']
  },

  // Templates SMS
  {
    id: 'rappel-rdv-sms',
    name: 'Rappel RDV J-1',
    channel: 'sms',
    category: 'vente',
    preview: 'Rappel: RDV demain {{date}} à {{time}} avec {{salesRep}}. Lieu: {{location}}. Confirmez en répondant OK ou annulez: {{cancelLink}}',
    usedIn: ['Rappel rendez-vous J-1']
  },
  {
    id: 'code-validation-sms',
    name: 'Code de Validation',
    channel: 'sms',
    category: 'securite',
    preview: 'Votre code de validation {{companyName}}: {{code}}. Valable 10 minutes. Ne partagez ce code avec personne.',
    usedIn: ['Authentification 2FA']
  }
];

export function TemplatesSection() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Section principale fermée par défaut
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  const toggleTemplate = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const handleAskMaxToModify = (template: Template) => {
    // Naviguer vers le chat avec un message pré-rempli
    const channelLabel = template.channel === 'whatsapp' ? 'WhatsApp' : template.channel === 'email' ? 'Email' : 'SMS';
    const prompt = `Peux-tu m'aider à modifier le template "${template.name}" (${channelLabel}) ?`;

    // Stocker le prompt dans sessionStorage pour le récupérer dans ChatPage
    sessionStorage.setItem('pendingPrompt', prompt);

    // Naviguer vers le chat
    navigate('/chat');
  };

  const categoryConfig = {
    vente: { label: 'Vente', color: 'bg-emerald-100 text-emerald-700', icon: '💰' },
    support: { label: 'Support', color: 'bg-sky-100 text-sky-700', icon: '🛟' },
    marketing: { label: 'Marketing', color: 'bg-violet-100 text-violet-700', icon: '📣' },
    facturation: { label: 'Facturation', color: 'bg-amber-100 text-amber-700', icon: '💳' },
    securite: { label: 'Sécurité', color: 'bg-red-100 text-red-700', icon: '🔒' }
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
              {templates.length} template{templates.length > 1 ? 's' : ''} configuré{templates.length > 1 ? 's' : ''} • Cas d'usage multiples
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
              📱 {groupedTemplates.whatsapp.length}
            </span>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))',
                border: '1px solid rgba(0, 145, 255, 0.3)',
                color: '#0091ff'
              }}
            >
              📧 {groupedTemplates.email.length}
            </span>
            {groupedTemplates.sms.length > 0 && (
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#7c3aed'
                }}
              >
                💬 {groupedTemplates.sms.length}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((template) => {
          const config = channelConfig[template.channel];
          const catConfig = categoryConfig[template.category];
          const Icon = config.icon;
          const isExpanded = expandedTemplates.has(template.id);

          return (
            <div
              key={template.id}
              className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl group"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98))',
                border: `1px solid ${config.borderColor.includes('green') ? 'rgba(16, 185, 129, 0.2)' : config.borderColor.includes('blue') ? 'rgba(0, 145, 255, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
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
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
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
                  {template.from && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">De:</span>
                      <span className="font-mono text-gray-900">{template.from}</span>
                    </div>
                  )}
                  {template.subject && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Sujet:</span>
                      <span className="text-gray-900">{template.subject}</span>
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
                        {template.preview}
                      </p>
                    </div>
                  </div>

                  {/* Used in workflows */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">UTILISÉ DANS:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.usedIn.map((workflow, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                        >
                          {workflow}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleAskMaxToModify(template)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>💬</span>
                      <span>Demander à M.A.X. de modifier ce template</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

          {/* Info box */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Comment modifier un template ?</h4>
                <p className="text-sm text-blue-700">
                  Vous ne pouvez pas modifier les templates directement. Pour personnaliser un message, demandez à M.A.X. dans le chat :
                  <span className="italic font-medium"> "MAX, adoucis le message de relance WhatsApp"</span> ou
                  <span className="italic font-medium"> "MAX, rend l'email de newsletter plus professionnel"</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
