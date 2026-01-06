# Troubleshooting : Erreurs 404 dans le Frontend MAX

## 🔍 Problème

Lorsque vous rafraîchissez la page https://max.studiomacrea.cloud, vous voyez parfois des erreurs 404 avec des IDs Vercel du type :
```
404: NOT_FOUND
Code: NOT_FOUND
ID: cdg1::xlg4r-1766749624037-be38383c902d
```

## 📊 Diagnostics effectués

### 1. Backend Status ✅
- Backend fonctionne correctement (healthy)
- Routes API accessibles
- Nginx proxy fonctionne

### 2. Frontend Config ✅
- `vercel.json` configuré avec rewrites
- Page 404 personnalisée créée (`/public/404.html`)
- Headers de sécurité ajoutés
- Déploiement automatique via GitHub → Vercel

### 3. Sources potentielles d'erreurs

#### A. Erreurs de la console navigateur
Les erreurs que vous voyez viennent probablement de:

1. **Service Worker** qui cherche des ressources en cache
2. **Polling API** qui appelle des endpoints avant que le backend soit prêt
3. **Assets manquants** (favicon, manifest.json, robots.txt)
4. **CORS preflight** (OPTIONS) qui échoue temporairement

#### B. Vérifications à faire

Ouvrez la console du navigateur (F12) et regardez l'onglet "Network" pour voir :
- Quelles requêtes retournent 404
- Quelles requêtes retournent 503
- Si ce sont des requêtes vers le backend ou vers Vercel

## 🛠️ Solutions implémentées

### 1. Page 404 personnalisée ✅

Créé `/public/404.html` avec :
- Design professionnel cohérent avec MAX
- Message clair pour l'utilisateur
- Redirection automatique vers `/` après 3 secondes
- Pas d'ID technique Vercel visible

### 2. Configuration Vercel améliorée ✅

Mis à jour `vercel.json` avec :
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 3. React Router config ✅

Le code React gère déjà les 404 :
```jsx
// App.jsx ligne 46
<Route path="*" element={<Navigate to="/" replace />} />
```

## 🔄 Prochaines actions

### Actions immédiates

1. **Attendre le déploiement Vercel** (en cours)
   - Commit poussé : `feat: Add custom 404 page`
   - Vercel va rebuilder automatiquement
   - Délai : ~2-3 minutes

2. **Vider le cache navigateur**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

3. **Tester à nouveau**
   - Ouvrir https://max.studiomacrea.cloud
   - Ouvrir la console (F12)
   - Rafraîchir plusieurs fois
   - Vérifier si les erreurs 404 persistent

### Si les erreurs persistent

4. **Vérifier les requêtes API**

Ouvrez la console et regardez l'onglet Network pour identifier :
```
- Quelles URLs retournent 404/503 ?
- Sont-ce des requêtes vers max-api.studiomacrea.cloud ?
- Ou vers max.studiomacrea.cloud (frontend Vercel) ?
```

5. **Ajouter des assets manquants**

Si vous voyez des 404 pour :
- `/favicon.ico` → Ajouter dans `/public/`
- `/manifest.json` → Créer un manifest PWA
- `/robots.txt` → Ajouter pour SEO

6. **Gérer les erreurs API temporaires**

Si le backend est temporairement indisponible (503), ajouter dans le frontend :
- Retry automatique avec exponential backoff
- Message d'erreur user-friendly
- Fallback sur données en cache

### Code à ajouter pour gérer les erreurs API

```javascript
// Dans api/client.js
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Si 503, retry après délai
      if (response.status === 503 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## 📋 Checklist de vérification

- [x] Backend healthy
- [x] Nginx configuré avec CORS
- [x] Page 404 personnalisée créée
- [x] vercel.json configuré
- [x] Code déployé sur Vercel
- [ ] Vider cache navigateur
- [ ] Tester après déploiement
- [ ] Identifier source exacte des 404 (Network tab)
- [ ] Ajouter assets manquants si nécessaire
- [ ] Implémenter retry logic si erreurs 503

## 🎯 Résultat attendu

Après le déploiement, les utilisateurs devraient :
- **Ne plus voir** les IDs techniques Vercel
- **Être redirigés** automatiquement en cas de 404
- **Voir une page professionnelle** s'ils accèdent à une route invalide
- **Ne plus avoir d'erreurs CORS** dans la console

Les erreurs 503 temporaires peuvent toujours arriver si le backend redémarre, mais elles ne devraient pas bloquer l'expérience utilisateur.

---

**Créé le** : 26 décembre 2025
**Status** : Déploiement en cours
**Prochaine vérification** : Après déploiement Vercel (~3 minutes)
