# 🚀 Statut Déploiement - Système Consentement MAX

**Date**: 2025-12-27
**Branch**: `feature/greenapi`
**Commit**: `abdba2c` - fix(frontend): Correction tenant + intégration système consentement

---

## ✅ Travaux Terminés

### 1. Corrections Critiques
- ✅ **Tenant fixé**: `'macrea-admin'` → `'macrea'` dans `useSettingsStore.ts` et `client.ts`
- ✅ **Types étendus**: `MessageType`, `ConsentOperation`, champs consent dans `ChatMessage`
- ✅ **ConsentCard intégrée**: Rendu conditionnel dans `MessageList.tsx`
- ✅ **Handlers complets**: `handleApproveConsent()` et `handleViewAudit()` dans `ChatPage.tsx`
- ✅ **ActivityPanel logging**: Logs automatiques à chaque étape du consentement
- ✅ **Bouton test**: `🧪 Test Consent` pour validation immédiate

### 2. Backend (Déjà Prêt)
- ✅ `routes/consent.js`: `/request`, `/execute/:id`, `/audit/:id`
- ✅ `lib/consentManager.js`: Gestion volatile, expiration 5min, one-shot
- ✅ `lib/espoLayoutManager.js`: Wrapper SSH → Docker → PHP
- ✅ `espocrm-tools/add-field-to-layouts.php`: Script corrigé (json_decode array)

### 3. Documentation
- ✅ [CONSENT_TRIGGER_GUIDE.md](max_frontend/CONSENT_TRIGGER_GUIDE.md)
- ✅ [CONSENT_INTEGRATION.md](max_frontend/CONSENT_INTEGRATION.md)
- ✅ [deploy-manual.md](max_frontend/deploy-manual.md)

### 4. Build
```bash
✓ 2180 modules transformed.
dist/index.html                   0.37 kB │ gzip:   0.26 kB
dist/assets/index-Tvg4wNj0.css   63.16 kB │ gzip:  10.21 kB
dist/assets/index-R-JT0vGS.js   534.26 kB │ gzip: 162.57 kB
✓ built in 9.12s
```

### 5. Git
- ✅ Commit créé et poussé sur `feature/greenapi`
- ✅ URL PR: https://github.com/Malilyqueen/max-crm/pull/new/feature/greenapi

---

## ⏳ Actions Requises (PAR VOUS)

### Priorité 1: Déployer le Build

**Option A - Dashboard Vercel (PLUS RAPIDE):**
1. Ouvrir https://vercel.com/dashboard
2. Sélectionner projet `max-frontend`
3. Onglet "Deployments"
4. Cliquer "Redeploy" sur le dernier déploiement
5. **Décocher** "Use existing Build Cache"
6. Cliquer "Redeploy"

**Option B - Vercel CLI (si token réparé):**
```bash
cd max_frontend
vercel login
npx vercel --prod --yes
```

**Option C - Merge vers main (si Vercel auto-deploy configuré):**
1. Créer PR: https://github.com/Malilyqueen/max-crm/pull/new/feature/greenapi
2. Merger vers `main`
3. Vercel auto-déploiera (si configuré)

**Option D - Script PowerShell:**
```powershell
cd max_frontend
.\DEPLOY_NOW.ps1
```
Suivre les instructions affichées.

---

## 🧪 Tests Post-Déploiement

### 1. Vérifier le Tenant
```
1. Ouvrir: https://max.studiomacrea.cloud
2. Hard Refresh: Ctrl + Shift + R
3. F12 → Console
4. Chercher: [API] X-Tenant: macrea
5. Vérifier: PAS 'macrea-admin'
```

### 2. Si Erreur "TENANT_NOT_RESOLVED"
```javascript
// Dans Console
localStorage.clear();
location.reload();
```

Ou ouvrir: `max_frontend/CLEAR_STORAGE.html`

### 3. Tester le Consentement
```
1. Dans le chat, cliquer: 🧪 Test Consent
2. Vérifier apparition de ConsentCard
3. Countdown visible (5:00 → 4:59...)
4. Cliquer: "Autoriser cette intervention"
5. ActivityPanel doit logger:
   - CONSENT_REQUESTED
   - CONSENT_GRANTED
   - EXECUTION_STARTED
   - EXECUTION_SUCCESS
   - AUDIT_AVAILABLE
6. Bouton "Voir le rapport" apparaît
7. Cliquer → AuditReportModal affiche le JSON
```

---

## 🐛 Résolution Problèmes Connus

### Erreur 404 /api/chat
**Cause**: Ancien build déployé
**Solution**: Redéployer (Option A ci-dessus)

### Erreur "TENANT_NOT_RESOLVED"
**Cause**: localStorage contient `'macrea-admin'`
**Solution**: `localStorage.clear(); location.reload();`

### ConsentCard n'apparaît pas
**Cause**: Build pas déployé OU cache navigateur
**Solution**:
1. Hard refresh: Ctrl + Shift + R
2. Vérifier version déployée: Console → chercher `[API]`
3. Redéployer si version ancienne

### Bouton "🧪 Test Consent" invisible
**Cause**: Ancien build
**Solution**: Hard refresh + redéployer

---

## 📊 Architecture Consent (Rappel)

```
User clique "🧪 Test Consent"
  ↓
requestConsent() → POST /api/consent/request
  ↓
Backend crée consentId (expiration 5min)
  ↓
Frontend ajoute message type='consent' au chat
  ↓
MessageList détecte → Affiche <ConsentCard>
  ↓
User clique "Autoriser cette intervention"
  ↓
handleApproveConsent(consentId)
  ↓
executeConsent(consentId) → POST /api/consent/execute/:id
  ↓
Backend: SSH → Docker → PHP add-field-to-layouts.php
  ↓
Audit JSON créé → Disponible via GET /api/consent/audit/:id
  ↓
ConsentCard passe en status='success'
  ↓
Bouton "Voir le rapport" → AuditReportModal
```

---

## 🔐 Modèle de Sécurité (Confirmé)

- ✅ **MAX ne demande PAS de mot de passe** au moment du consentement
- ✅ **MAX ne stocke AUCUN mot de passe** (ni RAM ni disque)
- ✅ **MAX orchestre** des actions système déjà autorisées
- ✅ **Consentement autorise l'exécution**, pas la transmission de secrets
- ✅ **Credentials SSH/Docker** sont dans `.env` backend, inaccessibles au frontend
- ✅ **ConsentId one-shot**: Expire après 5min OU après première utilisation
- ✅ **Audit trail**: Chaque opération logged en JSON persistant

---

## 📝 Fichiers Modifiés (Commit `abdba2c`)

```
M  max_frontend/src/api/client.ts
M  max_frontend/src/stores/useSettingsStore.ts
M  max_frontend/src/types/chat.ts
M  max_frontend/src/components/chat/MessageList.tsx
M  max_frontend/src/pages/ChatPage.tsx
A  max_frontend/CONSENT_TRIGGER_GUIDE.md
A  max_frontend/deploy-manual.md
A  max_frontend/DEPLOY_NOW.ps1
```

---

## 🎯 Prochaine Étape

**MAINTENANT**: Déployer via Option A (Dashboard Vercel)
**ENSUITE**: Tester le bouton 🧪 Test Consent
**ENFIN**: Activer la détection automatique dans `useChatStore.ts` (voir CONSENT_TRIGGER_GUIDE.md)

---

**Besoin d'aide?** Voir [deploy-manual.md](max_frontend/deploy-manual.md) pour instructions détaillées.
