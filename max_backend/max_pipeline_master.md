
# MAX — Pipeline Master CRM  
Version de base pour tous les métiers (Logistique, E-commerce, Coaching, Artisans, B2B)

Ce document sert de **référence centrale** à MAX pour :
- comprendre les statuts standards d’un pipeline,
- recommander des champs clés,
- proposer les transitions logiques,
- relier chaque étape aux bonnes automatisations.

---

## 1. Champs transverses recommandés

MAX doit encourager (ou vérifier) la présence des champs suivants sur l’entité Lead / Opportunité :

- `lead_chaleur` : {froid, tiède, chaud}
- `canal_entree` : {site_web, whatsapp, facebook, instagram, email, téléphone, autre}
- `budget_estime` / `budget_indicatif`
- `urgence` : {oui, non}
- `notes_max` : champ texte pour résumé stratégique de MAX
- `statut_global` : statut pipeline générique (voir ci-dessous)

---

## 2. Pipeline générique (tous secteurs)

Proposition standard :

1. `nouveau`
2. `en_qualification`
3. `proposition_en_preparation` (si applicable)
4. `devis_envoye` / `offre_proposee`
5. `en_reflexion` / `en_negociation`
6. `gagne`
7. `perdu`

MAX doit :
- détecter les incohérences (ex : devis envoyé mais statut toujours “nouveau”),
- proposer la correction,
- éventuellement appliquer la mise à jour (en mode AUTO).

---

## 3. Spécificités par métier

### 3.1. Logistique

Champs métiers :
- `type_envoi`
- `mode_transport`
- `completude_dossier`
- `statut_logistique`

Pipeline conseillé :

- `nouveau`
- `en_qualification`
- `devis_possible`
- `devis_envoye`
- `en_attente_client`
- `gagne`
- `perdu`

MAX doit mapper :
- `statut_logistique` ↔ `statut_global`.

---

### 3.2. E-commerce

Champs :
- `type_produit`
- `intention_achat`
- `statut_ecom`

Pipeline conseillé :

- `nouveau`
- `question_produit`
- `panier_abandonne`
- `relance_en_cours`
- `converti`
- `perdu`

---

### 3.3. Coaching

Champs :
- `type_coaching`
- `niveau_motivation`
- `qualification`
- `statut_coaching`

Pipeline conseillé :

- `nouveau`
- `pre_qualif`
- `appel_planifie`
- `appel_realise`
- `offre_envoyee`
- `en_reflexion`
- `gagne`
- `perdu`

---

### 3.4. Artisans

Champs :
- `type_artisan`
- `type_intervention`
- `statut_artisan`

Pipeline conseillé :

- `nouveau`
- `a_appeler`
- `intervention_planifiee`
- `intervention_faite`
- `a_facturer`
- `cloture`

---

### 3.5. B2B

Champs :
- `secteur_b2b`
- `taille_entreprise`
- `type_besoin`
- `statut_b2b`

Pipeline conseillé :

- `nouveau`
- `en_qualif`
- `proposition_en_preparation`
- `devis_envoye`
- `en_negociation`
- `gagne`
- `perdu`

---

## 4. Règles générales pour MAX

1. **Jamais régresser un statut** sans validation explicite (ex : de `devis_envoye` vers `nouveau`).
2. Toujours proposer le **“prochain meilleur statut”** logique.
3. Relier chaque changement de statut à :
   - un ou plusieurs messages possibles (email, WhatsApp…),
   - des tâches,
   - des tags éventuels.
4. Mentionner clairement dans quel **mode** (CONSEIL / ASSISTÉ / AUTO) MAX agit.

