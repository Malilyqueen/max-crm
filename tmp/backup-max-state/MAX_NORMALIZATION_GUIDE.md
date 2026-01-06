# Guide de Normalisation M.A.X.

**Version:** 1.0
**Date:** 2025-11-26
**Status:** Production Ready

---

## Vue d'ensemble

M.A.X. dispose maintenant d'un **système de normalisation intelligente** qui garantit que toutes les écritures vers EspoCRM sont **validées, normalisées et conformes au mapping officiel**.

### Principes

1. **M.A.X. reste LIBRE dans son analyse** - Il peut raisonner de manière créative et flexible
2. **M.A.X. est STRICT dans l'écriture** - Toute écriture vers EspoCRM est validée automatiquement
3. **Auto-migration des champs dépréciés** - Les anciens champs sont automatiquement convertis
4. **Rejet strict des champs non autorisés** - Impossible d'écrire dans des champs non mappés
5. **Self-healing automatique** - Détection et correction des incohérences au démarrage

---

## Architecture du Système

### 1. Field Validator ([lib/fieldValidator.js](../lib/fieldValidator.js))

**Responsabilités:**
- Valider que les champs utilisés sont dans le mapping officiel
- Convertir automatiquement les champs dépréciés vers les nouveaux
- Vérifier les types de données (int, array, text, etc.)
- Rejeter les champs interdits (id, createdAt, etc.)

**API:**

```javascript
import { validateLeadUpdate, normalizeLeadUpdate } from './lib/fieldValidator.js';

// Validation seule (sans exception)
const result = validateLeadUpdate(updateData);
if (!result.valid) {
  console.error('Erreurs:', result.errors);
}

// Validation + normalisation (lance une exception si invalide)
const normalized = normalizeLeadUpdate(updateData);
```

**Champs autorisés:**

| Champ | Type | Description |
|-------|------|-------------|
| `tagsIA` | array | Tags générés par l'IA |
| `secteurInfere` | text | Secteur détecté par l'IA |
| `scoreIA` | int (0-100) | Score de qualification |
| `servicesSouhaites` | text | Services identifiés |
| `notesIA` | text | Notes de M.A.X. |
| `description` | text | Description enrichie |
| `status` | enum | Statut du lead |
| + autres champs EspoCRM standards |

**Champs dépréciés (auto-migrés):**

- `secteur` → `secteurInfere`
- `maxTags` → `tagsIA`

### 2. Safe Update Wrapper ([lib/espoClient.js](../lib/espoClient.js))

**Fonctions sécurisées:**

```javascript
import { safeUpdateLead, safeCreateLead } from './lib/espoClient.js';

// ✅ Mise à jour sécurisée (validation automatique)
await safeUpdateLead(leadId, {
  tagsIA: ['PME', 'Tech'],
  secteurInfere: 'Technologies',
  scoreIA: 85
});

// ✅ Création sécurisée
await safeCreateLead({
  firstName: 'John',
  lastName: 'Doe',
  tagsIA: ['Nouveau']
});

// ⚠️ Option pour bypass (DEBUG UNIQUEMENT)
await safeUpdateLead(leadId, data, { skipValidation: true });
```

**Comportement:**

1. Valide les données avec `normalizeLeadUpdate()`
2. Log l'opération: `[ESPO_CLIENT] ✅ Lead XXX - Validation OK`
3. Envoie les données normalisées à EspoCRM
4. Si erreur de validation: Lance une exception avec détails

### 3. Self-Healing System ([lib/selfHealing.js](../lib/selfHealing.js))

**Fonctionnalités:**
- Capture un snapshot du schéma EspoCRM (metadata + layouts)
- Détecte les changements entre démarrages
- Vérifie la cohérence metadata/layouts/données
- Propose des corrections automatiques

**Initialisation automatique:**

Le self-healing s'initialise **automatiquement au démarrage du serveur** dans [server.js:194-204](../server.js#L194-L204):

```javascript
🔧 M.A.X. SELF-HEALING SYSTEM - Initialisation
================================================================================
[SELF_HEALING] 🔍 Initialisation du système de self-healing...
[SELF_HEALING] 📸 Premier démarrage - Capture de l'état initial
[SELF_HEALING] ✅ Système sain
================================================================================
```

**API manuelle:**

```javascript
import { healthCheck, autoHeal } from './lib/selfHealing.js';

// Health check complet
const health = await healthCheck();
if (!health.healthy) {
  console.error('Problèmes:', health.issues);
}

// Auto-correction
const result = await autoHeal();
console.log('Actions effectuées:', result.actions);
```

---

## Utilisation dans le Code M.A.X.

### Migration du Code Existant

**AVANT (non sécurisé):**

```javascript
await espoFetch(`/Lead/${leadId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    secteur: lead.secteur,  // ❌ Champ déprécié
    maxTags: lead.tags      // ❌ Champ déprécié
  })
});
```

**APRÈS (sécurisé):**

```javascript
import { safeUpdateLead } from '../lib/espoClient.js';

await safeUpdateLead(leadId, {
  secteurInfere: lead.secteur,  // ✅ Champ officiel
  tagsIA: lead.tags              // ✅ Champ officiel
});
```

**ENCORE MIEUX (auto-migration):**

```javascript
// Les champs dépréciés sont auto-convertis!
await safeUpdateLead(leadId, {
  secteur: lead.secteur,  // Auto-converti en secteurInfere
  maxTags: lead.tags      // Auto-converti en tagsIA
});

// Log produit:
// [FIELD_VALIDATOR] ⚠️ Warnings: Le champ "secteur" est déprécié...
// [ESPO_CLIENT] ✅ Lead XXX - Validation OK - Champs: secteurInfere, tagsIA
```

### Exemples Pratiques

**1. Enrichissement de Lead:**

```javascript
import { safeUpdateLead } from '../lib/espoClient.js';

async function enrichirLead(leadId, analysis) {
  return safeUpdateLead(leadId, {
    tagsIA: analysis.tags,
    secteurInfere: analysis.secteur,
    scoreIA: analysis.score,
    servicesSouhaites: analysis.services.join(', '),
    notesIA: analysis.notes,
    description: analysis.description
  });
}
```

**2. Gestion d'erreur:**

```javascript
try {
  await safeUpdateLead(leadId, updateData);
} catch (error) {
  if (error.code === 'FIELD_VALIDATION_ERROR') {
    console.error('Champs invalides:', error.details.errors);
    // Gérer l'erreur de validation
  } else {
    // Autre erreur (réseau, EspoCRM, etc.)
  }
}
```

---

## Outils de Maintenance

### 1. Audit CRM

```bash
node tools/crm_audit.js
```

**Résultat:**
- Liste des champs définis vs présents dans les leads
- Taux de remplissage de chaque champ M.A.X.
- Détection des incohérences
- Rapport JSON sauvegardé dans `audit_reports/`

### 2. Fix Layouts

```bash
node tools/fix_layouts.js
```

**Actions:**
- Ajoute automatiquement les champs M.A.X. aux layouts Detail et List
- Clear cache EspoCRM
- Rebuild EspoCRM

### 3. Test Normalization

```bash
node tools/test_normalization.js
```

**Tests:**
- Validation de champs valides/invalides
- Auto-migration des champs dépréciés
- Vérification de cohérence du schéma
- Health check système

---

## Comportement au Runtime

### Au Démarrage du Serveur

```
🔧 M.A.X. SELF-HEALING SYSTEM - Initialisation
================================================================================
[SELF_HEALING] 🔍 Initialisation du système de self-healing...
[SELF_HEALING] 📸 Premier démarrage - Capture de l'état initial
[SELF_HEALING] ✅ Système sain
================================================================================

M.A.X. server P1 listening on http://127.0.0.1:3005
```

### Lors d'une Mise à Jour de Lead

```
[FIELD_VALIDATOR] ⚠️  Warnings: [
  { field: 'secteur', message: 'Champ déprécié, utiliser secteurInfere' }
]
[ESPO_CLIENT] ✅ Lead 67890 - Validation OK - Champs: secteurInfere, tagsIA, description
```

### En Cas d'Erreur

```
[ESPO_CLIENT] ❌ Validation échouée: {
  "valid": false,
  "errors": [
    {
      "field": "champInconnu",
      "reason": "UNKNOWN",
      "message": "Le champ 'champInconnu' n'est pas dans le mapping officiel"
    }
  ]
}
```

---

## Garanties

Avec ce système, M.A.X. garantit:

1. ✅ **Aucune écriture dans des champs non autorisés**
2. ✅ **Migration automatique des champs dépréciés**
3. ✅ **Validation des types de données**
4. ✅ **Détection des incohérences de schéma**
5. ✅ **Traçabilité complète** (logs de toutes les opérations)
6. ✅ **Self-healing automatique** au démarrage

---

## Migration Checklist

Pour migrer le code existant:

- [ ] Remplacer `espoFetch('/Lead/XXX', { method: 'PATCH', ... })` par `safeUpdateLead()`
- [ ] Remplacer `espoFetch('/Lead', { method: 'POST', ... })` par `safeCreateLead()`
- [ ] Vérifier que les champs utilisés sont dans le mapping officiel
- [ ] Tester avec `node tools/test_normalization.js`
- [ ] Vérifier les logs au runtime pour détecter les warnings

---

## Références

- **Mapping officiel:** [ESPOCRM_FIELD_MAPPING.md](./ESPOCRM_FIELD_MAPPING.md)
- **Field Validator:** [lib/fieldValidator.js](../lib/fieldValidator.js)
- **Self-Healing:** [lib/selfHealing.js](../lib/selfHealing.js)
- **Espo Client:** [lib/espoClient.js](../lib/espoClient.js)

---

**Ce système assure que M.A.X. reste intelligent et libre dans son analyse, mais propre et discipliné dans l'écriture vers EspoCRM.**
