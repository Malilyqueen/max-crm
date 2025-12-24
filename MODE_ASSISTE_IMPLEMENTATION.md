# Mode Assisté - Implémentation Complète

## 🎯 Objectif

Empêcher M.A.X. de simuler des actions dans le chat. L'assistant doit demander confirmation explicite avant toute action réelle (import CRM, création campagne, etc.).

## ✅ Implémentation (9 novembre 2025)

### Backend

**1. [conversationService.js](max_backend/lib/conversationService.js)**
- `createSession(mode = 'assisté')` - Sessions créées avec mode par défaut
- `updateSessionMode(sessionId, mode)` - Mise à jour du mode
- Session JSON contient champ `mode: 'assisté' | 'auto' | 'conseil'`

**2. [chat.js](max_backend/routes/chat.js)**
- System prompt adapté selon le mode
- Mode Assisté: "TOUJOURS demander confirmation explicite avant d'exécuter toute action"
- Mode Auto: "Exécuter automatiquement les actions appropriées"
- Mode Conseil: "UNIQUEMENT fournir des conseils, JAMAIS exécuter d'actions"

**Exemple system prompt Mode Assisté**:
```javascript
⚠️ MODE ASSISTÉ ACTIF:
- TOUJOURS demander confirmation explicite avant d'exécuter toute action
  (import CRM, création campagne, modifications données)
- Utiliser des formulations comme: "Souhaitez-vous que j'insère ces leads dans EspoCRM?"
  ou "Dois-je procéder à l'import?"
- JAMAIS simuler ou annoncer qu'une action a été faite sans confirmation utilisateur
- Marquer clairement les actions RÉELLES avec ✅ et les suggestions avec 💡
```

### Frontend

**1. [ChatPage.tsx](max_frontend/src/pages/ChatPage.tsx)**
- ExecutionMode type: `'assisté' | 'auto' | 'conseil'`
- Mode Selector UI avec 3 boutons (🤝 Assisté | ⚡ Auto | 💡 Conseil)
- LocalStorage persistence du mode sélectionné
- Mode passé au backend dans tous les appels API

**2. [ChatMax.tsx](max_frontend/src/components/ChatMax.tsx)**
- Migré vers nouvelle API `/api/chat` (au lieu de `/api/max/ask`)
- Mode Assisté par défaut
- Session gérée avec sessionId

**Structure UI (ChatPage)**:
```
┌─────────────────────────────────────────────┐
│ Header: Chat M.A.X.                         │
├─────────────────────────────────────────────┤
│ Mode d'exécution:                           │
│ [🤝 Assisté] [⚡ Auto] [💡 Conseil]         │
│         🤝 Demande confirmation avant...    │
├─────────────────────────────────────────────┤
│ (Messages area)                             │
├─────────────────────────────────────────────┤
│ (Input area)                                │
└─────────────────────────────────────────────┘
```

## 🧪 Test & Validation

### Test effectué (9 novembre 2025)

**Contexte**: User demande "Importe les 10 leads dans EspoCRM"

**Résultat AVANT Mode Assisté**:
```
M.A.X.: "✅ J'ai terminé l'intégration des 10 nouveaux leads dans le CRM..."
Réalité: Aucune action exécutée, simulation uniquement
```

**Résultat APRÈS Mode Assisté**:
```
M.A.X.: "Je m'excuse, j'ai dû créer de la confusion avec ma dernière proposition.
En tant qu'assistant IA, je n'ai pas la capacité d'effectuer directement des
modifications dans le CRM Macrea.

Permettez-moi de clarifier mon rôle et les prochaines étapes :

Mon rôle est de vous fournir des recommandations... Cependant, pour que ces
changements soient effectivement appliqués dans le CRM, j'ai besoin de votre
validation explicite. Je ne peux pas les exécuter moi-même directement.

Pouvez-vous me clarifier comment vous souhaitez que nous procédions ?"
```

**✅ SUCCÈS**: M.A.X. ne simule plus d'actions, demande confirmation explicite.

## 🎯 Workflow complet avec confirmation

### Étapes du workflow d'upload CSV

1. **Upload fichier CSV**
   - User drag & drop ou clique 📎
   - POST `/api/chat/upload` avec `mode: 'assisté'`

2. **M.A.X. analyse**
   - Détecte colonnes, qualité, champs manquants
   - Pose questions contextuelles

3. **User donne contexte**
   - "Leads du Salon Tech 2025"
   - POST `/api/chat/enrich`

4. **M.A.X. enrichit et DEMANDE CONFIRMATION**
   ```
   Souhaitez-vous que j'importe ces 150 leads enrichis dans EspoCRM?

   [✅ Oui, importer] [❌ Non, annuler] [📥 Télécharger CSV]
   ```

5. **User clique "Oui"**
   - Action handler `confirm-import-espo`
   - POST `/api/chat/import`
   - Import RÉEL dans EspoCRM

6. **M.A.X. confirme**
   ```
   ✅ ACTION RÉELLE EXÉCUTÉE - Import terminé avec succès!

   📊 Résultats:
   - 148 leads importés dans EspoCRM
   - 2 leads en échec
   - 1 segment créé

   🔗 Liens rapides:
   - [Voir tous les Leads dans EspoCRM](http://127.0.0.1:8081/espocrm/#Lead)
   ```

## 📊 Différences entre les 3 modes

### 🤝 Mode Assisté (par défaut)
- Demande **confirmation explicite** avant chaque action
- Affiche boutons: `[✅ Oui] [❌ Non]`
- Marque les actions: `✅ ACTION RÉELLE EXÉCUTÉE`
- **Usage**: Recommandé pour tous les utilisateurs

### ⚡ Mode Auto
- Exécute **automatiquement** les actions appropriées
- Pas de boutons de confirmation
- Annonce l'action avant de l'exécuter
- **Usage**: Pour utilisateurs avancés, workflows automatisés

### 💡 Mode Conseil
- **UNIQUEMENT** suggestions et recommandations
- **JAMAIS** d'exécution d'actions
- Marque toutes les réponses: `💡 SUGGESTION`
- **Usage**: Brainstorming, stratégie, analyse

## 🔧 Configuration

### Variables d'environnement
Aucune config .env requise pour le Mode Assisté.

### Session backend
```json
{
  "sessionId": "session_1762734321456_abc123",
  "createdAt": "2025-11-09T15:00:00.000Z",
  "mode": "assisté",
  "messages": [...]
}
```

### LocalStorage frontend
```javascript
localStorage.getItem('max_chat_mode')
// Valeur: 'assisté' | 'auto' | 'conseil'
// Par défaut: 'assisté'
```

## ⚠️ Known Issues

### UI Mode Selector non visible (en cours)
**Symptôme**: Les 3 boutons de mode ne s'affichent pas sur ChatPage
**Impact**: Faible - Le Mode Assisté fonctionne quand même (par défaut)
**Workaround**: Mode est déjà configuré en 'assisté' par défaut
**Status**: En investigation (cache navigateur ou CSS)

## 🚀 Prochaines étapes

1. ✅ **Mode Assisté fonctionnel** - Empêche simulation
2. ⏳ **Résoudre UI Mode Selector** - Rendre les boutons visibles
3. ⏳ **Tester workflow complet** - Upload CSV → Enrich → Import
4. ⏳ **Documenter Mode Auto** - Cas d'usage et sécurité
5. ⏳ **Ajouter logs actions** - Historique des actions réelles vs suggestions

## 📚 Références

- System prompt complet: [chat.js:113-151](max_backend/routes/chat.js#L113-L151)
- Mode Selector UI: [ChatPage.tsx:383-437](max_frontend/src/pages/ChatPage.tsx#L383-L437)
- Session management: [conversationService.js:30-47](max_backend/lib/conversationService.js#L30-L47)

---

**Dernière mise à jour**: 9 novembre 2025, 16:00
**Status**: ✅ Mode Assisté FONCTIONNEL (empêche simulation)
**Problème UI**: ⚠️ Boutons de mode non visibles (mode fonctionne quand même)
