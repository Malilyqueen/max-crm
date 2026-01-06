# 🚀 MVP1 Condensé - Architecture Ultra-Simplifiée

## 🎯 Objectif: Livrer en 7-10 jours MAX

**Principe**: Même structure, exécution 40% plus légère, tout est fonctionnel mais minimal.

---

## 📱 Navigation (Identique)

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] [💰 850/1000] [Mode: Assisté ▼] [⚙️]                  │
├──────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard │ 💬 M.A.X. │ 📋 CRM │ ⚙️ Auto │ 📊 Rapports   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Pages MVP1 - Version Ultra-Simplifiée

### 1. 🏠 **Dashboard** (1 jour)

**Contenu minimal**:
- ✅ **2 KPI** (leads totaux, messages envoyés ce mois) - cartes simples
- ✅ **1 graphique** (évolution leads 30j - Chart.js LineChart simple)
- ✅ **Bloc "À venir"** (3-5 prochains RDV/rappels) - liste textuelle
- ✅ **3 alertes** (leads à relancer, quotas, RDV aujourd'hui)
- ✅ **4 boutons rapides** (Nouveau lead, Envoyer message, Voir CRM, Créer auto)

**Composants**:
```tsx
<DashboardPage>
  <KPICard label="Leads" value={120} />
  <KPICard label="Messages" value={47} />
  <LineChart data={leadsData} />
  <UpcomingBlock items={upcoming} /> {/* Simple <ul> */}
  <AlertsBlock alerts={alerts} />
  <QuickActions />
</DashboardPage>
```

**État**: Pas de store dédié, juste fetch au mount avec `useState`

---

### 2. 💬 **M.A.X. Chat Global** (2 jours)

**Contenu minimal**:
- ✅ Interface chat (messages + input)
- ✅ Upload CSV
- ✅ Confirmation modale pour actions sensibles
- ❌ Pas de recherche dans historique
- ❌ Pas de tags/favoris

**Composants**:
```tsx
<ChatPage>
  <ChatHeader mode={mode} setMode={setMode} />
  <MessageList messages={messages} isLoading={loading} />
  <ChatInput onSend={sendMessage} onUploadCSV={handleCSV} />
  {confirmModal && <ConfirmModal action={action} onConfirm={execute} />}
</ChatPage>
```

**État**: 1 store Zustand `useMaxStore` (messages + mode + send)

---

### 3. 📋 **CRM** (2 jours)

**Contenu minimal**:
- ✅ Liste leads (nom, entreprise, statut, score)
- ✅ Recherche simple (barre texte)
- ✅ Filtres simples (2 dropdowns: statut + secteur)
- ✅ Clic sur lead → **panneau latéral simplifié** (pas sidebar complexe)
- ✅ Panneau contient:
  - Chat contextuel M.A.X. (réutilise composant ChatInput/MessageList)
  - 5 derniers messages WhatsApp (si disponibles) - simple liste `<ul>`
  - Petit bloc "Rappels/RDV liés" (3 lignes max)
  - Bouton "Voir dans MaCréa CRM"
- ❌ Pas d'historique WhatsApp complet
- ❌ Pas de fiche lead détaillée (juste nom/statut/score affichés)

**Composants**:
```tsx
<CRMPage>
  <SearchBar value={search} onChange={setSearch} />
  <FilterBar status={status} sector={sector} />

  <LeadList>
    {filteredLeads.map(lead => (
      <LeadCard lead={lead} onClick={() => openPanel(lead)} />
    ))}
  </LeadList>

  {panelOpen && (
    <LeadPanel lead={selectedLead} onClose={closePanel}>
      <ChatInput context={{ leadId: lead.id }} />
      <WhatsAppPreview messages={lastMessages.slice(0, 5)} />
      <RemindersBlock reminders={lead.reminders?.slice(0, 3)} />
      <Button onClick={() => window.open(espoUrl)}>Voir MaCréa</Button>
    </LeadPanel>
  )}
</CRMPage>
```

**État**: Réutilise `useMaxStore` (pas de store CRM dédié en MVP1)

---

### 4. ⚙️ **Automatisations** (1.5 jours)

**Contenu minimal**:
- ✅ Liste templates WhatsApp (nom, type, statut)
- ✅ Toggle actif/inactif (switch simple)
- ✅ Historique des envois (tableau simple: date, lead, template, statut)
- ❌ Pas de CRUD (pas de création/édition de templates en MVP1)
- ❌ Pas de workflow builder

**Composants**:
```tsx
<AutomationPage>
  <Tabs>
    <Tab label="Templates">
      <TemplateList>
        {templates.map(t => (
          <TemplateRow
            name={t.name}
            type={t.type}
            status={t.status}
            onToggle={() => toggleTemplate(t.id)}
          />
        ))}
      </TemplateList>
    </Tab>

    <Tab label="Historique">
      <HistoryTable data={history} columns={['date', 'lead', 'template', 'status']} />
    </Tab>
  </Tabs>
</AutomationPage>
```

**État**: Fetch simple avec `useState`, pas de store

---

### 5. 📊 **Rapports** (0.5 jour)

**Contenu minimal**:
- ✅ **1 graphique** (évolution leads 30j) - Chart.js simple
- ✅ **1 tableau** (top 10 leads par score)
- ✅ Sélecteur période (7j, 30j, 90j)
- ❌ Pas d'export CSV en MVP1
- ❌ Pas de graphiques multiples

**Composants**:
```tsx
<ReportingPage>
  <PeriodSelector value={period} onChange={setPeriod} />
  <LineChart data={filteredData} title="Évolution leads" />
  <SimpleTable data={topLeads} columns={['name', 'company', 'score']} />
</ReportingPage>
```

**État**: Fetch + `useState`, pas de store

---

## 🏗️ Architecture Technique Ultra-Simplifiée

### **2 Stores Zustand (pas 5)**

#### **1. useAppStore.ts** (Config globale)
```tsx
interface AppState {
  tenant: string;
  apiBase: string;
  credits: { used: number; total: number };
  fetchCredits: () => Promise<void>;
}
```

#### **2. useMaxStore.ts** (Chat + Mode + Contexte)
```tsx
interface MaxState {
  // Mode
  mode: 'assist' | 'auto' | 'conseil';
  setMode: (m: string) => void;

  // Chat global
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;

  // Chat contextuel
  contextLeadId: string | null;
  setContext: (leadId: string | null) => void;
  sendContextualMessage: (text: string) => Promise<void>;
}
```

**C'est tout.** Pas de store CRM, Automation, Reporting en MVP1.

---

### **Hooks Minimalistes**

#### **hooks/useLeads.ts**
```tsx
export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const data = await api.get('/leads');
    setLeads(data);
    setLoading(false);
  };

  return { leads, loading, refetch: fetchLeads };
}
```

#### **hooks/useTemplates.ts**
```tsx
export function useTemplates() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get('/whatsapp/messages').then(setTemplates);
  }, []);

  const toggle = async (id: string) => {
    await api.post(`/whatsapp/messages/${id}/toggle`);
    refetch();
  };

  return { templates, toggle };
}
```

**C'est tout.** Pas de hooks complexes.

---

### **API Client Simplifié**

#### **api/client.ts**
```tsx
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3005',
  headers: {
    'X-Tenant': 'macrea',
    'X-Role': 'admin'
  }
});

export const api = {
  get: (url: string) => client.get(url).then(r => r.data),
  post: (url: string, data?: any) => client.post(url, data).then(r => r.data),
};
```

---

## 📂 Arborescence Ultra-Simplifiée

```
src/
├── pages/
│   ├── DashboardPage.tsx        (2 KPI + 1 graphique + alertes)
│   ├── ChatPage.tsx             (chat global)
│   ├── CRMPage.tsx              (liste + panneau lead)
│   ├── AutomationPage.tsx       (templates + historique)
│   ├── ReportingPage.tsx        (1 graphique + tableau)
│   └── AppShell.tsx             (navigation 5 onglets)
│
├── components/
│   ├── common/
│   │   ├── Header.tsx           (logo + quotas + mode)
│   │   ├── Navigation.tsx       (5 onglets)
│   │   ├── ModeSelector.tsx     (dropdown + modale Auto)
│   │   └── ConfirmModal.tsx
│   │
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── ChatInput.tsx
│   │   └── ChatHeader.tsx
│   │
│   ├── crm/
│   │   ├── LeadList.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadPanel.tsx        (panneau latéral simplifié)
│   │   ├── WhatsAppPreview.tsx  (5 derniers messages)
│   │   └── RemindersBlock.tsx   (3 rappels max)
│   │
│   ├── automation/
│   │   ├── TemplateRow.tsx      (nom + toggle)
│   │   └── HistoryTable.tsx
│   │
│   └── reporting/
│       ├── LineChart.tsx        (Chart.js simple)
│       └── SimpleTable.tsx
│
├── stores/
│   ├── useAppStore.ts           (config + quotas)
│   └── useMaxStore.ts           (chat + mode + contexte)
│
├── hooks/
│   ├── useLeads.ts
│   └── useTemplates.ts
│
└── api/
    └── client.ts                (axios simple)
```

---

## 🚦 Plan d'Exécution MVP1 Condensé

### **Phase 1: Base + Navigation** (1 jour)
- [ ] AppShell avec 5 onglets
- [ ] Header avec quotas + ModeSelector
- [ ] Navigation fonctionnelle
- [ ] 2 stores Zustand (App + Max)
- [ ] API client setup

### **Phase 2: Chat M.A.X. Global** (2 jours)
- [ ] ChatPage avec MessageList + ChatInput
- [ ] Envoi messages + réponse SSE
- [ ] Upload CSV
- [ ] ConfirmModal pour actions
- [ ] ModeSelector avec modale Auto sécurisée

### **Phase 3: CRM + Panneau Lead** (2 jours)
- [ ] CRMPage avec LeadList
- [ ] SearchBar + FilterBar (statut + secteur)
- [ ] LeadPanel (panneau latéral simple)
- [ ] Chat contextuel (réutilise ChatInput)
- [ ] WhatsAppPreview (5 derniers messages)
- [ ] RemindersBlock (3 rappels max)
- [ ] Bouton "Voir dans MaCréa CRM"

### **Phase 4: Dashboard** (1 jour)
- [ ] 2 KPI (cartes simples)
- [ ] 1 graphique Chart.js (évolution leads)
- [ ] Bloc "À venir" (3-5 RDV/rappels)
- [ ] 3 alertes
- [ ] 4 boutons rapides

### **Phase 5: Automatisations** (1.5 jours)
- [ ] Liste templates (affichage + toggle)
- [ ] Historique envois (tableau simple)
- [ ] Pas de CRUD (lecture + toggle uniquement)

### **Phase 6: Rapports** (0.5 jour)
- [ ] 1 graphique évolution leads
- [ ] 1 tableau top 10 leads
- [ ] Sélecteur période

### **Phase 7: Polish Minimal** (1 jour)
- [ ] Loading states
- [ ] Messages erreur basiques
- [ ] Responsive basique
- [ ] Tests manuels

---

## ⏱️ Timeline Finale MVP1 Condensé

| Phase | Tâche | Durée |
|-------|-------|-------|
| 1 | Base + Navigation | 1j |
| 2 | Chat M.A.X. | 2j |
| 3 | CRM + Panneau | 2j |
| 4 | Dashboard | 1j |
| 5 | Automatisations | 1.5j |
| 6 | Rapports | 0.5j |
| 7 | Polish | 1j |
| **TOTAL** | | **9 jours** |

**Backend additionnel** (déjà fait à 90%):
- API quotas: 0.5j
- API historique automatisations: 0.5j
- Total backend: **1j**

---

## ✅ Ce qui EST dans MVP1 Condensé

✅ **Navigation 5 onglets** fonctionnelle
✅ **Chat M.A.X. global** complet (messages + CSV + confirmations)
✅ **Chat M.A.X. contextuel** (panneau lead simplifié)
✅ **CRM liste leads** (recherche + filtres + panneau)
✅ **5 derniers messages WhatsApp** par lead (pas historique complet)
✅ **3 rappels/RDV** par lead (pas calendrier complet)
✅ **Templates WhatsApp** affichage + toggle (pas CRUD)
✅ **Historique automatisations** (tableau simple)
✅ **Dashboard** (2 KPI + 1 graphique + alertes + "À venir")
✅ **Rapports** (1 graphique + 1 tableau)
✅ **Mode Assisté/Auto/Conseil** avec sécurité
✅ **Quotas visibles** et vulgarisés
✅ **Lien MaCréa CRM** contextuel

---

## ❌ Ce qui est HORS du MVP1 Condensé

❌ **Sidebar complexe** → panneau latéral simple
❌ **5 stores Zustand** → 2 stores suffisent
❌ **3 graphiques Chart.js** → 1 seul graphique
❌ **CRUD templates WhatsApp** → affichage + toggle uniquement
❌ **Historique WhatsApp complet** → 5 derniers messages
❌ **Calendrier/agenda complet** → bloc "À venir" (3-5 lignes)
❌ **Export CSV** → Phase 2
❌ **Recherche avancée** → recherche simple texte
❌ **Filtres complexes** → 2 dropdowns simples
❌ **Floating chat** → Phase 2
❌ **Workflow builder** → Phase 2
❌ **Statistiques détaillées** → Phase 2
❌ **Timeline avancée** → Phase 2

---

## 🎨 Wireframe Clé: CRM avec Panneau Lead Simplifié

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [💰 850/1000] [Mode: Assisté ▼] [⚙️]                     │
├─────────────────────────────────────────────────────────────────┤
│ 🏠 │ 💬 M.A.X. │ 📋 CRM │ ⚙️ Auto │ 📊 Rapports                 │
├──────────────────────────────────┬──────────────────────────────┤
│ 📋 CRM                           │ 💼 Lead: Jean Dupont         │
│                                  │ MaCréa Design | Qualified    │
│ [🔍 Rechercher...]               │ Score: 85                    │
│ [Statut ▼] [Secteur ▼]          │                              │
│                                  │ ────────────────────────     │
│ ┌────────────────────────────┐  │ M.A.X. (contextuel)          │
│ │ Jean Dupont                │◄─┼─[Chat input]                 │
│ │ MaCréa | Qualified | 85    │  │                              │
│ └────────────────────────────┘  │ User: "Confirme le RDV"      │
│                                  │ M.A.X.: "✅ Envoyé"          │
│ ┌────────────────────────────┐  │                              │
│ │ Sophie Laurent             │  │ ────────────────────────     │
│ │ E-Shop | New | 42          │  │ 📱 5 derniers messages       │
│ └────────────────────────────┘  │ • 15/12 Confirmation ✅      │
│                                  │ • 12/12 Relance J+3 ✅       │
│ ┌────────────────────────────┐  │                              │
│ │ Pierre Martin              │  │ ────────────────────────     │
│ │ Tech Corp | Contacted | 68 │  │ 📅 Rappels (3 max)           │
│ └────────────────────────────┘  │ • RDV 15/12 14h30            │
│                                  │ • Relance si pas réponse     │
│ [1/5]                            │                              │
│                                  │ [Voir dans MaCréa CRM]       │
│                                  │ [✕ Fermer]                   │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## 🎯 Différences Clés avec Version Précédente

| Aspect | Version Précédente (17j) | MVP1 Condensé (9j) |
|--------|--------------------------|---------------------|
| **Stores Zustand** | 5 stores | 2 stores |
| **KPI Dashboard** | 4 cartes | 2 cartes |
| **Graphiques** | 3 graphiques | 1 graphique |
| **CRUD WhatsApp** | Complet | Lecture + Toggle |
| **Historique WhatsApp** | Complet | 5 derniers messages |
| **Calendrier** | Intégré | Bloc "À venir" (3-5 lignes) |
| **Panneau Lead** | Sidebar complexe | Panneau latéral simple |
| **Export CSV** | Inclus | Phase 2 |
| **Recherche** | Avancée | Simple texte |
| **Filtres** | Multi-colonnes | 2 dropdowns |
| **Hooks** | 5 hooks custom | 2 hooks minimalistes |
| **Arborescence** | Très découpée | Simplifiée |

---

## 🏆 Résumé Exécutif

### Timeline: **9 jours frontend + 1 jour backend = 10 jours total**

### Qualité Conservée:
✅ Architecture cohérente (5 pages, navigation claire)
✅ M.A.X. omnipresent (global + contextuel)
✅ CRM + WhatsApp + Automatisations fonctionnels
✅ Mode d'exécution sécurisé
✅ Quotas visibles
✅ Lien MaCréa CRM

### Simplifications Majeures:
❌ Sidebar → Panneau simple
❌ 5 stores → 2 stores
❌ 3 graphiques → 1 graphique
❌ CRUD complet → Affichage + Toggle
❌ Historique complet → Preview (5 messages)
❌ Calendrier intégré → Bloc "À venir"

### Résultat:
**Produit fonctionnel et cohérent en 10 jours, prêt pour itérations Phase 2.**

---

**Cette version respecte ton urgence tout en conservant la cohérence du produit. Exécution 40% plus légère comme demandé.** 🚀
