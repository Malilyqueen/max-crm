# 📚 INDEX DES PLAYBOOKS M.A.X.

## Vue d'Ensemble

Les playbooks sont des guides de troubleshooting que M.A.X. consulte automatiquement quand il rencontre des problèmes. Ils contiennent:
- Diagnostic étape par étape
- Solutions alternatives
- Messages types pour l'utilisateur
- Code d'implémentation

## Playbooks Disponibles

### 🔧 Opérations CRM

#### LEAD_FIELD_UPDATE_FAILED.md
**Symptômes**: Champ lead ne se met pas à jour malgré confirmation M.A.X.

**Cas d'usage**:
- M.A.X. dit "✅ mis à jour" mais la valeur ne change pas
- Confusion entre champs similaires (lastName vs name vs accountName)
- Validation échoue silencieusement

**Mots-clés déclencheurs**:
- `field not updated`
- `value didn't change`
- `still shows old value`
- `lastName`, `firstName`, `accountName` (champs fréquemment problématiques)

---

### 📱 Communications

#### WHATSAPP_SEND_FAILED.md
**Symptômes**: Envoi WhatsApp échoue ou envoie mauvais message

**Cas d'usage**:
- Erreur `ECONNREFUSED 127.0.0.1:5678` (n8n non démarré)
- Message "test" au lieu du template configuré
- Template non trouvé
- Variables manquantes
- Erreur credentials Twilio

**Mots-clés déclencheurs**:
- `whatsapp failed`
- `ECONNREFUSED`
- `test message instead of template`
- `template not found`
- `Twilio error`

---

## Comment M.A.X. Utilise les Playbooks

### 1. Détection Automatique

M.A.X. détecte qu'il y a un problème quand:
```javascript
// Exemple: Update lead
const before = await get_lead(leadId);
await update_lead(leadId, { lastName: "RAMAHA" });
const after = await get_lead(leadId);

if (after.lastName !== "RAMAHA") {
  // ⚠️ Problème détecté
  consultPlaybook('LEAD_FIELD_UPDATE_FAILED');
}
```

### 2. Consultation du Playbook

```javascript
const playbook = await consult_troubleshooting_playbook({
  category: 'lead_operations',
  issue: 'field_update_failed',
  context: {
    field: 'lastName',
    expectedValue: 'RAMAHA',
    actualValue: 'AI Studio',
    leadId: '69272eee2a489f7a6'
  }
});

// Retourne: Diagnostic + Solutions + Message pour utilisateur
```

### 3. Application des Solutions

M.A.X. applique les solutions par ordre de priorité:
1. **Auto-correction** (si possible)
2. **Demande clarification** utilisateur
3. **Escalade** vers admin système

---

## Conventions de Nommage

### Format des Fichiers
```
CATEGORY_ISSUE_SYMPTOM.md

Exemples:
- LEAD_FIELD_UPDATE_FAILED.md
- WHATSAPP_SEND_FAILED.md
- EMAIL_TEMPLATE_NOT_FOUND.md
- CRM_CONNECTION_TIMEOUT.md
```

### Structure de Chaque Playbook

```markdown
# 🔧 PLAYBOOK: [Titre Court]

## Symptômes
[Liste des symptômes observables]

## Diagnostic Étape par Étape
[Numérotation avec emojis: 1️⃣ 2️⃣ 3️⃣]

### Solutions Alternatives
**Option A**: [Solution principale]
**Option B**: [Solution de secours]
**Option C**: [Solution de dernier recours]

## Messages Types pour l'Utilisateur
[Templates de messages clairs et actionnables]

## Code d'Implémentation
[Code JavaScript/TypeScript si applicable]

## Prévention Future
[Comment éviter ce problème]
```

---

## Roadmap des Playbooks

### 🚀 À Créer Priorité Haute

1. **EMAIL_SEND_FAILED.md**
   - SMTP errors
   - Template formatting issues
   - Attachment problems

2. **LEAD_IMPORT_FAILED.md**
   - CSV format errors
   - Duplicate detection issues
   - Field mapping problems

3. **CRM_SYNC_FAILED.md**
   - EspoCRM connection timeout
   - Authentication errors
   - Rate limiting

4. **ENRICHMENT_FAILED.md**
   - External API failures
   - Data quality issues
   - Timeout errors

### 📋 À Créer Priorité Moyenne

5. **WORKFLOW_N8N_FAILED.md**
6. **SEARCH_NO_RESULTS.md**
7. **TAG_GENERATION_FAILED.md**
8. **SCORE_CALCULATION_ERROR.md**

### 🔮 À Créer Priorité Basse

9. **REPORT_GENERATION_FAILED.md**
10. **EXPORT_FAILED.md**
11. **CALENDAR_SYNC_FAILED.md**

---

## Maintenance des Playbooks

### Mise à Jour
- Mettre à jour après chaque incident résolu
- Ajouter nouveaux cas d'usage découverts
- Améliorer les messages utilisateur basés sur feedback

### Versioning
Chaque playbook contient:
```markdown
---
version: 1.0.0
last_updated: 2025-12-12
author: M.A.X. Team
reviewed_by: [Noms]
---
```

### Métriques
Tracker pour chaque playbook:
- Nombre de consultations
- Taux de résolution (problème résolu sans escalade)
- Temps moyen de résolution
- Feedback utilisateur

---

## Outil M.A.X.: `consult_troubleshooting_playbook`

### Description
Permet à M.A.X. de consulter les playbooks de troubleshooting quand il rencontre un problème.

### Paramètres
```typescript
{
  issue: string,        // Ex: "field_update_failed"
  category?: string,    // Ex: "lead_operations"
  context?: object,     // Contexte additionnel
  getUserFacing?: boolean // true = retourne message pour utilisateur
}
```

### Exemples d'Utilisation

#### Exemple 1: Update échoué
```javascript
const guidance = await consult_troubleshooting_playbook({
  issue: "field_update_failed",
  context: {
    field: "lastName",
    expectedValue: "RAMAHA",
    actualValue: "AI Studio"
  },
  getUserFacing: true
});

// Retourne message formaté pour l'utilisateur
console.log(guidance.userMessage);
```

#### Exemple 2: WhatsApp échoué
```javascript
const guidance = await consult_troubleshooting_playbook({
  issue: "whatsapp_send_failed",
  context: {
    error: "ECONNREFUSED 127.0.0.1:5678",
    template: "Confirmation RDV",
    leadId: "69272eee2a489f7a6"
  }
});

// Retourne diagnostic + solutions
console.log(guidance.diagnosis);
console.log(guidance.solutions);
```

---

## FAQ

### Q: Quand M.A.X. doit-il consulter un playbook?
**R**: Dès qu'une opération échoue 2 fois consécutives, ou quand une vérification post-opération détecte une anomalie.

### Q: Les playbooks peuvent-ils être modifiés dynamiquement?
**R**: Oui, M.A.X. peut suggérer des améliorations basées sur les incidents, mais les modifications doivent être validées par un humain.

### Q: Que se passe-t-il si aucun playbook ne correspond?
**R**: M.A.X. crée un rapport d'incident et demande de l'aide à l'admin, tout en suggérant la création d'un nouveau playbook.

### Q: Les playbooks sont-ils accessibles aux utilisateurs finaux?
**R**: Non directement. M.A.X. traduit le contenu technique en messages clairs et actionnables pour l'utilisateur.

---

## Contribution

Pour ajouter un nouveau playbook:

1. **Identifier le problème** récurrent (>3 occurrences)
2. **Créer le fichier** selon convention de nommage
3. **Suivre la structure** standard
4. **Tester** avec des cas réels
5. **Mettre à jour** cet index
6. **Intégrer** dans maxTools.js

Template de départ:
```bash
cp playbooks/TEMPLATE.md playbooks/YOUR_NEW_PLAYBOOK.md
```
