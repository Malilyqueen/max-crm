# Option C - Intégration M.A.X. Complète du Système de Consentement

**Prérequis:** Option B validée et filmée ✅

---

## 🎯 Objectif

Permettre à M.A.X. de demander automatiquement le consentement lors de conversations naturelles, sans bouton de test manuel.

**Exemple de conversation cible:**

```
User: "M.A.X., peux-tu ajouter le champ secteur aux layouts Lead ?"

M.A.X. (interne):
  - Détecte opération sensible: modification de layout
  - Appelle tool request_consent
  - Reçoit consentId

M.A.X. (réponse):
  "Je peux ajouter le champ secteur aux layouts Lead.
   Cette opération nécessite ton autorisation."
  [ConsentCard s'affiche]

User: [Clique "Approuver"]

M.A.X. (interne):
  - Reçoit notification d'approbation
  - Appelle tool modify_layout avec consentId
  - Exécute l'opération

M.A.X. (réponse):
  "✅ Opération terminée !
   Le champ secteur a été ajouté aux layouts Lead (detail + list).
   2 layouts modifiés.
   Rapport d'audit disponible."
```

---

## 📋 Tâches à accomplir

### 1. Créer l'action `modify_layout`

**Fichier:** `max_backend/actions/modifyLayout.js`

**Responsabilité:**
- Vérifier qu'un consentement valide existe
- Modifier les layouts EspoCRM
- Générer un audit détaillé

**Signature:**
```javascript
/**
 * Modifie un layout EspoCRM après approbation du consentement
 *
 * @param {Object} params
 * @param {string} params.consentId - ID du consentement approuvé
 * @param {string} params.entity - Entity EspoCRM (Lead, Contact, etc.)
 * @param {string} params.fieldName - Nom du champ à ajouter
 * @param {Array<string>} params.layoutTypes - Types de layouts (detail, list, etc.)
 * @param {string} params.tenantId - ID du tenant
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function modifyLayout(params) {
  // 1. Vérifier que le consentement existe et est approuvé
  // 2. Appeler FilesystemLayoutManager pour modifier les layouts
  // 3. Générer l'audit
  // 4. Retourner le résultat
}
```

**Pseudo-code:**
```javascript
import { FilesystemLayoutManager } from '../lib/FilesystemLayoutManager.cjs';
import { getConsentStatus, markConsentExecuted } from '../lib/consentManager.js';

export async function modifyLayout(params) {
  const { consentId, entity, fieldName, layoutTypes, tenantId } = params;

  // Vérifier le consentement
  const consent = await getConsentStatus(consentId);
  if (!consent || consent.status !== 'approved') {
    throw new Error('Consentement non trouvé ou non approuvé');
  }

  // Exécuter la modification
  const layoutManager = new FilesystemLayoutManager(tenantId);
  const results = [];

  for (const layoutType of layoutTypes) {
    const result = await layoutManager.addFieldToLayout(entity, fieldName, layoutType);
    results.push(result);
  }

  // Marquer le consentement comme exécuté
  await markConsentExecuted(consentId, {
    success: true,
    layoutsModified: results.length,
    details: results
  });

  return {
    success: true,
    provider: 'espocrm-layouts',
    entityId: consentId,
    preview: `${results.length} layout(s) modifié(s) pour ${entity}`,
    metadata: {
      entity,
      fieldName,
      layoutTypes,
      results
    }
  };
}
```

### 2. Enregistrer l'action dans `actions/index.js`

**Modification:**
```javascript
import { modifyLayout } from './modifyLayout.js';

// Dans executeAction()
case 'modify_layout':
  result = await modifyLayout(params);
  break;

// Dans exports
export {
  sendEmail,
  createEmailDraft,
  // ...
  requestConsent,
  modifyLayout
};
```

### 3. Exposer les tools à M.A.X. dans le prompt système

**Fichier:** `max_backend/prompts/system_prompt_max.txt` (ou équivalent)

**Ajouter cette section:**

````markdown
## TOOLS DISPONIBLES

Tu as accès aux tools suivants pour interagir avec le CRM:

### request_consent

Demande le consentement utilisateur avant une opération sensible.

**Quand l'utiliser:**
- Modification de layouts
- Création de champs custom
- Modification de métadonnées
- Toute opération irréversible

**Paramètres:**
```json
{
  "type": "layout_modification",
  "description": "Ajouter le champ secteur aux layouts Lead",
  "details": {
    "entity": "Lead",
    "fieldName": "secteur",
    "layoutTypes": ["detail", "list"]
  }
}
```

**Retour:**
```json
{
  "success": true,
  "consentId": "consent_xxx",
  "expiresIn": 300
}
```

**Important:** Après avoir appelé ce tool, attends que l'utilisateur approuve avant de continuer.

### modify_layout

Modifie un layout EspoCRM après approbation du consentement.

**Prérequis:** Un consentement valide et approuvé.

**Paramètres:**
```json
{
  "consentId": "consent_xxx",
  "entity": "Lead",
  "fieldName": "secteur",
  "layoutTypes": ["detail", "list"]
}
```

**Retour:**
```json
{
  "success": true,
  "layoutsModified": 2,
  "details": [...]
}
```

## WORKFLOW CONSENTEMENT

Voici le flux à suivre pour une opération nécessitant consentement:

1. **Détection:** L'utilisateur demande une modification de layout
2. **Demande:** Tu appelles `request_consent` avec les détails
3. **Attente:** Tu informes l'utilisateur et attends son approbation
4. **Exécution:** Une fois approuvé, tu appelles `modify_layout`
5. **Confirmation:** Tu confirmes la réussite avec les détails

**Exemple de conversation:**

User: "Ajoute le champ secteur aux layouts Lead"