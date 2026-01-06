# Guide : Comment parler à M.A.X. pour configurer EspoCRM

## 🎯 Vocabulaire clé

### Champs vs Layouts

**CHAMP** = Une donnée stockée (ex: nom, email, tags)
**LAYOUT** = Comment afficher les champs (liste, fiche détail, formulaire)

## 📊 Types de vues

| Ce que tu veux modifier | Tu dis à M.A.X. | Layout technique |
|------------------------|-----------------|------------------|
| Colonnes de la liste | "Ajoute X à la **liste** des leads" | `list` |
| Fiche détaillée | "Ajoute X à la **fiche** du lead" | `detail` |
| Popup rapide | "Ajoute X à la **vue rapide**" | `detailSmall` |
| Formulaire création | "Ajoute X au **formulaire** de création" | `edit` |

## 🏷️ Champs de tags

| Nom technique | Nom affiché | Usage |
|--------------|-------------|-------|
| `tags` | Tags utilisateur | Tags manuels ajoutés par l'utilisateur |
| `maxTags` | Tags M.A.X. | Tags automatiques générés par M.A.X. |

### Comment parler de ces champs

✅ **CORRECT** :
- "Ajoute les **Tags M.A.X.** à la liste"
- "Mets à jour le champ **maxTags**"
- "Affiche les **tags utilisateur** dans la fiche"

❌ **AMBIGU** :
- "Ajoute les tags" → Quel champ ? `tags` ou `maxTags` ?

## 📝 Exemples de demandes claires

### Modifier la liste (colonnes)
```
"Ajoute la colonne Email à la liste des leads"
"Retire le champ Date de création de la liste"
"Mets Tags M.A.X. en première colonne"
```

### Modifier la fiche détaillée
```
"Ajoute le champ Téléphone à la fiche du lead"
"Retire Secteur d'activité de la fiche"
"Place Description en haut de la fiche"
```

### Modifier un champ spécifique
```
"Mets à jour maxTags pour le lead Sophie Martin"
"Change le statut du lead en Qualifié"
"Ajoute 'Urgent' dans les tags utilisateur"
```

## 🎨 Personnalisation avancée

### Créer un nouveau champ
```
"Crée un champ texte appelé 'Notes internes' sur Lead"
"Ajoute un champ liste déroulante 'Priorité' avec options: Haute, Moyenne, Basse"
```

### Configurer les layouts
```
"Configure le layout liste pour afficher : Nom, Email, Tags M.A.X., Statut"
"Réorganise la fiche détail avec Nom en premier, puis Email, puis Téléphone"
```

## 🔍 Vocabulaire M.A.X.

| Tu dis | M.A.X. comprend |
|--------|-----------------|
| "liste" | Layout `list` (colonnes tableau) |
| "fiche", "détail", "complète" | Layout `detail` |
| "formulaire", "création", "édition" | Layout `edit` |
| "vue rapide", "popup" | Layout `detailSmall` |
| "colonne" | Champ dans layout `list` |
| "Tags M.A.X." | Champ `maxTags` |
| "Tags utilisateur" | Champ `tags` |

## ⚠️ Pièges à éviter

1. **Ne pas confondre champ et layout**
   - ❌ "Crée une colonne Email" → Email existe déjà comme champ
   - ✅ "Ajoute Email à la liste" → Ajoute le champ existant au layout

2. **Être spécifique sur les tags**
   - ❌ "Affiche les tags dans la liste"
   - ✅ "Affiche Tags M.A.X. dans la liste"

3. **Préciser le layout**
   - ❌ "Ajoute le téléphone"
   - ✅ "Ajoute le téléphone à la fiche détail"

## 🚀 Best Practices

1. **Toujours préciser le layout** : "liste", "fiche", "formulaire"
2. **Utiliser les noms affichés** : "Tags M.A.X." plutôt que "maxTags"
3. **Une demande = une action** : Ne mélange pas création de champ et modification de layout
4. **Valider après chaque modification** : Rafraîchis l'interface et vérifie le résultat

## 📞 Exemples complets

### Scénario 1 : Nouveau champ de bout en bout
```
Toi: "Crée un champ texte 'Budget estimé' sur Lead"
M.A.X.: [Crée le champ]

Toi: "Ajoute Budget estimé à la liste des leads"
M.A.X.: [Ajoute au layout list]

Toi: "Ajoute Budget estimé à la fiche détail"
M.A.X.: [Ajoute au layout detail]
```

### Scénario 2 : Réorganiser la liste
```
Toi: "Configure la liste des leads pour afficher dans cet ordre :
Nom, Statut, Tags M.A.X., Email, Téléphone, Date de création"
M.A.X.: [Reconfigure le layout list]
```

### Scénario 3 : Nettoyer les layouts
```
Toi: "Retire tous les champs de test de la liste des leads"
M.A.X.: [Identifie et retire testFieldMaxLO, etc.]
```

## 🎓 Pour aller plus loin

- Les layouts sont stockés dans `/custom/Espo/Custom/Resources/layouts/Lead/`
- Les champs sont définis dans `/custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json`
- Après modification, toujours faire : Clear Cache + Rebuild EspoCRM