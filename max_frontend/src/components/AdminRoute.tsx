/**
 * components/AdminRoute.tsx
 * HOC pour proteger les routes admin-only
 *
 * REGLE SECURITE V1:
 * - Seuls les utilisateurs avec role 'admin' peuvent acceder
 * - Les 'owner' (proprietaire tenant) et 'user' sont rediriges
 * - Doit etre utilise APRES ProtectedRoute (authentification)
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();

  // Si pas authentifie, laisser ProtectedRoute gerer
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Verifier le role admin
  if (user.role !== 'admin') {
    console.warn(`[ADMIN] Acces refuse pour ${user.email} (role: ${user.role})`);
    // Rediriger vers dashboard au lieu de 403
    return <Navigate to="/dashboard" replace />;
  }

  // Admin OK - render children ou Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
