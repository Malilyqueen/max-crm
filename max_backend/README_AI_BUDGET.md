# Système de Budget IA - Token Tracking & Coûts

## Vue d'ensemble

Le système de budget IA permet de:
- **Tracker tous les appels** à Claude Haiku en temps réel
- **Calculer les coûts** automatiquement (configurable via .env)
- **Imposer un cap strict** de tokens (10M par défaut, configurable)
- **Estimer les tâches restantes** via moyenne mobile
- **Historiser tous les appels** dans des fichiers JSONL journaliers
- **Afficher un widget** temps réel dans l'interface

## Architecture

```
max_backend/
├── lib/
│   ├── tokenMeter.js      # Compteur de tokens, coûts, budget
│   ├── aiClient.js         # Wrapper Anthropic (Haiku) + OpenAI commenté
│   └── maxCreaService.js   # Service Créa utilisant aiClient
├── routes/
│   └── ai.js               # Routes /api/ai/* (usage, history, test-call, reset)
├── billing/
│   ├── state.json          # État courant (rechargé au démarrage)
│   └── anthropic-usage-YYYY-MM-DD.jsonl  # Logs journaliers
└── .env                    # Configuration (modèle, coûts, budget)

max_frontend/
└── src/
    └── components/
        └── TokenBudget.tsx # Widget affichant usage/coûts temps réel
```

## Configuration (.env)

```bash
# Modèle Anthropic
ANTHROPIC_API_KEY=sk-ant-***
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Coûts USD par million de tokens
COST_INPUT_PER_MILLION=0.25
COST_OUTPUT_PER_MILLION=1.25

# Budget total (en tokens)
TOKENS_BUDGET_TOTAL=10000000

# Reset autorisé (dev only)
ALLOW_RESET=true
```

## API Endpoints

### GET /api/ai/health
Vérifier que le système IA est opérationnel.

**Réponse:**
```json
{
  "ok": true,
  "service": "AI Routes",
  "model": "claude-3-haiku-20240307",
  "budget_enabled": true,
  "reset_allowed": true
}
```

### GET /api/ai/usage
Obtenir l'usage actuel, le coût et l'estimation de tâches restantes.

**Réponse:**
```json
{
  "ok": true,
  "model": "claude-3-haiku-20240307",
  "budget_total": 10000000,
  "tokens": {
    "input": 14,
    "output": 4,
    "total": 18
  },
  "calls_count": 1,
  "avg_tokens_per_task": 18,
  "tasks_left": 555554,
  "cost_usd": 0.000008,
  "cost_config": {
    "input_per_million": 0.25,
    "output_per_million": 1.25
  }
}
```

### POST /api/ai/test-call
Effectuer un appel de test simple (réponse: "OK").

**Réponse:**
```json
{
  "ok": true,
  "text": "OK",
  "usage": {
    "input_tokens": 14,
    "output_tokens": 4,
    "total_tokens": 18
  },
  "snapshot": { ... }
}
```

**En cas de budget dépassé (429):**
```json
{
  "ok": false,
  "error": "Budget tokens dépassé",
  "code": "BUDGET_EXCEEDED",
  "snapshot": { ... }
}
```

### GET /api/ai/usage/history?date=YYYY-MM-DD
Récupérer l'historique des appels d'une date donnée.

**Réponse:**
```json
{
  "ok": true,
  "date": "2025-11-09",
  "count": 1,
  "entries": [
    {
      "ts": "2025-11-09T09:33:59.679Z",
      "model": "claude-3-haiku-20240307",
      "input": 14,
      "output": 4,
      "total": 18,
      "costDelta": 0.000008
    }
  ]
}
```

### POST /api/ai/reset
Réinitialiser les compteurs (uniquement si `ALLOW_RESET=true`).

**Réponse:**
```json
{
  "ok": true,
  "message": "Compteurs réinitialisés",
  "snapshot": { ... }
}
```

## Utilisation dans le code

### Appeler Claude Haiku

```javascript
import { callHaiku } from './lib/aiClient.js';

try {
  const result = await callHaiku({
    messages: [
      { role: 'user', content: 'Votre prompt ici' }
    ],
    max_tokens: 1024,
    temperature: 0.7
  });

  console.log('Réponse:', result.text);
  console.log('Usage:', result.usage); // { input_tokens, output_tokens, total_tokens }
} catch (error) {
  if (error.code === 'BUDGET_EXCEEDED') {
    console.error('Budget tokens dépassé!');
  }
}
```

### Obtenir l'état du budget

```javascript
import { snapshot } from './lib/tokenMeter.js';

const state = snapshot();
console.log(`Tokens utilisés: ${state.tokens.total} / ${state.budget_total}`);
console.log(`Coût actuel: $${state.cost_usd}`);
console.log(`Tâches restantes estimées: ${state.tasks_left}`);
```

## Widget Frontend

Le composant `TokenBudget` affiche en temps réel:
- **Barre de progression** (couleur adaptative selon % consommé)
- **Modèle actif** (badge)
- **Tokens** utilisés / budget total
- **Coût** en USD (~)
- **Tâches restantes** (si disponible)
- **Alerte** si cap atteint

Polling automatique toutes les 10 secondes.

## Fichiers de billing

### state.json
```json
{
  "budgetTotal": 10000000,
  "inputTotal": 14,
  "outputTotal": 4,
  "total": 18,
  "calls": 1,
  "avgTokensPerTask": 18,
  "costUsd": 0.000008
}
```

### anthropic-usage-YYYY-MM-DD.jsonl
Une ligne par appel:
```json
{"ts":"2025-11-09T09:33:59.679Z","model":"claude-3-haiku-20240307","input":14,"output":4,"total":18,"costDelta":0.000008}
```

## Sécurité & Limites

- **Cap strict**: Si le budget est atteint, tous les appels retournent `429 BUDGET_EXCEEDED`
- **Coûts configurables**: Mise à jour facile des prix via .env
- **Logs horodatés**: Audit complet de tous les appels
- **Reset protégé**: Nécessite `ALLOW_RESET=true` (désactiver en prod)

## Roadmap OpenAI

Le code OpenAI est **déjà présent en commentaires** dans `aiClient.js`. Pour l'activer:

1. Décommenter le bloc OpenAI dans `aiClient.js`
2. Ajouter `OPENAI_API_KEY` et `OPENAI_MODEL` dans `.env`
3. Créer un toggle `AI_PROVIDER=openai|anthropic`
4. Adapter les appels selon le provider choisi

## Tests

```bash
# Tester le système
curl http://127.0.0.1:3005/api/ai/health
curl http://127.0.0.1:3005/api/ai/usage
curl -X POST http://127.0.0.1:3005/api/ai/test-call

# Vérifier les logs
cat billing/anthropic-usage-$(date +%Y-%m-%d).jsonl

# Reset (si ALLOW_RESET=true)
curl -X POST http://127.0.0.1:3005/api/ai/reset
```

## Coûts Haiku (référence)

**Claude 3 Haiku** (avril 2024):
- Input: $0.25 / million tokens
- Output: $1.25 / million tokens

**Budget 10M tokens** ≈ **$2.50 - $12.50 USD** selon ratio input/output.

---

**Développé pour M.A.X. - Copilote IA CRM**
