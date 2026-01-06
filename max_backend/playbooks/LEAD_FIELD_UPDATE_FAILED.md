# 🔧 PLAYBOOK: Échec de Mise à Jour de Champ Lead

## Symptômes
- M.A.X. dit avoir mis à jour un champ mais la valeur ne change pas
- Erreur de validation lors de la mise à jour
- Le lead semble se mettre à jour mais revient à l'ancienne valeur

## Diagnostic Étape par Étape

### 1️⃣ Vérifier le nom exact du champ
```
❌ INCORRECT: "nom de famille", "last name", "surname"
✅ CORRECT: lastName (respecter la casse exacte)
```

**Action M.A.X.**: Utiliser l'outil `get_lead_schema` pour voir les champs disponibles

### 2️⃣ Vérifier les champs similaires qui peuvent créer confusion

| Intention Utilisateur | ❌ Champ Incorrect | ✅ Champ Correct |
|----------------------|-------------------|------------------|
| Nom de famille | `name`, `familyName` | `lastName` |
| Prénom | `given_name`, `first_name` | `firstName` |
| Entreprise | `company`, `organization` | `accountName` |
| Secteur (IA) | `secteur`, `industry` | `secteurInfere` |
| Tags (IA) | `maxTags`, `tags` | `tagsIA` |

### 3️⃣ Prompt de dépannage pour l'utilisateur

Si M.A.X. échoue après 2 tentatives, proposer à l'utilisateur:

```
Je rencontre des difficultés avec ce champ. Laissez-moi vérifier quelques points:

1. **Vérification du schéma**: Je vais consulter la structure exacte des champs
2. **Test direct**: Je vais utiliser le nom de champ exact de l'API
3. **Diagnostic**: Si ça échoue encore, je vais vous montrer exactement ce que j'envoie

Puis-je procéder?
```

### 4️⃣ Solutions alternatives

**Option A - Utilisation explicite du nom de champ API**:
```javascript
// Au lieu de:
updateData = { "nom de famille": "RAMAHA" }

// Utiliser explicitement:
updateData = { lastName: "RAMAHA" }
```

**Option B - Validation manuelle avant envoi**:
```javascript
// 1. Récupérer le lead actuel
const currentLead = await get_lead(leadId);

// 2. Comparer avant/après
console.log("Avant:", currentLead.lastName);

// 3. Envoyer mise à jour
await update_lead(leadId, { lastName: newValue });

// 4. Vérifier immédiatement
const updatedLead = await get_lead(leadId);
console.log("Après:", updatedLead.lastName);
```

**Option C - Mode Debug avec skipValidation**:
```javascript
// SEULEMENT en dernier recours et avec accord utilisateur
await safeUpdateLead(leadId, updateData, { skipValidation: true });
```

### 5️⃣ Checklist de vérification M.A.X.

Avant de dire "mise à jour réussie", M.A.X. doit:
- [ ] Vérifier que le nom de champ existe dans OFFICIAL_FIELDS
- [ ] Envoyer la requête à EspoCRM
- [ ] Attendre la réponse (status 200)
- [ ] **RE-LIRE le lead** pour confirmer la valeur
- [ ] Comparer valeur envoyée vs valeur lue
- [ ] SEULEMENT si valeurs matchent → ✅ "Mise à jour réussie"

### 6️⃣ Message type pour l'utilisateur en cas d'échec

```
❌ Je n'ai pas pu mettre à jour le champ "nom de famille" à "RAMAHA DOMOINA".

🔍 **Diagnostic**:
- Champ utilisé: `lastName`
- Valeur envoyée: "RAMAHA DOMOINA"
- Réponse API: 200 OK
- ⚠️ Problème: Après vérification, la valeur est toujours "AI Studio"

💡 **Solutions possibles**:
1. Ce champ pourrait être en lecture seule dans votre configuration EspoCRM
2. Il y a peut-être une validation côté serveur qui rejette la valeur
3. Le champ pourrait être lié à un autre module (Contact/Account)

🛠️ **Prochaines étapes**:
- Voulez-vous que je vérifie les permissions du champ?
- Voulez-vous essayer de mettre à jour via un autre champ (ex: accountName)?
- Voulez-vous que je contacte l'admin pour vérifier la configuration EspoCRM?
```

## Prévention Future

### Pour M.A.X. (Auto-apprentissage)
- Logger tous les échecs de mise à jour avec les détails
- Construire une base de "champs problématiques" par tenant
- Si un champ échoue 3x, marquer comme "nécessite investigation admin"

### Pour l'Utilisateur
- Proposer un rapport de santé hebdomadaire des opérations M.A.X.
- Alerter proactivement si un type d'opération échoue fréquemment
- Suggérer des audits de configuration EspoCRM

## Code d'Implémentation Recommandé

```javascript
// Dans maxTools.js - Tool update_lead
async function updateLeadWithVerification(leadId, updates) {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    // 1. Lire avant
    const before = await getLead(leadId);

    // 2. Appliquer mise à jour
    await safeUpdateLead(leadId, updates);

    // 3. Lire après (attendre 500ms pour propagation)
    await new Promise(r => setTimeout(r, 500));
    const after = await getLead(leadId);

    // 4. Vérifier chaque champ
    const failures = [];
    for (const [field, expectedValue] of Object.entries(updates)) {
      if (after[field] !== expectedValue) {
        failures.push({
          field,
          expected: expectedValue,
          actual: after[field],
          before: before[field]
        });
      }
    }

    // 5. Si tout OK, retourner succès
    if (failures.length === 0) {
      return { success: true, lead: after };
    }

    // 6. Si échec et pas de retry restant, retourner diagnostic détaillé
    if (attempt >= maxRetries) {
      return {
        success: false,
        failures,
        diagnosticPrompt: generateTroubleshootingPrompt(failures)
      };
    }

    // 7. Sinon, retry
    console.log(`Retry ${attempt}/${maxRetries} pour ${leadId}`);
  }
}

function generateTroubleshootingPrompt(failures) {
  return `❌ Échec de mise à jour après ${failures.length} tentatives.

🔍 **Champs concernés**: ${failures.map(f => f.field).join(', ')}

💡 **Suggestions**:
1. Vérifier les permissions du champ dans EspoCRM
2. Consulter le playbook: LEAD_FIELD_UPDATE_FAILED.md
3. Utiliser le nom de champ API exact: ${failures.map(f => `\`${f.field}\``).join(', ')}

Voulez-vous que je tente une approche alternative?`;
}
```
