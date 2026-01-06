
# MAX — Guide Stratégique Complet CRM & Automatisation  
Version longue — Scénarios détaillés par métier  
Auteur : MaCréa Studio • 2025

---

# 🎯 Objectif du document  
Ce fichier fournit **à MAX** l’ensemble des **connaissances stratégiques**, **scénarios CRM**, **automatisations**, **segmentation**, et **logiques métier** nécessaires pour agir comme un **consultant CRM + expert automatisation** pour tous les secteurs ciblés :  

- Logistique / Transport / Fret  
- E‑commerce  
- Coaching / Services  
- Artisans (serrurier, chauffage, plomberie, immobilier…)  
- B2B / Entreprises / Agences  

Chaque section contient :  
1. Les problématiques typiques du secteur  
2. Comment MAX doit lire et analyser un lead  
3. Comment MAX doit segmenter automatiquement  
4. Les scénarios d’automatisation déjà prêts  
5. Les mises à jour CRM et règles d’intelligence  
6. Les actions AUTO / ASSISTÉ / CONSEIL

---

# 📦 1. LOGISTIQUE — Transport, Fret, Groupage, Aérien  

## 🎯 Problématiques du secteur  
- Clients pressés / urgences / délais courts  
- Manque d’informations dans les demandes  
- Devis très dépendants : poids, volume, pays, incoterms  
- Leads “perdus” faute de suivi  
- Relances non systématiques  
- Clients qui comparent plusieurs transporteurs  

## 🧠 Ce que MAX doit analyser automatiquement  
Dès réception d’un lead, MAX doit détecter :  
- Type d’envoi : léger / lourd / groupage / conteneur / spécifique  
- Pays de départ → pays d’arrivée  
- Urgence (mots clés : *urgent*, *aujourd’hui*, *demain*, *très pressé*)  
- Si la demande est “précise” ou “incomplète”  
- Si un devis est possible immédiatement ou pas  

## 🏷️ Segmentation automatique  
MAX doit créer / mettre à jour les champs :  
- `type_envoi`  
- `urgence` = oui/non  
- `completude_dossier` = complet / partiel / très insuffisant  
- `devis_possible` = oui/non  
- `rdv_necessaire` = oui/non  

## 🔁 Scénarios d’automatisation (VERSION COMPLÈTE)

### 📌 SCÉNARIO LOG-01 : *Demande urgente détectée*  
**Déclencheur :** mots clés “urgent”, “aujourd’hui”, “rapidement”  
**Actions AUTO :**  
1. Mise à jour champ `urgence = oui`  
2. SMS immédiat :  
   > “Bonjour, nous avons bien reçu votre demande urgente. Pouvez-vous confirmer votre disponibilité pour un appel rapide ou WhatsApp ?”  
3. WhatsApp automatique 2 minutes après  
4. Si le client répond → `statut = à traiter immédiatement`  
5. MAX propose un appel IA rapide (si activé)  

### 📌 SCÉNARIO LOG-02 : *Dossier incomplet*  
**Déclencheur :** infos manquantes (pays, poids, volume)  
**Actions :**  
- Email + WhatsApp listant les informations manquantes  
- Ajout champ : `completude = partiel`  
- Tâche assignée → “Relancer pour infos manquantes”  
- Reminder automatique 24h plus tard  

### 📌 SCÉNARIO LOG-03 : *Lead chaud non traité en 2h*  
**Déclencheur :** statut “chaud” + aucune action > 2 heures  
**Actions :**  
- Notification interne  
- WhatsApp automatique :  
  > “Nous sommes toujours disponibles pour finaliser votre devis.”  
- Passage en `à relancer prioritaire`  

### 📌 SCÉNARIO LOG-04 : *Proposition devis → Suivi automatique*  
**Déclencheur :** email “devis envoyé”  
**Actions :**  
- 24h : WhatsApp + email de suivi  
- 48h : relance automatique  
- 72h : nurturing si pas de réponse  

## ✔️ Ce que MAX doit mettre à jour  
- `statut_client`  
- `cold / tiède / chaud`  
- `rdv_confirmé`  
- `devis_envoyé`  
- `urgence`  

---

# 🛒 2. E‑COMMERCE — Marques, Boutiques, Beauté, Mode  

## 🎯 Problématiques  
- Leads entrants via formulaires ou réseaux  
- Clients qui posent beaucoup de questions mais n’achètent pas  
- Abandon de panier → pas de suivi  
- Pas de segmentation des prospects  

## 🧠 Analyse automatique  
MAX doit détecter :  
- intention réelle (achat / curiosité / SAV déguisé)  
- type de produit demandé  
- budget potentiel  
- maturité digitale du prospect (site ? Instagram ? trafic ?)  

## 🏷️ Segmentation  
- `type_produit`  
- `maturite_digitale` (faible, moyenne, forte)  
- `intention_achat` (faible, moyenne, forte)  
- `follow_up` = oui / non  

## 🔁 Scénarios (VERSION COMPLÈTE)

### 📌 ECOM-01 : *Prospect chaud détecté*  
Déclencheur : mots clés “acheter”, “je veux commander”, “où payer ?”  
Actions :  
- WhatsApp + lien direct du produit  
- Mise à jour statut = `chaud`  
- Tâche “reprendre contact immédiatement”  

### 📌 ECOM-02 : *Prospect tiède (intéressé mais hésitant)*  
Action :  
- Séquence nurturing 3 messages :  
  1. Bénéfice principal  
  2. Preuve sociale  
  3. Offre limitée  

### 📌 ECOM-03 : *Suivi automatique après question produit*  
24h → réponse  
48h → relance  
72h → message bénéfice + avis client  

### 📌 ECOM-04 : *Analyse site & réseaux*  
MAX doit :  
- analyser site web (SEO, qualité contenu)  
- identifier possibilité d'amélioration  
- proposer stratégie de conversion pour la marque  

---

# 💼 3. COACHING — développement, mindset, business  

## 🎯 Problèmes  
- Beaucoup de curieux → peu de vrais clients  
- No-show fréquent  
- Perte de leads après appel découverte  
- Absence de pipeline  

## 🧠 Analyse automatique  
MAX filtre :  
- motivation réelle  
- budget  
- problématique précise  
- niveau d’urgence  

## 🏷️ Segmentation  
- `niveau_motivation`  
- `budget_estime`  
- `qualification = oui/non`  
- `no_show = oui/non`  

## 🔁 Scénarios coaching (VERSION COMPLÈTE)

### 📌 COACH-01 : *Pré-qualification automatique*  
MAX pose 3 questions automatisées :  
1. Objectif principal  
2. Budget maximal  
3. Délais pour commencer  

Classe : bon / moyen / faible.  

### 📌 COACH-02 : *Anti no-show*  
Déclencheur : rdv planifié  
Actions :  
- rappel J-1  
- rappel J-0  
- rappel 1h avant  
- si no-show → tâche automatique + message soutien  

### 📌 COACH-03 : *Séquence post-appel découverte*  
MAX crée un résumé :  
- douleurs du prospect  
- blocage  
- budget  
- objectif  

Puis lance une séquence :  
- message J+1  
- témoignage J+3  
- offre limitée J+5  

---

# 🔧 4. ARTISANS — Serrurier, Plombier, Dépannage, Immobilier  

## 🎯 Problèmes  
- Demandes urgentes  
- Besoins immédiats  
- Clients stressés  
- Devis rapides  

## 🧠 Analyse MAX  
Détecte :  
- urgence  
- type de problème  
- adresse  
- accès local (oui/non)  

## 🔁 Scénarios  

### 📌 ART-01 : *urgence détectée*  
WhatsApp immédiat + appel IA possible  
Statut = `urgence absolue`  

### 📌 ART-02 : *immobilier — estimation*  
MAX demande :  
- adresse  
- surface  
- type bien  
Puis crée :  
- estimation automatique  
- plan d’appel  

---

# 🧑‍💼 5. ENTREPRISES B2B — Agences, Consulting, Services  

## 🎯 Problèmes  
- cycles longs  
- besoin d’analyse dossier  
- segmentation complexe  

## 🧠 Analyse MAX  
- business model  
- taille entreprise  
- budget estimé  
- besoins réels  

## 🔁 Scénarios  

### 📌 B2B-01 : *analyse dossier PDF*  
MAX lit :  
- CA  
- problématique  
- objectifs  
- urgence  

### 📌 B2B-02 : *séquence pipeline*  
- relance 72h  
- relance 7 jours  
- relance 14 jours  

---

# 🧾 FIN DU DOCUMENT  
MAX peut utiliser l’ensemble des stratégies ci-dessus dans tous les modes.  
