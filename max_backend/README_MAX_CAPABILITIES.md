# 🚀 M.A.X. - CAPACITÉS COMPLÈTES (MaCréa Assistant eXpert)

## 📋 RÉSUMÉ EXÉCUTIF

M.A.X. est un assistant IA autonome pour EspoCRM capable de gérer l'intégralité du CRM :
- ✅ Gestion des leads (CRUD, enrichissement, analyse)
- ✅ Création et gestion des champs personnalisés
- ✅ Réorganisation des layouts (detail/list)
- ✅ Gestion complète des dashboards
- ✅ **NOUVEAU** : Création de newsletters HTML premium
- ✅ Analyse et reporting intelligent
- ✅ Workflows et automations (via n8n - à venir)
- ✅ Budget de tokens : 20M tokens ($3 USD)

---

## 🛠️ OUTILS DISPONIBLES (25 TOOLS)

### 📊 **GESTION DES DASHBOARDS** (NOUVEAUX - 4 tools)

#### 1. `list_dashlets`
**But** : Lister les widgets actuels du dashboard
```javascript
list_dashlets({
  page: 'Home',        // Page du dashboard
  userId: 'optional'   // ID utilisateur (défaut: admin)
})
```
**Retour** : Liste des dashlets avec id, type, titre, position

#### 2. `add_dashlet`
**But** : Ajouter un widget au dashboard
```javascript
add_dashlet({
  page: 'Home',
  type: 'Calendar',    // Calendar|Activities|List|ReportChart|Stream
  title: 'Mon Calendrier',
  position: {
    column: 1,        // 0=gauche, 1=centre, 2=droite
    row: 0,           // 0=haut, 1, 2...
    width: 2,         // 1-3 colonnes
    height: 2         // 1-4 lignes
  },
  options: {
    scope: ['Meeting', 'Call', 'Task']  // Pour Calendar
    // ou entity: 'Lead', filter: 'myLeads'  // Pour List
    // ou reportId: 'report-id'  // Pour ReportChart
  }
})
```

#### 3. `update_dashlet`
**But** : Modifier un widget existant
```javascript
update_dashlet({
  dashletId: 'dashlet-123',
  title: 'Nouveau titre',        // Optionnel
  position: { column: 2, row: 1 }, // Optionnel
  options: { ... }                 // Optionnel
})
```

#### 4. `remove_dashlet`
**But** : Supprimer un widget
```javascript
remove_dashlet({
  dashletId: 'dashlet-123'
})
```

**Types de dashlets supportés** :
- `Calendar` : Calendrier avec meetings/calls/tasks
- `Activities` : Liste des activités récentes
- `List` : Liste d'enregistrements (Leads, Cases, Opportunities)
- `Stream` : Flux d'activités
- `ReportChart` : Graphiques de rapports

---

### 📝 **GESTION DES LEADS** (6 tools)

1. `query_espo_leads` - Rechercher des leads
2. `update_leads_in_espo` - Créer/Mettre à jour des leads
3. `delete_leads_from_espo` - Supprimer des leads
4. `update_lead_fields` - Mettre à jour des champs spécifiques
5. `analyze_and_enrich_leads` - Analyser et enrichir automatiquement
6. `auto_enrich_missing_leads` - Enrichissement automatique des leads incomplets

---

### 🏗️ **GESTION DES CHAMPS CUSTOM** (4 tools)

1. `create_custom_field` - Créer un champ personnalisé
   - ✅ Auto-ajout aux layouts
   - ✅ Clear cache automatique

2. `delete_custom_field` - Supprimer un champ custom
   - ✅ 5 niveaux de sécurité
   - ✅ Backup automatique
   - ✅ Confirmation requise

3. `list_available_fields` - Lister les champs disponibles

4. `configure_entity_layout` - Configurer les layouts

---

### 🎨 **GESTION DES LAYOUTS** (1 tool)

1. `reorganize_layout` - Réorganiser les champs dans les layouts
```javascript
reorganize_layout({
  entity: 'Lead',
  layoutType: 'detail',  // ou 'list'
  fieldToMove: 'addressStreet',
  position: 'before',    // ou 'after'
  referenceField: 'description'
})
```

---

### 📊 **ANALYSE ET REPORTING** (3 tools)

1. `analyze_empty_fields` - Analyser les champs vides
2. `get_lead_diff` - Voir les différences entre versions
3. `get_lead_snapshot` - Snapshot d'un lead

---

### ✅ **GESTION DES TÂCHES** (1 tool)

1. `create_task` - Créer une tâche EspoCRM liée à une entité

---

### 📂 **IMPORT ET FICHIERS** (2 tools)

1. `get_uploaded_file_data` - Lire un fichier uploadé (CSV, etc.)
2. `import_leads_to_crm` - Importer des leads en masse

---

## 📚 DOCUMENTATION CHARGÉE

M.A.X. a accès à ces prompts système :

1. **ULTRA_PRIORITY_RULES.txt** - Règles prioritaires
2. **max_system_prompt_v2.txt** - Prompt système principal
3. **max_status_indicators.txt** - Indicateurs de statut
4. **max_rapport_obligatoire.txt** - Format de rapport
5. **INSTRUCTION_MODE_LECTURE.txt** - Mode lecture
6. **max_custom_fields_awareness.txt** - Gestion des champs custom
7. **DASHBOARD_MANAGEMENT.txt** - Gestion des dashboards
8. **NEWSLETTER_CREATION.txt** - **NOUVEAU** : Création de newsletters HTML premium
9. **agent_identity.json** - Identité et règles anti-hallucination

---

## 🎯 WORKFLOW DASHBOARD

### Exemple : Créer un dashboard complet

**Commande utilisateur** :
```
"MAX, installe-moi un dashboard comme sur la démo :
- calendrier en haut au centre
- mes activités à gauche
- mes cases en bas à gauche
- graphique opportunités par source en bas à droite"
```

**Actions de M.A.X.** :

1. **Vérifier l'existant** :
```javascript
list_dashlets({ page: 'Home' })
```

2. **Ajouter les widgets** :
```javascript
// Calendrier
add_dashlet({
  type: 'Calendar',
  title: 'Mon Calendrier',
  position: { column: 1, row: 0, width: 2, height: 2 },
  options: { scope: ['Meeting', 'Call', 'Task'] }
})

// Activités
add_dashlet({
  type: 'Activities',
  title: 'Mes Activités',
  position: { column: 0, row: 0, width: 1, height: 2 }
})

// Cases
add_dashlet({
  type: 'List',
  title: 'Mes Cases',
  position: { column: 0, row: 2, width: 1, height: 2 },
  options: { entity: 'Case', filter: 'myCases' }
})

// Graphique
add_dashlet({
  type: 'ReportChart',
  title: 'Opportunités par source',
  position: { column: 2, row: 2, width: 1, height: 2 },
  options: { reportId: 'opportunities-by-source' }
})
```

3. **Retourner un résumé clair** :
```
✅ Dashboard configuré avec succès !

📊 Widgets ajoutés :
✔ Calendrier ajouté en haut au centre (colonne 1, ligne 0)
✔ Mes activités ajoutées en haut à gauche (colonne 0, ligne 0)
✔ Mes cases ajoutées en bas à gauche (colonne 0, ligne 2)
✔ Graphique "Opportunités par source" ajouté en bas à droite (colonne 2, ligne 2)

🎨 Organisation :
┌─────────────┬─────────────┬─────────────┐
│ Activités   │ Calendrier  │             │  ← ligne 0
│ (0,0)       │   (1,0)     │             │
├─────────────┼─────────────┼─────────────┤
│             │             │             │  ← ligne 1
│             │             │             │
├─────────────┼─────────────┼─────────────┤
│ Cases       │             │ Graphique   │  ← ligne 2
│ (0,2)       │             │   (2,2)     │
└─────────────┴─────────────┴─────────────┘
```

---

## 📧 WORKFLOW NEWSLETTERS

### Exemple : Créer une newsletter professionnelle

**Commande utilisateur** :
```
"MAX, crée-moi une newsletter pour promouvoir notre nouvelle gamme de soins capillaires afro.
Cible : femmes 25-45 ans, ton chaleureux et inclusif"
```

**Actions de M.A.X.** :

1. **Analyser le contexte** :
   - Objectif : Promouvoir gamme de produits
   - Cible : Femmes afro 25-45 ans
   - Ton : Chaleureux, inclusif, empowerment
   - Niche : Cosmétique afro

2. **Créer la structure HTML** :
   - Header avec logo et tagline
   - Hero image accrocheur
   - Storytelling émotionnel (ex: "Vos cheveux méritent le meilleur")
   - Section produit avec visuel
   - Social proof (témoignages)
   - Offre limitée (-20% première commande)
   - CTA clair et visible
   - Footer avec réseaux sociaux

3. **Appliquer les règles techniques** :
   - Tables HTML (pas de div/flexbox)
   - CSS inline uniquement
   - Largeur max 600px (mobile-friendly)
   - Palette cosmétique afro : #8B4513, #D4AF37, #F4E4C1

4. **Retourner un résumé structuré** :
```
✅ Newsletter créée avec succès !

📧 Informations :
✔ Titre : "Révélez la beauté naturelle de vos cheveux"
✔ Niche : Cosmétique afro
✔ Ton : Chaleureux et inclusif
✔ Structure : 8 sections (Header → CTA)

🎨 Caractéristiques techniques :
✔ HTML table-based (compatibilité email)
✔ CSS inline uniquement
✔ Mobile-friendly (600px max)
✔ Palette : Tons chauds (#8B4513, #D4AF37)

📊 Placeholders inclus :
✔ [[PRENOM_CLIENT]]
✔ [[CTA_LINK]]
✔ [[LOGO_URL]]
✔ [[HERO_IMAGE_URL]]
✔ [[PRODUCT_IMAGE_URL]]

💡 Prêt pour : Mailchimp, Sendinblue, Campaign Monitor
```

**Capacités de M.A.X. pour les newsletters** :
- ✅ Adaptation automatique à la niche (B2B, cosmétique, mode, tech...)
- ✅ Copywriting AIDA (Attention, Intérêt, Désir, Action)
- ✅ HTML/CSS compatible tous clients emails
- ✅ Optimisation mobile automatique
- ✅ Palettes de couleurs par industrie
- ✅ Placeholders standardisés pour personnalisation
- ✅ Structure storytelling émotionnelle
- ✅ CTAs optimisés pour la conversion

---

## 🚫 RÈGLES ANTI-HALLUCINATION (STRICTES)

### 1. Données Réelles Uniquement
M.A.X. **N'INVENTE JAMAIS** :
- ❌ IDs (leadId, dashletId, taskId...)
- ❌ Champs EspoCRM inexistants
- ❌ Valeurs de données (email, téléphone, source...)
- ❌ Entités ou relations
- ❌ Tools ou endpoints

### 2. Déductions Logiques Autorisées
✅ **Autorisé** : Déductions basées sur données réelles
- Si email existe mais pas téléphone → enrichissement via email OK
- Si contexte dans "notes" → utiliser pour qualifier OK

❌ **Interdit** : Suppositions ou inventions
- Ne jamais inventer une valeur manquante
- Ne jamais compléter un champ avec des données fictives

### 3. Vérification Avant Mise à Jour
Avant `update_lead_fields` ou tout tool de modification :
1. Chaque valeur doit avoir une **source claire**
2. Si pas de source → **NE PAS mettre à jour**
3. Proposer une **ACTION** (créer tâche, envoyer email) au lieu d'inventer

### 4. Résumés Lisibles
M.A.X. ne retourne **JAMAIS** :
- ❌ JSON brut de l'API
- ❌ Réponses techniques complexes
- ❌ Messages d'erreur bruts

M.A.X. retourne **TOUJOURS** :
- ✅ Résumés clairs avec emojis
- ✅ Listes structurées (✔ / ❌)
- ✅ Actions effectuées de manière lisible

---

## 💰 BUDGET ET COÛTS

- **Budget total** : 20M tokens
- **Modèle** : GPT-4o-mini
- **Coûts** :
  - Input : $0.15 / million tokens
  - Output : $0.60 / million tokens
- **Consommé** : ~9M tokens
- **Restant** : ~11M tokens (55%)
- **Coût total actuel** : ~$2.38 USD

---

## 🔧 CONFIGURATION

### Fichiers Clés

1. **Backend** :
   - `max_backend/lib/maxTools.js` - Définition des 25 tools
   - `max_backend/routes/chat.js` - Handlers des tools
   - `max_backend/prompts/` - Documentation système
   - `max_backend/.env` - Configuration (tokens, API keys)

2. **Frontend** :
   - `max_frontend/src/components/ChatMax.tsx` - Interface chat
   - Loader animé intégré

3. **EspoCRM** :
   - `custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json` - Champs custom
   - `custom/Espo/Custom/Resources/layouts/Lead/` - Layouts

### Variables d'Environnement Importantes

```env
# Budget tokens
TOKENS_BUDGET_TOTAL=20000000
MAX_BUDGET_HARD_CAP=20000000

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# EspoCRM
ESPO_BASE_URL=http://127.0.0.1:8081/espocrm/api/v1
ESPO_API_KEY=7b8a983aab7071bb64f18a75cf27ebbc
PHP_PATH=D:\\Macrea\\xampp\\php\\php.exe
ESPOCRM_DIR=D:\\Macrea\\xampp\\htdocs\\espocrm

# M.A.X.
MAX_DEFAULT_ROLE=ADMIN
MAX_FORCE_ADMIN=true
MAX_RESPONSE_TOKENS=2000
```

---

## 📈 PROCHAINES ÉVOLUTIONS

1. **Workflows & Automations** (via n8n)
   - Création de workflows automatiques
   - Gestion des déclencheurs
   - BPM (Business Process Manager)

2. **Reporting Avancé**
   - Création de rapports personnalisés
   - Dashboards analytiques
   - KPIs automatiques

3. **Lead Scoring**
   - Scoring automatique basé sur l'engagement
   - Priorisation intelligente
   - Prédiction de conversion

4. **Intégrations**
   - Emails (Gmail, Outlook)
   - Calendriers externes
   - Outils marketing

---

## ✅ RÉSUMÉ DES CAPACITÉS

M.A.X. peut désormais :

### 📊 DASHBOARDS
- [x] Lister les widgets existants
- [x] Ajouter calendrier, activités, listes, graphiques
- [x] Déplacer et redimensionner les widgets
- [x] Supprimer des widgets
- [x] Organiser sur grille 3x∞
- [x] Retourner résumés clairs et lisibles

### 🏗️ CHAMPS & LAYOUTS
- [x] Créer des champs personnalisés
- [x] Auto-ajouter aux layouts
- [x] Réorganiser les layouts (drag & drop virtuel)
- [x] Supprimer avec sécurité (5 niveaux)
- [x] Backups automatiques

### 📝 LEADS & DONNÉES
- [x] CRUD complet sur les leads
- [x] Enrichissement intelligent
- [x] Analyse et insights
- [x] Import CSV
- [x] Détection de doublons

### 🎯 TÂCHES & ORGANISATION
- [x] Créer des tâches liées
- [x] Assigner automatiquement
- [x] Dates et priorités

### 📧 NEWSLETTERS & MARKETING
- [x] Création de newsletters HTML professionnelles
- [x] CSS inline (compatibilité email)
- [x] Copywriting AIDA adaptatif
- [x] Adaptation automatique à la niche (B2B, cosmétique, mode...)
- [x] Optimisation mobile (600px max)
- [x] Palettes de couleurs par industrie
- [x] Placeholders standardisés pour personnalisation
- [x] Structure storytelling émotionnelle
- [x] CTAs optimisés pour la conversion

---

**M.A.X. est maintenant un véritable administrateur EspoCRM autonome ET un expert marketing, capable de gérer l'intégralité du CRM et de créer des campagnes emails premium sans intervention humaine !** 🚀

Version : 2.1
Date : 2025-01-22
Auteur : Claude Code + MaCréa Team
