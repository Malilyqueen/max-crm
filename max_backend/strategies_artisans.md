
# MAX — Stratégies CRM & Automatisation — ARTISANS & DÉPANNAGE

Secteurs : serrurier, plombier, chauffage, électricien, dépannage, Immobilier (visites, estimations).

---

## 1. Problématiques

- Demandes souvent **d’URGENCE** (porte bloquée, fuite, panne).
- Clients stressés, pressés, peu disponibles pour parler longtemps.
- Beaucoup d’appels, peu de suivi structuré.
- Pas de segmentation des types d’intervention.
- Dans l’immobilier : visites, estimations, relances manquantes.

---

## 2. Lecture d’un lead artisan par MAX

MAX doit détecter :
- urgences vs interventions programmables,
- type de problème (“porte bloquée”, “chaudière en panne”, “clés perdues”…),
- localisation,
- disponibilité horaire.

Champs :
- `type_artisan` : {serrurier, plombier, chauffage, elec, immobilier, autre}
- `type_intervention` : {urgence, standard, devis}
- `urgence` : {oui, non}
- `adresse_complete`
- `disponibilite_client` : {immédiat, aujourd’hui, cette semaine}
- `statut_artisan` : {nouveau, à_appeler, en_cours, intervention_faite, a_facturer, cloture}

---

## 3. Scénarios ARTISANS

### SCÉNARIO ART-01 — URGENCE détectée

**Déclencheur :**
- Mots-clés “bloqué dehors”, “porte fermée”, “fuite”, “urgence”, “immédiatement”.

**Actions MAX :**
1. `type_intervention = urgence`, `urgence = oui`.
2. Proposition d’appel téléphonique immédiat (via agent vocal ou humain).
3. SMS/WhatsApp immédiat :

   > Bonjour, j’ai bien noté votre urgence.  
   > Pouvez-vous me confirmer :  
   > • Adresse exacte  
   > • Étages / digicode  
   > • Êtes-vous seul sur place ?

4. Création tâche : “Intervention urgente à planifier / traiter” avec priorité haute.

---

### SCÉNARIO ART-02 — Demande de DEVIS

**Déclencheur :**
- Mots-clés “devis”, “estimatif”, “combien ça coûte”.

**Actions :**
1. `type_intervention = devis`.
2. Email/WhatsApp pour précision du contexte (photos éventuellement).
3. Proposition de créneau pour visite si nécessaire.
4. Tâche “Envoyer devis” + rappel J+2 si non envoyé.

---

### SCÉNARIO ART-03 — Immobilier (Visite / Estimation)

**Déclencheur :**
- Mots-clés “estimer mon bien”, “mettre en vente”, “visite”, “immobilier”.

**Actions :**
1. `type_artisan = immobilier`.
2. Champs spécifiques :
   - `type_bien` (appart, maison…),
   - `surface`,
   - `ville_quartier`.
3. Proposition de RDV visite (avec choix de créneaux).
4. Séquence post-visite :
   - compte rendu,
   - estimation,
   - relances pour mandat.

---

## 4. Modes MAX — ARTISANS

- **CONSEIL** : suggérer la meilleure façon de gérer le flux d’urgences.
- **ASSISTÉ** : rédiger les messages, organiser la priorisation.
- **AUTO** : déclencher appels, SMS, WhatsApp pour urgences et devis.
