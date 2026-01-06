# Fixes Finaux du Système Consent Gate

**Date**: 2026-01-05
**Status**: ✅ Consent Gate opérationnel + 1 amélioration appliquée

---

## ✅ Problèmes Résolus

### 1. Consent Gate fonctionne en production
- M.A.X. appelle les tools au lieu de répondre en texte
- Backend crée les consents et retourne `pendingConsent`
- Frontend affiche la ConsentCard avec boutons Approuver/Refuser
- L'utilisateur peut approuver/refuser
- L'opération s'exécute après approbation

### 2. Grâce période augmentée de 10s → 10min
**Problème**: Après approbation d'un consent, M.A.X. ne pouvait réessayer que pendant 10 secondes.
**Solution**: Modifié `EXECUTION_GRACE_PERIOD_MS` de `10 * 1000` à `10 * 60 * 1000` dans `max_backend/lib/consentManager.js:127`

**Impact**: M.A.X. peut maintenant faire plusieurs tentatives/corrections dans les 10 minutes suivant l'approbation, sans redemander un consent à chaque fois.

---

## ⚠️ Problème Restant à Investiguer

### M.A.X. n'arrive pas à modifier les layouts EspoCRM

**Symptôme**:
```
Configuration partiellement terminée. Certaines étapes ont échoué.
```

**Opération tentée**: Ajouter le champ "name" aux layouts Lead

**Hypothèses possibles**:
1. Permissions de fichiers sur `/opt/max-infrastructure/espocrm/custom/Espo/Custom/Resources/metadata/`
2. EspoCRM en lecture seule ou cache actif
3. Le module `FilesystemLayoutManager` a un bug
4. Docker volume mount en lecture seule

**Prochaines étapes de diagnostic**:
```bash
# 1. Vérifier permissions
ssh root@51.159.170.20 "ls -la /opt/max-infrastructure/espocrm/custom/Espo/Custom/Resources/"

# 2. Vérifier logs backend pour l'erreur exacte
ssh root@51.159.170.20 "docker logs max-infrastructure-max-backend-1 --tail 500 | grep -A 20 'modifyLayout'"

# 3. Tester manuellement la création d'un fichier
ssh root@51.159.170.20 "docker exec max-infrastructure-max-backend-1 touch /espocrm/custom/test_write.txt"
```

---

## 📊 Commits Déployés

### Backend
- `d159a01` - fix(consent): Augmenter grâce période de 10s à 10min pour réessais multiples

### Frontend
- `ac323fa` - Désactiver streaming par défaut pour supporter pendingConsent
- `1ce56e7` - Config centralisée partout (élimine tous les localhost)
- `096cbca` - Trigger Vercel rebuild sur branche main

---

## 🧪 Test de Validation

Pour tester le nouveau système avec 10 minutes de grâce:

1. Demande à M.A.X.: "Crée un champ testGrace de type text sur Lead"
2. Clique sur **Approuver**
3. Attends 30 secondes
4. Demande: "Modifie le lead NextMove en mettant testGrace à 'valeur test'"
5. **Résultat attendu**: L'opération s'exécute sans demander un nouveau consent (car dans les 10min)

---

## 📝 Notes Techniques

### Durées configurées
- **Expiration du consent**: 5 minutes (`CONSENT_EXPIRY_MS = 5 * 60 * 1000`)
- **Grâce période d'exécution**: 10 minutes (`EXECUTION_GRACE_PERIOD_MS = 10 * 60 * 1000`)
- **Logs de débogage**: `[CHAT_STORE]`, `[ConsentManager]`, `[ConsentGate]`

### Architecture
```
User demande → M.A.X. appelle tool → Tool retourne 412 + requiresConsent
→ Backend crée pendingConsent → Frontend détecte pendingConsent
→ ConsentCard s'affiche → User approuve → POST /api/consent/execute/:id
→ Backend marque consent 'approved' + usedAt → Tool s'exécute
→ Pendant 10min, les tools peuvent réessayer sans nouveau consent
```
