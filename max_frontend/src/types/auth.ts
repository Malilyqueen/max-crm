/**
 * types/auth.ts
 * Types TypeScript pour l'authentification
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user';
  tenantId: string;
  tenantName?: string;
  plan?: 'starter' | 'starter_whatsapp';
  isProvisioned?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  plan?: 'starter' | 'starter_whatsapp';
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: {
    whatsapp: boolean;
    whatsappMessages: number;
    sms: boolean;
    email: boolean;
    campaigns: boolean;
  };
  description: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}
