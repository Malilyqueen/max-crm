/**
 * components/common/SyncTagsButton.tsx
 * Bouton de synchronisation des tags avec UX complète
 * - Affichage de l'état (sync en cours, terminé, erreur)
 * - Gestion automatique des erreurs de session expirée
 * - Ne nécessite pas d'accès F12 ou EspoCRM
 */

import React, { useState } from 'react';
import { RotateCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';

interface SyncTagsButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  onSyncComplete?: (success: boolean) => void;
  className?: string;
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export function SyncTagsButton({ 
  variant = 'secondary', 
  size = 'md',
  onSyncComplete,
  className = '' 
}: SyncTagsButtonProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [syncedCount, setSyncedCount] = useState<number>(0);

  const handleSync = async () => {
    setSyncState('syncing');
    setErrorMessage('');
    
    try {
      const response = await apiClient.post('/crm/cache/sync-tags') as { 
        success: boolean; 
        synced: number; 
        message: string 
      };
      
      if (response.success) {
        setSyncedCount(response.synced);
        setSyncState('success');
        onSyncComplete?.(true);
        
        // Reset automatique après 3 secondes
        setTimeout(() => {
          setSyncState('idle');
        }, 3000);
      } else {
        throw new Error('Échec de la synchronisation');
      }
      
    } catch (error: any) {
      console.error('[SyncTags] Erreur:', error);
      
      // Gestion automatique des erreurs de session
      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorMessage('Session expirée - Reconnectez-vous');
      } else {
        setErrorMessage(
          error.response?.data?.error || 
          error.message || 
          'Erreur de synchronisation'
        );
      }
      
      setSyncState('error');
      onSyncComplete?.(false);
      
      // Reset automatique après 5 secondes
      setTimeout(() => {
        setSyncState('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  const getButtonContent = () => {
    switch (syncState) {
      case 'syncing':
        return (
          <>
            <RotateCw className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />
            Synchronisation...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
            {syncedCount > 0 ? `${syncedCount} tags synchronisés` : 'Synchronisé'}
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
            {size === 'sm' ? 'Erreur' : 'Erreur de sync'}
          </>
        );
      default:
        return (
          <>
            <RotateCw className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
            {size === 'sm' ? 'Sync tags' : 'Synchroniser les tags'}
          </>
        );
    }
  };

  const getButtonClasses = () => {
    const baseClasses = `
      inline-flex items-center gap-2 font-medium transition-all duration-200 rounded-lg
      disabled:cursor-not-allowed
      ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'}
      ${className}
    `;

    switch (syncState) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-700 border border-green-300`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-700 border border-red-300`;
      default:
        return variant === 'primary'
          ? `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 shadow-sm`
          : `${baseClasses} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={syncState === 'syncing'}
        className={getButtonClasses()}
        title={
          syncState === 'idle' 
            ? "Synchronise les tags depuis EspoCRM vers MAX" 
            : syncState === 'error' && errorMessage
            ? errorMessage
            : undefined
        }
      >
        {getButtonContent()}
      </button>
      
      {/* Message d'erreur affiché sous le bouton */}
      {syncState === 'error' && errorMessage && size !== 'sm' && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-lg z-10">
          {errorMessage}
        </div>
      )}
    </div>
  );
}