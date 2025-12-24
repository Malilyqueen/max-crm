import { useState } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface Suggestion {
  id: string;
  type: 'email' | 'sms';
  subject?: string;
  body?: string;
  cta?: string;
  message?: string;
}

interface GenerationResult {
  ok: boolean;
  suggestions?: Suggestion[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

export function CreaPage() {
  const { apiBase } = useAppCtx();

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState('');
  const [target, setTarget] = useState('');
  const [tone, setTone] = useState('professionnel');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');

  // Generation state
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [espoCampaignUrl, setEspoCampaignUrl] = useState<string | null>(null);

  async function handleGenerate() {
    if (!campaignName || !objective || !target) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuggestions([]);
      setSelectedVariant(null);

      const res = await fetch(`${apiBase}/api/max/crea/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignName,
          objective,
          target,
          tone,
          channel
        })
      });

      const data: GenerationResult = await res.json();

      if (data.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setError(data.error || 'Erreur de génération');
      }
    } catch (e) {
      console.error('[CreaPage] Erreur:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCampaign() {
    if (!selectedVariant) {
      setError('Veuillez sélectionner une variante');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiBase}/api/max/crea/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: campaignName,
          objective,
          target,
          channel,
          selectedVariant,
          metadata: { tone }
        })
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess(`Campagne "${campaignName}" créée avec succès dans EspoCRM!`);
        setEspoCampaignUrl(data.editUrl);
        // Reset form
        setCampaignName('');
        setObjective('');
        setTarget('');
        setSuggestions([]);
        setSelectedVariant(null);
      } else {
        setError(data.error || 'Erreur de sauvegarde');
      }
    } catch (e) {
      console.error('[CreaPage] Erreur:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-4xl">✨</span>
          Espace Créa M.A.X.
        </h1>
        <p className="text-gray-400">
          Créez des campagnes marketing percutantes avec l'aide de l'intelligence artificielle
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400 mb-3">{success}</p>
          <div className="flex gap-3">
            {espoCampaignUrl && (
              <a
                href={espoCampaignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span>🎨</span>
                Ouvrir dans EspoCRM
              </a>
            )}
            <button
              onClick={() => {
                setSuccess(null);
                setEspoCampaignUrl(null);
              }}
              className="text-xs text-green-300 hover:text-green-200"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-300 hover:text-red-200 mt-2"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="bg-[#1A1F2E] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📝</span>
            Paramètres de la campagne
          </h2>

          <div className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de la campagne *
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Relance clients Q4"
                className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Objectif de la campagne *
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex: Réactiver les clients inactifs et leur proposer une offre spéciale"
                rows={3}
                className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cible *
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Ex: Clients inactifs depuis 3 mois"
                className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Canal de diffusion *
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setChannel('email')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                    channel === 'email'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-[#0F1419] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  📧 Email
                </button>
                <button
                  onClick={() => setChannel('sms')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                    channel === 'sms'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-[#0F1419] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  💬 SMS
                </button>
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ton du message
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="professionnel">Professionnel</option>
                <option value="amical">Amical</option>
                <option value="urgent">Urgent</option>
                <option value="enthousiaste">Enthousiaste</option>
                <option value="formel">Formel</option>
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !campaignName || !objective || !target}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Génération en cours...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Générer avec M.A.X.
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Suggestions */}
        <div className="bg-[#1A1F2E] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>💡</span>
            Suggestions générées
          </h2>

          {suggestions.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">🎨</p>
              <p>Remplissez le formulaire et cliquez sur "Générer avec M.A.X."</p>
              <p className="text-sm mt-2">M.A.X. créera 3 variantes pour votre campagne</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">M.A.X. travaille sur vos messages...</p>
            </div>
          )}

          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVariant?.id === suggestion.id
                    ? 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-[#0F1419] border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedVariant(suggestion)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">Variante {index + 1}</h3>
                  {selectedVariant?.id === suggestion.id && (
                    <span className="text-cyan-400 text-sm">✓ Sélectionnée</span>
                  )}
                </div>

                {suggestion.type === 'email' && (
                  <>
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Objet:</p>
                      <p className="text-sm text-gray-300 font-medium">{suggestion.subject}</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Corps:</p>
                      <p className="text-sm text-gray-400 whitespace-pre-wrap line-clamp-4">{suggestion.body}</p>
                    </div>
                    {suggestion.cta && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Call-to-Action:</p>
                        <p className="text-sm text-cyan-400">{suggestion.cta}</p>
                      </div>
                    )}
                  </>
                )}

                {suggestion.type === 'sms' && (
                  <div>
                    <p className="text-sm text-gray-300">{suggestion.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{suggestion.message?.length}/160 caractères</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          {suggestions.length > 0 && (
            <button
              onClick={handleSaveCampaign}
              disabled={loading || !selectedVariant}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>💾</span>
              Sauvegarder la campagne
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
