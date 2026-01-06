

👉 **La synchronisation du calendrier (Google / Outlook)**
C’est l’un des sujets où les utilisateurs ont le PLUS de mauvaises attentes,
car ils pensent que c’est comme :

* HubSpot
* Salesforce
* Gmail
* Outlook Exchange
* Notion Calendar

Alors qu’en réalité, **la synchronisation EspoCRM est très limitée**, et génère beaucoup de frustrations si personne ne l’explique clairement.

MAX doit **gérer les attentes**, **expliquer les limites techniques**, et **proposer les alternatives**.

Voici la fiche complète.

---

# 📘 FICHE TECHNIQUE #10 — Synchronisation Calendrier (Google / Outlook)

### 🔥 Criticité : **Moyenne à Élevée (fort risque de frustration client)**

### 🧩 Catégorie : Limitations natives / Ventes / Agenda

### 🤖 Mode recommandé : **CONSEIL + ASSISTÉ**

---

# 🧠 1. Contexte : Ce que MAX doit comprendre

Les utilisateurs imaginent que la synchronisation calendrier EspoCRM est :

✔️ bidirectionnelle
✔️ instantanée
✔️ complète
✔️ compatible avec les participants
✔️ compatible avec les récurrences
✔️ compatible avec les mises à jour de description

… parce que c’est ce qu’ils ont dans 99 % des outils du marché.

Mais EspoCRM NE FAIT PAS ça.
Et ce n’est pas un bug.
C’EST UNE LIMITATION DOCUMENTÉE.

MAX doit expliquer **ce qui est synchronisé** et **ce qui ne l’est pas**.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

L’utilisateur dit :

* « Les participants ne se synchronisent pas ! »
* « Les réunions récurrentes ne s’importent pas ! »
* « Le titre change mais pas la description ! »
* « Les mises à jour Outlook ne passent pas dans Espo ! »
* « Le calendrier met une heure à se mettre à jour ! »
* « Les événements disparaissent ! »
* « Ça ne synchronise pas les modifications… pourquoi ? »

MAX doit comprendre immédiatement que ce n’est pas un bug,
mais une **limitation native**.

---

# 🔍 3. Causes techniques (claires et simples)

## ✔️ Google Calendar — limitations

Google limite :

* les événements récurrents
* les mises à jour trop fréquentes
* les imports multiples d’un même événement
* les synchronisations complexes (participants, décr.)
* les timestamps mal formatés

Souvent :
→ **Rate Limit Exceeded**

## ✔️ Outlook Calendar — limitations

Outlook limite :

* les participants
* les récurrences
* les modifications des descriptions après création
* les invitations complexes
* les fuseaux horaires multiples

## ✔️ EspoCRM — architecture simplifiée

EspoCRM ne gère pas :

* les récurrences complexes
* les participants externes
* les exceptions dans les événements récurrents
* la mise à jour du statut (Accepté / En attente)
* la mise à jour *en miroir* des modifications

EspoCRM gère uniquement des **événements simples**.

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

MAX doit communiquer clairement, avec pédagogie :

> « La synchronisation calendrier d’EspoCRM est volontairement limitée.
> Elle ne gère que les événements simples : date, heure, titre.
>
> Les éléments suivants ne sont pas synchronisés :
> — participants
> — événements récurrents
> — descriptions modifiées
> — mises à jour complexes depuis Outlook/Google
>
> Cela n’est pas un bug mais une limitation du système.
> Je peux vous montrer ce qui est possible et comment contourner les limites si besoin. »

Ce message désamorce immédiatement 90 % des frustrations.

---

# 🔧 5. Solutions / Alternatives (MAX doit les proposer)

### ✔️ Solution A : utiliser uniquement des événements simples

MAX conseille :

* pas de récurrence
* pas de participants multiples
* pas de descriptions changeantes
* événements unitaires seulement

### ✔️ Solution B : utiliser n8n pour synchroniser

Pour les clients plus avancés :

* n8n reçoit les événements Google/Outlook
* n8n crée ou met à jour l’événement dans Espo via API
* gestion des participants dans n8n
* logique “si modifié, mettre à jour”

### ✔️ Solution C : utiliser Calendly ou TidyCal

Et EspoCRM reçoit les rendez-vous via Webhook.

### ✔️ Solution D : utiliser Zapier → EspoCRM API

Simple, efficace, mais externe.

---

# 🤖 6. Mode ASSISTÉ — Correction guidée

MAX doit proposer dans l’Espace :

```
▶️ Vérifier les permissions Google/Outlook
▶️ Vérifier la configuration OAuth
▶️ Vérifier les fuseaux horaires
▶️ Tester un événement simple
▶️ Explorer les limitations
▶️ Proposer une alternative via n8n
```

GUIDAGE MAX :

* où cliquer
* comment tester
* comment vérifier
* comment corriger

---

# 🤖 7. Mode AUTO — Vérifications techniques

MAX peut **automatiquement** :

* vérifier les permissions OAuth
* lire les logs d’erreurs Google “Rate Limit Exceeded”
* lire les erreurs Outlook “Invalid Recurrence Rule”
* vérifier si l’événement comporte des participants
* vérifier si l’événement est récurrent
* vérifier si la description a été modifiée

Et dire :

> « Votre événement contient des participants ou une récurrence :
> ces éléments ne sont pas synchronisés par EspoCRM.
> Utilisez plutôt un événement simple ou un flux externe. »

---

# 🗂️ 8. Résumé interne pour mémoire de MAX

```
Problème : Synchronisation agenda limitée
Catégorie : Calendar / OAuth / Limitations natives
Symptômes :
 - participants non synchronisés
 - récurrences non supportées
 - descriptions non mises à jour
 - lenteur / erreurs de quota
Causes :
 - limitations Google/Outlook
 - architecture EspoCRM simplifiée
Solutions :
 - événements simples
 - workflows n8n
 - Calendly / Zapier
Mode :
 - CONSEIL (principal)
 - ASSISTÉ
Priority : Moyenne à Élevée
```

---

# 🎉 Malala… le TOP 10 est terminé !

Maintenant MAX possède :

* les 10 réflexes critiques
* les 10 diagnostics prioritaires
* la logique métier complète
* les modes CONSEIL / ASSISTÉ / AUTO
* et les réponses clean & pro pour tes clients

---


**Tu choisis ❤️**
