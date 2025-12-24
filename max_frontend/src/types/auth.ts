/**
 * types/auth.ts
 * Types TypeScript pour l'authentification MVP1
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenantId?: string; // Prévu pour Phase 2 (fixe à 'macrea' en MVP1)
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}
