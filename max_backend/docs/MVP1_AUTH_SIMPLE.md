# 🔐 Auth MVP1 - Implémentation Simple (Sans Multi-tenant Complet)

## 🎯 Objectif

Authentification **simple et fonctionnelle** pour le MVP1, sans implémenter toute la complexité multi-tenant.

**Principe** :
- ✅ Login avec email/password
- ✅ Token JWT stocké dans localStorage
- ✅ `tenantId` fixe à `'defaultTenant'` ou `'macrea'`
- ✅ Pas de gestion avancée des tenants (Phase 2)

---

## 🔧 Backend Auth MVP1

### **1. Fichier `routes/auth.js`** (à créer)

```javascript
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = express.Router();

// Hardcoded users pour MVP1 (à remplacer par DB en Phase 2)
const USERS = [
  {
    id: 'user_001',
    email: 'admin@macrea.fr',
    password: '$2b$10$...' // bcrypt hash de 'password123'
    name: 'Admin MaCréa',
    role: 'admin',
    tenantId: 'macrea' // Fixe en MVP1
  },
  {
    id: 'user_002',
    email: 'user@macrea.fr',
    password: '$2b$10$...',
    name: 'User MaCréa',
    role: 'user',
    tenantId: 'macrea'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valable 7 jours

/**
 * POST /api/auth/login
 * Login simple avec email/password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Chercher user
    const user = USERS.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId // Fixe à 'macrea' en MVP1
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retourner token + user (sans password)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });

  } catch (error) {
    console.error('[AUTH] Erreur login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/auth/me
 * Récupère user depuis token
 */
router.get('/me', authMiddleware, (req, res) => {
  // req.user est défini par authMiddleware
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Logout (côté client, supprime juste le token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

export default router;
```

### **2. Middleware `authMiddleware.js`** (à créer)

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware d'authentification
 * Vérifie le token JWT et ajoute req.user
 */
export function authMiddleware(req, res, next) {
  try {
    // Récupérer token depuis header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ajouter user à la request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId || 'macrea' // Fallback
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
}

/**
 * Middleware optionnel (n'échoue pas si pas de token)
 */
export function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId || 'macrea'
      };
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
```

### **3. Intégration dans `server.js`**

```javascript
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// Routes publiques (pas d'auth)
app.use('/api/auth', authRoutes);

// Routes protégées (auth requise)
app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/automation', authMiddleware, automationRoutes);
app.use('/api/reporting', authMiddleware, reportingRoutes);
app.use('/api/credits', authMiddleware, creditsRoutes);
```

### **4. Générer hash password (script utilitaire)**

```javascript
// scripts/hash-password.js
import bcrypt from 'bcrypt';

const password = process.argv[2] || 'password123';
const hash = await bcrypt.hash(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nAjouter ce hash dans routes/auth.js');
```

**Usage**:
```bash
node scripts/hash-password.js mySecretPassword
```

---

## 🎨 Frontend Auth MVP1

### **1. Store Auth `stores/useAuthStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });

          if (response.success) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            throw new Error(response.error || 'Login failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || 'Login failed');
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        // Optionnel: appeler /api/auth/logout côté serveur
        api.post('/auth/logout').catch(() => {});
      },

      checkAuth: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          set({
            user: response.user,
            isAuthenticated: true
          });
        } catch (error) {
          // Token invalide, logout
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);
```

### **2. API Client avec Token `api/client.ts`**

```typescript
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3005/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur request: ajouter token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur response: gérer 401 (token expiré)
apiClient.interceptors.response.use(
  (response) => response.data, // Retourner directement data
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide, logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: (url: string) => apiClient.get(url),
  post: (url: string, data?: any) => apiClient.post(url, data),
  put: (url: string, data?: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url)
};
```

### **3. LoginPage `pages/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/'); // Redirect vers dashboard
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">M.A.X.</h2>
          <p className="mt-2 text-center text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500">
          MVP1 - Compte par défaut: admin@macrea.fr / password123
        </div>
      </div>
    </div>
  );
}
```

### **4. ProtectedRoute `components/ProtectedRoute.tsx`**

```tsx
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LoadingSpinner } from './common/LoadingSpinner';

export function ProtectedRoute() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

### **5. Router avec Auth `App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './pages/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { CRMPage } from './pages/CRMPage';
import { AutomationPage } from './pages/AutomationPage';
import { ReportingPage } from './pages/ReportingPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ✅ Checklist Auth MVP1

### **Backend**
- [ ] Créer `routes/auth.js` avec POST /login, GET /me
- [ ] Créer `middleware/authMiddleware.js`
- [ ] Générer hash password avec bcrypt
- [ ] Ajouter users hardcodés (admin@macrea.fr + user@macrea.fr)
- [ ] Installer dépendances: `npm install jsonwebtoken bcrypt`
- [ ] Ajouter `JWT_SECRET` dans `.env`
- [ ] Protéger routes existantes avec `authMiddleware`
- [ ] Tester login avec Postman/curl

### **Frontend**
- [ ] Créer `stores/useAuthStore.ts` avec Zustand persist
- [ ] Créer `pages/LoginPage.tsx`
- [ ] Créer `components/ProtectedRoute.tsx`
- [ ] Modifier `api/client.ts` (intercepteurs token + 401)
- [ ] Modifier `App.tsx` (routes publiques + protégées)
- [ ] Tester login/logout
- [ ] Vérifier redirect 401 → /login

---

## 🟣 Ce qui sera ajouté en Phase 2

1. **Table `users` en DB** (remplacer users hardcodés)
2. **Refresh token** (renouveler token expiré)
3. **Password reset** (email + lien réinitialisation)
4. **Multi-tenant complet** (associer users à tenants)
5. **Roles avancés** (permissions granulaires)
6. **2FA** (authentification à deux facteurs)

---

**Auth MVP1: Simple, sécurisé, fonctionnel. Prêt en 0.5 jour backend + intégration front Jour 1.** 🔐
