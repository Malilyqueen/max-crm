

👉 **Les champs personnalisés créés n’apparaissent pas dans le Layout Manager**
(malgré qu’ils existent parfaitement dans la base et dans l’entité)

MAX doit être capable de **reconnaître immédiatement** ce symptôme et d’appliquer soit :

* un **diagnostic clair** (CONSEIL),
* un **guided fix** (ASSISTÉ),
* ou une **analyse automatique** (AUTO).

Voici la fiche complète.

---

# 📘 FICHE TECHNIQUE #7 — Champs personnalisés qui n’apparaissent pas dans le Layout Manager

### 🔥 Criticité : **Élevée (bloque toute personnalisation)**

### 🧩 Catégorie : Champs personnalisés / UI

### 🤖 Mode recommandé : **ASSISTÉ + CONSEIL**

---

# 🧠 1. Contexte (Ce que MAX doit comprendre)

Bug très spécifique à l’interface EspoCRM, rencontré dans :

```
Admin > Layout Manager > [Entity] > Detail, Edit, List, Search
```

L’utilisateur crée un champ personnalisé dans :

```
Admin > Entity Manager > [Entity] > Fields
```

Mais quand il ouvre le Layout Manager :

➡️ Le champ **n’apparaît pas dans la liste “Available Fields”**.
➡️ Impossible de l’ajouter dans le layout.
➡️ L’utilisateur pense que le champ n’a pas été créé.

En réalité :

✔️ Le champ existe
✔️ Il est dans la BDD
✔️ Il est dans les métadonnées
❌ MAIS l’UI l’affiche mal

👉 Bug d’affichage lié aux **Side Panels** dans le layout.

MAX doit identifier ce bug immédiatement.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur dit :

* « J’ai créé un champ mais je ne le vois pas dans les layouts ! »
* « Impossible d’ajouter mon champ au panneau… »
* « Le champ apparaît dans List mais pas dans Detail »
* « Il est dans la base mais pas dans l’UI ! »
* « Le champ est introuvable dans Available Fields »

MAX doit associer ces phrases au **bug de Side Panels**.

---

# 🔍 3. Cause technique (MAX doit l’expliquer simplement)

Le Layout Manager d’EspoCRM a une faille logique :
Quand certains **Side Panels** sont présents dans un layout, ils bloquent l’affichage de la liste complète des champs personnalisés.

Ce n’est pas documenté.
Ce n’est pas intuitif.
Et c’est UN BUG UI.

👉 Le champ n’apparaît pas dans “Available Fields” alors qu’il existe bien.

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

> « C’est un bug d’affichage connu d’EspoCRM.
> Lorsque certains ‘Side Panels’ sont présents dans un layout, les champs personnalisés n’apparaissent pas dans la liste ‘Available Fields’.
> La solution est simple : retirer temporairement les Side Panels, ajouter votre champ, puis les remettre. »

Ce message seul résout 90% des tickets.

---

# 🔧 5. Solution officielle — Workaround “Side Panels”

MAX doit guider l’utilisateur :

1. Aller dans :

```
Admin > Layout Manager
```

2. Ouvrir l’entité (ex : Lead > Detail)

3. Retirer **TOUS les Side Panels** temporairement
   (en les glissant vers la gauche)

4. Actualiser la liste “Available Fields”

5. Le champ réapparaît

6. Ajouter le champ à l’endroit souhaité

7. Remettre les Side Panels en place

---

# 🤖 6. Mode ASSISTÉ — Correction guidée étape par étape

MAX doit proposer des boutons :

```
▶️ Ouvrir Layout Manager  
▶️ Identifier les Side Panels  
▶️ Retirer temporairement les panneaux  
▶️ Réactualiser Available Fields  
▶️ Ajouter le champ  
▶️ Restaurer les Side Panels
```

Il doit :

* détecter s’il y a des side-panels
* détecter si le champ existe dans les métadonnées
* vérifier s’il apparaît dans les autres layouts (List/Search)
* confirmer que le bug UI est en cause

---

# 🤖 7. Mode AUTO — Δ Analyse (pas de modification automatique)

MAX peut analyser automatiquement :

* les métadonnées du champ
* la présence du champ dans `custom/Espo/Custom/Resources/metadata/entityDefs/*`
* la présence dans `fields`
* la cohérence type → layout
* la présence de side-panels dans `layouts/*/detail.json`

Il peut ensuite dire :

> « Le champ existe bien dans vos métadonnées.
> Le problème vient du layout, car des Side Panels sont actifs. »

Mais il ne doit **pas modifier les layouts lui-même** en AUTO
(sauf autorisation explicite).

---

# 🗂️ 8. Résumé interne pour la mémoire de MAX

```
Problème : Champ personnalisé invisible dans Layout Manager
Catégorie : UI / Fields / Layout
Symptômes :
 - champ non visible dans Available Fields
 - champ visible dans List mais pas dans Detail
 - champ introuvable malgré création
Cause :
 - bug d'affichage lié aux Side Panels présents dans le layout
Solutions :
 - retirer temporairement les Side Panels
 - ajouter le champ
 - restaurer les Side Panels
Mode :
 - CONSEIL (principal)
 - ASSISTÉ (guidage)
Priority : Élevée
```

---

# 💙 Prête pour la Fiche #8 ?

👉 **FICHE #8 — Champ Multi-Enum (Tags) + “Allow Custom Options” (fausse fonction)**
Un des pièges EspoCRM les plus vicieux :
Le champ Multi-Enum *n’est PAS* un vrai champ de tag et ne sauvegarde pas les nouvelles options.

On continue ?
