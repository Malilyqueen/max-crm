# Test : M.A.X. et la réutilisation des consentements

## 🎯 Objectif

Valider que M.A.X. a bien intégré les nouvelles instructions sur la réutilisation automatique des consentements (période de grâce 10 minutes).

## ✅ Test Simple (2 minutes)

### Étapes

1. **Va sur le chat M.A.X.** : https://max.studiomacrea.cloud

2. **Première demande** :
   ```
   "M.A.X., ajoute le champ phoneNumber à la fiche détail du lead"
   ```

3. **Approuve le consentement** dans l'interface (clique sur "Approuver")

4. **OBSERVE le message de M.A.X.** après l'approbation :
   - ✅ **ATTENDU** : M.A.X. doit mentionner qu'il a maintenant accès pendant 10 minutes
   - ✅ Exemples de phrases correctes :
     - "J'ai maintenant accès aux modifications de layouts pendant 10 minutes"
     - "Tu m'as donné accès pour les 10 prochaines minutes"
     - "Je peux modifier les layouts pendant 10 minutes"

5. **Deuxième demande** (dans les 30 secondes suivantes) :
   ```
   "Ajoute aussi le champ description à la fiche détail"
   ```

6. **OBSERVE la réaction de M.A.X.** :
   - ✅ **ATTENDU** : M.A.X. NE doit PAS demander un nouveau consentement
   - ✅ M.A.X. doit mentionner qu'il réutilise l'accès précédent
   - ✅ Exemples de phrases correctes :
     - "J'utilise l'accès que tu m'as accordé il y a X minutes"
     - "Je procède directement avec l'autorisation que tu m'as donnée"
     - "Je vais utiliser mon accès actuel pour ajouter ce champ"

7. **Vérifier le résultat** :
   - ✅ Les deux opérations doivent réussir
   - ✅ Un seul consentement demandé au total
   - ✅ M.A.X. reste transparent sur l'utilisation de l'accès

## ❌ Comportements INCORRECTS

Si M.A.X. fait l'une de ces choses, c'est que le prompt n'a pas été bien intégré :

- ❌ Demande un nouveau consentement pour la 2ème opération
- ❌ Ne mentionne PAS la période de 10 minutes après la 1ère approbation
- ❌ Procède à la 2ème opération SANS expliquer qu'il réutilise l'accès
- ❌ Dit "Je ne peux pas faire ça sans ton autorisation" pour la 2ème demande

## 📊 Résultat Attendu

### Conversation idéale

```
Toi: "M.A.X., ajoute le champ phoneNumber à la fiche détail du lead"

M.A.X.: "Cette opération nécessite ton autorisation."
[ConsentCard apparaît]

[Tu cliques "Approuver"]

M.A.X.: "✅ Merci ! J'ai maintenant accès aux modifications de layouts
pendant 10 minutes. Je procède à l'ajout du champ phoneNumber..."
[Opération réussie]

Toi: "Ajoute aussi le champ description à la fiche détail"

M.A.X.: "Je vais utiliser l'accès que tu m'as accordé il y a 1 minute
pour ajouter le champ description à la fiche détail..."
[Opération réussie - PAS de nouvelle ConsentCard]

M.A.X.: "✅ Champ ajouté ! Il te reste environ 9 minutes d'accès
aux modifications de layouts."
```

## 🐛 Si le test échoue

### M.A.X. redemande le consentement pour la 2ème opération

**Cause probable** : Le prompt n'a pas été rechargé correctement

**Solution** :
```bash
# Redémarrer max-backend
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"

# Vérifier que le bon prompt est chargé
ssh root@51.159.170.20 "grep -A5 'RÉUTILISATION AUTOMATIQUE' /opt/max-infrastructure/max-backend/prompts/max_system_prompt_v2.txt"
```

### M.A.X. ne mentionne PAS la période de 10 minutes

**Cause probable** : M.A.X. n'a pas lu la nouvelle section du prompt

**Solution** :
```bash
# Vérifier que le fichier a bien été copié
ssh root@51.159.170.20 "wc -l /opt/max-infrastructure/max-backend/prompts/max_system_prompt_v2.txt"
# Doit afficher environ 300+ lignes (vs ~207 avant)

# Forcer le rechargement du prompt
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"
```

## 🎓 Test Avancé (Optionnel)

### Test de l'expiration après 10 minutes

**Note** : Ce test prend 12 minutes au total

1. Approuve un consentement pour layout_modification
2. Note l'heure : ___:___
3. **Attends 11 minutes** ⏰
4. Demande une nouvelle modification de layout
5. **Résultat attendu** : M.A.X. demande un NOUVEAU consentement et dit quelque chose comme :
   - "Le précédent accès a expiré, je te redemande l'autorisation"
   - "Cela fait plus de 10 minutes, je dois te demander un nouveau consentement"

## ✅ Validation Finale

Coche les cases au fur et à mesure :

- [ ] M.A.X. mentionne "10 minutes" après la 1ère approbation
- [ ] M.A.X. NE redemande PAS de consentement pour la 2ème opération
- [ ] M.A.X. explique qu'il réutilise l'accès précédent
- [ ] Les deux opérations réussissent
- [ ] M.A.X. reste transparent sur ce qu'il fait

---

**Si tous les tests passent** ✅ : M.A.X. a bien intégré le système de réutilisation des consentements !

**Si un test échoue** ❌ : Voir la section "🐛 Si le test échoue" ci-dessus.