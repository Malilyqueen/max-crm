# 🚀 Guide de Déploiement Vercel - Frontend M.A.X.

**Problème résolu:** Commit vide `761b0c3` créé pour forcer le redéploiement

---

## ✅ Statut actuel

**Derniers commits:**
- `761b0c3` - chore: Force Vercel redeploy for consent test button (EMPTY COMMIT)
- `5079b4b` - feat(frontend): Bouton test consentement avec mode debug

**Action en cours:** Vercel redéploie automatiquement (~2-3 minutes)

---

## 📊 Vérifier le déploiement

### Via interface Vercel (RECOMMANDÉ)

1. Ouvrir: https://vercel.com/malalas-projects-941e8450/max-app-frontend
2. Déploiement en cours: https://vercel.com/malalas-projects-941e8450/max-app-frontend/7UnenBUEcAfEmZnkQ4bymSB4P9ce
3. Attendre statut "Ready" ✅

### Tester directement l'URL

Attendre 2-3 minutes, puis ouvrir:
```
https://max-frontend-plum.vercel.app/chat?debug=1
```

Si le bouton jaune n'apparaît pas: Ctrl+Shift+R (vider cache)

---

## 🎬 URLs de test

**Production normale:**
```
https://max-frontend-plum.vercel.app/chat
```
👉 Bouton de test **ne devrait PAS** apparaître

**Mode debug:**
```
https://max-frontend-plum.vercel.app/chat?debug=1
```
👉 Bouton jaune **devrait** apparaître

---

## ⏱️ Timeline

- Push commit: Maintenant
- Détection Vercel: +10-30s
- Build: 1-2 min
- Propagation CDN: +30s
- **Total: ~2-3 minutes**

---

## ✅ Checklist validation

- [ ] Vercel status = "Ready"
- [ ] URL `?debug=1` affiche bouton jaune
- [ ] Clic bouton → ConsentCard apparaît
- [ ] Console propre (F12)
- [ ] ActivityPanel affiche logs
- [ ] Approbation → exécution OK

---

**Commit:** `761b0c3` (force redeploy)
**Statut:** ⏳ Déploiement en cours
