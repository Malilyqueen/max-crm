import { useState, useEffect } from 'react';

export function useFallbackBanner() {
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');

  useEffect(() => {
    const handleFallback = (event: CustomEvent) => {
      setFallbackMessage(`Live API indisponible: ${event.detail?.error || 'Erreur inconnue'}`);
      setShowFallback(true);

      // Auto-hide after 5 seconds
      setTimeout(() => setShowFallback(false), 5000);
    };

    window.addEventListener('live:fallback', handleFallback as EventListener);

    return () => {
      window.removeEventListener('live:fallback', handleFallback as EventListener);
    };
  }, []);

  return { showFallback, fallbackMessage, hideFallback: () => setShowFallback(false) };
}