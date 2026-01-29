/**
 * WhatsApp Pricing Block
 * Affiche le nouveau modèle de pricing WhatsApp:
 * - Abonnement: 24,90/mois (100 messages inclus)
 * - Recharges: Packs de messages supplémentaires
 */

import { useWhatsappBillingStore, type RechargePack } from '../../stores/useWhatsappBillingStore';

interface WhatsAppPricingBlockProps {
  mode: 'upsell' | 'billing';
  onContactSupport?: () => void;
}

export function WhatsAppPricingBlock({ mode, onContactSupport }: WhatsAppPricingBlockProps) {
  const {
    subscriptionActive,
    subscriptionExpiresAt,
    includedMessages,
    includedRemaining,
    rechargedRemaining,
    totalAvailable,
    isLowBalance,
    expiresSoon,
    packs,
    subscriptionPrice,
    subscriptionIncludedMessages,
    isLoading,
    isRecharging,
    recharge
  } = useWhatsappBillingStore();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Mode Upsell (WhatsApp pas activé)
  if (mode === 'upsell') {
    return (
      <div className="space-y-6">
        {/* Abonnement principal */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-gray-900">Abonnement WhatsApp Pro</h4>
              <p className="text-gray-600">Envoyez des messages WhatsApp depuis MAX CRM</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{subscriptionPrice.toFixed(2).replace('.', ',')}&#8239;&#8364;</div>
              <div className="text-sm text-gray-500">/mois</div>
            </div>
          </div>

          <div className="bg-white/60 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">&#127873;</span>
              <span className="font-semibold text-gray-900">{subscriptionIncludedMessages} messages inclus/mois</span>
            </div>
            <p className="text-sm text-gray-600 ml-9">
              Renouvelés chaque mois avec votre abonnement
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">&#10003;</span>
              <span>Envoi et réception WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">&#10003;</span>
              <span>Historique des conversations</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">&#10003;</span>
              <span>Notifications en temps réel</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">&#10003;</span>
              <span>Support prioritaire</span>
            </div>
          </div>

          <button
            onClick={onContactSupport}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            Activer WhatsApp Pro
          </button>
        </div>

        {/* Packs de recharge */}
        <div className="border border-gray-200 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Packs de recharge <span className="text-sm font-normal text-gray-500">(optionnel)</span>
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Besoin de plus de messages? Achetez des packs de recharge qui s'ajoutent a votre solde.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(packs).map(([packId, pack]) => (
              <div
                key={packId}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
              >
                <div className="text-lg font-bold text-gray-900">{pack.messages} msg</div>
                <div className="text-green-600 font-semibold">{pack.price.toFixed(2).replace('.', ',')}&#8239;&#8364;</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            &#9432; Les recharges n'expirent pas et sont conservees meme si l'abonnement est inactif.
          </p>
        </div>
      </div>
    );
  }

  // Mode Billing (WhatsApp activé - affiche le solde)
  return (
    <div className="space-y-4">
      {/* Alertes */}
      {!subscriptionActive && totalAvailable > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">&#9888;&#65039;</span>
            <div>
              <p className="font-semibold text-amber-900">Abonnement inactif</p>
              <p className="text-sm text-amber-800">
                Votre credit de {totalAvailable} messages est conserve mais l'envoi est bloque.
                <br />
                Renouvelez votre abonnement pour utiliser vos messages.
              </p>
              <button
                onClick={onContactSupport}
                className="mt-2 text-sm text-amber-700 hover:text-amber-900 underline"
              >
                Contacter le support pour renouveler
              </button>
            </div>
          </div>
        </div>
      )}

      {isLowBalance && subscriptionActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">&#128276;</span>
            <div>
              <p className="font-semibold text-amber-900">Solde faible</p>
              <p className="text-sm text-amber-800">
                Il vous reste moins de 20 messages. Pensez a recharger!
              </p>
            </div>
          </div>
        </div>
      )}

      {expiresSoon && subscriptionActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">&#128197;</span>
            <div>
              <p className="font-semibold text-blue-900">Abonnement expire bientot</p>
              <p className="text-sm text-blue-800">
                Votre abonnement expire le {formatDate(subscriptionExpiresAt)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Solde actuel */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Solde WhatsApp</h4>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscriptionActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {subscriptionActive ? '&#10004; Actif' : '&#9724; Inactif'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{totalAvailable}</div>
            <div className="text-sm text-gray-600">Total disponible</div>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <div className="text-xl font-semibold text-gray-800">{includedRemaining}</div>
            <div className="text-sm text-gray-500">Inclus ({includedMessages}/mois)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-800">{rechargedRemaining}</div>
            <div className="text-sm text-gray-500">Recharges</div>
          </div>
        </div>

        {subscriptionExpiresAt && subscriptionActive && (
          <p className="text-sm text-gray-600">
            Prochain renouvellement: {formatDate(subscriptionExpiresAt)}
          </p>
        )}
      </div>

      {/* Packs de recharge */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Recharger mon compte
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(packs).map(([packId, pack]) => (
            <button
              key={packId}
              onClick={() => recharge(packId)}
              disabled={isRecharging || !subscriptionActive}
              className={`border rounded-lg p-4 text-center transition-all ${
                subscriptionActive
                  ? 'border-green-200 hover:border-green-400 hover:bg-green-50 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="text-xl font-bold text-gray-900">{pack.messages} messages</div>
              <div className="text-lg text-green-600 font-semibold">{pack.price.toFixed(2).replace('.', ',')}&#8239;&#8364;</div>
              {subscriptionActive && (
                <div className="mt-2 text-xs text-gray-500">Cliquer pour ajouter</div>
              )}
            </button>
          ))}
        </div>

        {!subscriptionActive && (
          <p className="text-sm text-gray-500 mt-3 text-center">
            Activez votre abonnement pour acheter des recharges
          </p>
        )}

        <p className="text-xs text-gray-500 mt-4">
          &#9432; Apres clic, contactez le support pour finaliser le paiement. Les messages seront credites immediatement apres confirmation.
        </p>
      </div>
    </div>
  );
}
