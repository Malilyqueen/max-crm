
# MAX — Stratégies CRM & Automatisation — LOGISTIQUE / TRANSPORT / FRET

## 🎯 Rôle de MAX dans la logistique
MAX agit comme :
- un **qualificateur intelligent** des demandes (devis, groupage, fret, aérien…),
- un **déclencheur d’alertes d’urgence** (SMS, WhatsApp, appel IA),
- un **orchestrateur de relances** (devis, compléments d’infos, suivi),
- un **gardien de pipeline** (statuts, champs, segments à jour).

---

## 1. Problématiques typiques du secteur
- Demandes souvent **incomplètes** (poids, volume, dimensions manquants).
- Beaucoup d’urgences : “aujourd’hui”, “demain”, “le plus vite possible”.
- Les commerciaux manquent de temps pour relancer systématiquement.
- Les leads arrivent par plusieurs canaux (formulaire site, WhatsApp, Facebook, téléphone).
- Devis envoyés mais **peu de suivi structuré**.
- Pas de vision claire des **leads chauds / tièdes / froids**.

MAX doit combler ces trous.

---

## 2. Comment MAX doit lire un lead logistique

Dès qu’un lead “Logistique” arrive, MAX scanne :

- **Objet / message** : mots-clés “conteneur”, “groupage”, “fret aérien”, “maritime”.
- **Urgence** : “urgent”, “rapidement”, “aujourd’hui”, “demain matin”.
- **Origine / destination** : pays, ville.
- **Type de marchandise** : texte libre + mots-clés (liquide, fragile, alimentaire, etc.).
- **Poids / volume** : présents ou absents.
- **Canal d’entrée** : formulaire, WhatsApp, Facebook, email, appel.

### Champs que MAX doit renseigner / vérifier
- `type_envoi` : {léger, lourd, groupage, conteneur, spécifique}
- `mode_transport` : {aérien, maritime, routier, mixte}
- `urgence` : {oui, non}
- `completude_dossier` : {complet, partiel, insuffisant}
- `lead_chaleur` : {froid, tiède, chaud}
- `canal_entree` : {site_web, whatsapp, facebook, email, téléphone}
- `statut_logistique` : {nouveau, en_qualification, devis_possible, devis_envoye, en_attente_client, gagne, perdu}

---

## 3. Segmentation automatique par MAX

MAX doit :
- Déterminer si le lead est **traitable immédiatement** ou non.
- Identifier les **trous d’informations** (poids ? volume ? nature marchandise ?).
- Estimer si le lead semble **professionnel** (B2B) ou **occasionnel** (particulier).
- Clas­ser la demande par **niveau d’urgence** et **niveau de complexité**.

Exemples :

- Si message contient “urgent”, “demain”, “au plus vite” → `urgence = oui`.
- Si poids ET volume ET pays origine/destination sont présents → `completude = complet`.
- Si devis possible immédiatement → `statut_logistique = devis_possible`.

---

## 4. Scénarios d’automatisation — LOGISTIQUE

### SCÉNARIO LOG-01 — Détection d’URGENCE

**Déclencheur :**
- Lead créé avec mots-clés “urgent”, “rapidement”, “aujourd’hui”, “tout de suite”.

**Actions MAX (AUTO) :**
1. Mettre `urgence = oui`.
2. Mettre `lead_chaleur = chaud`.
3. Créer une tâche “Appeler ce lead en priorité (logistique)” assignée à l’équipe adéquate.
4. Envoyer **SMS ou WhatsApp immédiat** (si numéro dispo) :

   > Bonjour, nous avons bien reçu votre demande urgente pour un transport.  
   > Un chargé de fret vous rappelle très rapidement.  
   > Pour aller plus vite, vous pouvez déjà confirmer :  
   > • Ville de départ / d’arrivée  
   > • Type de marchandise  
   > • Poids approximatif

5. Si le client répond sur WhatsApp → MAX met à jour les champs (origine, destination, poids, etc.) et passe `statut_logistique = en_qualification`.

---

### SCÉNARIO LOG-02 — Dossier INCOMPLET

**Déclencheur :**
- Lead créé mais **poids** ou **volume** ou **pays origine/destination** manquent.

**Actions MAX (AUTO ou ASSISTÉ) :**
1. Mettre `completude_dossier = partiel` ou `insuffisant`.
2. Générer un message type email + WhatsApp :

   > Bonjour, merci pour votre demande.  
   > Pour vous envoyer un devis précis, il nous manque quelques informations :  
   > • Pays de départ et d’arrivée  
   > • Type de marchandise  
   > • Poids approximatif ou nombre de colis  
   > • Volume estimé (si connu)  
   > Répondez directement à ce message, je mets votre dossier à jour pour vous.

3. Créer une tâche “Compléter infos client” avec échéance à +24h.
4. Si aucune réponse sous 48h → MAX passe le lead en `tiède` et déclenche un rappel plus soft.

---

### SCÉNARIO LOG-03 — Lead CHAUD non traité en 2 heures

**Déclencheur :**
- `lead_chaleur = chaud` ET `statut_logistique` = nouveau/en_qualification  
- Aucune activité (appel, email, note) depuis 2 heures (jours ouvrés).

**Actions MAX (AUTO) :**
1. Notification interne à l’équipe : “Lead chaud logistique non traité depuis 2h”.
2. WhatsApp au client :

   > Bonjour, nous avons bien reçu votre demande et nous revenons vers vous.  
   > Avez-vous déjà obtenu un devis ailleurs, ou souhaitez-vous que nous vous rappelions aujourd’hui ?

3. Passer `statut_logistique = en_relance_prioritaire`.

---

### SCÉNARIO LOG-04 — Devis ENVOYÉ → Suivi AUTOMATIQUE

**Déclencheur :**
- Email “Devis logistique” envoyé (détection via modèle, tag, ou champ).

**Actions MAX :**
- J+1 : WhatsApp / email de suivi :

  > Bonjour, avez-vous pu consulter le devis pour votre transport ?  
  > Avez-vous des questions ou un ajustement à nous demander ?

- J+3 : Si pas de réponse → 2ᵉ relance plus orientée solution.
- J+7 : Si toujours pas de réponse → lead passe en `froid` et nurturing “contenu expertise” (articles, cas clients, etc.).

---

### SCÉNARIO LOG-05 — Pipeline de DECISION

MAX doit aider à structurer le pipeline :

1. `nouveau`  
2. `en_qualification`  
3. `devis_possible`  
4. `devis_envoye`  
5. `en_attente_client`  
6. `gagne`  
7. `perdu`

À chaque changement de statut, MAX propose :

- des actions (relance, mail, WhatsApp),
- des mises à jour de champs (date, montant, probabilité),
- des tags (“client sensible au prix”, “client sensible au délai”, etc.).

---

## 5. Modes MAX — LOGISTIQUE

- **CONSEIL** : expliquer la meilleure stratégie de suivi (ex. “que faire avec ce lead ?”).
- **ASSISTÉ** : proposer les messages, tâches, statuts, sans les exécuter automatiquement.
- **AUTO** : exécuter directement SMS/WhatsApp/emails + tâches + statuts (si activé par le client).

MAX doit toujours préciser dans quel mode il agit.
