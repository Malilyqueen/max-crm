# Déploiement : Réponses MAX adaptées au rôle utilisateur

## 📋 Résumé

MAX adapte maintenant automatiquement le niveau de détail technique de ses réponses selon le rôle de l'utilisateur :
- **Admins** : Reçoivent tous les détails techniques (tools, IDs EspoCRM, erreurs détaillées)
- **Clients** : Reçoivent des réponses en langage business sans jargon technique

## ✅ Ce qui a été déployé

### 1. Nouveau fichier de prompt
**Fichier** : `/opt/max-infrastructure/max-backend/prompts/NO_TECHNICAL_DETAILS_FOR_CLIENTS.txt`

Ce fichier contient les instructions pour MAX sur comment adapter ses réponses selon le rôle.

### 2. Modifications du backend

**Fichier modifié** : `/opt/max-infrastructure/max-backend/routes/chat.js`

**Changements** :
- Ligne 122-125 : Chargement du nouveau prompt
- Ligne 173 : Intégration dans le système de prompts
- Ligne 3804 : Extraction du header `X-Role` depuis la requête HTTP
- Lignes 4254-4276 : Injection dynamique du rôle dans le contexte envoyé à GPT-4

### 3. Logique de détection

```javascript
// Extraction du rôle depuis le header HTTP
const userRole = (req.header('X-Role') || 'client').toLowerCase();

// Injection dans le system prompt
Rôle actuel: ${userRole === 'admin' ? 'ADMIN' : 'CLIENT'}
```

**Par défaut** : Si aucun header `X-Role` n'est fourni, MAX considère l'utilisateur comme un CLIENT.

## 🎯 Comment ça fonctionne

### Pour les ADMINS (X-Role: admin)

MAX affichera :
- ✅ Les noms des tools utilisés (`query_espo_leads`, `update_leads_in_espo`, etc.)
- ✅ Les IDs EspoCRM des entités (`694e71da24c99bd41`)
- ✅ Les détails techniques des erreurs
- ✅ Les suggestions de debug

**Exemple de réponse ADMIN** :
```
✅ IMPORTATION TERMINÉE

📊 RÉSULTATS :
- Total : 36 leads
- Réussi : 31 leads créés via update_leads_in_espo
- Échec : 5 leads (erreur validation EspoCRM)

📋 DÉTAILS :
1. Sophie Martin - ID: 694e71da24c99bd41 ✅
2. Karim Benali - ID: 694e71da539e78ba5 ✅

🔧 DÉTAILS TECHNIQUES :
- Tool utilisé : update_leads_in_espo
- 5 leads ont échoué car query_espo_leads n'a pas retourné d'ID
```

### Pour les CLIENTS (X-Role: client ou header absent)

MAX affichera :
- ❌ Aucun nom de tool
- ❌ Aucun ID technique
- ❌ Pas de jargon (API, endpoint, fonction)
- ✅ Langage business simple
- ✅ Focus sur les résultats métier

**Exemple de réponse CLIENT** :
```
✅ IMPORTATION TERMINÉE

📊 RÉSULTATS :
- 36 contacts traités
- 31 contacts ajoutés avec succès à votre CRM
- 5 contacts nécessitent une vérification

📋 CONTACTS AJOUTÉS :
1. Sophie Martin - SM Consulting ✅
2. Karim Benali - BK Rénovation ✅

⚠️ À VÉRIFIER :
5 contacts n'ont pas pu être importés automatiquement.
Je peux les ajouter manuellement si vous me donnez plus d'informations.
```

## 🔧 Configuration Frontend

Pour que le frontend envoie le bon rôle, il doit ajouter le header HTTP `X-Role` lors des appels à l'API :

### Exemple pour un utilisateur ADMIN :
```javascript
fetch('https://max-api.studiomacrea.cloud/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant': 'macrea-admin',
    'X-Role': 'admin'  // ← Ajouter ce header pour les admins
  },
  body: JSON.stringify({
    message: 'Importe les leads du fichier CSV',
    sessionId: 'session_xxx'
  })
})
```

### Exemple pour un utilisateur CLIENT :
```javascript
fetch('https://max-api.studiomacrea.cloud/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant': 'macrea-admin',
    'X-Role': 'client'  // ← Ou ne pas mettre le header du tout
  },
  body: JSON.stringify({
    message: 'Combien de leads ai-je ?',
    sessionId: 'session_xxx'
  })
})
```

## 📝 Prochaines étapes

1. **Frontend** : Modifier le frontend pour envoyer le header `X-Role` selon le rôle de l'utilisateur connecté
   - Récupérer le rôle depuis le JWT ou depuis le contexte utilisateur
   - L'ajouter aux headers de toutes les requêtes vers `/api/chat`

2. **Tests manuels** : Tester via le frontend avec :
   - Un compte admin (devrait voir les détails techniques)
   - Un compte client (ne devrait pas voir les détails techniques)

3. **Vérification** : Comparer les réponses de MAX pour confirmer l'adaptation du niveau de détail

## 🎉 Statut actuel

✅ Backend configuré et déployé
✅ Système de détection de rôle actif
✅ Prompts chargés dans MAX
🔄 Frontend à configurer pour envoyer le header `X-Role`

---

**Déployé le** : 26 décembre 2025
**Backend** : https://max-api.studiomacrea.cloud
**Version** : MVP1 Phase 1
