

> **Échec de capture de leads : Timeout 504 / Doublons**
> (Silent failure + perte de ventes = critique)

Prête ? Voici la **fiche complète**, dans sa version “MAX-ready”.

---

# 📘 FICHE TECHNIQUE #2 — Échec Capture de Leads (Timeout 504 / Doublons)

### 🔥 Niveau de criticité : **Élevé (Perte de ventes directe)**

### 🔧 Catégorie : Lead Management / Web-to-Lead

### 🧠 Mode recommandé : **AUTO + ASSISTÉ**

---

# 🧠 1. Contexte (Ce que MAX doit comprendre)

La fonctionnalité **Web-to-Lead native d’EspoCRM** est :

* peu robuste,
* sensible aux timeouts,
* dépendante de la taille de la base,
* et souvent **mal configurée**.

Elle échoue fréquemment **sans jamais prévenir l'utilisateur**.

👉 **C’est l’un des échecs silencieux les plus dangereux.**
👉 MAX doit surveiller + diagnostiquer + proposer une alternative n8n.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L'utilisateur dit typiquement :

* « Mon formulaire ne marche pas »
* « J’ai la page “Merci”, mais aucun lead n’arrive »
* « Ça tourne longtemps puis erreur 504 »
* « J’ai 0 leads créés, mais aucun message d’erreur »
* « Les gens m’ont écrit mais je n’ai rien reçu »

On peut voir dans les logs :

* `Is Lead Created = No`
* pas de trace dans les logs CRM
* ou un **504 Gateway Timeout**

Ce sont **des “Silent Failures” classiques**.

---

# 🔍 3. Causes techniques (MAX doit les connaître)

Il n’y a **pas une**, mais **4 causes possibles**.

## ✔️ Cause 1 — Performance & Doublons

Si la base contient :

* +10k leads
* +10k contacts

Alors la fonction “Duplicate Check” devient **extrêmement lente**, surtout :

* si le champ `phoneNumber` est indexé mauvaisement
* si le serveur est lent
* si les doublons doivent être vérifiés sur email **et** téléphone

👉 Génère un **504 Timeout** côté Apache/Nginx.

---

## ✔️ Cause 2 — Bug EspoCRM (corrigé v6+)

Même si la fonction “Duplicate Check” est désactivée, EspoCRM :

→ continue **quand même** à vérifier les doublons…
→ surtout s’il existe un Contact avec le même email.

Résultat :
Aucun lead n’est créé et **aucune erreur n'est donnée**.

---

## ✔️ Cause 3 — Mauvaise configuration du formulaire HTML

Très fréquent :

* les champs `<input name="xxx">` ne correspondent pas à
  `Payload Fields` dans EspoCRM
* ou un champ obligatoire est manquant

Exemple :

```
<input name="email">   ≠   emailAddress
```

Résultat → **Lead rejeté silencieusement**.

---

## ✔️ Cause 4 — Key API / Endpoint incorrects

Erreurs classiques :

* mauvaise clé API
* mauvaise URL `/api/v1/LeadCapture/XXXXX`
* mauvais token
* ou endpoint oublié après migration d’instance

---

# 🧩 4. Message que MAX doit jouer (Mode CONSEIL)

> « Votre formulaire Web-to-Lead peut échouer silencieusement pour trois raisons :
>
> 1. Vérification de doublons trop lente
> 2. Bug natif d’EspoCRM
> 3. Mauvais mapping HTML / champs CRM
>
> Je vais vérifier et vous proposer une solution robuste. »

---

# 🔧 5. Solution correcte (Workaround officiel + alternative MAX)

Cette partie est cruciale :
MAX doit d’abord **diagnostiquer**, puis **corriger**.

---

## ✔️ Étape 1 — Vérifier le Duplicate Check

Dans :

```
Admin > Lead Capture > Duplicate Check
```

Si activé → **désactiver**.

MAX explique :

> « La recherche de doublons sur une grande base provoque des 504.
> Je vous recommande de la désactiver et de gérer les doublons autrement. »

---

## ✔️ Étape 2 — Vérifier le Bug de doublons Contact/Lead

MAX doit vérifier :

* si le même email existe déjà côté Contact
* si la version EspoCRM est < v6.0.0

Si oui → bug probable.

MAX :

> « Votre version d’EspoCRM a un bug connu :
> même avec Duplicate Check désactivé, le système peut bloquer la création si un Contact existe déjà.
> Je vous recommande fortement d’utiliser MAX en mode AUTO pour remplacer cette capture par une solution n8n plus stable. »

---

## ✔️ Étape 3 — Vérifier mapping HTML

MAX doit afficher :

* liste des `Payload Fields`
* liste des `input name=""`

Puis vérifier les correspondances.

Affichage type :

```
Payload Field : emailAddress  
HTML Field    : email  
→ Problème détecté : noms différents
```

MAX :

> « Votre champ HTML 'email' ne correspond pas au champ EspoCRM 'emailAddress'.
> C’est une cause fréquente d’échec silencieux. »

---

## ✔️ Étape 4 — Vérifier API Key + Endpoint

MAX doit tester l’URL :

```
/api/v1/LeadCapture/:id
```

Il doit renvoyer :

* 200 → OK
* 401 → clé incorrecte
* 404 → mauvais endpoint
* 500 → erreur interne (souvent permissions)

MAX :

> « Je n’arrive pas à valider votre endpoint.
> Je vous aide à le corriger. »

---

# 🤖 6. Mode AUTO — Solution robuste proposée par MAX

Quand plusieurs causes possibles sont détectées,
MAX doit proposer **son alternative n8n**.

Voici la phrase exacte pour MAX :

> « Les problèmes Web-to-Lead sont fréquents : timeouts, doublons, bugs natifs.
> Je vous propose d’utiliser ma solution n8n, plus fiable.
> Elle gère :
> – le dédoublonnage,
> – la validation des données,
> – la création automatique du Lead même avec une base volumineuse.
> Souhaitez-vous que je l’installe ? »

Si oui :

### MAX doit automatiser :

1. Création d’un webhook n8n
2. Réception du JSON
3. Vérification email + téléphone dans Leads et Contacts
4. Création Lead ou enrichissement Contact
5. Retour d’état (succès / doublon / enrichissement)
6. Notification utilisateur

👉 **C’est la vraie solution pro.**

---

# 🎯 7. Mode ASSISTÉ — Correction interactive

MAX guide l’utilisateur étape par étape :

* « Ouvrons ensemble la configuration de Lead Capture »
* « Vérifions les doublons »
* « Je vous montre comment tester l’endpoint »
* « Je vous montre comment corriger votre formulaire HTML »

Avec boutons :

```
▶️ Tester Endpoint  
▶️ Lister Payload Fields  
▶️ Comparer HTML  
▶️ Proposer alternative n8n  
```

---

# 🗂️ 8. Résumé interne pour la mémoire de MAX

```
Problème : Chrome/Apache Timeout 504, Lead non créé
Catégorie : Lead Management
Causes :
 - Duplicate Check lent (base > 10k)
 - Bug doublon Contact (v<6)
 - mapping HTML incorrect
 - mauvais endpoint API
Impact : Perte de leads, ventes perdues
Solutions :
 - désactiver duplicate check
 - vérifier version
 - corriger HTML mapping
 - tester API
 - alternative n8n (AUTO)
Mode : AUTO / ASSISTÉ / CONSEIL
Priority : Élevée
```


