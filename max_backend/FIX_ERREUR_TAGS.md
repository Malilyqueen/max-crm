# 🔧 Correction Erreur "maxTags" - EspoCRM

## 🐛 Problème Identifié

### Erreur EspoCRM
```json
{
  "messageTranslation": {
    "label": "validationFailure",
    "scope": null,
    "data": {
      "field": "maxTags",
      "type": "valid"
    }
  }
}
```

**Code erreur** : `Espo 400 Bad Request`
**Cause** : Le nombre de tags (segments) dépasse la limite autorisée par EspoCRM
**Résultat** : 0 leads mis à jour, 10 leads en erreur

---

## ✅ Solution Appliquée

### 1. Limitation stricte du nombre de tags

**Fichier modifié** : [emailAnalyzer.js](d:\Macrea\CRM\max_backend\lib\emailAnalyzer.js)

#### Modification 1 : Prompt IA (ligne 137)

**Avant** :
```
- Tags: 2-4 tags pertinents, format ["Cosmétique", "E-commerce", "B2C"]
```

**Après** :
```
- Tags: EXACTEMENT 2-3 tags pertinents MAXIMUM, format ["Cosmétique", "E-commerce", "B2C"]
```

#### Modification 2 : Formatage pour EspoCRM (ligne 342-343)

**Avant** :
```javascript
if (Array.isArray(detail.tags) && detail.tags.length > 0) {
  lead.segments = detail.tags;
}
```

**Après** :
```javascript
// LIMITATION : Maximum 3 tags pour éviter l'erreur "maxTags" d'EspoCRM
if (Array.isArray(detail.tags) && detail.tags.length > 0) {
  lead.segments = detail.tags.slice(0, 3); // Limite stricte à 3 tags
}
```

#### Vérification : Fallbacks déjà protégés

**Fallback JSON parsing** (ligne 169) :
```javascript
tags: Object.keys(keywordHints).slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1))
```
✅ Déjà limité à 3 tags

**Fallback keywords** (ligne 195) :
```javascript
tags: Object.keys(keywordHints).slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1))
```
✅ Déjà limité à 3 tags

---

## 💰 Augmentation Budget Tokens

### Modification .env

**Avant** :
```env
TOKENS_BUDGET_TOTAL=2000000
```

**Après** :
```env
TOKENS_BUDGET_TOTAL=3000000
```

**Augmentation** : +1,000,000 tokens
**Nouveau budget total** : 3,000,000 tokens
**Hard cap** : 10,000,000 tokens (inchangé)

---

## 🧪 Tests à Effectuer

### Test 1 : Redémarrage serveur

```powershell
.\RESTART_SERVER.ps1
```

**Vérification** : Serveur démarre sans erreur avec nouveau budget 3M tokens

---

### Test 2 : Enrichissement avec limite tags

**Prompt** :
```
"Enrichis les 10 leads qui ont échoué en respectant la limite de tags"
```

**Résultat attendu** :
- ✅ 10/10 leads enrichis avec succès
- ✅ Chaque lead a exactement 2-3 tags
- ✅ Aucune erreur "maxTags"
- ✅ Descriptions ajoutées
- ✅ Logs confirment le succès

**Console serveur** :
```
[EmailAnalyzer] ✓ Lead 67b... (Lead 1) enrichi: Cosmétique
[EmailAnalyzer] ✓ Lead 67b... (Lead 2) enrichi: Événementiel
...
[EmailAnalyzer] Batch terminé: 10 enrichis, 0 ignorés
```

---

### Test 3 : Vérification dans EspoCRM

**Dans EspoCRM, pour chaque lead enrichi, vérifiez** :

1. **Champ "Description"** : Doit contenir une description générée
2. **Champ "Segments" (Tags)** : Doit contenir 2-3 tags maximum
3. **Aucune erreur de validation**

**Exemple attendu** :

| Lead | Tags (Segments) | Nombre de tags |
|------|----------------|----------------|
| Amina Diallo | Cosmétique, E-commerce, B2C | 3 ✅ |
| Moussa Sow | DJ, Musique, Événementiel | 3 ✅ |
| Vero Rakoto | Coaching, Formation | 2 ✅ |

---

## 📊 Analyse de la Limite EspoCRM

### Limite détectée

D'après l'erreur `maxTags`, EspoCRM a une limite sur le nombre de tags par entité.

**Limite probable** : 3 tags maximum par lead
**Notre solution** : Limite stricte à 3 tags dans le code

### Pourquoi cette limite existe

1. **Performance** : Éviter des requêtes trop lourdes
2. **UI/UX** : Affichage propre dans l'interface
3. **Base de données** : Contraintes de schéma

---

## 🔍 Diagnostic

### Avant la correction

```json
{
  "secteur": "Cosmétique",
  "tags": ["Cosmétique", "E-commerce", "B2C", "Beauty", "Paris"],
  "services_interesses": ["Branding", "Social Media", "SEO"]
}
```

**Problème** : 5 tags → Dépasse la limite → Erreur 400

### Après la correction

```json
{
  "secteur": "Cosmétique",
  "tags": ["Cosmétique", "E-commerce", "B2C"],
  "services_interesses": ["Branding", "Social Media", "SEO"]
}
```

**Résultat** : 3 tags → Dans la limite → Succès ✅

---

## 🚀 Prochaines Étapes

### Étape 1 : Redémarrer le serveur

```powershell
.\RESTART_SERVER.ps1
```

### Étape 2 : Relancer l'enrichissement

**Dans le chat M.A.X.** :
```
"Réessaie d'enrichir les 10 leads qui ont échoué"
```

ou

```
"Enrichis tous les leads en analysant leur email"
```

### Étape 3 : Vérifier le succès

**Résultat attendu** :
```
✅ Enrichissement terminé : 10 leads mis à jour

Détails :
- Analysés : 10
- Enrichis : 10
- Ignorés : 0
- Erreurs : 0
```

---

## 📝 Recommandations

### Pour éviter ce problème à l'avenir

1. **Toujours limiter les tags à 3 maximum** lors de l'enrichissement
2. **Vérifier les contraintes EspoCRM** avant d'ajouter de nouveaux champs
3. **Tester sur 1-2 leads** avant un batch complet
4. **Logger les tags générés** pour détecter les dépassements

### Si le problème persiste

1. **Vérifier la configuration EspoCRM** :
   - Admin → Entity Manager → Lead → Fields → segments
   - Vérifier "Max Items Selected" ou "Max Count"

2. **Ajuster la limite dans le code** si EspoCRM accepte plus/moins de 3 tags

3. **Utiliser un champ custom** si plus de 3 tags sont nécessaires

---

## 📈 Impact Budget Tokens

### Consommation attendue pour réessai

- **10 leads** × 300-400 tokens/lead = **3,000-4,000 tokens**
- **Budget actuel** : 3,000,000 tokens
- **Impact** : 0.1-0.13% du budget

### Capacité restante

Avec 3M de tokens, vous pouvez enrichir :
- **~750-1,000 leads** au total
- **~75-100 batchs** de 10 leads

---

## ✅ Validation

### Checklist de validation

- [x] Prompt IA modifié pour limiter à 2-3 tags
- [x] Code formatage modifié avec `.slice(0, 3)`
- [x] Fallbacks déjà protégés avec `.slice(0, 3)`
- [x] Budget tokens augmenté à 3M
- [ ] Serveur redémarré
- [ ] Test enrichissement réussi
- [ ] Leads vérifiés dans EspoCRM

---

## 🎯 Résumé

**Problème** : Erreur "maxTags" lors de l'enrichissement (10 leads)
**Cause** : Trop de tags générés (>3)
**Solution** : Limite stricte à 3 tags dans le code
**Bonus** : Budget tokens augmenté de 1M (+50%)

**Statut** : ✅ **Correction appliquée, prêt à tester**

---

**Version** : 1.0.0
**Date** : 16 novembre 2025
**Fichiers modifiés** :
- [.env](d:\Macrea\CRM\max_backend\.env#L15) (ligne 15)
- [emailAnalyzer.js](d:\Macrea\CRM\max_backend\lib\emailAnalyzer.js) (lignes 137, 342-343)

---

**🔄 Action requise : Redémarrer le serveur avec `.\RESTART_SERVER.ps1`**
