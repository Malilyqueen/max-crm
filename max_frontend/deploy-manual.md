# Déploiement Manuel Frontend MAX

## Option 1: Vercel CLI (Recommandé)

```bash
cd max_frontend

# Si token expiré, se reconnecter
vercel login

# Déployer en production
npx vercel --prod --yes
```

## Option 2: Vercel Dashboard (Sans CLI)

1. Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionner le projet `max-frontend`
3. Onglet "Deployments"
4. Cliquer "Redeploy" sur le dernier déploiement
5. Cocher "Use existing Build Cache" = **NON**
6. Cliquer "Redeploy"

## Option 3: Upload Drag & Drop

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Drag & drop le dossier `max_frontend/dist/`
3. Configurer le domaine: `max.studiomacrea.cloud`

## Option 4: GitHub Auto-Deploy

Si le repo est connecté à Vercel:

```bash
cd max_frontend
git add .
git commit -m "fix: Correction tenant + intégration système consentement"
git push origin main
```

Vercel détectera automatiquement et redéploiera.

## Vérifier le Déploiement

Après déploiement, vérifier:

1. **Hard Refresh**: `Ctrl + Shift + R`
2. **Console**: Vérifier `[API] X-Tenant: macrea` (pas `macrea-admin`)
3. **Test**: Cliquer bouton "🧪 Test Consent"
4. **Vérifier**: ConsentCard apparaît dans le chat

## Si Erreurs Persistent

**Erreur**: `TENANT_NOT_RESOLVED`
**Cause**: localStorage contient encore `tenant: 'macrea-admin'`
**Solution**:
```javascript
localStorage.clear();
location.reload();
```

**Erreur**: `404 /api/chat`
**Cause**: Backend pas accessible ou CORS
**Solution**: Vérifier `VITE_API_BASE` dans variables d'environnement Vercel

## Variables d'Environnement Vercel

S'assurer que ces variables sont configurées:

```
VITE_API_BASE=https://max-api.studiomacrea.cloud
VITE_API_URL=https://max-api.studiomacrea.cloud
```

Dashboard Vercel → Projet → Settings → Environment Variables
