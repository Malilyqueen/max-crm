# Intégration M.A.X. Admin Opérateur
## Transformation : Assistant → Admin qui exécute

---

## 🎯 Objectif

Transformer M.A.X. d'un "assistant qui propose des options" en un **admin opérateur qui AGIT**.

### Avant
```
User: "Supprime les leads vides"
M.A.X.: "Je peux vous aider avec :
  - Enrichir les données
  - Créer des workflows
  - Segmenter les leads
  Que souhaitez-vous faire ?"
```

### Après
```
User: "Supprime les leads vides"
M.A.X.: "J'ai détecté 4 fiches vides (créées il y a 2h).

Leads à supprimer :
• Martin (pas d'email, pas d'entreprise)
• Dupont (pas d'email, pas d'entreprise)
• [...]

Je supprime ces 4 fiches ?"

[🗑️ Supprimer] [🚫 Annuler]
```

---

## 📦 Fichiers créés

### 1. Modules techniques (3 fichiers)
- **lib/sessionContext.js** - Détection contexte (import/update/query)
- **lib/leadUpsert.js** - Logique upsert avec garde-fous
- **lib/fieldMapping.js** - Mapping propre (fini tags dans description)

### 2. Prompts & Directives
- **prompts/max_system_prompt_v2.txt** - Nouveau prompt system (admin opérateur)
- **CORRECTIF_LOGIQUE_MAX.md** - Guide technique des correctifs
- **INTEGRATION_ADMIN_OPERATOR.md** - Ce document

---

## 🔧 Modifications à faire dans `chat.js`

### Étape 1 : Imports

```javascript
// En haut de routes/chat.js
import { detectOperationMode, storeLeadContext, getActiveLeadContext, clearImportContext } from '../lib/sessionContext.js';
import { batchUpsertLeads, upsertLead, validateMinimalLead, findExistingLead } from '../lib/leadUpsert.js';
import { formatEnrichedLead, generateUpdateDiff, FIELD_MAPPING } from '../lib/fieldMapping.js';
import fs from 'fs/promises';
import path from 'path';
```

### Étape 2 : Charger nouveau prompt system

```javascript
// Remplacer la lecture du prompt actuel
const MAX_SYSTEM_PROMPT = await fs.readFile(
  path.join(process.cwd(), 'prompts', 'max_system_prompt_v2.txt'),
  'utf-8'
);
```

### Étape 3 : Nouveaux Tools pour M.A.X.

Remplacer les tools actuels par :

```javascript
const tools = [
  {
    type: "function",
    function: {
      name: "query_espo_leads",
      description: "Liste ou cherche des leads dans EspoCRM avec filtres précis. Retourne liste avec IDs + total count. Utilise pour 'montre les X derniers leads', 'liste les leads avant injection', etc.",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description: "Filtres EspoCRM (ex: {createdAt: {$gte: '2025-01-01'}})"
          },
          limit: {
            type: "number",
            description: "Nombre max de résultats",
            default: 10
          },
          sortBy: {
            type: "string",
            description: "Champ de tri (ex: 'createdAt', 'name')",
            default: "createdAt"
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_leads_in_espo",
      description: "Met à jour des leads existants. Par défaut UPDATE ONLY (0 création). Upsert intelligent avec match email/phone/website. Retourne rapport détaillé.",
      parameters: {
        type: "object",
        properties: {
          leadIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs des leads à mettre à jour (depuis query_espo_leads ou contexte mémorisé)"
          },
          updates: {
            type: "object",
            description: "Champs à modifier (ex: {industry: 'Cosmétique', segments: ['Tag1', 'Tag2']})"
          },
          mode: {
            type: "string",
            enum: ["update_only", "upsert_with_confirmation", "force_create"],
            description: "update_only (défaut, 0 création), upsert_with_confirmation (demande avant créer), force_create (crée sans demander)",
            default: "update_only"
          }
        },
        required: ["updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_leads_from_espo",
      description: "Supprime des leads par IDs. Mode correctif (cleanup, purge). Demande confirmation avant exécution.",
      parameters: {
        type: "object",
        properties: {
          leadIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs des leads à supprimer"
          },
          confirm: {
            type: "boolean",
            description: "Confirmation utilisateur (true = exécuter suppression)",
            default: false
          }
        },
        required: ["leadIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_lead_diff",
      description: "Génère prévisualisation avant/après pour un lead. Affiche diff des champs modifiés. À appeler AVANT update_leads_in_espo pour montrer à l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "ID du lead"
          },
          proposedUpdates: {
            type: "object",
            description: "Modifications proposées"
          }
        },
        required: ["leadId", "proposedUpdates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_csv_file",
      description: "Analyse fichier CSV uploadé. Détecte si modèle/exemple (placeholders) ou données réelles. Retourne analyse structure.",
      parameters: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "ID de session"
          }
        },
        required: ["sessionId"]
      }
    }
  }
];
```

### Étape 4 : Handlers des nouveaux Tools

```javascript
// Handler query_espo_leads
if (toolCall.function.name === 'query_espo_leads') {
  const args = JSON.parse(toolCall.function.arguments);
  const { filters = {}, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = args;

  try {
    // Construire query EspoCRM
    const where = [];

    // Filtres date
    if (filters.createdAt) {
      if (filters.createdAt.$gte) {
        where.push({
          type: 'after',
          attribute: 'createdAt',
          value: filters.createdAt.$gte
        });
      }
    }

    // Filtre vides (pour mode correctif)
    if (filters.isEmpty) {
      where.push({
        type: 'or',
        value: [
          { type: 'isNull', attribute: 'emailAddress' },
          { type: 'equals', attribute: 'emailAddress', value: '' }
        ]
      });
      where.push({
        type: 'or',
        value: [
          { type: 'isNull', attribute: 'firstName' },
          { type: 'equals', attribute: 'firstName', value: '' }
        ]
      });
    }

    const response = await espoRequest('/Lead', {
      method: 'GET',
      params: {
        where,
        maxSize: limit,
        orderBy: sortBy,
        order: sortOrder
      }
    });

    // Mémoriser IDs dans session
    const session = loadConversation(sessionId);
    if (response.list && response.list.length > 0) {
      const leadIds = response.list.map(l => l.id);
      storeLeadContext(session, leadIds);
      saveConversation(sessionId, session);
    }

    // Formatter résultat
    const leads = response.list.map(lead => ({
      id: lead.id,
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      company: lead.accountName || 'N/A',
      email: lead.emailAddress || 'N/A',
      createdAt: lead.createdAt
    }));

    return JSON.stringify({
      leads,
      total: response.total,
      count: leads.length
    });

  } catch (error) {
    console.error('[query_espo_leads] Erreur:', error);
    return JSON.stringify({ error: error.message });
  }
}

// Handler update_leads_in_espo
if (toolCall.function.name === 'update_leads_in_espo') {
  const args = JSON.parse(toolCall.function.arguments);
  const { leadIds, updates, mode = 'update_only' } = args;

  try {
    const session = loadConversation(sessionId);

    // Si pas d'IDs fournis, utiliser contexte mémorisé
    let targetIds = leadIds;
    if (!targetIds || targetIds.length === 0) {
      targetIds = getActiveLeadContext(session);

      if (targetIds.length === 0) {
        return JSON.stringify({
          error: 'Aucun lead ciblé. Utilisez query_espo_leads d\'abord.'
        });
      }
    }

    // Charger leads depuis EspoCRM
    const leads = [];
    for (const id of targetIds) {
      const lead = await espoRequest(`/Lead/${id}`);
      leads.push(lead);
    }

    // Formatter updates (mapping propre)
    const formattedUpdates = formatEnrichedLead(updates);

    // Appliquer updates à chaque lead
    const leadsToUpsert = leads.map(lead => ({
      ...lead,
      ...formattedUpdates
    }));

    // Upsert avec rapport
    const forceCreate = mode === 'force_create';
    const report = await batchUpsertLeads(leadsToUpsert, { forceCreate });

    return JSON.stringify(report);

  } catch (error) {
    console.error('[update_leads_in_espo] Erreur:', error);
    return JSON.stringify({ error: error.message });
  }
}

// Handler delete_leads_from_espo
if (toolCall.function.name === 'delete_leads_from_espo') {
  const args = JSON.parse(toolCall.function.arguments);
  const { leadIds, confirm = false } = args;

  if (!confirm) {
    return JSON.stringify({
      needsConfirmation: true,
      message: 'Confirmation requise avant suppression'
    });
  }

  try {
    const deleted = [];
    const errors = [];

    for (const id of leadIds) {
      try {
        await espoRequest(`/Lead/${id}`, { method: 'DELETE' });
        deleted.push(id);
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    return JSON.stringify({
      deleted: deleted.length,
      errors: errors.length,
      details: { deleted, errors }
    });

  } catch (error) {
    console.error('[delete_leads_from_espo] Erreur:', error);
    return JSON.stringify({ error: error.message });
  }
}

// Handler get_lead_diff
if (toolCall.function.name === 'get_lead_diff') {
  const args = JSON.parse(toolCall.function.arguments);
  const { leadId, proposedUpdates } = args;

  try {
    const existingLead = await espoRequest(`/Lead/${leadId}`);
    const diff = generateUpdateDiff(existingLead, proposedUpdates);

    return JSON.stringify(diff);

  } catch (error) {
    console.error('[get_lead_diff] Erreur:', error);
    return JSON.stringify({ error: error.message });
  }
}

// Handler analyze_csv_file
if (toolCall.function.name === 'analyze_csv_file') {
  const args = JSON.parse(toolCall.function.arguments);
  const { sessionId: sid } = args;

  try {
    const session = loadConversation(sid);

    if (!session || !session.uploadedFile) {
      return JSON.stringify({ error: 'Aucun fichier uploadé' });
    }

    const analysis = session.uploadedFile.analysis;

    // Détecter si fichier modèle
    const isTemplate = analysis.data.some(row => {
      const values = Object.values(row);
      return values.some(v =>
        typeof v === 'string' && (
          v.includes('exemple') ||
          v.includes('placeholder') ||
          v.includes('Prénom') ||
          v.includes('@example.com')
        )
      );
    });

    return JSON.stringify({
      isTemplate,
      rowCount: analysis.summary.rowCount,
      columnCount: analysis.summary.columnCount,
      columns: analysis.columns.map(c => c.name)
    });

  } catch (error) {
    console.error('[analyze_csv_file] Erreur:', error);
    return JSON.stringify({ error: error.message });
  }
}
```

---

## 🎯 Comportements attendus après intégration

### Scénario 1 : Suppression ciblée (Mode Correctif)

```
User: "Supprime les 4 leads vides que tu as importés"

M.A.X. appelle :
1. query_espo_leads({ filters: { isEmpty: true, createdAt: { $gte: 'today' } }, limit: 10 })
   → Trouve 4 leads

2. Affiche récap :
   "J'ai détecté 4 fiches vides (créées il y a 2h) :
    • Martin (pas d'email, pas d'entreprise)
    • Dupont (pas d'email, pas d'entreprise)
    • [...]

    Je supprime ces 4 fiches ?"

3. User clique [🗑️ Supprimer]
   → Frontend appelle /api/chat/action avec action: 'confirm-delete'

4. M.A.X. appelle delete_leads_from_espo({ leadIds: [...], confirm: true })

5. Rapport :
   "✅ Suppression effectuée : 4 leads supprimés, 0 erreurs
    🔗 Voir dans le CRM"
```

### Scénario 2 : Lister avant injection

```
User: "Donne la liste des 5 derniers leads avant cette injection"

M.A.X. appelle :
1. query_espo_leads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })

2. Affiche :
   "Les 5 derniers leads créés :

    1. Jean Dupont | Directeur | Entreprise A | jean@a.com | ID: abc123
    2. Marie Martin | CEO | Entreprise B | marie@b.com | ID: def456
    [...]

    (IDs mémorisés pour actions futures)"

3. PAS de boutons génériques
4. Contexte mémorisé : session.lastQueriedLeadIds = [abc123, def456, ...]
```

### Scénario 3 : Retraiter avec tags (Mode Opérateur)

```
User: "Retraite ces leads : ajoute les tags Cosmétique et Prospection-IA, et remplis Secteur avec Cosmétique"

M.A.X. appelle :
1. get_lead_diff(leadId: 'abc123', proposedUpdates: {
     industry: 'Cosmétique',
     segments: ['Cosmétique', 'Prospection-IA']
   })
   → Retourne diff

2. Affiche prévisualisation :
   "Mise à jour proposée sur 5 leads :

    Champs modifiés :
    • industry: [vide] → 'Cosmétique'
    • segments: [vide] → ['Cosmétique', 'Prospection-IA']

    Leads ciblés : Jean Dupont, Marie Martin, [...]

    Mode : UPDATE ONLY (0 création)

    Je confirme ces modifications ?"

3. User clique [✅ Confirmer]

4. M.A.X. appelle update_leads_in_espo({
     leadIds: ['abc123', 'def456', ...],
     updates: { industry: 'Cosmétique', segments: [...] },
     mode: 'update_only'
   })

5. Rapport :
   "✅ Mise à jour effectuée sur 5 leads :
    • 5 mis à jour
    • 0 créés
    • 0 ignorés

    🔗 Voir dans le CRM"
```

---

## 📋 Checklist d'intégration

### Backend
- [ ] Créer dossier `prompts/` si inexistant
- [ ] Copier `max_system_prompt_v2.txt` dans `prompts/`
- [ ] Importer 3 modules (sessionContext, leadUpsert, fieldMapping) dans `chat.js`
- [ ] Modifier chargement prompt system (lire v2.txt)
- [ ] Remplacer array `tools` par nouveaux tools
- [ ] Ajouter 5 handlers (query, update, delete, diff, analyze)
- [ ] Tester chaque handler avec Postman ou curl

### Tests de validation
- [ ] Test 1: "Supprime les 4 leads vides" → 1 confirmation → DELETE → rapport
- [ ] Test 2: "5 derniers leads" → compte réel → IDs présents → zéro invention
- [ ] Test 3: "Retraite ces leads (tags)" → UPDATE ONLY → 0 création → tags dans segments
- [ ] Test 4: Jamais "bientôt dispo" sur actions cœur

### EspoCRM (recommandé)
- [ ] Administration → Entity Manager → Lead
- [ ] Ajouter champ `enumMulti` nommé `segments`
- [ ] Valeurs : Cosmétique, Coaching, Prospection-IA, LinkedIn
- [ ] Ajouter au layout Détail et Édition
- [ ] Rebuild

---

## 🚀 Ordre d'exécution

1. **Créer les modules** (déjà fait) ✅
2. **Intégrer dans chat.js** (copier-coller code ci-dessus)
3. **Redémarrer serveur** : `taskkill /F /IM node.exe && cd d:\Macrea\CRM\max_backend && npm start`
4. **Tester scénarios**
5. **Config EspoCRM** (champ segments)

---

**Version** : 1.0
**Date** : 2025-11-10
**Auteur** : Claude (Anthropic)

© 2025 MaCréa Studio AI
