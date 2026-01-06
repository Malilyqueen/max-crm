# Test du Flux d'Authentification MVP1 - Jour 1

## ✅ Tests Backend (via curl)

### 1. Login avec credentials valides (admin)
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@macrea.fr\",\"password\":\"admin123\"}"
```
**Résultat attendu:** `{"success":true,"token":"...","user":{...}}`
**Status:** ✅ TESTÉ ET VALIDÉ

### 2. Login avec credentials valides (user)
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@macrea.fr\",\"password\":\"user123\"}"
```
**Résultat attendu:** `{"success":true,"token":"...","user":{...}}`
**Status:** ⏳ À TESTER

### 3. Vérification du token avec /me
```bash
curl http://localhost:3005/api/auth/me \
  -H "Authorization: Bearer [TOKEN_FROM_LOGIN]"
```
**Résultat attendu:** `{"success":true,"user":{...}}`
**Status:** ✅ TESTÉ ET VALIDÉ

### 4. Requête sans token (401)
```bash
curl http://localhost:3005/api/auth/me
```
**Résultat attendu:** `{"success":false,"error":"Token manquant"}`
**Status:** ⏳ À TESTER

### 5. Requête avec token invalide (401)
```bash
curl http://localhost:3005/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```
**Résultat attendu:** `{"success":false,"error":"Token invalide"}`
**Status:** ⏳ À TESTER

---

## ✅ Tests Frontend (navigateur)

### Accès: http://localhost:5173

### Scénario 1: Utilisateur non authentifié
1. ⏳ Ouvrir http://localhost:5173
2. ⏳ **Attendu:** Redirection automatique vers `/login`
3. ⏳ **Attendu:** Affichage du formulaire de login avec:
   - Logo M.A.X.
   - Champs Email et Mot de passe
   - Bouton "Se connecter"
   - Section "Comptes de test MVP1" visible

### Scénario 2: Login avec admin
1. ⏳ Sur la page `/login`, entrer:
   - Email: `admin@macrea.fr`
   - Mot de passe: `admin123`
2. ⏳ Cliquer sur "Se connecter"
3. ⏳ **Attendu:**
   - Bouton affiche "Chargement..." avec spinner
   - Après succès, redirection vers `/dashboard`
4. ⏳ **Attendu sur /dashboard:**
   - Header avec navigation visible
   - Nom utilisateur affiché: "Admin MaCréa (admin@macrea.fr)"
   - Bouton "Déconnexion" visible
   - Contenu placeholder "Dashboard"

### Scénario 3: Navigation entre pages
1. ⏳ Depuis `/dashboard`, cliquer sur "Chat" dans la nav
2. ⏳ **Attendu:** Navigation vers `/chat` avec contenu placeholder
3. ⏳ Cliquer sur "CRM"
4. ⏳ **Attendu:** Navigation vers `/crm` avec contenu placeholder
5. ⏳ Cliquer sur "Automatisations"
6. ⏳ **Attendu:** Navigation vers `/automation` avec contenu placeholder
7. ⏳ Cliquer sur "Rapports"
8. ⏳ **Attendu:** Navigation vers `/reporting` avec contenu placeholder

### Scénario 4: Persistence du token
1. ⏳ Depuis n'importe quelle page authentifiée, rafraîchir la page (F5)
2. ⏳ **Attendu:**
   - Pas de redirection vers `/login`
   - Utilisateur reste authentifié
   - Page reste affichée correctement

### Scénario 5: Logout
1. ⏳ Depuis n'importe quelle page authentifiée, cliquer sur "Déconnexion"
2. ⏳ **Attendu:**
   - Redirection vers `/login`
   - Token supprimé du localStorage
3. ⏳ Essayer d'accéder manuellement à http://localhost:5173/dashboard
4. ⏳ **Attendu:** Redirection immédiate vers `/login`

### Scénario 6: Login avec user
1. ⏳ Sur `/login`, entrer:
   - Email: `user@macrea.fr`
   - Mot de passe: `user123`
2. ⏳ Cliquer sur "Se connecter"
3. ⏳ **Attendu:**
   - Redirection vers `/dashboard`
   - Nom utilisateur affiché: "User MaCréa (user@macrea.fr)"

### Scénario 7: Credentials incorrects
1. ⏳ Sur `/login`, entrer:
   - Email: `wrong@email.fr`
   - Mot de passe: `wrongpass`
2. ⏳ Cliquer sur "Se connecter"
3. ⏳ **Attendu:**
   - Message d'erreur affiché en rouge
   - Pas de redirection
   - Formulaire reste visible

### Scénario 8: Navigation directe vers page protégée
1. ⏳ En étant déconnecté, taper manuellement http://localhost:5173/automation
2. ⏳ **Attendu:** Redirection immédiate vers `/login`

---

## 🔍 Vérifications dans localStorage

### Après login réussi:
Ouvrir DevTools > Application > Local Storage > http://localhost:5173

**Attendu:**
```json
{
  "auth-storage": {
    "state": {
      "user": {
        "id": "user_admin_001",
        "email": "admin@macrea.fr",
        "name": "Admin MaCréa",
        "role": "admin",
        "tenantId": "macrea"
      },
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "isAuthenticated": true
    },
    "version": 0
  }
}
```

### Après logout:
**Attendu:** La clé `auth-storage` doit être supprimée ou vide

---

## 🔍 Vérifications dans Network DevTools

### Lors du login:
1. Requête POST vers `http://localhost:3005/api/auth/login`
2. Headers: `Content-Type: application/json`
3. Body: `{"email":"...","password":"..."}`
4. Response 200: `{"success":true,"token":"...","user":{...}}`

### Lors de la navigation (après auth):
1. Toutes les futures requêtes vers `/api/*` doivent avoir le header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

### Lors d'un 401:
1. Si le backend répond 401
2. **Attendu:** Redirection automatique vers `/login` via l'interceptor axios

---

## 📋 Résumé des Tests

| Test | Backend | Frontend | Status |
|------|---------|----------|--------|
| Login admin | ✅ | ⏳ | À compléter |
| Login user | ⏳ | ⏳ | À compléter |
| Token verification | ✅ | ⏳ | À compléter |
| 401 sans token | ⏳ | ⏳ | À compléter |
| 401 token invalide | ⏳ | ⏳ | À compléter |
| Navigation protégée | N/A | ⏳ | À compléter |
| Persistence token | N/A | ⏳ | À compléter |
| Logout | ⏳ | ⏳ | À compléter |
| Credentials invalides | ⏳ | ⏳ | À compléter |

---

## ✅ Build Production

```bash
cd max_frontend
npm run build
```

**Résultat:** ✅ Build réussi sans erreurs TypeScript
- 104 modules transformés
- Bundle: 271.19 kB (gzip: 89.96 kB)

---

## 🎯 Prochaines Étapes

Après validation complète du flux auth:
- [ ] **Jour 2-3:** Implémenter Chat M.A.X. Global
- [ ] Créer MessageList et Message components
- [ ] Créer ChatInput avec upload CSV
- [ ] Intégrer SSE pour réponses M.A.X.
- [ ] Créer ConfirmModal pour confirmations actions
