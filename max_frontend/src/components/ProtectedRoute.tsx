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

  // Vérifier l'auth au mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Loading state pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Vérification de l'authentification..." />
      </div>
    );
  }

  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si authentifié, render les routes enfants
  return <Outlet />;
};

export default ProtectedRoute;
