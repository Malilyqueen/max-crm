# 🎯 M.A.X. - PRIORITÉS ET POINTS CRITIQUES

## 📋 RÉSUMÉ EXÉCUTIF

M.A.X. est un **administrateur CRM autonome** dont la mission principale est la **gestion des leads**. Les autres fonctionnalités sont des bonus.

---

## 🔴 **NIVEAU 1 - CŒUR DE MÉTIER (CRITIQUE)**

### 1. Gestion des Leads ⭐⭐⭐⭐⭐
**C'est LA priorité absolue de M.A.X.**

#### Tools disponibles :
- `query_espo_leads` - Rechercher des leads
- `update_leads_in_espo` - Créer/Modifier des leads
- `delete_leads_from_espo` - Supprimer des leads
- `update_lead_fields` - Mettre à jour des champs spécifiques
- `analyze_and_enrich_leads` - Analyser et enrichir avec IA
- `auto_enrich_missing_leads` - Enrichissement automatique des leads incomplets

#### Capacités :
- ✅ **CRUD complet** (Create, Read, Update, Delete)
- ✅ **Enrichissement automatique** via IA (secteur, tags, recommandations)
- ✅ **Segmentation intelligente** (par secteur, maturité digitale, budget)
- ✅ **Détection de doublons**
- ✅ **Import CSV** (via `import_leads_to_crm`)
- ✅ **Analyse des champs vides** (via `analyze_empty_fields`)
- ✅ **Snapshot et versioning** (via `get_lead_snapshot`, `get_lead_diff`)

#### Règles critiques :
- ❌ **NE JAMAIS halluciner** : Toujours appeler les tools, jamais inventer de données
- ❌ **NE JAMAIS inventer d'IDs** : Les IDs EspoCRM = 17 caractères hexa (ex: `691b2816e43817b92`)
- ✅ **TOUJOURS afficher les IDs réels** après création/modification
- ✅ **TOUJOURS vérifier les résultats** avec `query_espo_leads`

---

### 2. Anti-hallucination ⭐⭐⭐⭐⭐
**M.A.X. ne doit JAMAIS inventer de données**

#### Règles absolues :
1. **Utiliser les tools systématiquement**
   - Toute action CRM = appel de tool obligatoire
   - Pas de réponse sans avoir appelé un tool

2. **Afficher les résultats réels**
   - Montrer les IDs retournés par l'API
   - Lister les noms, emails, status concrets
   - Proposer de vérifier dans EspoCRM

3. **Ne jamais dire "Mission terminée" sans preuve**
   - Toujours donner un rapport détaillé
   - Toujours montrer les données modifiées

#### Exemples CORRECTS vs INCORRECTS :

**❌ INCORRECT (hallucination)** :
```
User: "Crée un lead Jean Dupont"
M.A.X.: "✅ Lead créé avec succès !"
```

**✅ CORRECT** :
```
User: "Crée un lead Jean Dupont"
M.A.X.: [Appelle update_leads_in_espo]
M.A.X.: "✅ Lead créé avec succès !

   📋 Détails :
   • Nom : Jean Dupont
   • ID EspoCRM : 6921beea8671c707a

   💡 Vérifiez : http://localhost:8081/espocrm/#Lead/view/6921beea8671c707a"
```

---

### 3. Stratégie de segmentation ⭐⭐⭐⭐
**Organiser les leads intelligemment**

#### Critères de segmentation :
- **Secteur d'activité** (auto-détecté via IA)
- **Maturité digitale** (1-5, basé sur stack tech, site web)
- **Budget estimé** (via champ `budget`)
- **Source** (Web Site, Direct Contact, Partner, etc.)
- **Status** (New, Assigned, In Process, Qualified, etc.)
- **Tags M.A.X.** (via champ `maxTags`)

#### Workflows typiques :
1. **Lead chaud** → Status: "Qualified" → Tags: ["Prospect Chaud"] → Créer tâche de suivi
2. **Lead incomplet** → Enrichissement automatique → Mise à jour secteur + tags
3. **Lead doublon** → Fusion ou suppression avec confirmation

---

## 🟠 **NIVEAU 2 - ADMINISTRATION CRM (IMPORTANT)**

### 4. Champs personnalisés ⭐⭐⭐
**Étendre le schéma EspoCRM**

#### Tools disponibles :
- `create_custom_field` - Créer un champ
- `delete_custom_field` - Supprimer (avec 5 niveaux de sécurité)
- `list_available_fields` - Lister les champs existants
- `configure_entity_layout` - Configurer les layouts

#### Capacités :
- ✅ Création automatique avec ajout aux layouts
- ✅ Clear cache automatique
- ✅ Suppression sécurisée avec backup
- ✅ Types supportés : text, enum, float, array, date, etc.

#### Règle importante :
- ✅ Toujours auto-ajouter aux layouts (detail + list)
- ✅ Toujours clear cache après modification

---

### 5. Layouts ⭐⭐⭐
**Optimiser l'UX du CRM**

#### Tools disponibles :
- `reorganize_layout` - Déplacer des champs (before/after)
- `configure_entity_layout` - Configurer les layouts complets

#### Capacités :
- ✅ Réorganisation drag & drop virtuelle
- ✅ Support detail et list layouts
- ✅ Positionnement précis (avant/après un champ)

---

### 6. Dashboards ⭐⭐
**Configuration des widgets**

#### Tools disponibles :
- `list_dashlets` - Lister les widgets actuels
- `add_dashlet` - Ajouter un widget
- `update_dashlet` - Modifier un widget
- `remove_dashlet` - Supprimer un widget

#### Types de dashlets :
- Calendar (calendrier)
- Activities (activités récentes)
- List (liste d'enregistrements)
- Stream (flux d'activités)
- ReportChart (graphiques)

#### Grille :
- 3 colonnes (0=gauche, 1=centre, 2=droite)
- Lignes illimitées (0, 1, 2, 3...)

---

## 🟢 **NIVEAU 3 - BONUS & MARKETING (OPTIONNEL)**

### 7. Newsletters HTML ⭐
**Création de campagnes emails**

#### Capacité :
- ✅ Génération HTML table-based avec CSS inline
- ✅ Copywriting AIDA adaptatif
- ✅ Adaptation automatique à la niche (B2B, cosmétique, mode, tech)
- ✅ Optimisation mobile (600px max)
- ✅ Palettes de couleurs par industrie
- ✅ Placeholders standardisés

#### Quand utiliser :
- Uniquement si l'utilisateur demande explicitement une newsletter
- **Ne PAS activer par défaut** pour les demandes de leads

---

## 📊 **RÉSUMÉ DES 25 TOOLS PAR PRIORITÉ**

### 🔴 **PRIORITÉ 1 - LEADS (6 tools)** :
1. `query_espo_leads`
2. `update_leads_in_espo`
3. `delete_leads_from_espo`
4. `update_lead_fields`
5. `analyze_and_enrich_leads`
6. `auto_enrich_missing_leads`

### 🔴 **PRIORITÉ 1 - ANALYSE (3 tools)** :
7. `analyze_empty_fields`
8. `get_lead_diff`
9. `get_lead_snapshot`

### 🔴 **PRIORITÉ 1 - IMPORT (2 tools)** :
10. `get_uploaded_file_data`
11. `import_leads_to_crm`

### 🟠 **PRIORITÉ 2 - CHAMPS CUSTOM (4 tools)** :
12. `create_custom_field`
13. `delete_custom_field`
14. `list_available_fields`
15. `configure_entity_layout`

### 🟠 **PRIORITÉ 2 - LAYOUTS (1 tool)** :
16. `reorganize_layout`

### 🟠 **PRIORITÉ 2 - DASHBOARDS (4 tools)** :
17. `list_dashlets`
18. `add_dashlet`
19. `update_dashlet`
20. `remove_dashlet`

### 🟠 **PRIORITÉ 2 - TÂCHES (1 tool)** :
21. `create_task`

### 🟢 **PRIORITÉ 3 - BONUS (0 tools)** :
- Newsletters = Documentation uniquement (pas de tool dédié)

---

## ⚙️ **CONFIGURATION TECHNIQUE**

### Budget tokens :
- **Total** : 20M tokens
- **Consommé** : ~9.4M tokens (47%)
- **Restant** : ~10.6M tokens (53%)
- **Coût actuel** : ~$2.38 USD

### Modèle :
- **Actif** : GPT-4o-mini
- **Input** : $0.15/million tokens
- **Output** : $0.60/million tokens

### Ordre des prompts (recency bias) :
```
1. PROMPT_SYSTEM_MAX
2. RAPPORT_OBLIGATOIRE
3. STATUS_INDICATORS
4. INSTRUCTION_MODE_LECTURE
5. CUSTOM_FIELDS_AWARENESS
6. DASHBOARD_MANAGEMENT
7. NEWSLETTER_CREATION (bonus, lu avant les règles)
8. AGENT_IDENTITY.anti_hallucination
9. ULTRA_PRIORITY_RULES ← Lu EN DERNIER = retenu en priorité !
```

---

## 🚨 **POINTS DE VIGILANCE**

### Si M.A.X. hallucine :
1. ✅ Vérifier que ULTRA_PRIORITY_RULES est bien EN FIN de prompt
2. ✅ Vérifier que les règles anti-hallucination sont visibles (séparateurs ═══)
3. ✅ Réduire la taille de NEWSLETTER_CREATION si nécessaire (< 3000 chars)
4. ✅ Redémarrer le backend après toute modification de prompt

### Si un lead n'est pas créé :
1. ✅ Vérifier les logs backend : `console.log` dans `routes/chat.js`
2. ✅ Tester l'API directement : `curl -X POST http://127.0.0.1:8081/espocrm/api/v1/Lead`
3. ✅ Vérifier l'API key : `ESPO_API_KEY=7b8a983aab7071bb64f18a75cf27ebbc`

---

## 📝 **CHANGELOG**

- **22/01/2025 10:00** : Token budget 10M → 20M
- **22/01/2025 11:00** : Tags field `maxTags` ajouté + visible dans layouts
- **22/01/2025 12:00** : Tool `reorganize_layout` créé
- **22/01/2025 13:00** : 4 tools dashboard créés
- **22/01/2025 14:00** : NEWSLETTER_CREATION ajouté (10 000+ chars) → M.A.X. hallucine
- **22/01/2025 14:30** : ULTRA_PRIORITY_RULES renforcé (règles #1, #2, #3)
- **22/01/2025 14:45** : ULTRA_PRIORITY_RULES déplacé EN FIN (fix recency bias)
- **22/01/2025 15:00** : Ordre des prompts par priorité métier (leads > admin > bonus)

---

**Version M.A.X.** : 2.1
**Priorité métier** : LEADS > CHAMPS/LAYOUTS > DASHBOARDS > NEWSLETTERS
**Date** : 22/01/2025
