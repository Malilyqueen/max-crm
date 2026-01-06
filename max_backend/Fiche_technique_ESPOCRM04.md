

> **Les workflows planifiés (“Scheduled Workflows”) qui se BLOQUENT**
> → sans message d’erreur
> → sans raison apparente
> → et qui cassent toutes les automatisations derrière.

MAX doit absolument maîtriser ça, car c’est **un des échecs silencieux les plus critiques**.

Voici la fiche complète, prête à intégrer au README technique.

---

# 📘 FICHE TECHNIQUE #6 — Workflows “Scheduled” bloqués (Scheduler Stuck)

### 🔥 Criticité : **Très Élevée (Automatisation paralysée)**

### 🧩 Catégorie : Workflow / BPM

### 🤖 Mode recommandé : **ASSISTÉ + AUTO**

---

# 🧠 1. Contexte (que MAX doit comprendre absolument)

EspoCRM utilise un **scheduler interne** qui exécute :

* les workflows planifiés
* les BPM programmés
* les relais de tâches
* les envois d’email automatisés
* les répétitions (toutes les X minutes)

Ce scheduler peut se retrouver **coincé (“stuck”)** :

* après un bug
* après une mise à jour
* après une erreur dans un workflow
* après une formule mal écrite
* ou sans raison apparente (échec silencieux)

Quand il est coincé :

➡️ plus AUCUN workflow planifié ne tourne.
➡️ plus d’emails automatiques.
➡️ plus de séquences.
➡️ plus de follow-up.
➡️ l’entreprise perd du business… sans le savoir.

MAX doit donc **détecter, diagnostiquer et réparer**.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur remarque :

* « Mes workflows ne s’exécutent plus »
* « Mes emails automatiques ne partent plus »
* « Mon workflow planifié toutes les 10 min ne tourne plus »
* « Le cron tourne mais rien ne se passe »
* « Le log montre une exécution, mais aucune action effectuée »

C’est le signe classique du **scheduler stuck**.

Dans les logs :

* dernière exécution : il y a plusieurs heures
* ou aucune erreur visible
* ou “executed” mais “action” non réalisée

👉 **Échec silencieux total.**

---

# 🔍 3. Causes techniques (MAX doit les connaître)

## ✔️ Cause 1 — Le scheduled job s’est mis en “faulty state”

EspoCRM marque un workflow comme :

```
status = Running
```

Mais il NE se relance plus.

## ✔️ Cause 2 — Une erreur dans une Script Task BPM

Un script mal écrit → crash → bloque le scheduler.

## ✔️ Cause 3 — Une formule mal écrite

Ex : division par zéro, null, champ inexistant.

Les workflows meurent en silence.

## ✔️ Cause 4 — Après une mise à jour

Il arrive que le scheduler reste bloqué après un upgrade.

## ✔️ Cause 5 — Cron du serveur fonctionne, mais EspoCRM interne est bloqué

Cas classique :
CRON OK → EspoCRM KO.

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

> « Votre workflow planifié ne s’exécute plus.
> C’est un problème courant d’EspoCRM : le scheduler interne peut se bloquer silencieusement.
> Je vais vous montrer comment le redémarrer ou je peux le faire automatiquement. »

---

# 🔧 5. Solution officielle — “Redémarrer” le Scheduler

### ⭐ C’est l’étape **MAGIQUE** qui répare 90% des cas.

MAX doit guider :

1. Aller dans :

```
Administration > Scheduled Jobs
```

2. Trouver :

```
Run Scheduled Workflows
```

3. Faire :

```
Status = Inactive
```

4. Puis :

```
Admin > Rebuild
```

5. Puis revenir et faire :

```
Status = Active
```

Cela “réinitialise” le scheduler interne.

---

# 🤖 6. Mode AUTO — MAX répare seul

Si autorisé par l’utilisateur, MAX doit :

1. détecter l’absence d’exécution depuis X minutes
2. désactiver le job :

```
PATCH /Admin/ScheduledJob/runScheduledWorkflows (status=inactive)
```

3. lancer :

```
POST /Admin/Rebuild
```

4. réactiver :

```
PATCH /Admin/ScheduledJob/runScheduledWorkflows (status=active)
```

5. vérifier exécution dans les logs
6. renvoyer :

> « Le scheduler a été redémarré et vos workflows planifiés sont à nouveau opérationnels. »

---

# 🛠️ 7. Mode ASSISTÉ — Correction guidée étape par étape

Boutons que MAX doit afficher :

```
▶️ Vérifier dernière exécution
▶️ Afficher logs
▶️ Désactiver Scheduler
▶️ Lancer Rebuild
▶️ Réactiver Scheduler
▶️ Tester workflow
```

MAX doit :

* montrer la dernière exécution (timestamp)
* montrer les logs (succès / échecs)
* détecter formule ou script erroné
* aider à corriger une Script Task si besoin

---

# 🧪 8. Vérifications supplémentaires que MAX doit faire

MAX doit **toujours** vérifier :

## ✔️ 1. Y a-t-il une formule erronée ?

(ex : `1/0`, `null.field`, `string + number`)

## ✔️ 2. Y a-t-il une Script Task BPM qui plante ?

→ MAX doit lire les logs BPM.

## ✔️ 3. Y a-t-il un workflow trop long ?

(ex : boucle de calcul sur grande table)

## ✔️ 4. Y a-t-il un workflow avec déclencheur incorrect ?

Exemple :
Planifié sur “every 10 minutes” mais condition jamais remplie.

---

# 🗂️ 9. Résumé interne pour la mémoire de MAX

```
Problème : Scheduled workflows ne s'exécutent plus
Catégorie : Workflow / BPM
Symptômes :
 - workflows arrêtés
 - aucune action malgré une exécution
 - logs incomplets
 - absence d'exécution récente
Causes :
 - scheduler stuck
 - script BPM error
 - formule erronée
 - upgrade d’EspoCRM
Solutions :
 - reset scheduler (inactive → rebuild → active)
 - corriger formule/script
Modes :
 - ASSISTÉ / AUTO / CONSEIL
Priority : Très Élevée
```

---


