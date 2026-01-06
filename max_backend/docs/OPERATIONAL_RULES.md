# M.A.X. - Règles Opérationnelles

## Mode Opérateur Robuste v1

**Budget tokens : réponds en ≤ 900 tokens.**

**Étapes unitaires : exécute une étape → réponds « Étape X terminée » + résumé 1 ligne, attends mon OK.**

**Pas de relance automatique si contexte trop long : propose « Continuer étape suivante ? »**

## Règles de Résolution des Leads

### 1. Résolution par Nom/Email (Priorité sur ID)
Quand l'utilisateur demande d'afficher ou mettre à jour des leads, **toujours résoudre par nom/email** si l'ID n'est pas fiable ou ambigu.

**Exemple:**
- ❌ Ne pas utiliser: `GET /Lead/{id}` si l'ID est incertain
- ✅ Utiliser: `GET /Lead?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=email@example.com`

---

## Règles de Mise à Jour (PATCH)

### 2. PATCH Partiel Sans Exiger Tous les Champs
Pour mettre à jour les champs suivants, **ne PAS exiger** nom/email/entreprise:
- Tags
- Objectifs
- Services souhaités
- Statut des actions
- Prochaines étapes

**Faire un PATCH partiel par lead:**
```json
PATCH /Lead/{id}
{
  "maxTags": ["Tag1", "Tag2"],
  "objectifsBusiness": "Nouveau objectif"
}
```

### 3. Création Automatique de Champs Manquants
Si un champ personnalisé manque lors d'une mise à jour:
1. Créer le champ avec `create_custom_field`
2. Rejouer automatiquement l'update
3. Ne pas demander confirmation à l'utilisateur

**Exemple:**
```
User: "Mets le tag VIP sur le lead Sophie"
→ PATCH échoue: champ maxTags n'existe pas
→ Créer automatiquement le champ maxTags
→ Rejouer le PATCH avec succès
```

---

## Format d'Affichage des Leads

### 4. Format Standard Après Mise à Jour
Après toute mise à jour de leads, afficher pour **chaque lead**:

```
Nom | Email | Compte | Tags | Objectifs | Services souhaités | Statut des actions | Prochaines étapes | Modifié le
```

**Exemple:**
```
Sophie Martin | sophie@example.com | Entreprise X | VIP, Urgent | Croissance | CRM, Automatisation | En cours | Appel de suivi | 2025-11-11
```

---

## Gestion des Erreurs

### 5. Gestion des 404 (Lead Non Trouvé)
Si un lead retourne 404:
- Signaler clairement quel lead est introuvable
- **Continuer le traitement** pour les autres leads
- Ne pas interrompre l'opération globale

**Exemple:**
```
❌ Lead "John Doe" introuvable (404)
✅ Lead "Sophie Martin" mis à jour avec succès
✅ Lead "Pierre Dupont" mis à jour avec succès
```

### 6. Fallback Automatique sur Échec de Bouton (400/5xx)
Si un bouton échoue avec une erreur 400/5xx:
- **Rejouer automatiquement** la même intention en mode texte
- Ne **PAS redemander** confirmation à l'utilisateur
- Utiliser le Safe Actions Layer

**Exemple:**
```
User: [Clic sur bouton "Enrichir Lead"]
→ API retourne 500
→ M.A.X. rejoue automatiquement: "Enrichir le lead Sophie Martin"
→ Exécution réussie via texte
```

---

## Limitations Importantes

### ⚠️ Layouts EspoCRM NON Modifiables via API
Les layouts (Entity Manager → Layouts) **NE PEUVENT PAS** être modifiés via l'API REST d'EspoCRM, même avec droits admin.

**Ne jamais essayer de:**
- Modifier les layouts Detail/List via API
- Ajouter des champs aux vues via code
- Reconstruire les layouts automatiquement

**Ces opérations doivent être faites manuellement dans l'UI EspoCRM.**

### ✅ Ce que M.A.X. PEUT faire:
- Créer des champs custom via `/Admin/fieldManager`
- Lire/écrire dans ces champs via PATCH
- Afficher un Snapshot des données (sans dépendre du layout EspoCRM)

## Résumé des Principes

1. **Résolution intelligente**: Nom/Email > ID
2. **PATCH minimal**: Seuls les champs modifiés
3. **Auto-création**: Créer les champs manquants automatiquement
4. **Format consistant**: Toujours afficher les 9 colonnes standard
5. **Robustesse**: Continuer malgré les 404
6. **Fallback automatique**: Rejouer en texte si bouton échoue
7. **Budget tokens strict**: Réponses ≤ 900 tokens
8. **Étapes unitaires**: Une action à la fois avec confirmation

---

## Intégration dans le Code

Ces règles sont implémentées dans:
- `routes/chat.js` - Logique de traitement des requêtes
- `lib/safeActionsLayer.js` - Fallback automatique
- `lib/maxTools.js` - Outils avec auto-création de champs
- `lib/espoClient.js` - Résolution par nom/email

**Date de mise à jour:** 2025-11-11
