# 🎬 Guide Démo Filmable - Système de Consentement M.A.X.

**Date:** 2025-12-28
**Durée estimée:** 2 minutes
**Objectif:** Prouver que le flux de consentement fonctionne E2E avec UI réactive

---

## 🚀 Préparation (avant de filmer)

### 1. Attendre le déploiement Vercel

Le commit `5079b4b` vient d'être poussé. Vercel va automatiquement déployer dans ~2-3 minutes.

**Vérifier le déploiement:**
```
https://vercel.com/malilyqueen/max-crm
```

Attendre que le statut soit "Ready" avec ✅ vert.

### 2. Préparer l'URL de test

**URL de production avec mode debug:**
```
https://max-frontend-plum.vercel.app/chat?debug=1
```

Le paramètre `?debug=1` active le bouton de test (invisible en production normale).

### 3. Ouvrir la console développeur (F12)

Garder la console ouverte pour voir les logs `[TEST_CONSENT]` pendant la démo.

### 4. Ouvrir l'ActivityPanel

Cliquer sur l'icône d'activité en haut à droite pour voir les logs en temps réel.

---

## 🎥 Scénario de démo (2 minutes)

### Étape 1: Montrer l'interface normale (10 sec)

**Narration suggérée:**
> "Voici l'interface de chat M.A.X. en production. Normalement, l'utilisateur ne voit aucun bouton de test."

**Action:**
- Montrer ChatPage sans le paramètre `?debug=1`
- Pas de bouton jaune visible

### Étape 2: Activer le mode debug (5 sec)

**Narration suggérée:**
> "En ajoutant `?debug=1` à l'URL, on active le mode développeur qui affiche un bouton de test temporaire."

**Action:**
- Ajouter `?debug=1` à l'URL et recharger
- Le bouton jaune "🧪 Test Consentement (DEV ONLY)" apparaît au-dessus de l'input

### Étape 3: Cliquer sur le bouton de test (5 sec)

**Narration suggérée:**
> "Ce bouton simule M.A.X. demandant le consentement pour une opération sensible."

**Action:**
- Cliquer sur "🧪 Test Consentement (DEV ONLY)"
- Observer la console: `[TEST_CONSENT] Appel endpoint test-consent...`
- Observer ActivityPanel: nouvelle activité "Test consentement démarré"

### Étape 4: ConsentCard apparaît (15 sec)

**Narration suggérée:**
> "Un message spécial de type 'consent' est injecté dans la conversation. Le frontend détecte automatiquement ce type et affiche une carte de consentement interactive."

**Ce qui doit apparaître:**
- ✅ Une `ConsentCard` dans la conversation
- ✅ Titre de l'opération: "Ajouter le champ secteur aux layouts Lead"
- ✅ Countdown de 5 minutes (300 secondes)
- ✅ Deux boutons: "Approuver" (vert) et "Rejeter" (rouge)
- ✅ Log dans ActivityPanel: "Message consentement injecté: consent_..."

**Si ConsentCard n'apparaît PAS:**
- Vérifier la console pour erreurs
- Vérifier que le message a bien `type: 'consent'` dans les logs
- Vérifier que `consentId` existe dans le message

### Étape 5: Cliquer sur "Approuver" (20 sec)

**Narration suggérée:**
> "L'utilisateur approuve l'opération. Le frontend appelle le backend pour exécuter l'intervention sur les layouts EspoCRM."

**Action:**
- Cliquer sur le bouton "Approuver" vert
- Observer les logs qui défilent dans ActivityPanel:
  1. "Consentement accordé: consent_..."
  2. "Exécution intervention layout..."
  3. "Opération réussie: X layout(s) modifié(s)"
  4. "Rapport d'audit disponible: consent_..."

**État de la carte:**
- Le statut change: `pending` → `executing` → `success`
- Les boutons Approuver/Rejeter disparaissent
- Un nouveau bouton "Voir le rapport d'audit" apparaît

### Étape 6: Cliquer sur "Voir le rapport d'audit" (30 sec)

**Narration suggérée:**
> "Un rapport d'audit complet est généré et persisté. L'utilisateur peut le consulter à tout moment."

**Action:**
- Cliquer sur "Voir le rapport d'audit"
- Observer l'`AuditReportModal` qui s'ouvre (si implémenté)
- OU observer les logs console avec le rapport JSON complet

**Contenu du rapport (visible dans console):**
```json
{
  "consentId": "consent_xxx",
  "timestamp": "2025-12-28T...",
  "tenantId": "macrea-admin",
  "operation": {
    "type": "layout_modification",
    "description": "Ajouter le champ secteur aux layouts Lead",
    "details": {
      "entity": "Lead",
      "fieldName": "secteur",
      "layoutTypes": ["detail", "list"]
    }
  },
  "result": {
    "success": true,
    "layoutsModified": 2,
    "details": [...]
  },
  "metadata": {
    "approved_by": "user",
    "approved_at": "...",
    "executed_at": "...",
    "execution_time_ms": 245
  }
}
```

### Étape 7: Montrer la persistance (20 sec)

**Narration suggérée:**
> "Le rapport est persisté côté serveur. Même en rechargeant la page, l'audit reste accessible."

**Action:**
- Recharger la page (F5)
- Les messages restent (localStorage 72h)
- La ConsentCard affiche toujours le statut "success"
- Le bouton "Voir rapport" est toujours cliquable

### Étape 8: Conclusion (15 sec)

**Narration suggérée:**
> "Le système de consentement est maintenant opérationnel E2E. M.A.X. peut demander l'autorisation avant toute opération sensible, et l'utilisateur garde le contrôle total avec un audit complet."

**Action:**
- Montrer une dernière fois l'ActivityPanel avec tous les logs
- Montrer la console avec les logs `[TEST_CONSENT]`, `[CONSENT]`

---

## ✅ Checklist avant de filmer

- [ ] Vercel déployé et "Ready"
- [ ] URL avec `?debug=1` fonctionne
- [ ] Console développeur ouverte (F12)
- [ ] ActivityPanel ouvert
- [ ] Navigateur en plein écran (pas d'onglets parasites)
- [ ] Zoom navigateur à 100% (pas 80% ou 125%)
- [ ] Logiciel de capture d'écran prêt (OBS, ScreenToGif, etc.)

---

## 🐛 Troubleshooting

### Le bouton de test n'apparaît pas

**Cause:** Mode debug pas activé

**Solution:** Vérifier l'URL contient bien `?debug=1`

### ConsentCard ne s'affiche pas après le clic

**Cause possible 1:** Erreur réseau

**Solution:**
```javascript
// Dans console, vérifier la réponse:
fetch('https://max-api.studiomacrea.cloud/api/chat/test-consent', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Tenant': 'macrea-admin'},
  body: JSON.stringify({sessionId: 'test', description: 'Test'})
}).then(r => r.json()).then(console.log)
```

**Cause possible 2:** Message pas injecté dans l'état

**Solution:** Vérifier dans React DevTools que `messages` contient le nouveau message

**Cause possible 3:** MessageList ne détecte pas `type: 'consent'`

**Solution:** Vérifier dans console:
```javascript
// Le dernier message devrait avoir:
messages[messages.length - 1].type === 'consent' // true
messages[messages.length - 1].consentId // 'consent_xxx'
```

### Erreur 404 sur /api/chat/test-consent

**Cause:** Backend pas à jour sur le serveur

**Solution:**
```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure
git pull
cd max-backend
docker compose build max-backend
docker compose up -d max-backend
```

### Erreur CORS

**Cause:** Frontend local appelle API production

**Solution:** Utiliser la version déployée sur Vercel, pas localhost

### Le countdown ne décrémente pas

**Cause:** ConsentCard pas implémenté avec timer

**Solution:** C'est normal si le timer est statique. L'important est que la carte s'affiche.

---

## 📊 Métriques de succès

Pour que la démo soit considérée réussie, on doit voir:

1. ✅ Bouton de test visible avec `?debug=1`
2. ✅ ConsentCard s'affiche après le clic
3. ✅ Logs apparaissent dans ActivityPanel en temps réel
4. ✅ Bouton "Approuver" déclenche l'exécution
5. ✅ Statut de la carte change: pending → executing → success
6. ✅ Rapport d'audit disponible (console ou modal)
7. ✅ Pas d'erreurs dans la console
8. ✅ Flux complet < 10 secondes (hors narration)

---

## 🎯 Après la démo

Une fois la démo filmée et validée:

### Option C: Intégration M.A.X. complète

1. **Créer action `modify_layout`** qui appelle `requestConsent` automatiquement
2. **Exposer les tools dans le prompt système** de M.A.X.
3. **Tester conversation réelle:**
   - User: "M.A.X., peux-tu ajouter le champ secteur aux layouts Lead ?"
   - M.A.X. détecte opération sensible
   - M.A.X. appelle `request_consent` via tool
   - Frontend reçoit message `type: 'consent'`
   - ConsentCard s'affiche naturellement
   - User approuve
   - M.A.X. exécute via `modify_layout`

4. **Retirer le bouton de test:**
```bash
# Commenter le code du bouton dans ChatPage.tsx
git commit -m "chore: Retrait bouton test consentement après validation"
git push
```

---

## 📁 Fichiers impliqués

### Frontend
- [max_frontend/src/pages/ChatPage.tsx](max_frontend/src/pages/ChatPage.tsx) - Bouton de test et `testConsentFlow()`
- [max_frontend/src/stores/useChatStore.ts](max_frontend/src/stores/useChatStore.ts) - Méthode `injectMessage()`
- [max_frontend/src/types/chat.ts](max_frontend/src/types/chat.ts) - Type `ChatMessage` avec `type: 'consent'`
- [max_frontend/src/components/chat/MessageList.tsx](max_frontend/src/components/chat/MessageList.tsx) - Détection et rendu ConsentCard
- [max_frontend/src/components/chat/ConsentCard.tsx](max_frontend/src/components/chat/ConsentCard.tsx) - UI de la carte
- [max_frontend/src/hooks/useConsent.ts](max_frontend/src/hooks/useConsent.ts) - Hooks `executeConsent`, `getAuditReport`

### Backend
- [max_backend/routes/consent-test.js](max_backend/routes/consent-test.js) - Endpoint `/api/chat/test-consent`
- [max_backend/routes/consent.js](max_backend/routes/consent.js) - Endpoints `/api/consent/execute`, `/api/consent/audit`
- [max_backend/actions/requestConsent.js](max_backend/actions/requestConsent.js) - Action de création de consentement
- [max_backend/lib/consentManager.js](max_backend/lib/consentManager.js) - Logique métier du consentement

---

## 🎬 Scripts alternatifs de narration

### Version courte (30 sec)

> "Système de consentement M.A.X. en action. J'active le mode debug, je clique sur Test Consentement. La carte apparaît, je clique Approuver. L'opération s'exécute, les layouts sont modifiés, le rapport d'audit est généré. Tout est tracé et persisté. C'est prêt pour production."

### Version technique (2 min)

> "Démonstration du système de consentement pour M.A.X. Le backend expose un endpoint de test qui retourne un message avec type 'consent'. Le frontend détecte ce type spécial et affiche une ConsentCard interactive au lieu d'un message classique. L'utilisateur peut approuver ou rejeter. À l'approbation, le hook useConsent appelle l'API d'exécution, qui modifie réellement les layouts EspoCRM et génère un audit persisté dans Supabase. Tous les événements sont loggés dans l'ActivityPanel en temps réel. Le flux complet est opérationnel et prêt pour l'intégration dans le cerveau de M.A.X."

### Version business (1 min)

> "Avant cette fonctionnalité, M.A.X. pouvait modifier la configuration CRM sans demander. Maintenant, pour toute opération sensible, il demande l'autorisation. L'utilisateur voit exactement ce qui va être fait, il peut accepter ou refuser. S'il accepte, l'opération s'exécute et génère un rapport d'audit complet. Ce système apporte transparence, contrôle et traçabilité. C'est la base de la confiance pour un agent IA autonome."

---

## ✨ Prochaines évolutions possibles

Après validation de la démo:

1. **AuditReportModal amélioré:**
   - Affichage graphique du rapport (pas juste JSON)
   - Diff visuel des layouts (avant/après)
   - Timeline des événements

2. **Expiration automatique:**
   - Countdown réel dans ConsentCard
   - Auto-expiration après 5 minutes
   - Notification si expiré

3. **Rejeter le consentement:**
   - Implémenter le bouton "Rejeter"
   - Logger le rejet dans audit
   - Informer M.A.X. du refus

4. **Notifications:**
   - Toast quand consentement demandé
   - Son/vibration optionnel
   - Badge sur l'icône ActivityPanel

5. **Historique des consentements:**
   - Page dédiée listant tous les audits
   - Filtrage par statut, date, type
   - Export CSV/PDF

6. **Permissions par rôle:**
   - Admin peut tout approuver
   - Operator a restrictions
   - SuperAdmin peut bypass (avec audit renforcé)

---

**Bonne chance pour la démo ! 🎬**
