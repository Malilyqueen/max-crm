

* les frustrations clients,
* les fausses attentes,
* les confusions,
* et les “ce n’est pas normal, pourquoi mes emails ne se synchronisent pas ?”.

Car EspoCRM **n’est PAS un client email.**
Et 95% des utilisateurs ne le savent pas.

MAX doit *systématiquement* repérer ce cas et **gérer les attentes avant que l’utilisateur ne croie que le CRM est “cassé”**.

Voici la fiche complète, version “MAX-ready”.

---

# 📘 FICHE TECHNIQUE #5 — IMAP : Import ≠ Synchronisation

### 🔥 Criticité : **Élevée (frustration + mauvaise compréhension)**

### 🧩 Catégorie : Données / Email / Limitations natives

### 🎓 Mode recommandé : **CONSEIL (obligatoire) + ASSISTÉ**

---

# 🧠 1. Contexte (Ce que MAX doit comprendre)

Les utilisateurs pensent que l’intégration IMAP d’EspoCRM fonctionne comme :

* Outlook
* Gmail
* Apple Mail
* Thunderbird
* HubSpot
* Salesforce

C’est-à-dire :

➡️ **Une vraie synchronisation bidirectionnelle**

Mais EspoCRM fonctionne **à l’opposé**.

## ✔️ La vérité technique (que MAX doit connaître absolument) :

### 🔸 EspoCRM **n’est PAS** un client email

→ Il **n’affiche pas** la boîte mail de l’utilisateur
→ Il **n’interagit pas** avec les dossiers IMAP
→ Il **ne synchronise PAS** les statuts (lu/non lu)
→ Il **ne synchronise PAS** les dossiers envoyés
→ Il **ne synchronise PAS** les suppressions
→ Il **n’applique PAS** de mise à jour bidirectionnelle

### 🔸 EspoCRM fait seulement :

➡️ **un import unidirectionnel**
depuis la boîte IMAP
vers l’entité “Emails” du CRM.

C’est **by design**, confirmé par les développeurs EspoCRM eux-mêmes.

---

# 🛑 2. Symptômes visibles pour l’utilisateur

Les utilisateurs disent typiquement :

* « Mes emails envoyés n'apparaissent pas ! »
* « Si je lis l’email dans Gmail, ce n’est pas lu dans Espo… »
* « Mon dossier “Important” n’est pas synchronisé »
* « J’ai déplacé des emails dans Outlook mais le CRM ne les voit pas »
* « Les dossiers IMAP ne sont pas visibles »
* « Les emails disparaissent »

Ces “problèmes” ne sont pas des bugs :
👉 Ce sont les **limitations natives**.

MAX doit les reconnaître en quelques mots-clés :

```
“pas synchronisé”
“ne se met pas à jour”
“dossier IMAP”
“envoyés”
“important”
“lu/non-lu”
“gestion des emails”
```

---

# 🔍 3. Cause technique (pour MAX)

EspoCRM utilise une librairie IMAP qui :

* **importe** les emails dans sa propre table (`email`)
* **ne conserve pas** la structure IMAP
* **ne réplique pas** les dossiers
* **ne synchronise pas** les mises à jour
* **ne supprime pas** en miroir
* **ne met pas à jour le statut lu/non-lu**

Pourquoi ?

* éviter la charge serveur
* éviter la réconciliation complexe
* éviter des loops entre serveurs IMAP
* garder un CRM simple et robuste

Donc :
✔️ C’est voulu
✔️ Ce n’est pas un bug
✔️ Ça ne changera probablement jamais

---

# 🎓 4. Message que MAX doit jouer (Mode CONSEIL)

MAX doit **rassurer + expliquer + remettre les attentes au bon niveau**.

Voici la formulation idéale :

> « Vous utilisez l’intégration IMAP d’EspoCRM.
> Il est important de savoir qu’EspoCRM n’est pas un client email :
> il n’effectue *pas* de synchronisation bidirectionnelle comme Outlook ou Gmail.
> L’IMAP sert uniquement à importer les emails dans le CRM pour les lier aux contacts.
>
> Les statuts (lu/non-lu), dossiers IMAP, déplacés ou envoyés ne sont pas synchronisés.
>
> Ce comportement est normal et prévu.
> Je peux vous montrer ce qui est synchronisé, ce qui ne l’est pas, et comment utiliser la fonction au mieux. »

Cette explication seule résout **80% des tickets support**.

---

# 🛠️ 5. Mode ASSISTÉ — Aider l’utilisateur à s’en sortir

MAX doit proposer :

```
▶️ Vérifier la configuration IMAP
▶️ Tester la connexion
▶️ Expliquer ce qui est importé
▶️ Expliquer ce qui n’est pas synchronisé
▶️ Proposer workflow n8n pour les envois
```

MAX doit guider :

* vers “Admin > Email Accounts”
* vers “User > Mon Email > Paramètres IMAP/SMTP”
* vérifier login, port, SSL, dossiers, etc.

Il peut aussi proposer :

### ✔️ Un flux n8n pour synchroniser certains éléments

Par exemple :

* copie des emails envoyés
* étiquetage automatique
* archivage sélectif

MAX peut donc compenser les limites natives.

---

# 🤖 6. Mode AUTO — (rare mais possible)

Le mode AUTO n’est pas idéal pour IMAP, mais MAX peut :

* tester la connexion IMAP
* valider port / host / TLS
* valider le SMTP
* vérifier les credentials
* vérifier la fréquence d’import
* détecter les erreurs typiques :

  * `AUTHENTICATION FAILED`
  * `NO SUCH MAILBOX`
  * `INVALID CREDENTIALS`
  * `TIMEOUT`

MAX informe :

> « J’ai testé votre connexion IMAP et tout fonctionne correctement.
> Je rappelle que seuls les emails reçus sont importés dans EspoCRM —
> il ne s’agit pas d’une synchronisation complète. »

---

# 🗃️ 7. Résumé interne pour la mémoire de MAX

```
Problème : IMAP non synchronisé
Catégorie : Limitations natives
Symptômes :
 - dossiers manquants
 - statuts non mis à jour
 - envoyés non visibles
 - pas de synchro bidirectionnelle
Cause :
 - EspoCRM fait uniquement un import IMAP
Solutions :
 - expliquer limitation
 - configurer IMAP correctement
 - proposer workflow n8n
Mode :
 - CONSEIL (principal)
 - ASSISTÉ (configuration)
Priority : Élevée (frustration utilisateur)
```

---


