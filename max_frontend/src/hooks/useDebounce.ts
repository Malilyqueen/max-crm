/**
 * useDebounce Hook
 * Empêche les doubles clics et exécutions multiples
 */

import { useRef, useCallback } from 'react';

export const useDebounce = <T extends (...args: any[]) => Promise<void>>(
  callback: T,
  delay: number = 300
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  return useCallback(
    ((...args: Parameters<T>) => {
      // Si une action est déjà en cours, ignorer
      if (isRunningRef.current) {
        console.log('[Debounce] Action en cours, clic ignoré');
        return Promise.resolve();
      }

      // Annuler le timeout précédent
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Nouveau timeout
      return new Promise<void>((resolve) => {
        timeoutRef.current = setTimeout(async () => {
          isRunningRef.current = true;

          try {
            await callback(...args);
            resolve();
          } catch (error) {
            console.error('[Debounce] Erreur:', error);
            resolve();
          } finally {
            isRunningRef.current = false;
          }
        }, delay);
      });
    }) as T,
    [callback, delay]
  );
};
