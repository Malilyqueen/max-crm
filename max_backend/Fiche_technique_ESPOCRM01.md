

Celle-ci est **hyper importante**, car l’erreur 403 touche :

* les workflows,
* les imports,
* n8n,
* les APIs externes,
* et toutes les automatisations.

C’est un des problèmes les plus fréquents dans EspoCRM.

---

# 📘 FICHE TECHNIQUE #3 — Erreur API 403 (Permission d’assignation manquante)

### 🔥 Criticité : **Élevée (bloque toutes automatisations)**

### 🧩 Catégorie : API & Permissions

### 🤖 Mode recommandé : **ASSISTÉ ou AUTO**

---

# 🧠 1. Contexte (Ce que MAX doit comprendre)

Dans EspoCRM, **avoir les permissions “Create” & “Edit”** NE suffit PAS pour créer ou modifier des enregistrements via API.

Pour les entités qui ont un champ :

```
assignedUser
team
assignedUserId
assignedTeamsIds
```

Il existe une permission spécifique :

➡️ **Assignment Permission**
➡️ **Séparée et indépendante des permissions Create/Edit**

Si elle manque :
→ l'action API échoue
→ EspoCRM renvoie **403 “Forbidden: Assignment denied”**

C’est invisible pour 90% des utilisateurs.
MAX doit le reconnaître immédiatement.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur dit :

* « n8n ne peut pas créer le lead »
* « L’API me renvoie 403 mais j’ai toutes les permissions »
* « Je peux créer le contact à la main mais pas via n8n »
* « Le workflow externe ne marche plus »

Dans n8n :

```
Status: 403
Message: Assignment failure
```

Dans l’UI :

```
You don't have access to this area.
```

Tous ces cas = **Assignment Permission manquante**.

---

# 🔍 3. Cause technique (MAX doit la connaître)

EspoCRM protège les champs :

* `assignedUserId`
* `assignedTeamId`
* `assignedUsersIds`
* `usersIds`
* `teamsIds`

⚠️ Même si l’utilisateur API a :
✔️ Create
✔️ Edit
✔️ View

Il lui manque souvent :

➡️ **Assignment Permission**
qui doit être explicitement définie sur :

```
all
team
own
```

Sans cela :

* impossible d’assigner un enregistrement
* impossible de créer un lead/contact/opportunité
* impossible de modifier un record existant
* n8n échoue systématiquement

---

# 🧩 4. Message que MAX doit jouer (Mode CONSEIL)

> « L’erreur API 403 provient d’un manque de permission d’assignation.
> Même si l’utilisateur API a les permissions Create/Edit, il lui manque *Assignment Permission*, indispensable pour les champs assignedUser/assignedTeam.
> Je peux vous guider ou corriger cela automatiquement. »

---

# 🔧 5. Solution côté Utilisateur (Workaround officiel)

MAX doit guider l’utilisateur vers :

```
Administration > Rôles > [Rôle API] > Assignment Permission
```

Et régler :

```
Assignment Permission = all
```

OU, pour un usage restreint :

```
Assignment Permission = team
```

MAX doit aussi vérifier si :

* l’utilisateur API est dans une équipe
* l’équipe n’est pas vide
* l’équipe existe encore
* les rôles ne sont pas contradictoires

---

# 🤖 6. Solution Mode AUTO (si autorisé)

Si l’utilisateur accepte :

MAX exécute automatiquement :

1. Récupère le rôle de l’utilisateur API
2. Vérifie la valeur de :

   ```
   assignmentPermission
   ```
3. La modifie en :

   ```
   all
   ```
4. Sauvegarde via l’API Admin
5. Teste une création de Lead/Contact

MAX dit :

> « J’ai corrigé la permission d’assignation du rôle API.
> Vous pouvez réessayer vos workflows. »

---

# 🛠️ 7. Mode ASSISTÉ — Correction guidée

MAX affiche :

```
▶️ Ouvrir les Permissions du Rôle
▶️ Vérifier les Permissions Create/Edit
▶️ Vérifier Assignment Permission
▶️ Tester la création d’un enregistrement
```

Il guide l'utilisateur :

1. “Cliquez sur Admin”
2. “Ouvrez Rôles”
3. “Sélectionnez votre rôle API”
4. “Activez Assignment Permission sur ‘All’”
5. “Enregistrez”

Il propose ensuite :

```
▶️ Tester la connection API
```

---

# 🗂️ 8. Résumé interne pour la mémoire de MAX

```
Problème : API 403 - Permission denied
Catégorie : API & Permissions
Symptômes :
 - n8n échoue en 403
 - "Assignment failure"
 - UI : "You don't have access to this area"
Cause :
 - Assignment Permission manquante sur le rôle API
Solution :
 - activer Assignment Permission = all/team
 - vérifier équipe API
Mode :
 - CONSEIL / ASSISTÉ / AUTO
Priority : Élevée
```

---



