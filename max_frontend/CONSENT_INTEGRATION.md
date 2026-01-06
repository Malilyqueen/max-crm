# Intégration Système de Consentement

## Vue d'ensemble

Le système de consentement permet à MAX de demander l'autorisation explicite de l'utilisateur avant d'exécuter des opérations sensibles (modification layouts, etc.).

## Architecture

```
1. MAX détecte opération sensible
   ↓
2. Appelle useConsent().requestConsent()
   → Backend crée consentId (expire 5min)
   ↓
3. Affiche <ConsentCard /> dans le chat
   → Countdown timer visible
   → Bouton "Autoriser cette intervention"
   ↓
4. User clique → Appelle useConsent().executeConsent(consentId)
   → Backend valide (one-shot)
   → Exécute script PHP
   → Crée rapport audit JSON
   ↓
5. Log dans ActivityPanel
   → Message temps réel affiché
   ↓
6. Bouton "Voir le rapport"
   → Ouvre <AuditReportModal />
   → Affiche rapport JSON complet
```

## Composants

### 1. ConsentCard

Carte affichée dans le chat pour demander consentement.

**Props:**
- `consentId: string` - ID du consentement
- `operation: string` - Description de l'opération
- `expiresIn: number` - Durée d'expiration en secondes
- `onApprove: (consentId) => Promise<void>` - Callback approbation
- `onViewAudit?: (consentId) => void` - Callback voir rapport

**États:**
- `pending` - En attente (countdown actif)
- `executing` - Exécution en cours
- `success` - Succès (bouton "Voir le rapport")
- `error` - Erreur (message affiché)
- `expired` - Expiré (demander à nouveau)

### 2. AuditReportModal

Modal pour afficher le rapport d'audit complet.

**Props:**
- `consentId: string` - ID du consentement
- `isOpen: boolean` - État ouverture
- `onClose: () => void` - Callback fermeture

**Affiche:**
- Timestamp exécution
- Détails consentement (créé, exécuté, durée)
- Résultat JSON complet
- Métadonnées système

### 3. useConsent Hook

Hook pour gérer les appels API consentement.

**Méthodes:**
```typescript
const {
  loading,
  error,
  requestConsent,    // Créer demande
  executeConsent,    // Exécuter
  getAuditReport,    // Récupérer rapport
  listAuditReports,  // Lister tous
} = useConsent();
```

## Intégration dans ChatPage

### Étape 1: Import

```typescript
import { ConsentCard } from '../components/chat/ConsentCard';
import { AuditReportModal } from '../components/chat/AuditReportModal';
import { useConsent } from '../hooks/useConsent';
```

### Étape 2: State

```typescript
const { requestConsent, executeConsent } = useConsent();
const [currentConsent, setCurrentConsent] = useState<any>(null);
const [auditModalOpen, setAuditModalOpen] = useState(false);
const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
```

### Étape 3: Demander consentement (quand MAX détecte besoin)

```typescript
const handleRequestLayoutModification = async () => {
  const consent = await requestConsent({
    type: 'layout_modification',
    description: 'Ajouter le champ "secteurActivite" aux layouts Lead',
    details: {
      entity: 'Lead',
      fieldName: 'secteurActivite',
      layoutTypes: ['detail', 'detailSmall', 'list'],
    },
  });

  setCurrentConsent(consent);

  // Log dans ActivityPanel
  addActivity({
    icon: 'target',
    message: 'Demande de consentement créée',
  });
};
```

### Étape 4: Gérer approbation

```typescript
const handleApproveConsent = async (consentId: string) => {
  try {
    addActivity({ icon: 'refresh', message: 'Exécution...' });

    const result = await executeConsent(consentId);

    addActivity({
      icon: 'edit',
      message: `Champ ajouté à ${result.result.layoutsModified} layouts`,
    });

    setCurrentConsent(null);
  } catch (error) {
    addActivity({ icon: 'zap', message: `Erreur: ${error.message}` });
    throw error;
  }
};
```

### Étape 5: Afficher dans le chat

```typescript
{currentConsent && (
  <ConsentCard
    consentId={currentConsent.consentId}
    operation={currentConsent.operation}
    expiresIn={currentConsent.expiresIn}
    onApprove={handleApproveConsent}
    onViewAudit={(id) => {
      setSelectedAuditId(id);
      setAuditModalOpen(true);
    }}
  />
)}

{selectedAuditId && (
  <AuditReportModal
    consentId={selectedAuditId}
    isOpen={auditModalOpen}
    onClose={() => setAuditModalOpen(false)}
  />
)}
```

## Gestion des états

### Countdown

Le countdown est automatique dans `ConsentCard`. Il:
- Démarre à `expiresIn` secondes
- Décrémente chaque seconde
- Passe à `expired` quand atteint 0
- Affiche "Expire dans: 4:32"

### One-shot

Le backend valide que:
- ConsentId existe
- N'a pas expiré (< 5min)
- N'a pas déjà été utilisé
- Puis le consomme (impossible de réutiliser)

### Audit persisté

Chaque exécution crée un fichier JSON:
```
max_backend/audit_reports/consent_1735226400_a1b2c3.json
```

Contenu:
```json
{
  "consentId": "consent_1735226400_a1b2c3",
  "timestamp": "2025-12-26T16:00:00Z",
  "consent": {
    "operation": { ... },
    "createdAt": "2025-12-26T15:59:30Z",
    "usedAt": "2025-12-26T16:00:00Z",
    "duration": 30000
  },
  "result": {
    "success": true,
    "layoutsModified": 3,
    ...
  },
  "metadata": {
    "nodeVersion": "v18.17.0",
    "platform": "win32",
    "pid": 12345
  }
}
```

## API Endpoints

### POST /api/consent/request

Créer demande consentement.

**Body:**
```json
{
  "type": "layout_modification",
  "description": "Ajouter champ X aux layouts Y",
  "details": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "consent": {
    "consentId": "consent_xxx",
    "operation": "Ajouter champ...",
    "expiresIn": 300
  }
}
```

### POST /api/consent/execute/:consentId

Exécuter opération consentie.

**Response:**
```json
{
  "success": true,
  "result": { ... },
  "audit": {
    "consentId": "consent_xxx",
    "reportPath": "/path/to/report.json"
  }
}
```

### GET /api/consent/audit/:consentId

Récupérer rapport audit.

**Response:**
```json
{
  "success": true,
  "report": { ... }
}
```

### GET /api/consent/audits?limit=50

Lister tous les rapports.

## Sécurité

1. **Expiration 5min** - Force revalidation si trop lent
2. **One-shot** - Impossible de réutiliser un consentId
3. **Audit complet** - Toute exécution tracée
4. **Volatile storage** - ConsentIds en mémoire (pas de DB)
5. **Validation backend** - Frontend ne peut pas bypasser

## Testing

Voir `src/examples/ConsentCardExample.tsx` pour exemple complet.

## Notes importantes

- **Ne PAS** afficher ConsentCard pour opérations normales
- **Uniquement** pour opérations sensibles (layouts, config, etc.)
- **Toujours** logger dans ActivityPanel
- **Toujours** proposer "Voir le rapport" après succès
- **Gérer** cas expiré (redemander opération)
