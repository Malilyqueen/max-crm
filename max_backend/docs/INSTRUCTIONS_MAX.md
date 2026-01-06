# Instructions pour M.A.X. - Mode Opérateur Robuste v1

## Message à Copier-Coller pour M.A.X.

```
Mode Opérateur Robuste v1

Résous toujours les leads par nom/email (pas par ID).

Si un champ manque, crée-le puis rejoue l'update.

Fais un PATCH partiel uniquement sur : tags, objectifs, servicesSouhaites, statutActions, prochainesEtapes (n'exige pas nom/email/entreprise).

Après mise à jour, rafraîchis et affiche par lead :
Nom | Email | Compte | Tags | Objectifs | Services souhaités | Statut des actions | Prochaines étapes | Modifié le.

Si 404 sur un lead, signale-le et continue pour les autres.

Si un bouton échoue (400/5xx), rejoue l'intention en texte sans me redemander.

Budget tokens : réponds en ≤ 900 tokens.

Étapes unitaires : exécute une étape → réponds « Étape X terminée » + résumé 1 ligne, attends mon OK.

Pas de relance automatique si contexte trop long : propose « Continuer étape suivante ? »
```

---

## Configuration Manuelle des Layouts (À Faire Une Fois)

### Étape A : Layouts EspoCRM (3 minutes - Interface Web)

1. **Accéder à EspoCRM** : http://127.0.0.1:8081/espocrm
2. **Administration** → **Entity Manager** → **Lead** → **Layouts**

#### Detail Layout (et Detail (Small) si disponible) :
Ajouter les champs suivants dans la vue de détail :
- Tags (maxTags)
- Objectifs (objectifsBusiness)
- Services souhaités (servicesSouhaites)
- Statut des actions (statutActions)
- Prochaines étapes (prochainesEtapes)

#### List Layout :
Ajouter les champs suivants dans la vue de liste :
- Tags (maxTags)
- Statut des actions (statutActions)

3. **Rebuild** : Administration → Rebuild

---

## Alternative : Snapshot Lead (Sans Modification des Layouts)

Si vous ne voulez pas modifier les layouts EspoCRM immédiatement, utilisez cette commande :

```
Affiche un panneau Snapshot par lead (sans ouvrir Espo) avec les 5 champs : Tags, Objectifs, Services souhaités, Statut des actions, Prochaines étapes, en lisant directement via API. Continue même si certains sont vides.
```

M.A.X. utilisera le tool `get_lead_snapshot` qui lit directement via l'API sans dépendre du layout EspoCRM.

---

## Garde-Fous Budget Tokens

Ces règles sont intégrées dans le Mode Opérateur Robuste v1 :

- **Budget tokens** : Réponses limitées à ≤ 900 tokens
- **Étapes unitaires** : Exécute une étape → répond "Étape X terminée" + résumé 1 ligne
- **Pas de relance automatique** : Si contexte trop long, M.A.X. propose "Continuer étape suivante ?" au lieu de boucler

---

## Limitations Importantes

### ⚠️ Ce que M.A.X. NE PEUT PAS Faire

- **Modifier les layouts EspoCRM** : Les layouts (Entity Manager → Layouts) ne sont pas accessibles via l'API REST, même avec droits admin
- **Ajouter des champs aux vues automatiquement** : Cela doit être fait manuellement dans l'interface EspoCRM
- **Reconstruire les layouts via code** : L'action "Rebuild" n'est pas disponible via l'API

### ✅ Ce que M.A.X. PEUT Faire

- **Créer des champs custom** : Via `/Admin/fieldManager` avec droits admin
- **Lire/écrire dans ces champs** : Via PATCH même si non visibles dans le layout
- **Afficher un Snapshot** : Panneau récapitulatif sans dépendre du layout EspoCRM

---

## Tools Disponibles

M.A.X. dispose maintenant de 3 tools principaux pour les leads :

### 1. `query_espo_leads`
Recherche et liste les leads avec filtres.

### 2. `update_lead_fields` ⭐ NOUVEAU
Met à jour des champs spécifiques avec :
- Résolution intelligente par nom/email
- PATCH partiel (pas besoin de tous les champs)
- Auto-création des champs manquants
- Gestion 404 robuste

### 3. `get_lead_snapshot` ⭐ NOUVEAU
Affiche un snapshot des leads sans dépendre du layout EspoCRM.

### 4. `create_custom_field`
Crée un champ personnalisé dans EspoCRM avec droits admin.

---

## Consommation Tokens Actuelle

**État au 2025-11-11 :**
- Budget Total: 1 000 000 tokens
- Tokens Utilisés: 187 195 tokens (18.7%)
- Tokens Restants: 812 805 tokens
- Coût: 0.051 USD

**Moyenne par tâche :** ~8 939 tokens

Avec le Mode Opérateur Robuste v1 (limite 900 tokens), la consommation devrait être réduite de ~90%.

---

## Exemples d'Utilisation

### Exemple 1 : Mettre à jour un tag
```
Mets le tag "VIP" sur Sophie Martin
```
M.A.X. résoudra Sophie par nom, fera un PATCH partiel, créera le champ maxTags si nécessaire.

### Exemple 2 : Afficher un snapshot
```
Affiche un snapshot de tous les leads cosmétiques
```
M.A.X. utilisera `get_lead_snapshot` pour afficher les 5 champs clés sans dépendre du layout.

### Exemple 3 : Mise à jour massive
```
Ajoute le statut "En cours" à tous les leads créés aujourd'hui
```
M.A.X. fera un PATCH partiel sur chaque lead, gérera les 404, et continuera.

---

**Date de mise à jour :** 2025-11-11
