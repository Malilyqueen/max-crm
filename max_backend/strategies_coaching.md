
# MAX — Stratégies CRM & Automatisation — COACHING & SERVICES

## 🎯 Rôle de MAX
Dans le coaching, MAX sert à :
- trier les curieux des prospects sérieux,
- limiter les no-shows,
- structurer le suivi post “appel découverte”,
- aider à construire un pipeline de transformation clair.

---

## 1. Problématiques du coaching
- Beaucoup de personnes “intéressées” mais pas prêtes à investir.
- Appels découvertes non préparés.
- No-shows récurrents.
- Pas de suivi après l’appel (le prospect “disparaît”).
- Pas de segmentation par motivation, budget, urgence.

---

## 2. Lecture d’un lead coaching par MAX

MAX doit repérer :
- le type de problématique (business, mindset, perso…),
- la douleur principale (“je n’arrive pas à…”, “je suis bloqué…”, “je tourne en rond…”),
- la présence ou non d’un budget mentionné,
- la temporalité (je veux régler ça “rapidement”, “dans l’année”, “quand je pourrai”).

Champs stratégiques :
- `type_coaching` : {business, mindset, relationnel, autre}
- `niveau_motivation` : {faible, moyenne, forte}
- `budget_estime` : {<100€, 100–500€, 500–2000€, >2000€}
- `urgence_ressentie` : {faible, moyenne, forte}
- `qualification` : {non_qualifie, a_qualifier, qualifie}
- `no_show` : {oui, non}
- `statut_coaching` : {nouveau, pre_qualif, appel_planifie, appel_realise, offre_envoyee, en_reflexion, gagne, perdu}

---

## 3. Pré-qualification automatique

### SCÉNARIO COACH-01 — Séquence de pré-qualification

**Déclencheur :**
- Lead coaching créé.

**Actions MAX :**
1. Envoyer 3 questions par email ou WhatsApp :

   > 1. Si tu pouvais changer une chose dans ta situation actuelle, ce serait quoi ?  
   > 2. Qu’est-ce qui t’a manqué jusqu’ici pour y arriver ?  
   > 3. Si on travaillait ensemble et que ça fonctionnait, qu’est-ce qui aurait changé dans 3 à 6 mois ?

2. Selon la réponse :
   - douleur claire + engagement → `niveau_motivation = forte`, `qualification = a_qualifier`.
   - réponses vagues → `niveau_motivation = moyenne`.
   - aucune réponse → `niveau_motivation = faible`.

3. Eventuellement, question bonus sur le budget (avec beaucoup de tact).

---

## 4. Gestion des NO-SHOWS

### SCÉNARIO COACH-02 — Anti no-show

**Déclencheur :**
- Rendez-vous planifié dans le calendrier.

**Actions MAX :**
- J-1 : rappel bienveillant, rappel du bénéfice de l’appel.
- J-0 matin : “Je te confirme notre rendez-vous de tout à l’heure”.
- 1h avant : rappel très bref.

**En cas de no-show :**
- `no_show = oui`.
- Email/WhatsApp :

  > Je n’ai pas pu te joindre à l’heure prévue.  
  > Si ce n’est pas le bon moment, on peut soit reprogrammer, soit arrêter là, sans souci.  
  > Dis-moi ce qui est le plus juste pour toi.

- Si 2ᵉ no-show → `qualification = non_qualifie`.

---

## 5. Séquence post “Appel découverte”

### SCÉNARIO COACH-03 — Suivi post appel

**Déclencheur :**
- Champ `appel_realise = oui`.

**Actions MAX :**
1. Résumer dans le champ `notes_coaching` :
   - situation actuelle,
   - blocages,
   - désir futur,
   - budget (si évoqué).

2. J+1 : message personnalisé (ASSISTÉ ou AUTO).
3. J+3 : rappel orienté résultats (“voici ce que tu perds si tu repousses encore”).
4. J+7 : dernier message = soit clôture bienveillante, soit relance ouverte.

---

## 6. Modes MAX — COACHING

- **CONSEIL** : aider la coach à lire le lead (motivation, blocage, timing).
- **ASSISTÉ** : proposer scripts, emails, messages WhatsApp.
- **AUTO** : piloter toute la séquence (pré-qualif, anti no-show, post-appel) si activé.
