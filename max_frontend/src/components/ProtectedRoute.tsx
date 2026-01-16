/**
 * components/ProtectedRoute.tsx
 * HOC pour protéger les routes nécessitant authentification
 */

import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LoadingSpinner } from './common/LoadingSpinner';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  // Vérifier l'auth SEULEMENT au mount initial (pas à chaque navigation)
  useEffect(() => {
    // Ne checker que si pas déjà authentifié
    if (!isAuthenticated) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vide = seulement au mount

  // Loading state SEULEMENT si on n'est pas encore authentifié
  // Si déjà authentifié, on laisse naviguer même pendant le refresh du token
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Vérification de l'authentification..." />
      </div>
    );
  }

  // Si pas authentifié ET pas en train de charger, rediriger vers login
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // Si authentifié (ou en cours de vérification mais déjà auth), render les routes enfants
  return <Outlet />;
};

export default ProtectedRoute;
