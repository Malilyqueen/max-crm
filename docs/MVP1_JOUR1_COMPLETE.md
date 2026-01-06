# MVP1 - Jour 1 : Base + Navigation + Auth - ✅ TERMINÉ

## 📅 Date de complétion : 5 décembre 2025

---

## 🎯 Objectifs Jour 1

✅ **Backend Auth**
- Middleware JWT avec vérification
- Routes `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Hachage bcrypt des mots de passe
- 2 utilisateurs hardcodés (admin + user)
- Gestion erreurs 401 appropriée

✅ **Frontend Auth**
- Types TypeScript pour User, AuthResponse, AuthState
- API client Axios avec intercepteurs (token injection + 401 handling)
- Store Zustand avec persist (localStorage)
- Composants réutilisables (Button, Input, LoadingSpinner)
- LoginPage complète avec validation
- ProtectedRoute pour routes privées
- AppShellSimple avec navigation basique
- Routing complet avec React Router

✅ **Build & Tests**
- Build production sans erreurs TypeScript
- Tests backend complets via curl
- Documentation de test créée

---

## 📁 Fichiers Créés

### Backend (max_backend/)

1. **middleware/authMiddleware.js**
   - Vérifie JWT dans header `Authorization: Bearer [token]`
   - Extrait user (id, email, role, tenantId) depuis token
   - Retourne 401 si token manquant/invalide/expiré

2. **routes/auth.js**
   - `POST /api/auth/login` - Login avec bcrypt comparison
   - `GET /api/auth/me` - Vérifie token et retourne user
   - `POST /api/auth/logout` - Logout (placeholder)
   - 2 users hardcodés:
     - admin@macrea.fr / admin123 (role: admin)
     - user@macrea.fr / user123 (role: user)

3. **server.js** (modifié)
   - Import et mount du router auth
   - Route publique `/api/auth` (pas d'authMiddleware)

4. **.env** (modifié)
   - `JWT_SECRET=macrea-mvp1-jwt-secret-CHANGE_IN_PRODUCTION_2025`
   - Token expiry: 7 jours

### Frontend (max_frontend/src/)

5. **types/auth.ts**
   ```typescript
   export interface User {
     id: string;
     email: string;
     name: string;
     role: 'admin' | 'user';
     tenantId?: string; // Pour Phase 2
   }

   export interface AuthResponse {
     success: boolean;
     token: string;
     user: User;
   }

   export interface AuthState {
     user: User | null;
     token: string | null;
     isAuthenticated: boolean;
     isLoading: boolean;
     error: string | null;
     login: (email: string, password: string) => Promise<void>;
     logout: () => void;
     checkAuth: () => Promise<void>;
     clearError: () => void;
   }
   ```

6. **api/client.ts**
   - Axios instance avec `baseURL: http://localhost:3005/api`
   - Request interceptor: injecte `Authorization: Bearer [token]` automatiquement
   - Response interceptor: détecte 401 → logout + redirect `/login`
   - Timeout: 30s

7. **stores/useAuthStore.ts**
   - Zustand store avec persist middleware
   - Persiste `user`, `token`, `isAuthenticated` dans localStorage
   - Key: `auth-storage`
   - Méthodes:
     - `login(email, password)` - POST /auth/login
     - `logout()` - Clear state + POST /auth/logout
     - `checkAuth()` - GET /auth/me (vérifie token au mount)
     - `clearError()` - Reset error state

8. **components/common/Button.tsx**
   - Variants: primary, secondary, danger, ghost
   - Sizes: sm, md, lg
   - Props: `isLoading`, `disabled`, `className`
   - Affiche spinner pendant `isLoading`

9. **components/common/Input.tsx**
   - Props: `label`, `error`, `helperText`, `required`
   - Affiche astérisque rouge si `required`
   - Border rouge si `error`
   - Accessibility: `aria-invalid`, unique `id`

10. **components/common/LoadingSpinner.tsx**
    - SVG spinner animé (rotate)
    - Sizes: sm, md, lg
    - Optional `text` prop

11. **pages/LoginPage.tsx**
    - Formulaire email + password
    - Validation: champs requis
    - Error display (border rouge + message)
    - Loading state sur bouton
    - Redirect automatique si déjà authentifié
    - Affiche comptes de test MVP1

12. **components/ProtectedRoute.tsx**
    - Wrapper pour routes privées
    - Appelle `checkAuth()` au mount
    - Affiche LoadingSpinner pendant vérification
    - Redirect `/login` si non authentifié
    - Render `<Outlet />` si authentifié

13. **pages/AppShellSimple.tsx**
    - Header avec:
      - Logo "M.A.X."
      - Nav: Dashboard, Chat, CRM, Automatisations, Rapports
      - User info (nom + email)
      - Bouton Déconnexion
    - Main content: `<Outlet />`

14. **App.jsx** (remplacé)
    - BrowserRouter setup
    - Route publique: `/login` → LoginPage
    - Routes protégées (wrapped in ProtectedRoute):
      - `/` → redirect `/dashboard`
      - `/dashboard` → PlaceholderPage
      - `/chat` → PlaceholderPage
      - `/crm` → PlaceholderPage
      - `/automation` → PlaceholderPage
      - `/reporting` → PlaceholderPage
    - `*` → redirect `/`

15. **PlaceholderPage** (inline dans App.jsx)
    - Composant temporaire pour pages non implémentées
    - Affiche titre + message "sera implémenté dans les prochaines étapes"

### Documentation

16. **TEST_AUTH_FLOW.md**
    - Guide complet de test backend (curl)
    - Guide complet de test frontend (navigateur)
    - Scénarios: login, navigation, persistence, logout, erreurs
    - Checklist de vérification localStorage + Network DevTools

17. **MVP1_JOUR1_COMPLETE.md** (ce fichier)
    - Récapitulatif complet Jour 1
    - Liste des fichiers créés
    - Tests effectués
    - Prochaines étapes

---

## ✅ Tests Backend Effectués

Tous les tests réussis via `curl` :

| Test | Commande | Résultat Attendu | Status |
|------|----------|------------------|--------|
| Login admin | `POST /api/auth/login` (admin@macrea.fr) | 200 + token + user | ✅ |
| Login user | `POST /api/auth/login` (user@macrea.fr) | 200 + token + user | ✅ |
| Token valide | `GET /api/auth/me` (avec Bearer token) | 200 + user | ✅ |
| Sans token | `GET /api/auth/me` (sans header) | 401 "Token manquant" | ✅ |
| Token invalide | `GET /api/auth/me` (token corrompu) | 401 "Token invalide" | ✅ |
| Credentials faux | `POST /api/auth/login` (wrong email/pass) | 400 "Email ou mot de passe incorrect" | ✅ |

**Exemples de tokens générés :**
```
admin: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX2FkbWluXzAwMSIsImVtYWlsIjoiYWRtaW5AbWFjcmVhLmZyIiwicm9sZSI6ImFkbWluIiwidGVuYW50SWQiOiJtYWNyZWEiLCJpYXQiOjE3NjQ5MjU5MjcsImV4cCI6MTc2NTUzMDcyN30...

user: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX3N0YW5kYXJkXzAwMiIsImVtYWlsIjoidXNlckBtYWNyZWEuZnIiLCJyb2xlIjoidXNlciIsInRlbmFudElkIjoibWFjcmVhIiwiaWF0IjoxNzY0OTI2MTAwLCJleHAiOjE3NjU1MzA5MDB9...
```

**Payload décodé (admin) :**
```json
{
  "userId": "user_admin_001",
  "email": "admin@macrea.fr",
  "role": "admin",
  "tenantId": "macrea",
  "iat": 1764925927,
  "exp": 1765530727
}
```

---

## ✅ Build Production

```bash
cd max_frontend
npm run build
```

**Résultat :**
```
✓ 104 modules transformed
✓ built in 2.41s

dist/index.html                  0.37 kB │ gzip:  0.26 kB
dist/assets/index-DDhI_fIx.css  55.52 kB │ gzip:  9.57 kB
dist/assets/index-VDNVv7gU.js  271.19 kB │ gzip: 89.96 kB
```

**Aucune erreur TypeScript** ✅

---

## 🔍 Tests Frontend à Effectuer (Manuel)

⚠️ **Les tests frontend nécessitent une vérification manuelle dans le navigateur** à l'URL **http://localhost:5173**

Voir le fichier [TEST_AUTH_FLOW.md](../max_frontend/TEST_AUTH_FLOW.md) pour la liste complète des scénarios :

1. ⏳ **Redirection automatique** `/` → `/login` si non auth
2. ⏳ **Login avec admin@macrea.fr** → redirect `/dashboard`
3. ⏳ **Navigation entre pages** (chat, crm, automation, reporting)
4. ⏳ **Persistence après F5** (token dans localStorage)
5. ⏳ **Logout** → redirect `/login` + clear token
6. ⏳ **Login avec user@macrea.fr** → affiche "User MaCréa"
7. ⏳ **Credentials incorrects** → message d'erreur
8. ⏳ **Accès direct page protégée** sans auth → redirect `/login`

---

## 🏗️ Architecture Technique

### Flow d'Authentification

```
┌─────────────┐
│ LoginPage   │
│ (public)    │
└──────┬──────┘
       │ 1. submit email/password
       ▼
┌─────────────────┐
│ useAuthStore    │
│ login()         │
└──────┬──────────┘
       │ 2. POST /api/auth/login
       ▼
┌──────────────────┐
│ Backend          │
│ routes/auth.js   │
└──────┬───────────┘
       │ 3. bcrypt.compare(password, hash)
       ├─ 4a. Si invalid → 400 error
       └─ 4b. Si valid → jwt.sign() → return token
              │
              ▼
       ┌─────────────────┐
       │ useAuthStore    │
       │ set token+user  │
       │ persist to LS   │
       └──────┬──────────┘
              │ 5. navigate('/dashboard')
              ▼
       ┌─────────────────┐
       │ ProtectedRoute  │
       │ checkAuth()     │
       └──────┬──────────┘
              │ 6. GET /api/auth/me (avec Bearer token)
              ▼
       ┌──────────────────┐
       │ authMiddleware   │
       │ jwt.verify()     │
       └──────┬───────────┘
              ├─ 7a. Si invalid → 401
              │         ↓
              │    axios interceptor → logout + redirect /login
              │
              └─ 7b. Si valid → return user
                     ↓
              ┌─────────────────┐
              │ AppShellSimple  │
              │ render content  │
              └─────────────────┘
```

### Persistence Token

```
localStorage['auth-storage'] = {
  state: {
    user: { id, email, name, role, tenantId },
    token: "eyJhbG...",
    isAuthenticated: true
  },
  version: 0
}
```

### Request Interceptor (api/client.ts)

Toutes les requêtes axios vers `/api/*` :
```javascript
config.headers.Authorization = `Bearer ${token_from_localStorage}`
```

### Response Interceptor (api/client.ts)

Si `response.status === 401` :
```javascript
localStorage.removeItem('auth-storage')
window.location.href = '/login'
```

---

## 📊 Statistiques

- **Fichiers créés :** 17
- **Lignes de code backend :** ~150
- **Lignes de code frontend :** ~800
- **Composants React :** 6 (Button, Input, Spinner, LoginPage, ProtectedRoute, AppShellSimple)
- **Types TypeScript :** 3 (User, AuthResponse, AuthState)
- **Routes API :** 3 (POST /login, GET /me, POST /logout)
- **Routes Frontend :** 7 (/, /login, /dashboard, /chat, /crm, /automation, /reporting)
- **Tests backend :** 6/6 ✅
- **Build time :** 2.41s
- **Bundle size :** 271 KB (gzip: 90 KB)

---

## 🎯 Décisions Techniques Importantes

### 1. Single Tenant MVP1
- `tenantId` fixé à `'macrea'`
- Types préparés avec `tenantId?: string` pour Phase 2
- Multi-tenant (7 jours) vient APRÈS MVP1 frontend

### 2. Auth Simple
- Users hardcodés en mémoire (pas de DB)
- Bcrypt pour hashing passwords
- JWT avec expiry 7 jours
- localStorage pour persistence

### 3. Architecture Frontend
- Zustand (léger) au lieu de Redux
- Persist middleware pour auto-save localStorage
- Composants réutilisables avec variants
- TypeScript pour type safety
- Tailwind CSS pour styling rapide

### 4. Separation JSX/TSX
- `App.jsx` existant → remplacé par nouveau code MVP1
- Tous les nouveaux composants en `.tsx`
- JSX peut importer TSX (Vite résout automatiquement)

### 5. Routing Strategy
- React Router v7 (dernière version)
- `<ProtectedRoute>` wrapper avec `<Outlet />`
- Redirect automatique si non auth
- PlaceholderPage pour pages futures

---

## ⚠️ Limitations Actuelles (MVP1)

- ❌ Pas de "Remember me"
- ❌ Pas de "Forgot password"
- ❌ Pas de refresh token (juste access token 7j)
- ❌ Pas de rate limiting sur login
- ❌ Pas de CAPTCHA
- ❌ JWT_SECRET hardcodé (à changer en prod)
- ❌ Users hardcodés (pas de DB)
- ❌ Pas de gestion de sessions multiples
- ❌ Pas de logs d'audit

**Note :** Ces limitations sont acceptables pour MVP1. Phase 2 améliorera la sécurité.

---

## 🚀 Prochaines Étapes : Jour 2-3

### **Chat M.A.X. Global** (page `/chat`)

#### Backend à créer :
- [ ] `POST /api/chat/send` - Envoyer message à M.A.X.
- [ ] `GET /api/chat/history` - Récupérer historique conversation
- [ ] SSE endpoint `/api/chat/stream` - Stream réponses M.A.X.
- [ ] `POST /api/chat/upload-csv` - Upload fichier leads CSV
- [ ] `POST /api/chat/confirm-action` - Confirmer action suggérée

#### Frontend à créer :
- [ ] `pages/ChatPage.tsx` - Page principale Chat
- [ ] `components/chat/MessageList.tsx` - Liste messages scrollable
- [ ] `components/chat/Message.tsx` - Bubble message (user vs M.A.X.)
- [ ] `components/chat/ChatInput.tsx` - Input + upload CSV + envoyer
- [ ] `components/chat/ConfirmModal.tsx` - Modal confirmation actions
- [ ] `components/chat/ModeSelector.tsx` - Sélecteur mode (Assisté/Auto/Conseil)
- [ ] `components/chat/TokenDisplay.tsx` - Affichage quotas tokens
- [ ] `stores/useChatStore.ts` - Store messages + mode + SSE
- [ ] `hooks/useSSE.ts` - Hook custom pour SSE streaming
- [ ] `types/chat.ts` - Types Message, ChatMode, etc.

#### Fonctionnalités :
- ✅ Conversation fluide avec M.A.X.
- ✅ Upload CSV leads (→ table temp EspoCRM)
- ✅ Streaming réponses (SSE) avec typing indicator
- ✅ Mode Auto/Assisté/Conseil avec sécurité
- ✅ Confirmation modale pour actions critiques
- ✅ Affichage quotas tokens restants

---

## 📝 Notes de Session

### Erreurs Rencontrées et Résolues :

1. **Port 3005 already in use**
   - Résolu : Process déjà running (OK pour dev)

2. **Edit .env sans Read préalable**
   - Résolu : Read avant Edit (requirement du tool)

3. **App.tsx import AppShell non existant**
   - Résolu : Créé AppShellSimple et importé as AppShell

4. **App.jsx vs App.tsx**
   - Résolu : Remplacé contenu App.jsx par version MVP1

### Décisions Validées par User :

✅ Timeline 9-10 jours (pas 4 semaines)
✅ 2 stores au lieu de 5
✅ 1 graphique au lieu de 3
✅ Pas de CRUD templates WhatsApp (juste display + toggle)
✅ Multi-tenant APRÈS MVP1 frontend complet
✅ Auth simple avec users hardcodés
✅ tenantId préparé dans types pour Phase 2

---

## ✅ Jour 1 : TERMINÉ

**Statut final :** Backend 100% ✅ | Frontend 100% ✅ | Tests Backend 100% ✅

**Ready for :** Tests manuels frontend dans le navigateur (voir TEST_AUTH_FLOW.md)

**Next :** Jour 2-3 - Chat M.A.X. Global

---

**Date de complétion :** 5 décembre 2025
**Durée effective :** ~1 journée de développement
**Fichiers créés :** 17
**Tests réussis :** 6/6 backend, à compléter frontend manuellement
