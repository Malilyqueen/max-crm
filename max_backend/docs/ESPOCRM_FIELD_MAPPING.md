# EspoCRM Field Mapping for M.A.X.

**Date de création:** 2025-11-26
**Version:** 1.0 (STABLE)
**Status:** Production

## Objectif

Ce document définit le mapping OFFICIEL et STABLE entre les champs M.A.X. et EspoCRM Lead.
**TOUTE modification future DOIT être documentée ici avec versioning.**

---

## Champs M.A.X. → EspoCRM Lead

### Champs IA (Custom Fields)

| Champ M.A.X. | Nom EspoCRM | Type | Description | Statut |
|--------------|-------------|------|-------------|--------|
| Tags IA | `tagsIA` | array | Tags générés par l'IA pour catégoriser le lead | ✅ Actif |
| Secteur Inféré | `secteurInfere` | text | Secteur d'activité détecté par l'IA | ✅ Actif |
| Score IA | `scoreIA` | int | Score de qualification (0-100) | ✅ Actif |
| Services Souhaités | `servicesSouhaites` | text | Services identifiés comme pertinents | ✅ Actif |
| Notes IA | `notesIA` | text | Notes et observations de M.A.X. | ✅ Actif |

### Champs Standard EspoCRM (Utilisés par M.A.X.)

| Champ M.A.X. | Nom EspoCRM | Type | Description |
|--------------|-------------|------|-------------|
| Description | `description` | text | Description enrichie du lead |
| Status | `status` | enum | Statut du lead (New, Assigned, etc.) |
| Account Name | `accountName` | varchar | Nom de l'entreprise |
| First Name | `firstName` | varchar | Prénom du contact |
| Last Name | `lastName` | varchar | Nom du contact |
| Email | `emailAddress` | email | Email du contact |
| Phone | `phoneNumber` | phone | Téléphone du contact |
| Industry | `industry` | enum | Industrie/Secteur |
| Website | `website` | url | Site web de l'entreprise |

---

## Structure des Layouts

### Detail Layout
Les champs M.A.X. sont affichés dans un panel dédié "Tâches M.A.X.":

```json
{
  "label": "Tâches M.A.X.",
  "style": "default",
  "rows": [
    [
      { "name": "tagsIA", "fullWidth": false },
      { "name": "secteurInfere", "fullWidth": false }
    ],
    [
      { "name": "scoreIA", "fullWidth": false },
      { "name": "servicesSouhaites", "fullWidth": false }
    ],
    [
      { "name": "notesIA", "fullWidth": true },
      false
    ]
  ]
}
```

### List Layout
Champs essentiels affichés dans la vue liste:
- `tagsIA` (largeur: 20)
- `secteurInfere` (largeur: 15)
- `scoreIA` (largeur: 15)

---

## Exemples d'Utilisation

### Enrichir un Lead avec M.A.X.

```javascript
// PATCH /Lead/{id}
{
  "tagsIA": ["PME", "Tech", "Urgent"],
  "secteurInfere": "Technologies de l'information",
  "scoreIA": 85,
  "servicesSouhaites": "Site web, SEO, Marketing digital",
  "notesIA": "Lead très qualifié - entreprise en croissance",
  "description": "Description enrichie par M.A.X."
}
```

### Lire les Champs M.A.X.

```javascript
// GET /Lead/{id}
const lead = await espoFetch(`/Lead/${leadId}`);
console.log({
  tags: lead.tagsIA,
  secteur: lead.secteurInfere,
  score: lead.scoreIA,
  services: lead.servicesSouhaites,
  notes: lead.notesIA
});
```

---

## Champs DÉPRÉCIÉS (NE PLUS UTILISER)

| Ancien Nom | Remplacé Par | Date Dépréciation |
|------------|--------------|-------------------|
| `secteur` | `secteurInfere` | 2025-11-26 |
| `maxTags` | `tagsIA` | 2025-11-26 |

**Note:** Ces champs peuvent encore exister dans certains leads anciens mais ne doivent PLUS être utilisés dans le nouveau code.

---

## Maintenance

### Ajouter un Nouveau Champ M.A.X.

1. Créer le champ dans EspoCRM Admin → Entity Manager → Lead → Fields
2. Ajouter la définition dans `custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json`
3. Mettre à jour ce document de mapping
4. Exécuter `fix_layouts.js` pour ajouter aux layouts
5. Clear cache + rebuild EspoCRM

### Supprimer un Champ

1. Marquer comme DÉPRÉCIÉ dans ce document (NE PAS SUPPRIMER)
2. Créer une migration pour copier les données vers le nouveau champ
3. Après 3 mois sans utilisation, supprimer physiquement

---

## Outils de Maintenance

### Audit CRM
```bash
node tools/crm_audit.js
```
Détecte les incohérences entre metadata et données réelles.

### Fix Layouts
```bash
node tools/fix_layouts.js
```
Ajoute automatiquement les champs M.A.X. aux layouts Detail et List.

---

## Historique des Modifications

| Date | Version | Modification | Auteur |
|------|---------|--------------|--------|
| 2025-11-26 | 1.0 | Création du mapping stable | Claude Code |

---

## Notes Importantes

1. **TOUS les champs custom M.A.X. doivent avoir `isCustom: true` dans metadata**
2. **Ne JAMAIS modifier directement la base de données** - toujours passer par l'API EspoCRM
3. **Après toute modification de metadata ou layouts** - toujours faire clear-cache + rebuild
4. **Les champs array comme `tagsIA` doivent avoir `storeArrayValues: true`**

---

**Ce document est LA source de vérité pour le mapping EspoCRM-M.A.X.**
Toute divergence dans le code doit être corrigée pour correspondre à ce mapping.
