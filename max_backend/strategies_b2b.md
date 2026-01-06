
# MAX — Stratégies CRM & Automatisation — ENTREPRISES B2B / AGENCES / SERVICES

---

## 1. Problématiques

- Cycles de vente longs.
- Multiplicité des interlocuteurs.
- Dossiers complexes (PDF, présentations, cahiers des charges).
- Peu de suivi structuré post-premier contact.
- Opportunités non relancées après devis.

---

## 2. Lecture d’un lead B2B par MAX

MAX doit repérer :
- secteur d’activité,
- taille entreprise (si possible),
- type de besoin (marketing, logistique, IT, consulting…),
- présence de documents joints (PDF, cahier des charges),
- budget mentionné ou estimable,
- urgence de la demande.

Champs :
- `secteur_b2b`
- `taille_entreprise` : {solo, TPE, PME, grande}
- `type_besoin`
- `budget_indicatif`
- `statut_b2b` : {nouveau, en_qualif, proposition_en_preparation, devis_envoye, en_negociation, gagne, perdu}

---

## 3. Scénarios B2B

### SCÉNARIO B2B-01 — Lecture de DOCUMENT (PDF / cahier des charges)

**Déclencheur :**
- Fichier joint au lead.

**Actions (ASSISTÉ) :**
1. MAX lit le PDF (si connecté à un module de lecture).
2. Génère un résumé :
   - contexte de l’entreprise,
   - enjeux,
   - besoins clés,
   - deadlines,
   - critères importants (prix, qualité, délai, accompagnement).
3. Enregistre dans `resume_dossier`.
4. Propose une **stratégie de réponse** (approche globale) dans `strategie_proposee`.

---

### SCÉNARIO B2B-02 — Pipeline de suivi

**Étapes recommandées :**
1. `nouveau`
2. `en_qualif` (questions supplémentaires, réunion de cadrage)
3. `proposition_en_preparation`
4. `devis_envoye`
5. `en_negociation`
6. `gagne` / `perdu`

**Actions MAX :**
- à chaque étape, proposer les actions adaptées :
  - relance,
  - reformulation d’offre,
  - envoi de cas clients,
  - appel de clarification.

---

### SCÉNARIO B2B-03 — Relances structurées

**Déclencheur :**
- `devis_envoye` depuis plus de X jours sans activité.

**Actions :**
- J+3 : relance soft,
- J+7 : relance plus directe (“décision / délais ?”),
- J+14 : proposition d’appel rapide,
- J+21 : clôture ou nurturing long-terme.

---

## 4. Modes MAX — B2B

- **CONSEIL** : structurer les stratégies de négociation et relance.
- **ASSISTÉ** : générer résumés, notes de réunion, emails long-format.
- **AUTO** : exécuter relances périodiques & mise à jour des statuts.
