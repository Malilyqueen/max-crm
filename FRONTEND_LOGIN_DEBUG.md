# 🔐 Debug Login Frontend MAX

## ✅ Configuration Vérifiée

- ✅ Backend API fonctionne: `https://max-api.studiomacrea.cloud/api/auth/login`
- ✅ Route `/auth` montée dans server.js
- ✅ Frontend pointe vers `https://max-api.studiomacrea.cloud`
- ✅ Test curl réussi avec credentials

---

## 👤 Credentials Valides

### Admin
```
Email: admin@macrea.fr
Password: admin123
```

### User Standard
```
Email: user@macrea.fr
Password: user123
```

---

## 🔍 Debug dans le Navigateur

### 1. Ouvrir Console (F12)

1. Aller sur https://max.studiomacrea.cloud
2. Appuyer sur **F12**
3. Onglet **Console**

### 2. Essayer de se connecter

Utiliser les credentials ci-dessus.

### 3. Vérifier les Logs

Chercher dans la console:

**Si succès:**
```
[AUTH] ✅ Login réussi: admin@macrea.fr
[AUTH] 💾 Token sauvegardé: eyJhbGciOiJI...
[AUTH] 🔍 Vérification localStorage: PRÉSENT
```

**Si erreur réseau:**
```
[API] ❌ Erreur requête: ...
```

**Si erreur CORS:**
```
Access to XMLHttpRequest at 'https://max-api.studiomacrea.cloud/api/auth/login'
from origin 'https://max.studiomacrea.cloud' has been blocked by CORS policy
```

### 4. Onglet Network

1. Onglet **Network** (Réseau)
2. Tenter de se connecter
3. Chercher requête `auth/login`
4. Cliquer dessus
5. Vérifier:
   - **Status**: Doit être 200
   - **Response**: Doit contenir `{"success":true,"token":"...","user":{...}}`
   - **Headers** → Request Headers: Doit contenir `Origin: https://max.studiomacrea.cloud`

---

## 🛠️ Solutions selon l'Erreur

### Erreur: "Email ou mot de passe incorrect"

**Cause**: Mauvais credentials

**Solution**: Utiliser exactement:
```
admin@macrea.fr / admin123
```

---

### Erreur CORS

**Symptôme dans console**:
```
Access-Control-Allow-Origin...
```

**Cause**: Backend ne retourne pas les headers CORS pour `https://max.studiomacrea.cloud`

**Solution**: Vérifier `server.js` sur le serveur

```bash
ssh root@51.159.170.20
cat /opt/max-infrastructure/max-backend/server.js | grep -A 5 "cors("
```

Doit contenir:
```javascript
app.use(cors({
  origin: ['https://max.studiomacrea.cloud', 'http://localhost:5173'],
  credentials: true
}));
```

**Si absent ou incorrect**, corriger et redémarrer:
```bash
cd /opt/max-infrastructure
docker compose restart max-backend
```

---

### Erreur: Network Error / Failed to fetch

**Cause**: Frontend ne peut pas joindre le backend

**Tests**:

1. **DNS résout?**
```powershell
nslookup max-api.studiomacrea.cloud
```

2. **API accessible depuis navigateur?**
Ouvrir directement: https://max-api.studiomacrea.cloud/api/health

3. **Certificat SSL valide?**
Le navigateur doit montrer un cadenas vert.

---

### Erreur: "introuvable" ou réponse vide

**Symptôme**: Requête se termine mais pas de réponse ou erreur générique

**Cause possible**: Frontend cache une ancienne version

**Solution**:

1. **Vider le cache navigateur**:
   - Chrome: Ctrl+Shift+Del → Cocher "Images et fichiers en cache" → Effacer
   - Ou: Mode Navigation Privée (Ctrl+Shift+N)

2. **Hard Refresh**:
   - Windows: Ctrl+F5
   - Mac: Cmd+Shift+R

3. **Vérifier la version déployée sur Vercel**:
   - Vercel Dashboard → Project max-frontend → Deployments
   - Vérifier que le dernier deployment est "Ready"
   - Cliquer sur "Visit" pour tester l'URL Vercel directe

---

## 🔄 Redéployer le Frontend

Si problème persiste:

```powershell
cd d:\Macrea\CRM\max_frontend

# Vérifier les variables d'environnement
cat .env.production

# Doit contenir:
# VITE_API_BASE=https://max-api.studiomacrea.cloud
# VITE_API_URL=https://max-api.studiomacrea.cloud

# Push changements si besoin
git add .
git commit -m "fix: Update env vars"
git push origin master

# Vercel va auto-redéployer
```

Attendre 2-3 min, puis tester: https://max.studiomacrea.cloud

---

## 📋 Checklist Complète

- [ ] DNS `max-api.studiomacrea.cloud` résout (nslookup)
- [ ] API Health accessible: https://max-api.studiomacrea.cloud/api/health
- [ ] Frontend charge: https://max.studiomacrea.cloud
- [ ] Console navigateur (F12) ouverte
- [ ] Credentials corrects: `admin@macrea.fr` / `admin123`
- [ ] Onglet Network ouvert pour voir la requête
- [ ] Pas d'erreur CORS dans console
- [ ] Requête `/api/auth/login` retourne Status 200
- [ ] Response contient `{"success":true,"token":"..."}`

---

## 🧪 Test Manuel via Console Navigateur

Si vous voulez tester directement dans la console:

```javascript
// Ouvrir console (F12)
fetch('https://max-api.studiomacrea.cloud/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@macrea.fr',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Login réussi:', data))
.catch(err => console.error('❌ Erreur:', err));
```

**Résultat attendu**:
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "user_admin_001",
    "email": "admin@macrea.fr",
    "name": "Admin MaCréa",
    "role": "admin",
    "tenantId": "macrea"
  }
}
```

---

## 📞 Prochaine Étape

Une fois connecté avec succès, vous devriez:

1. Voir le tableau de bord MAX
2. Console doit afficher: `[AUTH] ✅ Login réussi`
3. LocalStorage doit contenir le token (F12 → Application → Local Storage)

---

**Dernière vérification**: 2025-12-25 17:17 UTC
**API Status**: ✅ Fonctionnel
**Credentials**: admin@macrea.fr / admin123
