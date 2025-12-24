import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { getMenu } from '../lib/api';
import { BadgeTenant } from '../components/BadgeTenant';
import { ModeSwitch } from '../components/ModeSwitch';
import { FallbackBanner } from '../components/FallbackBanner';
import { ChatMax } from '../components/ChatMax';
import { ServiceStatusBar } from '../components/ServiceStatusBar';
import { TokenBudget } from '../components/TokenBudget';
import { ReportingPage } from './ReportingPage';
import { AutomationPage } from './AutomationPage';
import { MaxPage } from './MaxPage';
import { CrmPage } from './CrmPage';
import { CreaPage } from './CreaPage';
import { ChatPage } from './ChatPage';
import { EspoCRMPage } from './EspoCRMPage';
import ChatPanel from '../components/ChatPanel';

interface MenuData {
  tabs: string[];
  role: string;
  preview: boolean;
}

export function AppShell() {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [currentTab, setCurrentTab] = useState('reporting');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const ctx = { apiBase, tenant, role, preview };

  // Détecter si on vient de la bubble EspoCRM et basculer sur Espace M.A.X.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source === 'bubble') {
      console.log('[AppShell] Ouverture depuis bubble, bascule sur Espace M.A.X.');
      setCurrentTab('max');
    }
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await getMenu(ctx);
        if (res.ok) {
          setMenuData(res);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      }
    };
    fetchMenu();
  }, [ctx.tenant, ctx.role, ctx.preview]);

  const allowedTabs = menuData?.tabs || [];

  const getTabLabel = (tab: string) => {
    const labels: Record<string, string> = {
      reporting: 'Reporting',
      automation: 'Automatisation',
      max: 'Espace M.A.X.',
      chat: 'Chat',
      crea: 'Créa M.A.X.',
      crm: 'CRM',
      espocrm: 'MaCréa CRM'
    };
    return labels[tab] || tab;
  };

  const renderPage = () => {
    switch (currentTab) {
      case 'reporting':
        return <ReportingPage />;
      case 'automation':
        return <AutomationPage />;
      case 'max':
        return <MaxPage />;
      case 'chat':
        return <ChatPage />;
      case 'crea':
        return <CreaPage />;
      case 'crm':
        return <CrmPage />;
      case 'espocrm':
        return <EspoCRMPage />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text)' }}>
      <FallbackBanner />

      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-macrea-bg/95 backdrop-blur shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-macrea-neon to-macrea-rose flex items-center justify-center text-macrea-bg font-bold text-lg shadow-soft">
                M
              </div>
              <div>
                <h1 className="text-xl font-semibold text-macrea-text">M.A.X. — Copilote IA CRM</h1>
              </div>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un lead, une tâche, un deal..."
                  className="w-full bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-4 py-2 text-macrea-text placeholder-macrea-mute focus:outline-none focus:border-macrea-neon/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-macrea-mute">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right: Health Bar + Token Budget + Client Selector + Icons */}
            <div className="flex items-center gap-6">
              {/* Service Status Bar */}
              <ServiceStatusBar />

              {/* Token Budget */}
              <TokenBudget />

              {/* Mode Switch */}
              <ModeSwitch />

              {/* Client Selector */}
              <select className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-1 text-macrea-text text-sm">
                <option>MaCréa Admin</option>
                <option>Damath Overseas</option>
                <option>Coach Vero</option>
              </select>

              {/* Icons */}
              <div className="flex items-center gap-2">
                <button className="p-2 text-macrea-mute hover:text-macrea-text transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button className="p-2 text-macrea-mute hover:text-macrea-text transition-colors relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.683L4 21l4.868-8.317z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-macrea-neon rounded-full"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-macrea-bg/50 border-b border-macrea-line/30" role="navigation" aria-label="Main navigation">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex gap-2 border-b border-white/5 pb-2">
            {allowedTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                aria-label={`Navigate to ${getTabLabel(tab)}`}
                aria-current={currentTab === tab ? 'page' : undefined}
                className={currentTab === tab ? 'tab-active' : 'tab'}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-page">
        {renderPage()}
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group z-40"
        aria-label="Ouvrir le chat M.A.X."
      >
        <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      <ChatMax isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}