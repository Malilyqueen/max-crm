# M.A.X. - Assistant Intelligent Indispensable

## Vision
Faire de M.A.X. un copilote CRM aussi pratique et intelligent que Claude Code, où l'utilisateur ne peut plus s'en passer.

## Fonctionnalités Clés Prioritaires

### 1. Upload & Analyse Intelligente de Fichiers ⭐⭐⭐
**Objectif**: L'utilisateur uploade un CSV basique → M.A.X. l'enrichit intelligemment

#### Scénario d'usage:
```
User: [Upload fichier "leads.csv" avec: nom, email, tel]

M.A.X.: 📊 J'ai analysé votre fichier "leads.csv" (150 lignes).

Colonnes détectées: Nom, Email, Téléphone

❌ Données manquantes:
- Description: 100%
- Tags: 100%
- Statut: 100%
- Source: 100%

💡 Pour mieux segmenter vos leads, j'ai besoin d'en savoir plus:

1. Quel est votre secteur d'activité?
2. D'où viennent ces leads? (site web, salon, LinkedIn...)
3. Avez-vous des informations complémentaires sur certains contacts?

[Parlez-moi de Jean-Claude Dupont] [Enrichir tout le fichier] [Importer tel quel]

User: C'est des leads salon automobile Paris 2024

M.A.X.: Parfait! 🎯

Je vais enrichir votre fichier:
✅ Tag automatique: "Salon Auto Paris 2024"
✅ Source: "Événement - Salon"
✅ Statut par défaut: "Lead Froid"
✅ Description: "Contact rencontré au Salon Automobile Paris 2024"

Voulez-vous que je:
1. Crée des segments par profil (Particulier/Pro)
2. Suggère une campagne de relance personnalisée
3. Configure un workflow de nurturing automatique

[Tout faire] [Juste importer] [Personnaliser]
```

#### Implémentation technique:
- **Frontend**: Drag & drop zone dans ChatPage
- **Backend**:
  - Route `/api/chat/upload` (multipart/form-data)
  - Service `fileAnalyzer.js` avec CSV parsing
  - Appel Haiku pour suggestions d'enrichissement
  - Stockage temporaire fichier + metadata
- **EspoCRM**: Import enrichi via API

### 2. Onboarding Intelligent pour Nouveaux Utilisateurs ⭐⭐⭐
**Objectif**: M.A.X. détecte un nouveau user → guide complet setup CRM

#### Détection:
```javascript
// Dans conversationService.js
function detectUserLevel(sessionId) {
  // Vérifier:
  // - Nombre de leads dans EspoCRM
  // - Champs custom créés
  // - Campagnes lancées
  // - Workflows actifs

  if (leadsCount < 10 && customFields === 0) {
    return 'NOUVEAU'; // Déclenche onboarding
  }
}
```

#### Workflow onboarding:
```
M.A.X. (auto): 👋 Bienvenue dans M.A.X. Pro!

Je vois que vous débutez. Je vais vous guider pour configurer votre CRM de façon optimale.

Étape 1/5: Importons vos premiers leads
→ Uploadez un fichier CSV/Excel, ou connectez votre source de données

[J'ai un fichier] [Je veux connecter mon site] [Plus tard]

User: [Upload fichier basique]

M.A.X.: Parfait! J'ai détecté des colonnes basiques.

Étape 2/5: Configurons vos champs personnalisés
Pour segmenter efficacement, je recommande d'ajouter:
- 📋 Statut (Lead/Prospect/Client)
- 🏷️ Source (Web/Salon/Référence)
- 💼 Secteur d'activité
- 📅 Date dernier contact

[Créer ces champs] [Personnaliser] [Passer]

M.A.X.: ✅ Champs créés dans EspoCRM!

Étape 3/5: Enrichissons vos données...
[etc.]
```

### 3. Actions Directes depuis le Chat ⭐⭐
**Objectif**: Tout faire sans quitter le chat

#### Boutons d'action contextuels:
```tsx
// Dans Message interface
actions?: Array<{
  label: string;
  icon: string;
  action: 'create-field' | 'import-leads' | 'create-segment' | 'launch-campaign';
  data: any;
}>

// Rendu dans ChatPage
{message.actions?.map(action => (
  <button onClick={() => handleAction(action)}>
    {action.icon} {action.label}
  </button>
))}
```

#### Exemples d'actions:
- **Créer un champ**: Appel direct API EspoCRM
- **Importer leads**: Traite CSV + import EspoCRM
- **Créer segment**: Génère critères + créé dans EspoCRM
- **Lancer campagne**: Workflow complet création campagne

### 4. Suggestions Proactives ⭐⭐
**Objectif**: M.A.X. analyse en continu et suggère des améliorations

#### Triggers automatiques:
```javascript
// Analyse périodique (cron job backend)
async function analyzeAndSuggest() {
  // Récupère données EspoCRM
  const leads = await fetchLeads();
  const campaigns = await fetchCampaigns();

  // Analyse via Haiku
  const suggestions = await callHaiku({
    system: 'Analyse CRM et suggère optimisations',
    messages: [{
      role: 'user',
      content: `Leads: ${JSON.stringify(leads)}\nCampagnes: ${JSON.stringify(campaigns)}`
    }]
  });

  // Stocke suggestions pour affichage au prochain chat
  await saveSuggestions(suggestions);
}
```

#### Affichage proactif:
```
[Au chargement du chat si suggestions disponibles]

M.A.X.: 💡 J'ai analysé votre CRM:

1. 45 leads inactifs depuis 30+ jours
   → [Créer campagne de réactivation]

2. Segment "Salon Auto 2024" sans suivi
   → [Configurer workflow nurturing]

3. Champ "Budget" vide sur 80% des prospects
   → [Enrichir via formulaire auto]

Voulez-vous que je m'en occupe?
```

### 5. Markdown Rendering & UX Améliorée ⭐
**Objectif**: Chat aussi pratique que cette console

#### Fonctionnalités:
- **Markdown complet**: Tables, listes, code blocks
- **Syntax highlighting**: CSV preview, SQL
- **Copy buttons**: Sur code blocks et données
- **Tableaux interactifs**: Tri, filtre dans le chat
- **Graphiques inline**: Charts.js pour KPIs

## Architecture Technique

### Backend Routes
```
POST /api/chat/upload          # Upload fichier (CSV/Excel)
POST /api/chat/analyze         # Analyse fichier + suggestions IA
POST /api/chat/enrich          # Enrichissement données via IA
POST /api/chat/action          # Exécute action (create-field, import, etc.)
GET  /api/chat/suggestions     # Récupère suggestions proactives
```

### Services Backend
```
lib/
├── fileAnalyzer.js       # Parse CSV/Excel, détecte colonnes
├── dataEnricher.js       # Enrichit données via Haiku
├── espoIntegrator.js     # Actions EspoCRM (champs, import, segments)
├── onboardingService.js  # Détection niveau user + workflow
└── proactiveSuggester.js # Analyse CRM + suggestions
```

### Frontend Components
```
components/
├── FileUploadZone.tsx       # Drag & drop
├── MessageWithActions.tsx   # Message + boutons action
├── DataPreview.tsx          # Tableaux interactifs
├── MarkdownRenderer.tsx     # Markdown + syntax highlight
└── OnboardingGuide.tsx      # Wizard onboarding
```

## Priorisation Implémentation

### Phase 1 (Immédiat - 60K tokens)
1. ✅ Upload fichiers dans chat (drag & drop)
2. ✅ Analyse CSV basique + détection colonnes
3. ✅ Enrichissement via questions IA
4. ✅ Import enrichi dans EspoCRM
5. ✅ Boutons d'action sur messages

### Phase 2 (Court terme - 40K tokens)
1. Onboarding automatique nouveaux users
2. Suggestions proactives
3. Markdown rendering + tables
4. Création champs EspoCRM depuis chat

### Phase 3 (Moyen terme - 50K tokens)
1. Segmentation automatique intelligente
2. Workflows depuis chat
3. Graphiques inline
4. Historique searchable

## Exemple Complet - Parcours Utilisateur

### Nouveau client forfait Pro:

```
[Premier login]

M.A.X.: 👋 Bonjour! Je suis M.A.X., votre copilote IA.

Je vois que c'est votre première fois. Laissez-moi vous guider!

Avez-vous déjà des leads à importer?
[Oui, j'ai un fichier] [Non, je démarre de zéro] [J'ai une intégration]

---

User: [Upload "prospects_salon.csv"]

M.A.X.: 📊 Fichier analysé: 230 contacts

Colonnes: Nom, Email, Téléphone
❌ Manquant: Description, Tags, Statut, Source

Pour mieux exploiter ces leads, parlez-moi d'eux:
- Secteur d'activité?
- Origine des contacts?
- Niveau d'engagement?

---

User: "Ce sont des contacts du Salon de l'Habitat Lyon 2024,
       ils ont montré un intérêt pour nos solutions de rénovation énergétique"

M.A.X.: Parfait! 🎯 Voici ce que je vais faire:

✅ Enrichissement automatique:
   - Tag: "Salon Habitat Lyon 2024"
   - Source: "Événement - Salon"
   - Secteur: "Rénovation énergétique"
   - Statut: "Lead Chaud" (récent salon)
   - Description: "Contact rencontré au Salon de l'Habitat Lyon 2024 - Intérêt rénovation énergétique"

✅ Champs EspoCRM créés:
   - custom_source (Liste: Web/Salon/Référence/Autre)
   - custom_secteur (Texte)
   - custom_interet (Multi-select: Rénovation/Isolation/Chauffage)

✅ Segments automatiques:
   - "Leads Salon Habitat 2024" (230 contacts)
   - "Rénovation Énergétique" (230 contacts)
   - "Leads Chauds" (< 7 jours)

💡 Je vous suggère:
1. Campagne email de remerciement + documentation
2. Workflow de relance téléphonique J+3
3. Segmentation par type de bien (Maison/Appart)

[Tout configurer] [Juste importer] [Personnaliser]

---

User: Tout configurer

M.A.X.: ✅ Configuration terminée!

📥 Import: 230 leads dans EspoCRM
📧 Campagne créée: "Merci Salon Habitat 2024"
⚙️ Workflow actif: Relance téléphonique automatique
📊 Dashboard mis à jour

Votre CRM est opérationnel! 🚀

Prochaines actions recommandées:
- Valider le template email [Voir]
- Configurer vos agents commerciaux [Config]
- Lancer la campagne [Lancer]
```

## Indicateurs de Succès

- **Adoption**: Utilisateurs qui reviennent dans le chat 3x/semaine
- **Autonomie**: % d'actions CRM faites via chat vs interface
- **Satisfaction**: NPS post-onboarding > 50
- **Valeur**: Leads enrichis vs leads basiques (+30% conversions)

---

**Prêt à implémenter?**
Dites-moi quelle phase commencer en priorité!
