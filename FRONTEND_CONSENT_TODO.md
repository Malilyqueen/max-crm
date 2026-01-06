# 🎨 Frontend Consent Gate - Tasks Restantes

**Date:** 2025-12-31
**Statut Backend:** ✅ DEPLOYED (self-correction + execute direct)
**Statut Frontend:** 🚧 EN COURS

---

## ✅ Fait (Backend)

1. ✅ Détection 412 dans chat.js
2. ✅ Self-correction automatique (createConsentRequest)
3. ✅ Réponse avec `pendingConsent` dans /api/chat/send
4. ✅ Endpoint `/api/consent/execute/:consentId` qui exécute directement
5. ✅ Export `executeToolCall` depuis chat.js
6. ✅ Audit automatique après exécution

## ✅ Fait (Frontend)

1. ✅ Détection `pendingConsent` dans useChatStore (ligne 216)
2. ✅ Injection message type `consent` (ligne 229-239)
3. ✅ Hook `useConsent` avec `executeConsent()` existe déjà
4. ✅ ConsentCard component existe
5. ✅ AuditReportModal existe

---

## 🚧 Tâches Restantes Frontend

### 1. Modifier ConsentCard.tsx (PRIORITÉ 1)

**Fichier:** `max_frontend/src/components/chat/ConsentCard.tsx`

**Changements requis:**

```typescript
// AVANT (ligne 11-17):
interface ConsentCardProps {
  consentId: string;
  operation: string; // ❌ Simple string
  expiresIn: number;
  onApprove: (consentId: string) => Promise<void>;
  onViewAudit?: (consentId: string) => void;
}

// APRÈS:
interface Operation {
  type: string;
  description: string;
  details: Record<string, any>;
}

interface ConsentCardProps {
  consentId: string;
  operation: Operation; // ✅ Structure complète
  expiresIn: number;
  sessionId?: string; // ✅ Pour POST body
  onExecuteComplete?: (result: any) => void; // ✅ Callback avec résultat
  onViewAudit?: (consentId: string) => void;
}
```

**Modifier handleApprove (ligne 50-62):**

```typescript
const handleApprove = async () => {
  setStatus('executing');
  setErrorMessage(null);

  try {
    // ✅ POST direct à /api/consent/execute/:consentId
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/consent/execute/${consentId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': 'macrea-admin'
        },
        body: JSON.stringify({ sessionId }) // ✅ Inclure sessionId
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Échec de l\'exécution');
    }

    setStatus('success');
    setHasAuditReport(true);
    setResultMessage(data.result?.message || 'Opération exécutée');

    // Callback avec résultat complet
    if (onExecuteComplete) {
      onExecuteComplete(data);
    }
  } catch (error: any) {
    setStatus('error');
    setErrorMessage(error.message);
  }
};
```

**Afficher operation.description (ligne 127):**

```tsx
<p className="text-sm" style={{ color: colors.textSecondary }}>
  {operation.description}
</p>
```

**Ajouter détails techniques (collapsible):**

```tsx
{/* Operation Details (optionnel, pour debug) */}
<div className="mb-3">
  <button onClick={() => setShowDetails(!showDetails)} className="text-xs">
    {showDetails ? 'Masquer' : 'Voir'} détails techniques
  </button>
  {showDetails && (
    <pre className="mt-2 p-2 text-xs bg-gray-800 rounded overflow-x-auto">
      {JSON.stringify(operation.details, null, 2)}
    </pre>
  )}
</div>
```

---

### 2. Brancher ConsentCard dans MessageList.tsx (PRIORITÉ 2)

**Fichier:** `max_frontend/src/components/chat/MessageList.tsx`

**Ajouter détection message type `consent`:**

```tsx
import { ConsentCard } from './ConsentCard';

// Dans le map des messages:
messages.map((msg) => {
  // Message consent (nouveau)
  if (msg.type === 'consent' || msg.role === 'consent') {
    return (
      <ConsentCard
        key={msg.timestamp}
        consentId={msg.consentId}
        operation={msg.operation}
        expiresIn={msg.expiresIn}
        sessionId={sessionId} // ✅ Passer sessionId depuis props
        onExecuteComplete={(result) => {
          // ✅ Injecter message de succès dans le chat
          addMessage('assistant', result.result?.message || 'Opération réussie');
        }}
        onViewAudit={(id) => {
          // ✅ Ouvrir AuditReportModal
          setAuditModalConsentId(id);
          setIsAuditModalOpen(true);
        }}
      />
    );
  }

  // Message normal (existant)
  return <Message key={msg.timestamp} {...msg} />;
})
```

**Ajouter état pour AuditReportModal:**

```tsx
const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
const [auditModalConsentId, setAuditModalConsentId] = useState<string | null>(null);

// Après la liste des messages:
{isAuditModalOpen && auditModalConsentId && (
  <AuditReportModal
    consentId={auditModalConsentId}
    onClose={() => {
      setIsAuditModalOpen(false);
      setAuditModalConsentId(null);
    }}
  />
)}
```

---

### 3. Ajouter sessionId aux props de MessageList (PRIORITÉ 3)

**Fichier:** `max_frontend/src/pages/ChatPage.tsx`

**Passer sessionId à MessageList:**

```tsx
<MessageList
  messages={messages}
  sessionId={sessionId} // ✅ Ajouter cette prop
/>
```

---

## 🧪 Test E2E Rapide

### Setup Frontend

```bash
cd max_frontend
npm install # Si pas déjà fait
npm run dev
```

### Test 1: Détecter pendingConsent

1. Ouvrir `http://localhost:5173/chat`
2. Envoyer: `"Peux-tu créer un champ testFeedback de type text sur Lead ?"`
3. **Attendu dans console:**
   ```
   [CHAT_STORE] 🚨 Consent requis détecté: { consentId: "consent_xxx", operation: {...}, ... }
   ```
4. **Attendu dans UI:**
   - Message assistant: "✋ Cette opération nécessite votre autorisation..."
   - **ConsentCard s'affiche** avec operation.description

### Test 2: Approuver et exécuter

1. Cliquer bouton **"Autoriser cette intervention"**
2. **Attendu:**
   - Status change: pending → executing → success
   - Message succès: "✅ Champ custom créé..."
   - Bouton "Voir le rapport d'audit" apparaît

### Test 3: Vérifier dans EspoCRM

1. Ouvrir `http://51.159.170.20/`
2. Admin → Entity Manager → Lead → Fields
3. Vérifier champ "testFeedback" existe

---

## 📦 Fichiers à Modifier

1. ✅ `max_frontend/src/stores/useChatStore.ts` (FAIT - ligne 216-239)
2. 🚧 `max_frontend/src/components/chat/ConsentCard.tsx` (À MODIFIER)
3. 🚧 `max_frontend/src/components/chat/MessageList.tsx` (À MODIFIER)
4. 🚧 `max_frontend/src/pages/ChatPage.tsx` (prop sessionId)

---

## 🎬 Ordre d'Exécution Suggéré

1. **Modifier ConsentCard.tsx** (10 min)
   - Props interface
   - handleApprove avec POST direct
   - Affichage operation.description

2. **Modifier MessageList.tsx** (5 min)
   - Détecter msg.type === 'consent'
   - Render ConsentCard
   - Callbacks onExecuteComplete + onViewAudit

3. **Tester** (5 min)
   - Lancer frontend
   - Conversation → consent → approve
   - Vérifier EspoCRM

**Total estimé: 20 minutes** pour branchement complet

---

## 💡 Alternative Rapide (Si Urgence)

Si tu veux tester **MAINTENANT sans modifier le frontend**:

### Test curl E2E complet:

```bash
# 1. Déclencher consent via conversation
curl -X POST https://max-api.studiomacrea.cloud/api/chat/send \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea-admin" \
  -d '{
    "message": "Crée un champ testCurl de type text sur Lead",
    "sessionId": "test-consent-curl"
  }'

# Copier le consentId depuis response.pendingConsent.consentId

# 2. Exécuter avec consent
CONSENT_ID="consent_xxx" # Remplacer

curl -X POST https://max-api.studiomacrea.cloud/api/consent/execute/$CONSENT_ID \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea-admin" \
  -d '{
    "sessionId": "test-consent-curl"
  }'

# Attendu:
# {
#   "success": true,
#   "result": {
#     "success": true,
#     "message": "✅ Champ custom \"testCurl\" créé..."
#   },
#   "audit": {
#     "consentId": "consent_xxx",
#     "reportPath": ".../consent_xxx.json"
#   }
# }

# 3. Vérifier EspoCRM
# → Lead → Fields → "testCurl" existe ✅
```

---

**Statut:** Backend ✅ READY | Frontend 🚧 20min de branchement UI

**Prochaine étape:** Modifier les 3 fichiers frontend listés ci-dessus puis tester E2E complet.
