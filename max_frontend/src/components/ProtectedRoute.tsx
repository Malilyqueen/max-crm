/**
 * components/ProtectedRoute.tsx
 * HOC pour proteger les routes necessitant authentification
 *
 * REGLE PRODUIT V1:
 * - Dashboard MAX : accessible a tous les tenants (Campagnes, Activite, KPIs, Settings)
 * - Tour de controle (CRM) : gate si crm non provisionne (gere dans CrmPage)
 *
 * Ce composant ne gere QUE l'authentification, pas le gate CRM
 */

import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LoadingSpinner } from './common/LoadingSpinner';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  // Verifier l'auth SEULEMENT au mount initial (pas a chaque navigation)
  useEffect(() => {
    // Ne checker que si pas deja authentifie
    if (!isAuthenticated) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vide = seulement au mount

  // Loading state SEULEMENT si on n'est pas encore authentifie
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Verification de l'authentification..." />
      </div>
    );
  }

  // Si pas authentifie ET pas en train de charger, rediriger vers login
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // Authentifie -> render les routes enfants
  // Le gate CRM est gere dans CrmPage uniquement
  return <Outlet />;
};

export default ProtectedRoute;
