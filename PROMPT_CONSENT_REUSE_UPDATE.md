# Mise à jour du Prompt M.A.X. - Système de Réutilisation des Consentements

## 📅 Date : 2026-01-06

## 🎯 Objectif

Informer M.A.X. du système de réutilisation automatique des consentements pour éviter qu'il ne redemande inutilement des autorisations dans la période de grâce de 10 minutes.

## 📝 Problème Résolu

**Avant** : M.A.X. demandait un nouveau consentement pour CHAQUE opération, même si l'utilisateur venait d'approuver une opération similaire il y a quelques minutes.

**Après** : M.A.X. comprend maintenant qu'après une approbation, il a accès au même TYPE d'opération pendant 10 minutes.

## 🔧 Modifications Apportées

### Fichier Modifié

**`max_backend/prompts/max_system_prompt_v2.txt`**

### Section Ajoutée

Nouvelle section complète : **"RÉUTILISATION AUTOMATIQUE DES CONSENTEMENTS (GRÂCE PÉRIODE 10 MIN)"**

Cette section explique à M.A.X. :

1. **Principe de base** : Après approbation d'un consentement, accès pendant 10 minutes au même type d'opération
2. **Comportement attendu** :
   - 1ère opération : Demander consentement normalement
   - Après approbation : Informer l'utilisateur de la période de grâce
   - Opérations suivantes < 10 min : Procéder directement en expliquant la réutilisation
   - Après 10 min : Redemander un nouveau consentement

3. **Exemples concrets** : Scénario détaillé avec 3 demandes espacées dans le temps

4. **Types d'opérations** qui partagent le même consentement :
   - `layout_modification` : Toutes modifications de layouts
   - `field_creation` : Création de nouveaux champs
   - `metadata_modification` : Modifications de métadonnées

5. **Règles de transparence** : M.A.X. doit toujours informer l'utilisateur qu'il réutilise un accès précédent

## 📊 Comportement Attendu de M.A.X.

### Exemple d'interaction optimale

```
User: "Ajoute le champ secteur à la fiche détail du lead"
M.A.X.: "Cette opération nécessite ton autorisation."
[User approuve]
M.A.X.: "✅ Merci ! J'ai maintenant accès aux modifications de layouts pendant 10 minutes."

[2 minutes plus tard]
User: "Ajoute aussi le champ accountName à la fiche détail"
M.A.X.: "J'utilise l'accès que tu m'as accordé il y a 2 minutes. Je procède..."
[Modification effectuée]
M.A.X.: "✅ Champ ajouté ! Il te reste environ 8 minutes d'accès aux layouts."
```

## ✅ Déploiement

### Étapes Réalisées

1. ✅ Modification du fichier local `max_backend/prompts/max_system_prompt_v2.txt`
2. ✅ Copie du fichier vers le serveur de production :
   ```bash
   scp max_backend/prompts/max_system_prompt_v2.txt root@51.159.170.20:/opt/max-infrastructure/max-backend/prompts/
   ```
3. ✅ Redémarrage du container max-backend :
   ```bash
   docker compose restart max-backend
   ```
4. ✅ Vérification des logs : Container démarré avec succès

### Serveur de Production

- **URL** : https://api.max.studiomacrea.cloud
- **Container** : max-backend
- **Port** : 3005
- **Status** : ✅ Running

## 🧪 Tests Recommandés

Pour valider que M.A.X. a bien intégré les nouvelles instructions :

### Test 1 : Réutilisation dans les 10 minutes

1. Demander à M.A.X. : **"Ajoute le champ secteur à la fiche détail du lead"**
2. Approuver le consentement
3. **Vérifier** : M.A.X. dit "J'ai maintenant accès aux modifications de layouts pendant 10 minutes"
4. Demander à M.A.X. (< 2 min après) : **"Ajoute le champ accountName à la fiche détail"**
5. **Résultat attendu** : M.A.X. dit quelque chose comme "J'utilise l'accès que tu m'as accordé il y a X minutes"

### Test 2 : Expiration après 10 minutes

1. Approuver un consentement pour layout_modification
2. Attendre 11 minutes
3. Demander une nouvelle modification de layout
4. **Résultat attendu** : M.A.X. demande un nouveau consentement en expliquant "Le précédent accès a expiré"

### Test 3 : Transparence

1. Pendant la période de grâce, demander plusieurs modifications
2. **Vérifier** : M.A.X. INFORME à chaque fois qu'il réutilise l'accès précédent
3. M.A.X. ne doit JAMAIS procéder silencieusement sans expliquer

## 📋 Système Backend (Déjà Fonctionnel)

Le backend gérait déjà la réutilisation automatique :

- ✅ `consentGate.js` : Recherche automatique de consentements récents
- ✅ `consentManager.js` : Fonction `findRecentConsentByType()`
- ✅ Période de grâce : 10 minutes (600000 ms)
- ✅ Nettoyage automatique après expiration

**Ce qui manquait** : M.A.X. n'était pas au courant de ce système ! Il continuait à demander des consentements par habitude.

**Maintenant** : M.A.X. sait qu'il peut réutiliser les consentements et le communique clairement à l'utilisateur.

## 🎓 Documentation Associée

- [TEST_MAX_CRM.md](TEST_MAX_CRM.md) - Plan de test complet
- [GUIDE_PARLER_A_MAX.md](GUIDE_PARLER_A_MAX.md) - Guide utilisateur
- [CONSENT_AUTO_REUSE_FIX.md](CONSENT_AUTO_REUSE_FIX.md) - Documentation technique backend

## 🚀 Impact Utilisateur

### Avant cette mise à jour

- 🔴 Interruptions fréquentes pour des opérations similaires
- 🔴 Workflow lent pour des tâches multiples
- 🔴 Frustration : "Mais je viens de te donner l'autorisation !"

### Après cette mise à jour

- ✅ UX fluide : Une seule approbation pour des opérations similaires pendant 10 minutes
- ✅ Transparence : M.A.X. explique qu'il réutilise l'accès
- ✅ Sécurité maintenue : Expiration automatique + contrôle utilisateur

## 🔐 Sécurité

Le système reste sécurisé :

1. ✅ L'utilisateur doit toujours approuver la PREMIÈRE opération
2. ✅ La réutilisation est limitée à 10 minutes
3. ✅ Chaque type d'opération a son propre consentement
4. ✅ Le backend valide TOUJOURS la validité et l'expiration
5. ✅ M.A.X. reste transparent sur l'utilisation des accès

---

**Status** : ✅ Déployé en production - Prêt pour tests utilisateur