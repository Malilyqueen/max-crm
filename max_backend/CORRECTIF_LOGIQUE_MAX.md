# Correctif Logique M.A.X. - Bugs Import/Update
## Implémentation des fixes pour les 3 bugs identifiés

---

## 🐛 Bugs corrigés

### 1. Boucle "import" après enrichissement
**Avant** : M.A.X. ré-empruntait le chemin d'IMPORT après chaque enrichissement.

**Après** : Détection automatique du contexte (`sessionContext.js`) → force mode UPDATE quand on travaille sur des leads existants.

### 2. Création de fiches vides
**Avant** : Pas d'upsert, pas de validation → création systématique de nouveaux leads même s'ils existaient.

**Après** :
- Logique d'upsert (`leadUpsert.js`) avec match par email/téléphone/website
- Validation minimale : Email OU (Nom + Entreprise)
- Création uniquement avec confirmation utilisateur

### 3. Tags dans Description
**Avant** : Fallback écrivait "TAGS: #Cosmétique #Prospection-IA" dans `description`.

**Après** : Mapping propre (`fieldMapping.js`) → utilise champ `segments` (enumMulti) ou relation `Tags`.

---

## 📦 Modules créés

### 1. `lib/sessionContext.js`
**Rôle** : Détermine si on est en mode IMPORT ou UPDATE selon le contexte.

**Fonctions clés** :
- `detectOperationMode(session, userMessage)` : retourne 'import' | 'update' | 'query'
- `storeLeadContext(session, leadIds)` : mémorise les leads consultés
- `getActiveLeadContext(session)` : récupère le contexte actif (valide 30 min)
- `clearImportContext(session)` : nettoie après import

**Logique** :
```javascript
// Si message contient "enrichis", "ajoute les tags", "modifie"
// ET qu'il y a un contexte de leads (IDs en session ou import récent)
// → MODE UPDATE

// Sinon si fichier uploadé non importé
// → MODE IMPORT

// Sinon
// → MODE QUERY (consultation)
```

### 2. `lib/leadUpsert.js`
**Rôle** : Gestion intelligente de l'upsert avec garde-fous anti-fiches vides.

**Fonctions clés** :
- `validateMinimalLead(lead)` : vérifie Email OU (Nom + Entreprise)
- `findExistingLead(lead)` : cherche par email → phone → website
- `upsertLead(lead, options)` : update si trouvé, sinon demande confirmation
- `batchUpsertLeads(leads, options)` : upsert par lot avec rapport

**Règles** :
- **Lead trouvé** → UPDATE automatique
- **Lead non trouvé + forceCreate=false** → retourne `pending_confirmation`
- **Lead non trouvé + forceCreate=true** → CREATE
- **Lead invalide** (< seuil minimal) → SKIP avec raison

**Rapport** :
```javascript
{
  updated: 5,
  created: 0,
  skipped: 1,
  pendingConfirmation: 0,
  details: [
    { action: 'updated', id: 'xxx', lead: 'Jean Dupont' },
    { action: 'skipped', reason: 'pas d\'email', lead: 'Martin' }
  ]
}
```

### 3. `lib/fieldMapping.js`
**Rôle** : Mapping clair et figé, interdit les concaténations libres.

**Fonctions clés** :
- `applyFieldMapping(data)` : applique le mapping standardisé
- `prepareTags(tags, mode)` : gère tags proprement (relation ou enum)
- `formatEnrichedLead(enrichmentData)` : formate sans polluer `description`
- `generateUpdateDiff(existingLead, updates)` : prévisualisation des changements

**Mapping** :
```javascript
{
  'Secteur': 'industry',
  'Origine': 'source',
  'Tags': 'segments',  // Champ enumMulti (fallback propre)
  'Objectifs': 'description'  // Temporaire si pas de champ dédié
}
```

**Règles** :
- `description` ne peut JAMAIS contenir de tags (nettoyage automatique)
- Champs non mappés → ignorés + log
- Tentative d'écriture structurée dans `description` → warning

---

## 🔧 Modifications à apporter dans `chat.js`

### Nouvelle fonction Tool pour M.A.X.

**Remplacer** :
```javascript
{
  type: "function",
  function: {
    name: "import_leads_to_espo",
    description: "Importe les leads enrichis dans EspoCRM"
  }
}
```

**Par** :
```javascript
{
  type: "function",
  function: {
    name: "update_leads_in_espo",
    description: "Met à jour les leads existants dans EspoCRM. Utilise upsert intelligent : update si le lead existe (match par email/phone/website), création UNIQUEMENT avec confirmation utilisateur. Retourne un rapport détaillé (updated/created/skipped).",
    parameters: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["update_only", "upsert_with_confirmation", "force_create"],
          description: "Mode d'opération : update_only (défaut, pas de création), upsert_with_confirmation (demande avant créer), force_create (crée sans demander)"
        }
      },
      required: []
    }
  }
}
```

### Handler du Tool

```javascript
// Dans chat.js, ajouter handler
if (toolCall.function.name === 'update_leads_in_espo') {
  const args = JSON.parse(toolCall.function.arguments);
  const mode = args.mode || 'update_only';

  const session = loadConversation(sessionId);
  if (!session) {
    return 'Session invalide';
  }

  // Déterminer contexte opération
  const operationMode = detectOperationMode(session, lastUserMessage);

  if (operationMode === 'import' && !session.imported) {
    // Premier import classique
    // ... (garder logique actuelle)

  } else {
    // MODE UPDATE : on travaille sur des leads existants

    // Récupérer contexte des leads
    const targetLeadIds = getActiveLeadContext(session);

    if (targetLeadIds.length === 0 && !session.enrichedData) {
      return '⚠️ Aucun lead ciblé. Utilisez d\'abord "Montre les 5 derniers leads" ou uploadez un fichier.';
    }

    // Charger les leads depuis EspoCRM si on a des IDs
    let leadsToUpdate = [];

    if (targetLeadIds.length > 0) {
      // Charger depuis EspoCRM
      for (const id of targetLeadIds) {
        const lead = await espoRequest(`/Lead/${id}`);
        leadsToUpdate.push(lead);
      }
    } else if (session.enrichedData) {
      // Utiliser les données enrichies
      leadsToUpdate = session.enrichedData.enrichedLeads;
    }

    // Formatter les leads (mapping propre)
    const formattedLeads = leadsToUpdate.map(lead => formatEnrichedLead(lead));

    // Upsert avec rapport
    const forceCreate = mode === 'force_create';
    const report = await batchUpsertLeads(formattedLeads, { forceCreate });

    // Générer message selon rapport
    let message = `✅ **Mise à jour effectuée** sur ${leadsToUpdate.length} leads :\n\n`;
    message += `• **${report.updated}** mis à jour\n`;

    if (report.created > 0) {
      message += `• **${report.created}** créés\n`;
    }

    if (report.skipped > 0) {
      message += `• **${report.skipped}** ignorés (champs manquants)\n`;
    }

    if (report.pendingConfirmation > 0) {
      message += `• **${report.pendingConfirmation}** nécessitent confirmation pour création\n\n`;
      message += `Voulez-vous créer ces ${report.pendingConfirmation} nouveaux leads ?`;
    }

    // Log détails
    report.details.filter(d => d.action === 'skipped').forEach(d => {
      message += `\n⚠️ ${d.lead} : ${d.reason}`;
    });

    // Lien CRM
    message += `\n\n🔗 [Voir dans le CRM](${ESPO_BASE_URL}/#Lead)`;

    return message;
  }
}
```

---

## 🎯 Prompt System pour M.A.X.

**Ajouter dans le system prompt** :

```
TU ES ADMINISTRATEUR ESPOCRM avec pouvoir de mise à jour des leads.

RÈGLES STRICTES :

1. **Mode d'opération** :
   - IMPORT : premier import de fichier CSV → utilise `import_leads_to_espo`
   - UPDATE : enrichissement/modification de leads existants → utilise `update_leads_in_espo` avec mode="update_only"
   - QUERY : consultation simple → pas d'écriture

2. **Détection contexte** :
   - Si utilisateur dit "enrichis", "ajoute les tags", "modifie", "complète" → MODE UPDATE
   - Si utilisateur dit "montre", "liste", "affiche" → MODE QUERY (mémoriser les IDs)
   - Si fichier uploadé non importé → MODE IMPORT

3. **Anti-création accidentelle** :
   - Par défaut : `mode="update_only"` (0 création)
   - Si lead n'existe pas → signaler + demander confirmation
   - Créer UNIQUEMENT si utilisateur confirme explicitement

4. **Tags** :
   - NE JAMAIS écrire "TAGS: #xxx" dans `description`
   - Utiliser champ `segments` (enumMulti)
   - Format : `["Cosmétique", "Prospection-IA"]`

5. **Messages clairs** :
   - Après UPDATE : "✅ Mise à jour effectuée sur X leads"
   - Après IMPORT : "✅ Import terminé : X leads créés"
   - JAMAIS dire "import" quand c'est une mise à jour

6. **Prévisualisation** :
   - Avant toute écriture, montrer : champs modifiés, tags ajoutés, leads ciblés
   - Demander confirmation si impact > 5 leads
```

---

## 📋 Checklist d'intégration

### Backend
- [ ] Importer `sessionContext.js` dans `chat.js`
- [ ] Importer `leadUpsert.js` dans `chat.js`
- [ ] Importer `fieldMapping.js` dans `chat.js`
- [ ] Ajouter nouveau Tool `update_leads_in_espo`
- [ ] Ajouter handler du Tool avec logique UPDATE
- [ ] Modifier system prompt M.A.X.
- [ ] Tester détection contexte (import vs update)
- [ ] Tester upsert (update existant, skip invalide)
- [ ] Tester tagging propre (pas dans description)

### EspoCRM (optionnel mais recommandé)
- [ ] **Administration → Entity Manager → Lead**
- [ ] Ajouter champ `enumMulti` nommé `segments`
  - Valeurs : Cosmétique, Coaching, Prospection-IA, LinkedIn, etc.
- [ ] Ajouter champ au layout "Détail" et "Édition"
- [ ] Rebuild EspoCRM
- [ ] (Optionnel) Créer relation many-to-many avec entité `Tag` pour tagging avancé

### Nettoyage des données cassées
- [ ] EspoCRM → Leads → Filtre "Créés aujourd'hui"
- [ ] Supprimer les fiches avec Email vide ET Nom vide
- [ ] Chercher "TAGS:" dans `description` (recherche textuelle)
- [ ] Remplacer par vide en masse (ou script)

---

## 🧪 Scénario de test complet

```
1. Upload fichier CSV
   M.A.X. : "J'ai scanné 10 leads. Confirmer import ?"
   User : "Oui"
   M.A.X. : "✅ Import terminé : 10 leads créés"

2. User : "Montre les 5 derniers leads importés"
   M.A.X. : Affiche liste (avec IDs mémorisés en session)

3. User : "Ajoute les tags Cosmétique et Prospection-IA et remplis Secteur avec Cosmétique"
   M.A.X. : Affiche diff :
     - 5 leads ciblés
     - Champs modifiés : industry="Cosmétique", segments=["Cosmétique","Prospection-IA"]
     - Mode : update_only (0 création)
   User : "OK"
   M.A.X. : "✅ Mise à jour effectuée sur 5 leads : 5 mis à jour, 0 créés, 0 ignorés"

4. Vérif EspoCRM :
   - Champ `segments` contient ["Cosmétique", "Prospection-IA"]
   - `description` ne contient PAS "TAGS:"
   - `industry` = "Cosmétique"
   - Dates `updatedAt` = aujourd'hui
```

---

## 🔮 Améliorations futures

1. **Diff visuel** : Afficher tableau avant/après dans interface
2. **Undo** : Bouton "Annuler dernière mise à jour"
3. **Logs audit** : Historique des modifications par M.A.X.
4. **Validation avancée** : Regex email, format téléphone
5. **Relation Tags vraie** : Implémenter `prepareTagRelations()` pour créer/lier tags

---

**Version** : 1.0
**Date** : 2025-11-10
**Auteur** : Claude (Anthropic)

© 2025 MaCréa Studio AI
