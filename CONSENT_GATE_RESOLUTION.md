# Résolution Complète du Système Consent Gate

## 🎯 Problème Initial

M.A.X. créait des consents mais l'interface ne montrait jamais la ConsentCard avec les boutons Approuver/Refuser.

## 🔍 Causes Identifiées

### 1. Prompt Système Manquant
**Problème**: Le prompt ne mentionnait jamais le tool `create_custom_field`
**Symptôme**: M.A.X. inventait "Un consentement a été créé..." en texte
**Solution**: Ajout explicite dans `max_custom_fields_awareness.txt`

### 2. Mode Streaming Activé par Défaut
**Problème**: `sendMessage(message, useStreaming = true)` par défaut
**Symptôme**: Le code de détection `pendingConsent` jamais exécuté
**Solution**: Changé à `useStreaming = false` dans `useChatStore.ts:105`

### 3. Import CommonJS Incorrect
**Problème**: Import ES6 d'un module CommonJS
**Symptôme**: Backend crash au démarrage
**Solution**: Utilisation de l'import par défaut dans `modifyLayout.js`

## ✅ Correctifs Appliqués

### Backend
1. **Prompt système** (`max_backend/prompts/max_custom_fields_awareness.txt`)
   - Ajout de `create_custom_field` en premier dans "CE QUE TU PEUX FAIRE"
   - Instruction: "utilise TOUJOURS le tool, ne réponds JAMAIS en texte"
   - Exemple concret avec warning: "❌ NE DIS JAMAIS: 'Un consentement a été créé...'"

2. **Import fix** (`max_backend/actions/modifyLayout.js`)
   ```javascript
   import pkg from '../lib/FilesystemLayoutManager.cjs';
   const { FilesystemLayoutManager } = pkg;
   ```

### Frontend
1. **Désactivation streaming** (`max_frontend/src/stores/useChatStore.ts:105`)
   ```typescript
   sendMessage: async (message: string, useStreaming = false) => {
   ```

2. **Logs debug** (déjà présents dans `useChatStore.ts:214-246`)
   - Logs `[CHAT_STORE]` pour tracer la détection de `pendingConsent`
   - Injection du message de type 'consent'

3. **API centralisée** (`max_frontend/src/config/api.ts`)
   - Détection runtime de l'environnement
   - Pas de dépendance aux env vars Vercel

## 🧪 Tests de Validation

### Backend (100% OK)
```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose logs max-backend | grep -E 'Tool bloqué par Consent Gate|Consent créé|Réponse avec pendingConsent'"
```

✅ Résultats:
- `[ChatRoute] Tool calls détectés: create_custom_field`
- `[create_custom_field] ❌ BLOQUÉ PAR CONSENT GATE`
- `[ChatRoute] ✅ Consent créé: consent_xxx`
- `[ChatRoute] ✅ Réponse avec pendingConsent: consent_xxx`

### Frontend Local (100% OK)
Test: "Crée un champ test888"

✅ Résultats:
- Backend retourne `pendingConsent` dans le JSON
- Frontend détecte `pendingConsent`
- ConsentCard s'affiche avec boutons Approuver/Refuser

### Frontend Production (EN ATTENTE VERCEL)
Status: Vercel n'a pas encore déployé le commit `0d59b1e` avec le fix streaming

## 📋 Commits Critiques

1. `e9c18ca` - fix(consent-gate): Force M.A.X. à appeler create_custom_field tool
2. `0d59b1e` - fix(consent-gate): Désactiver streaming par défaut pour supporter pendingConsent
3. `ed027a8` - fix(backend): Corriger import CommonJS de FilesystemLayoutManager

## 🚀 Déploiement Production

### Backend
✅ Redémarré avec tous les fixes:
```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"
```

### Frontend
⏳ En attente du build Vercel avec le commit `0d59b1e`

Une fois déployé, le système fonctionnera exactement comme en local.

## 📊 Architecture Finale

```
User: "Crée un champ maxTags"
     ↓
Frontend (useStreaming=false)
     ↓
POST /api/chat
     ↓
M.A.X. appelle create_custom_field()
     ↓
Tool retourné: httpCode=412, requiresConsent=true
     ↓
Backend crée pendingConsent
     ↓
Response JSON: {ok: true, answer: "...", pendingConsent: {...}}
     ↓
Frontend détecte pendingConsent
     ↓
Injection message type='consent'
     ↓
MessageList affiche ConsentCard
     ↓
User clique "Approuver"
     ↓
POST /api/consent/:consentId/approve
     ↓
Le champ est créé ✅
```

## 🎯 Résultat Final

Le système Consent Gate fonctionne à 100% en local. Production sera opérationnelle après le déploiement Vercel.

**Date de résolution**: 2026-01-05
**Durée totale**: ~2h de débogage intensif
**Commits**: 3 correctifs critiques
