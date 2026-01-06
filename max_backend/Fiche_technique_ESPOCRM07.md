

👉 **Les erreurs 403 causées par les rôles et les équipes**,
même quand tout semble “bien configuré”.

Ce problème est très fréquent dans :

* les équipes commerciales
* les agences
* les artisans avec plusieurs intervenants
* les structures B2B
* les CRM multi-agents (comme les serruriers)
* les équipes logistiques
* les coaches + assistantes
* les entreprises qui assignent des tâches ou leads à d’autres équipes

MAX doit absolument savoir reconnaître ce cas, car **l’utilisateur pense que c’est un bug**, alors que c’est la logique interne stricte d’EspoCRM.

---

# 📘 FICHE TECHNIQUE #9 — Erreur 403 (Conflit Rôle / Assigned Team / Created By)

### 🔥 Criticité : **Élevée (bloque création + workflows)**

### 🧩 Catégorie : Permissions / Rôles / API

### 🤖 Mode recommandé : **CONSEIL + ASSISTÉ**

---

# 🧠 1. Contexte : Ce que MAX doit comprendre absolument

Dans EspoCRM :

* les Rôles sont **strictement restrictifs**
* les équipes définissent ce qu’un utilisateur peut voir
* un enregistrement peut “disparaître” immédiatement après sa création
* le champ `createdBy` n’accorde PAS automatiquement le droit de lecture
* un changement d'équipe peut rendre un record inaccessible INSTANTANÉMENT

Donc :

➡️ l’utilisateur peut créer un enregistrement
➡️ mais NE PEUT PAS l'afficher juste après
➡️ → erreur **403 : You don’t have access to this area**

Et il croit que le CRM est cassé.

MAIS MAX doit comprendre :

✔️ Ce n’est PAS un bug
✔️ C’est la logique native d’EspoCRM
✔️ C’est déroutant mais normal

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur dit des phrases comme :

* « Je viens de créer une tâche mais je ne peux pas l’ouvrir »
* « Je crée un lead pour une autre équipe et j’ai 403 »
* « L’enregistrement disparaît juste après la création ! »
* « Je peux créer mais pas voir… pourquoi ? »
* « Je ne peux pas accéder aux tâches que j’ai créées »
* « Je peux voir mes leads mais pas ceux de l’équipe X »

MAX doit reconnaître ce pattern immédiatement.

---

# 🔍 3. Cause technique (MAX doit pouvoir l’expliquer simplement)

### ✔️ Cause 1 — Le Rôle interdit la lecture sur certains Owners

Exemple :

```
Le rôle : Only Own  
Mais la tâche est assignée à une autre équipe → 403
```

### ✔️ Cause 2 — Le champ CreatedBy n’accorde pas le droit de lecture

EspoCRM NE donne PAS automatiquement accès à :

```
Lire un enregistrement que j’ai créé  
→ si l’assignedUser appartient à une autre équipe
```

Donc :

* l’utilisateur crée l'enregistrement
* le champ assignedUser/Team le réassigne
* l’utilisateur n’a plus le droit de le voir
* il obtient un 403

### ✔️ Cause 3 — L’assignation automatique casse la visibilité

Si un workflow assigne un record à une équipe plus restrictive → 403 immédiat.

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

> « Cette erreur 403 n’est pas un bug.
> Elle apparaît lorsqu’un utilisateur crée un enregistrement assigné à une équipe pour laquelle il n’a pas de permission de lecture.
>
> EspoCRM ne donne pas automatiquement accès au créateur (“createdBy”) si le rôle ne le permet pas.
> Je peux vous expliquer où ajuster cela ou corriger la configuration ensemble. »

---

# 🔧 5. Solutions (MAX doit proposer 3 chemins)

### ✔️ SOLUTION A — Donner accès aux enregistrements “créés par”

Dans :

```
Admin > Rôles > [Role] > Field Level Security
```

Ajouter dans “Read” :

```
createdBy or team
```

Si possible :

```
Assignment Permission = team
Team Scope = all
```

---

### ✔️ SOLUTION B — Ajuster les permissions de l’équipe

Dans :

```
Admin > Users > [User] > Teams
```

S’assurer que :

* l’utilisateur fait bien partie de l’équipe qui reçoit les enregistrements
* ou qu’il a un rôle qui lui donne accès à cette équipe

---

### ✔️ SOLUTION C — Créer un rôle secondaire “opérationnel”

Très utilisé dans les CRM commerciaux.

Créer un rôle :

```
Nom : Accès Créateur Étendu
Read : team
Edit : team
Delete : team
Assignment : all
```

Lui donner ce rôle en plus de son rôle strict.

---

# 🤖 6. Mode ASSISTÉ — Correction guidée

MAX doit afficher :

```
▶️ Voir les équipes de l’utilisateur
▶️ Voir tous ses rôles
▶️ Voir AssignedUser / AssignedTeam du record
▶️ Vérifier la cohérence
▶️ Proposer la correction
```

Et guider étape par étape :

* dans les Rôles
* dans les Teams
* dans la configuration des permissions
* dans la sécurité au niveau champ
* dans les workflows d’assignation

---

# 🛠️ 7. Mode AUTO — Analyse complète (pas de correction automatique)

MAX peut analyser automatiquement :

* le rôle complet
* les équipes
* le champ assignedUser
* le champ assignedTeam
* le workflow qui fait l’assignation

Et dire :

> « J’ai détecté que vous créez une tâche assignée à l’équipe Support, mais votre rôle ne permet pas de voir les enregistrements de cette équipe.
> Je peux vous proposer une correction. »

Mais il NE doit PAS modifier les rôles automatiquement
(sauf autorisation explicite).

---

# 🗂️ 8. Résumé interne pour mémoire de MAX

```
Problème : Erreur 403 après création (conflit rôle/équipe)
Catégorie : Rôles / Permissions / Security
Symptômes :
 - enregistrement disparaît après création
 - impossible de l’ouvrir (403)
 - assigné à une autre équipe
Cause :
 - createdBy ≠ permission de lecture
 - rôle trop restrictif
 - assignation automatique casse visibilité
Solutions :
 - élargir permissions Read
 - ajuster équipes
 - rôle secondaire
Mode :
 - CONSEIL (principal)
 - ASSISTÉ (guidage)
Priority : Élevée
```

---


