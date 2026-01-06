# Enrichissement Intelligent M.A.X.

## 🎯 Objectif

Permettre à M.A.X. de **comprendre des prompts basiques de clients non techniques** et d'enrichir automatiquement les leads en analysant leurs adresses email.

---

## ✨ Fonctionnalités

### Analyse automatique des emails

M.A.X. peut maintenant déduire automatiquement :
- **Secteur d'activité** (Cosmétique, Tech, Finance, etc.)
- **Tags appropriés** (["Cosmétique", "E-commerce", "B2C"])
- **Services potentiellement intéressants** (Branding, SEO, Social Media, etc.)
- **Description professionnelle** du lead

### Exemples de prompts qui fonctionnent maintenant

#### ✅ Avant (ne fonctionnait pas)
```
"Sur tous les leads, à partir de leur email, trouve ce qui pourrait les intéresser"
→ Bulle vide ❌
```

#### ✅ Après (fonctionne)
```
"Sur tous les leads, à partir de leur email, trouve ce qui pourrait les intéresser"
→ M.A.X. :
  1. Liste les leads
  2. Analyse chaque email
  3. Propose un enrichissement
  4. Applique les modifications ✅
```

---

## 🔧 Comment ça marche

### 1. Détection de mots-clés dans le domaine

Exemples :
- `contact@cosmetics-paris.com` → Détection "cosmetic" → Secteur: Cosmétique
- `hello@digital-agency.fr` → Détection "digital" + "agency" → Secteur: Marketing
- `info@techsolutions.com` → Détection "tech" → Secteur: Tech

### 2. Analyse IA avancée

Si pas de mots-clés évidents, M.A.X. utilise l'IA (GPT-4o-mini) pour :
- Analyser le domaine complet
- Déduire le contexte métier
- Générer des tags pertinents
- Suggérer des services

### 3. Mise à jour automatique

M.A.X. applique automatiquement :
- Champ `description` : Description générée
- Champ `segments` : Tags générés
- (Optionnel) Autres champs custom que vous pouvez configurer

---

## 📖 Guide d'utilisation

### Workflow classique

1. **L'utilisateur demande (prompt basique)** :
   ```
   "Enrichis tous les leads en analysant leur email"
   ```

2. **M.A.X. liste d'abord les leads** :
   ```
   query_espo_leads({})
   ```

3. **M.A.X. analyse et propose** :
   ```
   analyze_and_enrich_leads({ applyUpdates: false })
   ```
   → Prévisualisation des enrichissements

4. **M.A.X. applique (si confirmé)** :
   ```
   analyze_and_enrich_leads({ applyUpdates: true })
   ```
   → Mise à jour du CRM

---

## 🎨 Exemples concrets

### Exemple 1 : Lead avec email évident

**Input :**
```
Email: contact@cosmetics-beauty.com
Nom: Sarah Martin
```

**Analyse M.A.X. :**
```json
{
  "secteur": "Cosmétique",
  "tags": ["Cosmétique", "Beauty", "E-commerce"],
  "services_interesses": [
    "Branding & Identité Visuelle",
    "Social Media Marketing",
    "E-commerce & Shopify"
  ],
  "description_courte": "Lead du secteur cosmétique, potentiellement intéressé par des services de branding et marketing digital pour produits de beauté.",
  "confiance": "haute"
}
```

### Exemple 2 : Lead avec email générique

**Input :**
```
Email: info@entreprise-services.fr
Nom: Jean Dupont
```

**Analyse M.A.X. :**
```json
{
  "secteur": "Services B2B",
  "tags": ["Services", "B2B", "Consulting"],
  "services_interesses": [
    "Stratégie Marketing",
    "Lead Generation",
    "Content Marketing"
  ],
  "description_courte": "Lead du secteur services B2B, entreprise de services professionnels.",
  "confiance": "moyenne"
}
```

---

## ⚙️ Configuration

### Champs mis à jour

Par défaut, `emailAnalyzer.js` met à jour :
- `description` : Description générée
- `segments` : Tags (format array)

**Pour personnaliser**, modifiez `formatEnrichedLeadsForUpdate()` dans [emailAnalyzer.js:260-273](d:\Macrea\CRM\max_backend\lib\emailAnalyzer.js#L260-L273) :

```javascript
export function formatEnrichedLeadsForUpdate(analysisDetails) {
  return analysisDetails
    .filter(detail => detail.status === 'enriched')
    .map(detail => ({
      id: detail.leadId,
      description: detail.description,
      segments: detail.tags,

      // Ajoutez vos champs custom :
      // industrie: detail.secteur,
      // servicesInteresses: detail.services
    }));
}
```

### Mots-clés détectables

Modifiez les mots-clés dans [emailAnalyzer.js:29-53](d:\Macrea\CRM\max_backend\lib\emailAnalyzer.js#L29-L53) pour votre domaine métier :

```javascript
const keywords = {
  votreIndustrie: ['keyword1', 'keyword2', 'keyword3'],
  // ...
};
```

---

## 🧪 Tests

### Test manuel

1. Redémarrez le serveur :
   ```powershell
   npm start
   ```

2. Dans le chat M.A.X., testez :
   ```
   "Liste les leads et enrichis-les à partir de leur email"
   ```

3. M.A.X. devrait :
   - ✅ Lister les leads
   - ✅ Analyser les emails
   - ✅ Proposer un enrichissement
   - ✅ Appliquer les modifications

### Exemples de prompts à tester

```
✅ "Enrichis tous les leads en analysant leur adresse email"
✅ "À partir des emails, trouve ce qui pourrait intéresser mes leads"
✅ "Devine le secteur de mes leads avec leur email"
✅ "Analyse les domaines et ajoute des tags pertinents"
✅ "Déduis les besoins à partir des adresses email"
```

---

## 📊 Performances

### Tokens consommés

- **Par lead** : ~300-400 tokens (analyse IA)
- **10 leads** : ~3,000-4,000 tokens
- **50 leads** : ~15,000-20,000 tokens

### Temps d'exécution

- **1 lead** : ~2-3 secondes
- **10 leads** : ~20-30 secondes
- **50 leads** : ~1.5-2 minutes

**Recommandation** : Pour de gros volumes (>100 leads), traitez par lots de 50.

---

## 🔍 Détails techniques

### Fichiers créés/modifiés

| Fichier | Modification | Description |
|---------|--------------|-------------|
| `lib/emailAnalyzer.js` | ➕ Créé | Module d'analyse IA |
| `lib/maxTools.js` | ✏️ Ligne 279-300 | Ajout outil `analyze_and_enrich_leads` |
| `routes/chat.js` | ✏️ Ligne 420-527 | Handler du nouvel outil |
| `prompts/max_system_prompt_v2.txt` | ✏️ Ligne 206-238 | Instructions pour M.A.X. |

### API utilisée

- **Modèle** : GPT-4o-mini (via `callOpenAI`)
- **Température** : 0.4 (équilibrée, pas trop créative)
- **Max tokens** : 400 par analyse

### Stratégie d'analyse

1. **Extraction domaine** : `@domaine.com`
2. **Détection keywords** : Mots-clés dans le domaine
3. **Analyse IA** : Si keywords insuffisants
4. **Fallback** : Si IA échoue, utilise keywords seuls
5. **Formatage** : JSON structuré pour mise à jour CRM

---

## ⚠️ Limitations et améliorations futures

### Limitations actuelles

- ❌ Ne fonctionne que sur les emails **professionnels** (@entreprise.com)
- ❌ Emails génériques (@gmail.com, @hotmail.com) → confiance "basse"
- ❌ Analyse limitée aux domaines francophones/anglophones

### Améliorations prévues

- 🔄 Intégration API Clearbit/Hunter pour enrichissement externe
- 🔄 Analyse LinkedIn automatique si disponible
- 🔄 Base de données d'entreprises connues
- 🔄 Machine Learning pour améliorer les prédictions

---

## 🆘 Dépannage

### M.A.X. ne comprend toujours pas le prompt

**Cause** : Serveur pas redémarré

**Solution** :
```powershell
.\RESTART_SERVER.ps1
```

### Erreur "ENOENT" ou module non trouvé

**Cause** : `emailAnalyzer.js` non trouvé

**Solution** :
```powershell
# Vérifier que le fichier existe
ls d:\Macrea\CRM\max_backend\lib\emailAnalyzer.js
```

### Analyse IA retourne toujours "confiance: basse"

**Cause** : Domaines trop génériques

**Solution** : Ajoutez plus de mots-clés dans `detectKeywords()` ou utilisez un service externe d'enrichissement.

---

**Version** : 1.0.0
**Date** : 16 novembre 2025
**Auteur** : Système M.A.X.
