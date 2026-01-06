# 🎨 Architecture Frontend M.A.X. - Audit UX Révisé

## 📊 Audit UX - Version Corrigée

### 🔴 Problèmes Critiques Identifiés

#### 1. **Floating Chat Button (Non-fonctionnel)**
**État actuel**: Bouton présent mais non-fonctionnel, placeholder uniquement
**Problème**: Confusion utilisateur, promesse non tenue
**Impact**: ⭐⭐⭐⭐ CRITIQUE

#### 2. **Confusion "Chat" vs "Espace M.A.X."**
**État actuel**: Deux onglets similaires sans distinction claire
**Clarification**:
- **Chat** = M.A.X. global (analyses CSV, campagnes, stratégies, discussions générales)
- **Espace M.A.X.** = M.A.X. contextuel par lead (ouvert depuis MaCréa CRM avec leadId préchargé)
**Problème**: Nomenclature non explicite pour utilisateurs non-tech
**Impact**: ⭐⭐⭐⭐ CRITIQUE

#### 3. **MaCréa CRM comme onglet principal**
**État actuel**: Onglet "MaCréa CRM" dans navigation principale
**Problème**: iframe EspoCRM non pertinent comme navigation principale
**Solution**: Remplacer par un lien contextuel "Voir dans MaCréa CRM" (s'ouvre dans nouvel onglet)
**Impact**: ⭐⭐⭐ IMPORTANT

#### 4. **Quotas/Tokens cachés**
**État actuel**: Affichés dans header
**Clarification**: DOIVENT rester visibles et vulgarisés (pas cachés en admin)
**Impact**: ⭐⭐⭐ IMPORTANT

#### 5. **Mode Auto à retirer**
**Clarification**: Mode Auto DOIT être conservé avec dialogue de confirmation sécurisé
**Impact**: ⭐⭐ MOYEN

#### 6. **Navigation à 8 onglets**
**Problème**: Trop d'onglets, redondances possibles
**Impact**: ⭐⭐⭐ IMPORTANT

---

## 🎯 Architecture Frontend Idéale (Révisée)

### 📱 Structure de Navigation Simplifiée

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  [Logo] [Quotas: 850/1000 tokens] [Mode: Assisté ▼] [⚙️]   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  NAVIGATION PRINCIPALE (5 onglets)                          │
│  🏠 Tableau de Bord  │  💬 M.A.X.  │  📋 CRM  │  ⚙️ Automatisations  │  📊 Rapports │
└─────────────────────────────────────────────────────────────┘
```

### 🗂️ Pages Principales

#### 1. 🏠 **Tableau de Bord** (Dashboard)
**Rôle**: Vue d'ensemble quotidienne pour prise de décision rapide
**Contenu**:
- KPI essentiels (leads, opportunités, messages WhatsApp)
- Alertes et tâches prioritaires
- Résumé activité M.A.X. (dernières actions automatiques)
- Accès rapides contextuels

#### 2. 💬 **M.A.X.** (Chat Global)
**Rôle**: M.A.X. omniscient pour analyses, campagnes, stratégies
**Contenu**:
- Interface chat complète
- Upload CSV pour analyses
- Questions générales ("Analyse mes leads Q1", "Propose une campagne de relance")
- Historique conversations globales
- **PAS lié à un lead spécifique**

#### 3. 📋 **CRM** (Vue Leads)
**Rôle**: Liste des leads avec contexte M.A.X. par lead
**Contenu**:
- Liste leads filtrables (statut, score, secteur)
- Recherche et tri
- **Bouton par lead: "💬 Ouvrir Espace M.A.X."** → ouvre modal/sidebar avec:
  - M.A.X. contextuel (connaît le lead)
  - Historique WhatsApp du lead
  - Actions automatiques sur ce lead
  - Fiche lead EspoCRM en lecture seule
  - **Lien: "Voir dans MaCréa CRM" (nouvel onglet)**
- Affichage direct des champs essentiels dans la liste (nom, entreprise, statut, score)

#### 4. ⚙️ **Automatisations**
**Rôle**: Gestion des workflows et messages WhatsApp
**Contenu**:
- Templates WhatsApp (liste, création, édition)
- Workflows d'automatisation (si/alors, déclencheurs)
- Historique des automatisations exécutées
- Configuration des règles métier

#### 5. 📊 **Rapports**
**Rôle**: Analyses et statistiques pour pilotage
**Contenu**:
- Graphiques de performance
- Export de données
- Analyse par période
- Rapports prédéfinis

---

## 🎨 Concepts UX Clés

### 1. **Distinction Chat Global vs Espace M.A.X.**

#### 💬 **Chat Global (onglet "M.A.X.")**
```
┌─────────────────────────────────────────────┐
│ 💬 M.A.X. - Assistant Global                │
├─────────────────────────────────────────────┤
│                                             │
│ [Historique conversations générales]       │
│                                             │
│ User: "Analyse mon CSV des leads Q1"       │
│ M.A.X.: "J'ai identifié 47 leads..."       │
│                                             │
│ User: "Propose une campagne de relance"    │
│ M.A.X.: "Je suggère 3 scénarios..."        │
│                                             │
├─────────────────────────────────────────────┤
│ [Votre message...]              [Envoyer]  │
│ 📎 Joindre CSV  │  🎯 Campagne  │  📊 Analyse│
└─────────────────────────────────────────────┘
```

#### 💼 **Espace M.A.X. (ouvert depuis CRM lead)**
```
┌─────────────────────────────────────────────┐
│ 💼 Espace M.A.X. - Jean Dupont              │
│ Lead: Jean Dupont | Entreprise: MaCréa      │
│ Statut: Qualified | Score: 85/100          │
├─────────────────────────────────────────────┤
│ [Chat contextuel]                          │
│                                             │
│ M.A.X.: "Jean Dupont, lead qualifié dans   │
│         le secteur e-commerce. RDV prévu   │
│         le 15/12/2025 à 14h30."            │
│                                             │
│ User: "Envoie la confirmation RDV"         │
│ M.A.X.: "✅ Confirmation RDV envoyée via   │
│         WhatsApp au +33 6 48 66 27 34"     │
│                                             │
├─────────────────────────────────────────────┤
│ [Votre message...]              [Envoyer]  │
├─────────────────────────────────────────────┤
│ 📱 Historique WhatsApp                     │
│ 15/12 14:22 - Confirmation RDV envoyée ✅  │
│ 12/12 10:15 - Relance J+3 envoyée ✅       │
│                                             │
│ ⚙️ Automatisations actives                 │
│ • Relance J+7 si pas de réponse            │
│                                             │
│ 🔗 [Voir dans MaCréa CRM] (nouvel onglet)  │
└─────────────────────────────────────────────┘
```

### 2. **Mode d'Exécution avec Sécurité**

```
┌─────────────────────────────────────────────┐
│ Mode: [Assisté ▼]                           │
│   ✓ Assisté (demande confirmation)         │
│   ⚡ Auto (exécution automatique)          │
│   💡 Conseil (suggestions uniquement)      │
└─────────────────────────────────────────────┘

Si l'utilisateur choisit "Auto":
┌─────────────────────────────────────────────┐
│ ⚠️ Mode Automatique                         │
├─────────────────────────────────────────────┤
│ M.A.X. exécutera les actions               │
│ SANS demander votre confirmation.          │
│                                             │
│ Recommandé uniquement pour les workflows   │
│ que vous maîtrisez parfaitement.           │
│                                             │
│ [Annuler]  [Je comprends, activer Auto]    │
└─────────────────────────────────────────────┘
```

### 3. **Quotas Vulgarisés et Visibles**

```
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ [Logo]  [💰 850/1000 crédits]  [Mode: ✓]   │
│         ↓                                   │
│      Survol affiche:                        │
│      "Vous avez utilisé 850 crédits        │
│       sur 1000 ce mois-ci.                 │
│       150 crédits restants."               │
└─────────────────────────────────────────────┘
```

**Dans Paramètres (⚙️)**:
```
┌─────────────────────────────────────────────┐
│ 📊 Utilisation des Crédits                 │
├─────────────────────────────────────────────┤
│ Ce mois-ci: 850 / 1000                     │
│ [████████░░] 85%                           │
│                                             │
│ Détails:                                    │
│ • Messages M.A.X.: 620 crédits             │
│ • Messages WhatsApp: 180 crédits           │
│ • Analyses de leads: 50 crédits            │
│                                             │
│ [Voir l'historique complet]                │
└─────────────────────────────────────────────┘
```

### 4. **Accès MaCréa CRM Contextualisé**

**Dans liste CRM**:
```
┌─────────────────────────────────────────────┐
│ Lead: Jean Dupont                           │
│ Status: Qualified | Score: 85               │
│                                             │
│ [💬 Espace M.A.X.] [🔗 Voir dans MaCréa]   │
└─────────────────────────────────────────────┘
```

Le lien "Voir dans MaCréa CRM" ouvre:
`https://espocrm.macrea.fr/#Lead/view/{leadId}` dans nouvel onglet

---

## 🚀 Architecture MVP1 - Proposition Réaliste

### 🎯 Objectif MVP1
**Livrer une expérience fonctionnelle et cohérente en timeline courte**
- ✅ Conservation de l'architecture qualitative
- ✅ Conservation de l'omniprésence M.A.X.
- ✅ Toutes les pages importantes présentes
- ✅ CRM + WhatsApp + Automatisations fonctionnels
- ❌ Réduction de la profondeur des fonctionnalités avancées
- ❌ Pas de timelines complexes, modals lourds, systèmes ultra-riches

### 📦 Pages MVP1

#### **Page 1: Tableau de Bord (Simplifié)**
**Périmètre MVP1**:
- ✅ 4 KPI essentiels (leads totaux, leads qualifiés, messages envoyés, taux conversion)
- ✅ Liste des 5 dernières actions M.A.X. (simple liste textuelle)
- ✅ 3 alertes prioritaires (RDV à confirmer, leads à relancer, quotas)
- ✅ Boutons d'accès rapides vers Chat, CRM, Automatisations
- ❌ Pas de graphiques avancés (juste chiffres + évolution %)
- ❌ Pas de timeline détaillée

**Composants React**:
```tsx
<DashboardPage>
  <DashboardHeader />
  <KPIGrid items={4} /> {/* Simple cards avec chiffres */}
  <AlertsList maxItems={3} /> {/* Liste simple */}
  <RecentActivityList maxItems={5} /> {/* Texte simple */}
  <QuickActions /> {/* 4 boutons */}
</DashboardPage>
```

#### **Page 2: M.A.X. Chat Global**
**Périmètre MVP1**:
- ✅ Interface chat complète (messages, historique)
- ✅ Upload CSV + analyses
- ✅ Suggestions M.A.X. avec boutons d'action
- ✅ Mode d'exécution (Assisté/Auto/Conseil)
- ✅ Confirmation modale pour actions sensibles
- ❌ Pas de recherche avancée dans historique
- ❌ Pas de tags/favoris sur conversations

**Composants React**:
```tsx
<ChatPage>
  <ChatHeader mode={mode} onModeChange={handleMode} />
  <MessageList messages={messages} />
  <MessageInput onSend={handleSend} onUploadCSV={handleCSV} />
  {showConfirmation && <ConfirmModal action={action} />}
</ChatPage>
```

#### **Page 3: CRM - Liste Leads**
**Périmètre MVP1**:
- ✅ Liste leads avec colonnes essentielles (nom, entreprise, statut, score)
- ✅ Filtres simples (statut, secteur)
- ✅ Recherche par nom
- ✅ Bouton "💬 Espace M.A.X." par lead → ouvre sidebar
- ✅ Sidebar Espace M.A.X. avec:
  - Chat contextuel (leadId préchargé)
  - Fiche lead EspoCRM (lecture seule, champs essentiels)
  - Historique WhatsApp (liste simple)
  - Lien "Voir dans MaCréa CRM"
- ❌ Pas de tri avancé multi-colonnes
- ❌ Pas de filtres complexes imbriqués
- ❌ Pas d'édition inline des leads (redirection MaCréa CRM pour édition)

**Composants React**:
```tsx
<CRMPage>
  <CRMHeader>
    <SearchBar />
    <FilterBar filters={['status', 'sector']} />
  </CRMHeader>

  <LeadList>
    {leads.map(lead => (
      <LeadCard
        lead={lead}
        onOpenMax={() => openMaxSpace(lead.id)}
        onViewInEspo={() => window.open(`https://espocrm.macrea.fr/#Lead/view/${lead.id}`)}
      />
    ))}
  </LeadList>

  {maxSpaceOpen && (
    <MaxSpaceSidebar leadId={selectedLeadId}>
      <LeadContextChat leadId={selectedLeadId} />
      <LeadSummaryCard lead={selectedLead} />
      <WhatsAppHistory leadId={selectedLeadId} />
      <ExternalLink href={espoUrl}>Voir dans MaCréa CRM</ExternalLink>
    </MaxSpaceSidebar>
  )}
</CRMPage>
```

#### **Page 4: Automatisations**
**Périmètre MVP1**:
- ✅ Liste des templates WhatsApp (nom, type, statut)
- ✅ Bouton "Créer template" (formulaire simple)
- ✅ Édition template (formulaire)
- ✅ Activation/Désactivation template
- ✅ Liste des automatisations exécutées (simple tableau: date, lead, template, statut)
- ❌ Pas de workflow builder visuel (si/alors)
- ❌ Pas de déclencheurs complexes (MVP1: envoi manuel uniquement)
- ❌ Pas de statistiques détaillées par template

**Composants React**:
```tsx
<AutomationPage>
  <Tabs defaultValue="templates">
    <TabsList>
      <Tab value="templates">📱 Templates WhatsApp</Tab>
      <Tab value="history">📋 Historique</Tab>
    </TabsList>

    <TabContent value="templates">
      <TemplateList>
        {templates.map(t => (
          <TemplateCard
            template={t}
            onEdit={() => openEditModal(t)}
            onToggle={() => toggleStatus(t.id)}
          />
        ))}
      </TemplateList>
      <Button onClick={openCreateModal}>+ Créer template</Button>
    </TabContent>

    <TabContent value="history">
      <AutomationHistoryTable data={history} />
    </TabContent>
  </Tabs>

  {editModalOpen && <TemplateEditModal template={editingTemplate} />}
</AutomationPage>
```

#### **Page 5: Rapports (Minimaliste)**
**Périmètre MVP1**:
- ✅ 3 graphiques simples (Chart.js):
  - Évolution leads (ligne)
  - Répartition par statut (camembert)
  - Messages WhatsApp envoyés (barres)
- ✅ Sélecteur de période (7j, 30j, 90j)
- ✅ Export CSV simple (tous les leads)
- ❌ Pas de rapports personnalisés
- ❌ Pas de segments avancés
- ❌ Pas de comparaison périodes

**Composants React**:
```tsx
<ReportingPage>
  <ReportHeader>
    <PeriodSelector periods={['7d', '30d', '90d']} />
    <ExportButton onClick={handleExportCSV} />
  </ReportHeader>

  <ChartGrid>
    <LineChart data={leadsEvolution} title="Évolution leads" />
    <PieChart data={statusDistribution} title="Répartition statuts" />
    <BarChart data={whatsappVolume} title="Messages WhatsApp" />
  </ChartGrid>
</ReportingPage>
```

---

## 🛠️ Stack Technique MVP1

### Frontend
```json
{
  "react": "19.1.1",
  "zustand": "5.0.8",
  "tailwindcss": "3.4.17",
  "framer-motion": "12.23.24",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

### Architecture Zustand

#### **stores/useAppStore.ts** (Global)
```tsx
interface AppState {
  // Config
  tenant: string;
  role: string;
  apiBase: string;

  // User preferences
  mode: 'assist' | 'auto' | 'conseil';
  setMode: (mode: string) => void;

  // Quotas
  credits: { used: number; total: number };
  fetchCredits: () => Promise<void>;
}
```

#### **stores/useChatStore.ts** (Chat Global)
```tsx
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (msg: Message) => void;
  sendMessage: (text: string) => Promise<void>;
}
```

#### **stores/useMaxSpaceStore.ts** (Espace M.A.X. contextuel)
```tsx
interface MaxSpaceState {
  isOpen: boolean;
  leadId: string | null;
  messages: Message[];
  openMaxSpace: (leadId: string) => void;
  closeMaxSpace: () => void;
  sendContextualMessage: (text: string, leadId: string) => Promise<void>;
}
```

#### **stores/useCRMStore.ts** (Leads)
```tsx
interface CRMState {
  leads: Lead[];
  filters: { status?: string; sector?: string };
  searchQuery: string;
  isLoading: boolean;
  fetchLeads: () => Promise<void>;
  setFilters: (filters: Partial<Filters>) => void;
  setSearchQuery: (query: string) => void;
}
```

#### **stores/useAutomationStore.ts** (Templates + History)
```tsx
interface AutomationState {
  templates: WhatsAppTemplate[];
  history: AutomationExecution[];
  fetchTemplates: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  createTemplate: (data: TemplateData) => Promise<void>;
  toggleTemplate: (id: string) => Promise<void>;
}
```

---

## 📂 Arborescence Fichiers MVP1

```
max_frontend/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx          (nouveau)
│   │   ├── ChatPage.tsx               (existant, nettoyer)
│   │   ├── CRMPage.tsx                (nouveau)
│   │   ├── AutomationPage.tsx         (nouveau)
│   │   ├── ReportingPage.tsx          (nouveau)
│   │   └── AppShell.tsx               (refactor navigation)
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── KPIGrid.tsx
│   │   │   ├── AlertsList.tsx
│   │   │   ├── RecentActivityList.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ConfirmModal.tsx
│   │   │
│   │   ├── crm/
│   │   │   ├── LeadList.tsx
│   │   │   ├── LeadCard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── MaxSpaceSidebar/
│   │   │       ├── LeadContextChat.tsx
│   │   │       ├── LeadSummaryCard.tsx
│   │   │       ├── WhatsAppHistory.tsx
│   │   │       └── ExternalLink.tsx
│   │   │
│   │   ├── automation/
│   │   │   ├── TemplateList.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── TemplateEditModal.tsx
│   │   │   └── AutomationHistoryTable.tsx
│   │   │
│   │   ├── reporting/
│   │   │   ├── LineChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── PeriodSelector.tsx
│   │   │   └── ExportButton.tsx
│   │   │
│   │   └── common/
│   │       ├── Header.tsx             (quotas visibles)
│   │       ├── Navigation.tsx         (5 onglets)
│   │       ├── ModeSelector.tsx       (Assisté/Auto/Conseil)
│   │       └── CreditsBadge.tsx       (survol vulgarisé)
│   │
│   ├── stores/
│   │   ├── useAppStore.ts
│   │   ├── useChatStore.ts
│   │   ├── useMaxSpaceStore.ts
│   │   ├── useCRMStore.ts
│   │   └── useAutomationStore.ts
│   │
│   ├── hooks/
│   │   ├── useLeads.ts                (fetch + cache)
│   │   ├── useWhatsAppTemplates.ts
│   │   ├── useMaxChat.ts              (logique chat)
│   │   ├── useMaxSpace.ts             (logique espace contextuel)
│   │   └── useCredits.ts              (polling quotas)
│   │
│   ├── api/
│   │   ├── client.ts                  (axios config)
│   │   ├── leads.ts
│   │   ├── chat.ts
│   │   ├── whatsapp.ts
│   │   └── automation.ts
│   │
│   └── types/
│       ├── lead.ts
│       ├── message.ts
│       ├── template.ts
│       └── automation.ts
```

---

## 🚦 Plan de Migration MVP1

### Phase 1: Refactoring Navigation (2 jours)
- [ ] Modifier AppShell.tsx pour 5 onglets uniquement
- [ ] Retirer onglet "MaCréa CRM"
- [ ] Renommer "Chat" en "M.A.X." avec tooltip explicatif
- [ ] Renommer "Max" en "Espace M.A.X." avec tooltip explicatif
- [ ] Créer composant Header avec quotas visibles (CreditsBadge)
- [ ] Créer ModeSelector avec modal de confirmation pour Auto

### Phase 2: Page CRM + Espace M.A.X. (4 jours)
- [ ] Créer CRMPage.tsx (liste + filtres)
- [ ] Créer LeadCard avec boutons "Espace M.A.X." et "Voir MaCréa"
- [ ] Créer MaxSpaceSidebar (sidebar droite)
- [ ] Créer LeadContextChat (chat avec leadId)
- [ ] Créer WhatsAppHistory (liste messages)
- [ ] Créer LeadSummaryCard (fiche lecture seule)
- [ ] Intégrer useMaxSpaceStore (ouverture/fermeture sidebar)

### Phase 3: Dashboard Simplifié (2 jours)
- [ ] Créer DashboardPage.tsx
- [ ] Créer KPIGrid (4 cartes simples)
- [ ] Créer AlertsList (3 alertes max)
- [ ] Créer RecentActivityList (5 actions max)
- [ ] Créer QuickActions (4 boutons)

### Phase 4: Automatisations (3 jours)
- [ ] Créer AutomationPage.tsx avec tabs
- [ ] Créer TemplateList + TemplateCard
- [ ] Créer TemplateEditModal (formulaire CRUD)
- [ ] Créer AutomationHistoryTable
- [ ] Intégrer API WhatsApp (useAutomationStore)

### Phase 5: Rapports Minimalistes (2 jours)
- [ ] Créer ReportingPage.tsx
- [ ] Intégrer Chart.js (3 graphiques)
- [ ] Créer PeriodSelector
- [ ] Créer ExportButton (export CSV)

### Phase 6: Polish + Tests (2 jours)
- [ ] Tests manuels complets
- [ ] Responsive design (mobile-friendly)
- [ ] Messages d'erreur clairs
- [ ] Loading states
- [ ] Animations Framer Motion

**TOTAL: ~15 jours de développement**

---

## 🎯 Ce qui est HORS du MVP1

❌ **Floating Chat Button** (reste placeholder, à implémenter post-MVP1)
❌ **Timeline avancée** des actions M.A.X.
❌ **Workflow builder visuel** (si/alors drag-and-drop)
❌ **Rapports personnalisés** (segments, filtres complexes)
❌ **Statistiques avancées** par template WhatsApp
❌ **Recherche full-text** dans historique chat
❌ **Tags/favoris** sur conversations
❌ **Édition inline** des leads (redirection MaCréa CRM)
❌ **Tri multi-colonnes** avancé
❌ **Filtres imbriqués** complexes
❌ **Comparaison de périodes** dans rapports
❌ **Notifications push** navigateur
❌ **Mode hors-ligne**

---

## ✅ Ce qui est DANS le MVP1

✅ **5 pages principales** fonctionnelles
✅ **Chat M.A.X. global** complet avec upload CSV
✅ **Espace M.A.X. contextuel** par lead (sidebar)
✅ **CRM avec liste leads** + filtres + recherche
✅ **Templates WhatsApp** CRUD complet
✅ **Historique automatisations** (lecture)
✅ **Dashboard avec KPI** essentiels
✅ **3 graphiques** rapports (Chart.js)
✅ **Mode d'exécution** Assisté/Auto/Conseil avec sécurité
✅ **Quotas visibles** et vulgarisés
✅ **Lien MaCréa CRM** contextuel (nouvel onglet)
✅ **Architecture Zustand** propre et scalable
✅ **API client** structuré
✅ **Responsive design** basique

---

## 📊 Estimation Réaliste

### Développement Frontend
- **Phase 1 (Navigation)**: 2 jours
- **Phase 2 (CRM + MaxSpace)**: 4 jours
- **Phase 3 (Dashboard)**: 2 jours
- **Phase 4 (Automatisations)**: 3 jours
- **Phase 5 (Rapports)**: 2 jours
- **Phase 6 (Polish)**: 2 jours
**Total**: **15 jours** (3 semaines à raison de 1 dev frontend)

### Backend (déjà existant ou mineur)
- API leads: ✅ déjà fonctionnelle (EspoCRM)
- API WhatsApp: ✅ déjà fonctionnelle (templates + envoi)
- API chat M.A.X.: ✅ déjà fonctionnelle
- API automatisations: ⚠️ endpoint historique à ajouter (1 jour)
- API quotas: ⚠️ endpoint à créer (1 jour)
**Total backend additionnel**: **2 jours**

### TIMELINE GLOBALE MVP1: **17 jours ouvrés** (~3.5 semaines)

---

## 🎨 Wireframes Clés MVP1

### 1. Page CRM avec Espace M.A.X. ouvert

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [💰 850/1000 crédits] [Mode: Assisté ▼] [⚙️]                        │
├────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard │ 💬 M.A.X. │ 📋 CRM │ ⚙️ Automatisations │ 📊 Rapports      │
├────────────────────────────────────────┬───────────────────────────────────┤
│ 📋 CRM - Mes Leads                     │ 💼 Espace M.A.X.                  │
│                                        │ Lead: Jean Dupont                 │
│ [🔍 Rechercher...] [Filtres ▼]        │ Entreprise: MaCréa Design         │
│                                        │ Statut: Qualified | Score: 85     │
│ ┌──────────────────────────────────┐  │                                   │
│ │ Jean Dupont                      │  │ ─────────────────────────────     │
│ │ MaCréa Design | Qualified | 85   │  │ [Chat contextuel]                 │
│ │ [💬 Espace M.A.X.] [🔗 MaCréa]   │◄─┼─ SELECTED                         │
│ └──────────────────────────────────┘  │                                   │
│                                        │ M.A.X.: "Jean est un lead         │
│ ┌──────────────────────────────────┐  │ qualifié. RDV confirmé le         │
│ │ Sophie Laurent                   │  │ 15/12 à 14h30."                   │
│ │ E-Shop Pro | New | 42            │  │                                   │
│ │ [💬 Espace M.A.X.] [🔗 MaCréa]   │  │ User: "Envoie la confirmation"    │
│ └──────────────────────────────────┘  │                                   │
│                                        │ M.A.X.: "✅ Confirmation RDV      │
│ ┌──────────────────────────────────┐  │ envoyée par WhatsApp"             │
│ │ Pierre Martin                    │  │                                   │
│ │ Tech Corp | Contacted | 68       │  │ [Votre message...] [Envoyer]      │
│ │ [💬 Espace M.A.X.] [🔗 MaCréa]   │  │                                   │
│ └──────────────────────────────────┘  │ ─────────────────────────────     │
│                                        │ 📱 Historique WhatsApp            │
│ [Page 1/5]                             │ • 15/12 14:22 - Confirmation ✅   │
│                                        │ • 12/12 10:15 - Relance J+3 ✅    │
│                                        │                                   │
│                                        │ ─────────────────────────────     │
│                                        │ 🔗 [Voir dans MaCréa CRM]         │
│                                        │                                   │
│                                        │ [✕ Fermer]                        │
└────────────────────────────────────────┴───────────────────────────────────┘
```

### 2. Mode Auto - Confirmation Sécurisée

```
┌────────────────────────────────────────────────────────────────┐
│ [Mode: Assisté ▼]                                              │
│   ✓ Assisté (demande confirmation avant chaque action)        │
│   ⚡ Auto (exécution automatique)                              │
│   💡 Conseil (suggestions uniquement, pas d'exécution)         │
└────────────────────────────────────────────────────────────────┘

User clique sur "Auto":

┌────────────────────────────────────────────────────────────────┐
│                   ⚠️ Mode Automatique                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  En mode Auto, M.A.X. exécutera les actions                   │
│  SANS demander votre confirmation.                            │
│                                                                │
│  ⚠️ Utilisez ce mode uniquement si vous maîtrisez             │
│     parfaitement les workflows actifs.                        │
│                                                                │
│  Exemples d'actions automatiques :                            │
│  • Envoi de messages WhatsApp                                 │
│  • Mise à jour de statuts de leads                            │
│  • Création de tâches et rappels                              │
│                                                                │
│  Vous pourrez revenir en mode Assisté à tout moment.          │
│                                                                │
│  [Annuler]               [Je comprends, activer Auto]         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏆 Résumé MVP1

### Périmètre Fonctionnel
✅ **5 pages** essentielles et cohérentes
✅ **Chat M.A.X. global** + **Espace M.A.X. contextuel** distincts
✅ **CRM fonctionnel** avec accès MaCréa CRM
✅ **Templates WhatsApp** CRUD
✅ **Dashboard KPI** + **Rapports basiques**
✅ **Quotas visibles** et sécurisés
✅ **Architecture scalable** (Zustand + hooks)

### Timeline
**17 jours ouvrés** (~3.5 semaines) pour 1 dev frontend + support backend mineur

### Post-MVP1 (Phase 2)
- Workflow builder visuel
- Floating chat fonctionnel
- Statistiques avancées
- Rapports personnalisés
- Notifications
- Timeline détaillée

---

**Cette architecture MVP1 conserve votre niveau d'exigence tout en étant réaliste pour une livraison rapide. Elle pose des fondations solides pour les évolutions futures.**
