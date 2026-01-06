# Plan de test : M.A.X. et modifications CRM

## ✅ Ce qui a été corrigé aujourd'hui

1. **Système de réutilisation des consentements (10 min)**
2. **Chemins des layouts (production vs développement)**
3. **Permissions d'écriture sur les fichiers**
4. **Docker CLI dans le container**
5. **Labels des champs (Tags M.A.X. vs Tags utilisateur)**

---

## 🎯 Test 1 : Réutilisation automatique des consentements

### Objectif
Vérifier que M.A.X. ne redemande pas le consentement pour chaque opération pendant 10 minutes.

### Instructions - VERSION SAFE (ne casse rien)
1. Ouvre le chat M.A.X. sur https://max.studiomacrea.cloud
2. **Première demande** : **"Ajoute le champ secteur à la fiche détail du lead"**
   - Une ConsentCard devrait apparaître
   - Clique sur **"Approuver"**
   - Attends que l'opération se termine (M.A.X. confirme le succès)
3. **Deuxième demande** (dans les 30 secondes) : **"Ajoute le champ accountName à la fiche détail du lead"**

### Résultat attendu
- ✅ **1ère demande** : ConsentCard apparaît, tu approuves
- ❌ **2ème demande** : **PAS de nouvelle ConsentCard**
- ✅ M.A.X. dit quelque chose comme "J'ai encore accès aux modifications, je procède directement..."
- ✅ Les deux opérations réussissent

### Logs à vérifier (optionnel)
```bash
ssh root@51.159.170.20 "docker logs max-backend --tail 50 | grep 'Réutilisation consent'"
```
Tu devrais voir : `[ConsentManager] 🔄 Réutilisation consent consent_xxx`

### Pourquoi ce test ?
- `secteur` et `accountName` existent déjà dans ton CRM
- On modifie la **fiche détail**, pas la liste (aucun impact sur tes vues actuelles)
- Facile à vérifier et à annuler si besoin

---

## 🎯 Test 2 : Modification des layouts (liste)

### Objectif
Vérifier que M.A.X. peut ajouter/retirer des champs de la liste.

### Test 2.1 : Ajouter un champ
1. Note les colonnes actuelles de la liste des leads
2. Dis à M.A.X. : **"Ajoute le champ phoneNumber à la liste des leads"**
3. Approuve le consentement (si demandé)
4. Rafraîchis la page EspoCRM (Ctrl+Shift+R)
5. Vérifie que la colonne "Téléphone" apparaît

### Test 2.2 : Retirer un champ
1. Dis à M.A.X. : **"Retire le champ testFieldMaxLO de la liste des leads"**
2. Ne devrait PAS redemander consentement (réutilisation 10min)
3. Rafraîchis la page
4. Vérifie que la colonne "testFieldMaxLO" a disparu

### Résultat attendu
- ✅ Les colonnes changent effectivement dans l'interface
- ✅ Pas de message "Configuration partiellement terminée"
- ✅ M.A.X. confirme le succès avec un message clair

---

## 🎯 Test 3 : Modification de la fiche détail

### Objectif
Vérifier que M.A.X. distingue bien "liste" et "fiche".

### Instructions
1. Ouvre un lead dans EspoCRM (clique sur un nom)
2. Note les champs affichés dans la fiche
3. Dis à M.A.X. : **"Ajoute le champ description à la fiche détail du lead"**
4. Rafraîchis et rouvre la fiche du lead
5. Vérifie que "Description" apparaît dans la fiche

### Résultat attendu
- ✅ Le champ apparaît dans la **fiche détail** (pas dans la liste)
- ✅ M.A.X. comprend la différence entre "liste" et "fiche"

---

## 🎯 Test 4 : Distinction entre les deux types de tags

### Objectif
Vérifier que M.A.X. comprend "Tags M.A.X." vs "Tags utilisateur".

### Test 4.1 : Vérifier les labels
1. Regarde la liste des leads
2. La colonne devrait afficher **"Tags M.A.X."** (pas "maxTags")
3. Ouvre la fiche d'un lead
4. Vérifie les labels des champs de tags

### Test 4.2 : Modifier maxTags
1. Dis à M.A.X. : **"Mets à jour les Tags M.A.X. pour le lead Hakim Bouaziz avec les valeurs: Urgent, Artisanat"**
2. M.A.X. devrait modifier le champ `maxTags` (pas `tags`)
3. Vérifie dans la liste ou la fiche que les tags apparaissent

### Test 4.3 : Modifier tags
1. Dis à M.A.X. : **"Ajoute le tag 'VIP' dans les tags utilisateur pour Camille Roos"**
2. M.A.X. devrait modifier le champ `tags` (pas `maxTags`)

### Résultat attendu
- ✅ M.A.X. modifie le bon champ selon la formulation
- ✅ Les labels sont clairs dans l'interface

---

## 🎯 Test 5 : Créer un nouveau champ de bout en bout

### Objectif
Test complet : création de champ + ajout aux layouts.

### Instructions
1. Dis à M.A.X. : **"Crée un champ texte appelé 'Budget' sur l'entité Lead"**
2. Approuve le consentement
3. Dis : **"Ajoute le champ Budget à la liste des leads"** (devrait réutiliser le consent)
4. Dis : **"Ajoute le champ Budget à la fiche détail"** (devrait réutiliser le consent)
5. Rafraîchis l'interface
6. Vérifie que "Budget" apparaît dans la liste ET dans la fiche

### Résultat attendu
- ✅ 1 seul consentement demandé (pour la création du champ)
- ✅ Les 2 ajouts de layout utilisent le consent réutilisé
- ✅ Le champ apparaît dans les deux endroits
- ✅ Total : 3 opérations, 1 seul consentement

---

## 🎯 Test 6 : Gestion d'erreur et messages clairs

### Objectif
Vérifier que M.A.X. donne des messages utiles en cas de problème.

### Test 6.1 : Champ inexistant
1. Dis à M.A.X. : **"Ajoute le champ champQuiNexistePas à la liste"**
2. M.A.X. devrait indiquer que le champ n'existe pas

### Test 6.2 : Champ déjà présent
1. Dis à M.A.X. : **"Ajoute le champ name à la liste des leads"**
2. M.A.X. devrait dire que le champ est déjà dans la liste

### Résultat attendu
- ✅ Messages d'erreur clairs et utiles
- ✅ Pas de crash ou erreur 500
- ✅ M.A.X. propose des solutions

---

## 🎯 Test 7 : Expiration du consentement (10 minutes)

### Objectif
Vérifier que le consentement expire bien après 10 minutes.

### Instructions
1. Approuve un consentement pour une modification de layout
2. **Attends 11 minutes** ⏰
3. Dis à M.A.X. : **"Ajoute un autre champ à la liste"**
4. Une **nouvelle ConsentCard** devrait apparaître

### Résultat attendu
- ✅ Après 10+ minutes, un nouveau consentement est demandé
- ✅ Le système ne réutilise pas un consentement expiré

---

## 📊 Checklist rapide

Coche au fur et à mesure :

- [ ] Test 1 : Réutilisation consentement (< 10min)
- [ ] Test 2.1 : Ajouter colonne à la liste
- [ ] Test 2.2 : Retirer colonne de la liste
- [ ] Test 3 : Modifier fiche détail
- [ ] Test 4 : Distinction Tags M.A.X. / Tags utilisateur
- [ ] Test 5 : Nouveau champ complet (création + layouts)
- [ ] Test 6 : Gestion erreurs
- [ ] Test 7 : Expiration consentement (optionnel)

---

## 🐛 Si quelque chose ne fonctionne pas

### Problème : Layout ne s'affiche pas
```bash
# Clear cache EspoCRM
ssh root@51.159.170.20 "docker exec espocrm php command.php clear-cache"
# Rafraîchir navigateur avec Ctrl+Shift+R
```

### Problème : Permission denied
```bash
# Vérifier permissions layouts
ssh root@51.159.170.20 "docker exec espocrm ls -la /var/www/html/custom/Espo/Custom/Resources/layouts/Lead/"
```

### Problème : Consentement redemandé à chaque fois
```bash
# Vérifier logs réutilisation
ssh root@51.159.170.20 "docker logs max-backend --tail 100 | grep -E 'Réutilisation|findRecentConsent'"
```

### Problème : Erreur 500
```bash
# Logs EspoCRM
ssh root@51.159.170.20 "docker exec espocrm tail -50 /var/www/html/data/logs/espo-$(date +%Y-%m-%d).log"
```

---

## ✅ Validation finale

**Tous les tests passent ?** 🎉

Tu peux maintenant :
1. Créer un commit Git avec tous les changements
2. Documenter pour le client avec [GUIDE_PARLER_A_MAX.md](GUIDE_PARLER_A_MAX.md)
3. Déployer en confiance pour les tests client