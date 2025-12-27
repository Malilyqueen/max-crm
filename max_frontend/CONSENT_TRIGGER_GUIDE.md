# Guide - Comment déclencher un message de consentement

## Architecture Implémentée

✅ **Backend**: API consent complète (`/api/consent/*`)
✅ **Frontend**: ConsentCard, useConsent hook, MessageList intégré
✅ **ChatPage**: Handlers pour approve/view audit
✅ **Types**: ChatMessage étendu avec `type: 'consent'`

## Comment déclencher un consentement

### Option 1: Depuis le Backend MAX (Recommandé)

Le backend MAX doit détecter qu'une opération sensible est nécessaire et retourner un flag spécial dans la réponse `/api/chat`:

```typescript
// Backend response example
{
  "ok": true,
  "sessionId": "session_xxx",
  "response": "Je peux ajouter ce champ aux layouts Lead. Voulez-vous autoriser cette intervention?",
  "requiresConsent": true,  // 🔑 Flag pour déclencher le consentement
  "consentOperation": {
    "type": "layout_modification",
    "description": "Ajouter le champ secteurActivite aux layouts Lead",
    "details": {
      "entity": "Lead",
      "fieldName": "secteurActivite",
      "layoutTypes": ["detail", "detailSmall", "list"]
    }
  }
}
```

Ensuite, **modifier `useChatStore.ts`** pour détecter ce flag et créer le message de consentement:

```typescript
// Dans useChatStore.ts, fonction sendMessage()

const response = await apiClient.post('/chat', {
  sessionId: currentState.sessionId,
  message,
  mode: modeMap[currentState.mode]
});

// Ajouter le message assistant
get().addMessage('assistant', response.answer || response.response);

// 🔑 DÉTECTER SI CONSENTEMENT REQUIS
if (response.requiresConsent && response.consentOperation) {
  // Créer le consentId
  const { requestConsent } = useConsent.getState();
  const consent = await requestConsent({
    type: response.consentOperation.type,
    description: response.consentOperation.description,
    details: response.consentOperation.details
  });

  // Ajouter un message de type "consent" au chat
  set((state) => ({
    messages: [
      ...state.messages,
      {
        role: 'system',
        content: response.consentOperation.description,
        timestamp: Date.now(),
        type: 'consent',
        consentId: consent.consentId,
        operation: response.consentOperation,
        consentStatus: 'pending'
      }
    ]
  }));

  // Logger dans ActivityPanel
  // (via le polling existant dans ChatPage)
}
```

### Option 2: Trigger Manuel pour Tests

Pour tester immédiatement sans modifier le backend, ajouter un bouton de test dans ChatPage:

```typescript
// Dans ChatPage.tsx, ajouter une fonction de test

const handleTestConsent = async () => {
  try {
    // Créer un consentement de test
    const consent = await requestConsent({
      type: 'layout_modification',
      description: 'TEST: Ajouter le champ testManuel aux layouts Lead',
      details: {
        entity: 'Lead',
        fieldName: 'testManuel',
        layoutTypes: ['detail', 'list']
      }
    });

    // Log dans ActivityPanel
    addActivity('alert-circle', `CONSENT_REQUESTED: ${consent.consentId}`);

    // Ajouter directement au store de messages
    const testMessage: ChatMessage = {
      role: 'system',
      content: 'Opération sensible détectée',
      timestamp: Date.now(),
      type: 'consent',
      consentId: consent.consentId,
      operation: {
        type: 'layout_modification',
        description: 'TEST: Ajouter le champ testManuel aux layouts Lead',
        details: {
          entity: 'Lead',
          fieldName: 'testManuel',
          layoutTypes: ['detail', 'list']
        }
      },
      consentStatus: 'pending'
    };

    // Utiliser addMessage du store (si disponible)
    // Ou forcer via setMessages si besoin

  } catch (error) {
    console.error('Test consent failed:', error);
  }
};

// Ajouter ce bouton dans le header pour tester:
<button onClick={handleTestConsent}>🧪 Test Consent</button>
```

## Flux Complet

```
User: "Ajoute le champ secteurActivite aux layouts Lead"
  ↓
Backend MAX détecte → Opération sensible
  ↓
Response: { requiresConsent: true, consentOperation: {...} }
  ↓
Frontend useChatStore:
  1. Appelle requestConsent() → Backend crée consentId
  2. Ajoute message type='consent' au chat
  3. Log CONSENT_REQUESTED dans ActivityPanel
  ↓
MessageList détecte message.type === 'consent'
  ↓
Affiche <ConsentCard> avec countdown
  ↓
User clique "Autoriser cette intervention"
  ↓
ChatPage.handleApproveConsent(consentId):
  1. Log CONSENT_GRANTED
  2. Appelle executeConsent(consentId)
  3. Backend exécute SSH → Docker → PHP
  4. Log EXECUTION_SUCCESS + AUDIT_AVAILABLE
  ↓
ConsentCard passe en status='success'
  ↓
Bouton "Voir le rapport" disponible
```

## Logging ActivityPanel

Le système log automatiquement:
- `CONSENT_REQUESTED`: Quand consent créé
- `CONSENT_GRANTED`: User clique "Autoriser"
- `EXECUTION_STARTED`: Début exécution
- `EXECUTION_SUCCESS` ou `EXECUTION_FAILED`: Résultat
- `AUDIT_AVAILABLE`: Rapport JSON prêt

## Prochaines Étapes

1. **Backend MAX**: Ajouter la logique de détection d'opérations sensibles
2. **useChatStore**: Modifier `sendMessage()` pour détecter `requiresConsent`
3. **Test**: Utiliser le bouton de test manuel pour valider l'UX
4. **Production**: Activer la détection backend réelle

## Fichiers Modifiés

- ✅ `max_frontend/src/types/chat.ts` - Types étendus
- ✅ `max_frontend/src/pages/ChatPage.tsx` - Handlers consent
- ✅ `max_frontend/src/components/chat/MessageList.tsx` - Rendu ConsentCard
- ⏳ `max_frontend/src/stores/useChatStore.ts` - À modifier pour détecter requiresConsent

## Backend API Déjà Prête

```
POST /api/consent/request
POST /api/consent/execute/:consentId
GET  /api/consent/audit/:consentId
GET  /api/consent/audits
```

Tout est en place! Il suffit maintenant de brancher la détection dans `useChatStore.ts` ou d'utiliser le bouton de test.
