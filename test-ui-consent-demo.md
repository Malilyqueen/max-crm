# 🎬 Guide de Test Consent Gate UI - DÉMO FILMABLE

## ⚠️ PROBLÈME DÉTECTÉ

Le frontend ne détecte **PAS** le `pendingConsent` retourné par le backend.

**Symptôme** : M.A.X. tourne en boucle infinie et crée un nouveau consent à chaque message.

---

## 🔍 DEBUG NÉCESSAIRE

### Test à faire :

1. Ouvre https://max.studiomacrea.cloud
2. Ouvre **DevTools** (F12) → Onglet **Console**
3. Envoie : `Crée un champ testDebug de type text sur Account`
4. Cherche dans la Console :
   - ✅ `[CHAT_STORE] 🚨 Consent requis détecté:` → Frontend détecte bien
   - ❌ Rien → Frontend ne détecte PAS

### Si le frontend ne détecte PAS :

**Causes possibles** :
1. Structure de la réponse différente entre `/api/chat` en prod vs local
2. Frontend build est l'ancienne version (déploiement Vercel pas terminé)
3. Cache navigateur sert l'ancien JS

**Solutions** :
1. Vider le cache navigateur (Ctrl+Shift+R)
2. Attendre 2-3 minutes que Vercel finisse le déploiement
3. Vérifier que le build Vercel est réussi : https://vercel.com/dashboard

---

## 🎯 SCÉNARIO DE REPLI : Test Backend Direct

Si l'UI ne fonctionne pas, utilise le script PowerShell qui **fonctionne à 100%** :

```powershell
cd "d:\Macrea\CRM"
powershell -ExecutionPolicy Bypass -File test-consent-direct.ps1
```

**Avantages** :
- ✅ Prouve que le backend fonctionne parfaitement
- ✅ Montre le flow complet
- ✅ Vérifiable dans EspoCRM

**Démo filmable** :
1. Filme l'exécution du script PowerShell
2. Montre les étapes : Consent créé → Exécuté → Champ créé
3. Ouvre EspoCRM pour montrer le champ

---

## 📊 Résumé Technique

### ✅ Ce qui fonctionne :
- Backend Consent Gate (100%)
- Self-correction automatique (100%)
- Exécution via `/api/consent/execute/:id` (100%)
- Création champs dans EspoCRM (100%)

### ❌ Ce qui ne fonctionne pas :
- Frontend ne détecte pas `pendingConsent`
- ConsentCard ne s'affiche pas automatiquement
- User doit répondre "oui" en texte → Boucle infinie

### 🔧 Fix nécessaire :
- Debug: Vérifier structure response dans DevTools Network
- Vérifier que le nouveau build Vercel est déployé
- Potentiellement: Ajouter plus de logs dans useChatStore.ts