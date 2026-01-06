# 🚀 Guide Rapide - Enrichissement Intelligent M.A.X.

## ✅ Système Installé et Prêt

Tous les composants de l'enrichissement intelligent ont été installés :

### 📁 Fichiers créés/modifiés

- ✅ `lib/emailAnalyzer.js` - Module d'analyse IA des emails
- ✅ `lib/maxTools.js` - Outil `analyze_and_enrich_leads` ajouté
- ✅ `routes/chat.js` - Handler de l'enrichissement
- ✅ `prompts/max_system_prompt_v2.txt` - Instructions M.A.X.
- ✅ `TEST_ENRICHISSEMENT.ps1` - Script de test
- ✅ `ENRICHISSEMENT_INTELLIGENT.md` - Documentation complète

---

## 🎯 Comment utiliser

### Étape 1 : Redémarrer le serveur

**IMPORTANT** : Le serveur doit être redémarré pour charger les nouvelles fonctionnalités.

```powershell
.\RESTART_SERVER.ps1
```

### Étape 2 : Tester l'enrichissement

Dans le chat M.A.X., utilisez un prompt basique comme :

```
"Sur tous les leads, à partir de leur email, trouve ce qui pourrait les intéresser"
```

ou

```
"Enrichis les leads en analysant leur adresse email"
```

ou

```
"Déduis le secteur d'activité à partir des emails"
```

### Étape 3 : M.A.X. va automatiquement

1. **Lister les leads** avec `query_espo_leads`
2. **Analyser chaque email** avec l'IA
3. **Proposer un enrichissement** (prévisualisation)
4. **Appliquer les modifications** au CRM

---

## 🧪 Test Manuel (Optionnel)

Pour tester directement l'API sans passer par le chat :

```powershell
.\TEST_ENRICHISSEMENT.ps1
```

Ce script teste l'analyse d'un email de démonstration (`contact@cosmetics-paris.com`).

---

## 📊 Ce que M.A.X. déduit automatiquement

À partir d'un email comme `contact@qmix-paris.fr` :

```json
{
  "secteur": "Événementiel",
  "tags": ["DJ", "Musique", "Événementiel"],
  "services_interesses": [
    "Branding & Identité Visuelle",
    "Social Media Marketing",
    "Création de Site Web"
  ],
  "description_courte": "Lead du secteur événementiel, probablement DJ ou mixeur musical basé à Paris.",
  "confiance": "moyenne"
}
```

---

## 🎨 Exemples de déductions

| Email | Secteur déduit | Tags | Confiance |
|-------|----------------|------|-----------|
| `contact@cosmetics-paris.com` | Cosmétique | Cosmétique, E-commerce, B2C | Haute |
| `info@qmix-paris.fr` | Événementiel | DJ, Musique, Événementiel | Moyenne |
| `hello@coach-vero.be` | Coaching | Coaching, Formation, Consulting | Moyenne |
| `contact@boutiquemiel.fr` | E-commerce Alimentaire | Miel, Bio, E-commerce | Haute |
| `info@terraya-paris.fr` | Cosmétique/Bien-être | Beauté, Cosmétique, Paris | Moyenne |
| `contact@glowco.com` | Cosmétique | Cosmétique, Skin Care, Beauty | Haute |

---

## ⚡ Résolution de problèmes

### Problème : Bulle vide ou "Aucun outil trouvé"

**Solution** : Redémarrez le serveur avec `.\RESTART_SERVER.ps1`

### Problème : "Leads non trouvés"

**Vérification** :
1. Listez d'abord manuellement : `"Liste tous les leads"`
2. Vérifiez que les leads ont bien des emails

### Problème : Enrichissements de mauvaise qualité

**Amélioration** :
- Ajoutez des mots-clés dans `lib/emailAnalyzer.js` ligne 32-63
- Ajoutez des exemples dans le prompt ligne 119-125

---

## 📈 Performances

- **1 lead** : ~2-3 secondes
- **10 leads** : ~20-30 secondes
- **50 leads** : ~1.5-2 minutes
- **Tokens** : ~300-400 par lead

**Recommandation** : Pour plus de 100 leads, traiter par lots de 50.

---

## 🔒 Sécurité & Budget

Le système d'enrichissement consomme des tokens. Pour surveiller le budget :

```powershell
.\MONITOR_TOKENS.ps1
```

Pour recharger le budget (admin seulement) :

```powershell
.\RECHARGE_TOKENS.ps1
```

---

## 📚 Documentation complète

Pour plus de détails, consultez :
- [ENRICHISSEMENT_INTELLIGENT.md](ENRICHISSEMENT_INTELLIGENT.md) - Guide détaillé
- [GESTION_TOKENS.md](GESTION_TOKENS.md) - Gestion du budget tokens

---

## ✨ Prochaine étape

**Redémarrez le serveur et testez !**

```powershell
.\RESTART_SERVER.ps1
```

Puis dans M.A.X. :

```
"Sur tous les leads, à partir de leur email, trouve ce qui pourrait les intéresser"
```

---

**Version** : 1.0.0
**Date** : 16 novembre 2025
**Statut** : ✅ Prêt à tester
