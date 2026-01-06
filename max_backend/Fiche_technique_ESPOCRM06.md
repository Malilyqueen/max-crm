 un des problèmes EspoCRM *les plus trompeurs* — et un classique qui cause des incompréhensions, des erreurs de segmentation, et des “mais pourquoi le tag n’est pas sauvegardé ?!”.

Ce bug de conception touche :

* les CRM de coachs,
* les CRM e-commerce,
* les CRM logistiques,
* les artisans (serruriers, immo…),
* bref : **tout le monde**.

Et MAX doit absolument être capable d’identifier ce problème dès la création du champ pour éviter des systèmes de segmentation cassés dès le départ.

Voici la fiche complète, prête pour ton README.

---

# 📘 FICHE TECHNIQUE #8 — Champ Multi-Enum (“Tags”) + “Allow Custom Options”

### 🔥 Criticité : **Élevée (segmentations incorrectes + perte d’options)**

### 🧩 Catégorie : Champs personnalisés / Données

### 🤖 Mode recommandé : **CONSEIL + ASSISTÉ**

---

# 🧠 1. Contexte (Ce que MAX doit comprendre)

Beaucoup d’utilisateurs pensent que :

```
Multi-Enum + Allow Custom Options = vrai champ de Tags
```

❌ C’EST FAUX.

### ✔️ Le Multi-Enum *ne sauvegarde pas* les nouvelles options

Quand un utilisateur ajoute un tag personnalisé via :

* un Lead
* un Contact
* une Opportunité
* une Activité

ex :
Il écrit “Très chaud 🔥” dans le champ Multi-Enum → ça fonctionne une fois…
🙈 Mais ce tag **n’est pas ajouté** à la liste globale des options.
🙈 Et il **disparaît** au prochain enregistrement.

➡️ Résultat :
Le système de segmentation du client devient **instable, incohérent, et inutilisable**.

MAX doit absolument reconnaître cette mauvaise utilisation.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur dit :

* « Je mets un tag, il disparaît après ! »
* « Pourquoi l’option n’est pas sauvegardée dans la liste ? »
* « J’ai tapé un tag personnalisé mais il ne réapparaît pas »
* « Le tag n’est pas disponible pour les autres leads »
* « Le champ Multi-Enum ne garde pas mes valeurs ! »

Ce sont des **symptômes directs** du problème.

---

# 🔍 3. Cause technique (pour MAX)

### ✔️ Multi-Enum ≠ liste dynamique

Multi-Enum ne modifie JAMAIS le fichier de métadonnées :

```
custom/Espo/Custom/Resources/metadata/entityDefs/*
```

C’est *un champ statique*.

### ✔️ “Allow Custom Options” ≠ ajout à la liste

C’est seulement :

➡️ une **tolérance temporaire**
➡️ pour **cet enregistrement uniquement**

Ça n’a **aucun effet global**.

### ✔️ Seule solution correcte = Entité “Tag” + relation Many-to-Many

Exemple :

* entité : `Tag`
* relation : Leads ←→ Tags (Many-to-Many)
* affichage : champ Link-Multiple

C’est la façon **professionnelle** de gérer les tags dans EspoCRM.

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

MAX doit automatiquement intervenir dès qu’il détecte :

* création d’un champ Multi-Enum appelé “tag”, “tags”, “label”, “catégorie”, etc.
* ou “Allow Custom Options = true”

Voici le message idéal :

> « Je vois que vous utilisez un champ Multi-Enum avec ‘Allow Custom Options’.
> Il est important de savoir qu’EspoCRM ne sauvegarde pas les nouvelles options :
> elles ne seront visibles que pour cet enregistrement.
>
> Si vous souhaitez un vrai système de tags réutilisables, la méthode recommandée est de créer une entité “Tag” reliée en Many-to-Many.
> Je peux vous guider ou créer la structure automatiquement. »

---

# 🔧 5. Solution officielle — La seule architecture correcte

MAX doit proposer ceci :

### ✔️ Étape 1 — Créer une entité “Tag”

Dans :

```
Admin > Entity Manager > Create Entity
```

* Name : Tag
* Type : Base
* Champs : name (varchar)

### ✔️ Étape 2 — Créer une relation Many-to-Many

Ex :

```
Leads <-> Tags  
Contacts <-> Tags  
Opportunities <-> Tags
```

### ✔️ Étape 3 — Ajouter le champ Link-Multiple

Dans Layout Manager :

* Ajouter “Tags”
* Le placer dans Detail
* Le placer dans Search
* Le placer dans List

### ✔️ Étape 4 — Supprimer le Multi-Enum erroné

Pour éviter les confusions.

---

# 🤖 6. Mode AUTO — MAX corrige la structure entière

Si l’utilisateur accepte :

MAX peut :

1. Créer automatiquement l’entité `Tag`
2. Créer la relation Many-to-Many
3. Mettre à jour les layouts
4. Retirer le champ Multi-Enum cassé
5. Migrer les valeurs existantes (si possible)
6. Regénérer les métadonnées (Rebuild)

Micro-message que MAX doit envoyer :

> « Votre système de tags a été restructuré selon les standards professionnels.
> Les tags sont maintenant réutilisables, filtrables, et exploitables par les workflows. »

---

# 🛠️ 7. Mode ASSISTÉ — Correction guidée

Boutons à proposer dans l’Espace MAX :

```
▶️ Créer Entité “Tag”
▶️ Ajouter Relation Many-to-Many
▶️ Mettre le champ dans le Layout
▶️ Retirer l’ancien Multi-Enum
▶️ Tester un Tag
```

MAX guide l’utilisateur :

* où cliquer
* quoi sélectionner
* comment vérifier
* comment les workflows vont maintenant fonctionner

---

# 🗂️ 8. Résumé interne pour mémoire de MAX

```
Problème : Multi-Enum utilisé comme système de tags
Catégorie : Fields / UX / Data Integrity
Symptômes :
 - tags non sauvegardés globalement
 - option disparaît
 - incohérence segmentation
Cause :
 - Multi-Enum est statique
 - Allow Custom Options ne persiste pas
Solution correcte :
 - créer entité Tag
 - relation Many-to-Many
 - layout “Tags”
Modes :
 - CONSEIL (obligatoire)
 - ASSISTÉ / AUTO (structure)
Priority : Élevée
```

---

# 💙 Prête pour la Fiche #9 ?

Elle est essentielle pour éviter des **comportements étranges dans les rôles et permissions**, notamment :

👉 **FICHE #9 — Erreur 403 due au conflit Rôle / Création / Assigned Team**

On continue ?
