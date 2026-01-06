# 🧪 Test Local - Système de Consentement

**Raison:** Vercel a des problèmes de déploiement (404 persistants)
**Solution:** Tester en local pour valider le code et filmer la démo

---

## 🚀 Démarrer le frontend en local

### Étape 1: Lancer le serveur de développement

```bash
cd max_frontend
npm run dev
```

**Résultat attendu:**
```
VITE v7.1.2  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### Étape 2: Ouvrir l'URL avec mode debug

**URL à ouvrir:**
```
http://localhost:5173/chat?debug=1
```

**Attendu:**
- ✅ Bouton jaune "🧪 Test Consentement (DEV ONLY)" au-dessus de l'input
- ✅ Interface complète de ChatPage
- ✅ Console F12 propre

---

## 🎬 Test E2E en local

### Scénario complet (2 minutes)

1. **Ouvrir l'URL**
   ```
   http://localhost:5173/chat?debug=1
   ```

2. **Ouvrir DevTools (F12)**
   - Onglet Console
   - Onglet Network

3. **Ouvrir ActivityPanel**
   - Cliquer sur l'icône d'activité en haut à droite

4. **Cliquer sur "🧪 Test Consentement (DEV ONLY)"**

   **Observer console:**
   ```
   [TEST_CONSENT] Appel endpoint test-consent...
   [TEST_CONSENT] Réponse: {...}
   [TEST_CONSENT] ✅ ConsentCard devrait s'afficher maintenant
   ```

   **Observer ActivityPanel:**
   - "Test consentement démarré"
   - "Message consentement injecté: consent_..."

   **Observer conversation:**
   - ConsentCard apparaît avec:
     - Titre: "Ajouter le champ secteur aux layouts Lead"
     - Countdown: 300 secondes (5 minutes)
     - Bouton vert "Approuver"
     - Bouton rouge "Rejeter"

5. **Cliquer sur "Approuver"**

   **Observer ActivityPanel (logs en temps réel):**
   - "Consentement accordé: consent_..."
   - "Exécution intervention layout..."
   - "Opération réussie: X layout(s) modifié(s)"
   - "Rapport d'audit disponible: consent_..."

   **Observer ConsentCard:**
   - Statut change: pending → executing → success
   - Boutons Approuver/Rejeter disparaissent
   - Bouton "Voir le rapport d'audit" apparaît

6. **Cliquer sur "Voir le rapport d'audit"**

   **Observer console:**
   ```javascript
   {
     consentId: "consent_xxx",
     timestamp: "...",
     operation: {
       type: "layout_modification",
       description: "Ajouter le champ secteur aux layouts Lead",
       details: {...}
     },
     result: {
       success: true,
       layoutsModified: 2,
       details: [...]
     },
     metadata: {
       approved_by: "user",
       execution_time_ms: 245
     }
   }
   ```

---

## ✅ Checklist de validation

- [ ] Frontend démarre sans erreurs (`npm run dev`)
- [ ] URL `?debug=1` affiche le bouton jaune
- [ ] Bouton cliquable sans erreur console
- [ ] Appel API `/api/chat/test-consent` réussit
- [ ] ConsentCard s'affiche dans la conversation
- [ ] ConsentCard affiche countdown + 2 boutons
- [ ] ActivityPanel affiche "Test consentement démarré"
- [ ] Clic "Approuver" déclenche l'exécution
- [ ] ActivityPanel affiche logs en temps réel
- [ ] Statut ConsentCard change (pending → success)
- [ ] Bouton "Voir rapport" apparaît
- [ ] Clic "Voir rapport" affiche audit dans console
- [ ] Aucune erreur dans console à la fin

---

## 🎥 Filmer la démo locale

### Préparation

1. **Installer OBS Studio** (si pas déjà fait)
   - https://obsproject.com/
   - Ou utiliser l'enregistreur Windows (Win + G)

2. **Préparer l'écran**
   - Fermer tous les onglets parasites
   - Zoom navigateur à 100%
   - Console F12 ouverte
   - ActivityPanel ouvert

3. **Lancer l'enregistrement**
   - OBS: "Démarrer l'enregistrement"
   - Windows: Win + Alt + R

### Script de démo (30 secondes)

**[0:00 - 0:05]** Montrer l'URL avec `?debug=1`
> "Voici l'interface M.A.X. en mode debug"

**[0:05 - 0:08]** Montrer le bouton jaune
> "Le bouton de test de consentement est visible"

**[0:08 - 0:12]** Cliquer sur le bouton
> "Je clique pour simuler une demande de consentement"

**[0:12 - 0:16]** ConsentCard apparaît
> "La carte de consentement s'affiche avec les détails de l'opération"

**[0:16 - 0:20]** Cliquer "Approuver"
> "J'approuve l'opération"

**[0:20 - 0:25]** Observer logs ActivityPanel
> "L'exécution se déroule et les logs apparaissent en temps réel"

**[0:25 - 0:30]** Cliquer "Voir rapport"
> "Le rapport d'audit complet est disponible"

### Arrêter l'enregistrement

- OBS: "Arrêter l'enregistrement"
- Windows: Win + Alt + R

**Fichier vidéo:** Sauvegardé automatiquement

---

## 🔧 Troubleshooting

### Le bouton de test n'apparaît pas

**Vérifier dans console:**
```javascript
const params = new URLSearchParams(window.location.search);
console.log('Debug mode:', params.get('debug'));
// Devrait afficher: Debug mode: 1
```

**Si affiche `null`:**
- L'URL n'a pas le paramètre `?debug=1`
- Recharger avec la bonne URL

### Erreur CORS sur l'appel API

**Cause:** API backend sur `https://max-api.studiomacrea.cloud`, frontend sur `localhost`

**Solution temporaire:** Tester avec backend local si disponible

**Ou:** Modifier temporairement le CORS backend pour accepter `localhost:5173`

### ConsentCard ne s'affiche pas

**Debug dans console:**
```javascript
// Vérifier que le message a été injecté
const messages = /* récupérer depuis React DevTools */;
const lastMessage = messages[messages.length - 1];
console.log('Last message:', lastMessage);
console.log('Type:', lastMessage.type); // Devrait être 'consent'
console.log('ConsentId:', lastMessage.consentId); // Devrait exister
```

**Si type !== 'consent':**
- Le backend n'a pas retourné le bon format
- Vérifier la réponse dans l'onglet Network

### Build production ne fonctionne pas

**Tester avec preview:**
```bash
npm run build
npm run preview
```

Ouvrir: `http://localhost:4173/chat?debug=1`

---

## 📦 Alternative: Test avec build de production

Si `npm run dev` a des problèmes, utiliser la version buildée:

```bash
cd max_frontend
npm run build
npm run preview
```

**URL:**
```
http://localhost:4173/chat?debug=1
```

---

## 🚀 Après validation locale

Une fois le test local réussi et filmé:

### Option A: Réessayer Vercel plus tard
- Parfois Vercel a des latences de détection
- Réessayer dans 10-15 minutes

### Option B: Déploiement manuel
```bash
cd max_frontend
npx vercel --prod
```

### Option C: Utiliser la démo locale
- La vidéo locale prouve que le système fonctionne
- Suffisant pour validation interne

---

## ✨ Avantages du test local

1. ✅ **Immédiat** - Pas d'attente de déploiement
2. ✅ **Contrôle total** - Pas de problèmes de cache CDN
3. ✅ **Debug facile** - Logs en temps réel
4. ✅ **Itération rapide** - Modifier et recharger instantanément
5. ✅ **Preuve de concept** - Montre que le code fonctionne

---

**Commande pour démarrer:**
```bash
cd max_frontend && npm run dev
```

**URL de test:**
```
http://localhost:5173/chat?debug=1
```

**Bonne démo ! 🎬**