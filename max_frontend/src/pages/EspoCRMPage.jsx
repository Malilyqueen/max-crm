import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, RefreshCw, Maximize2 } from 'lucide-react';

export function EspoCRMPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showMaxSuggestion, setShowMaxSuggestion] = useState(false);

  const ESPOCRM_URL = 'http://localhost:8081/espocrm';

  useEffect(() => {
    // Simuler chargement iframe
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Afficher suggestion M.A.X. après 2s
      setTimeout(() => setShowMaxSuggestion(true), 2000);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    // Recharger iframe
    const iframe = document.getElementById('espocrm-iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleOpenExternal = () => {
    window.open(ESPOCRM_URL, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">MaCréa CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Votre CRM EspoCRM intégré directement dans M.A.X.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>

          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            title="Ouvrir dans nouvel onglet"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir
          </button>
        </div>
      </motion.div>

      {/* CRM Iframe Container */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-white z-10"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Chargement de votre CRM...</p>
            </div>
          </motion.div>
        )}

        <motion.iframe
          id="espocrm-iframe"
          src={ESPOCRM_URL}
          className="w-full h-full border-0"
          title="EspoCRM"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />

        {/* M.A.X. Floating Suggestion (optionnel) */}
        {showMaxSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-6 right-6 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-2xl shadow-2xl p-6 max-w-sm"
          >
            <button
              onClick={() => setShowMaxSuggestion(false)}
              className="absolute top-2 right-2 text-white/80 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <p className="font-bold text-lg">M.A.X. peut vous aider</p>
                <p className="text-sm text-white/90 mt-1">
                  J'ai détecté 5 leads sans enrichissement
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                📊 Enrichir ces 5 leads
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                💬 Parler à M.A.X.
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>💡 Astuce : Utilisez M.A.X. pour enrichir vos leads automatiquement</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Connecté à EspoCRM
          </span>
        </div>
      </div>
    </div>
  );
}
