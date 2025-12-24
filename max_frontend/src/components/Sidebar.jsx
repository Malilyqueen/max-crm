import React from "react";

export default function Sidebar({ onSelectTab, activeTab }) {
  const tabs = [
    { id: "chat", label: "Chat", icon: "💬", badge: "IA" },
    { id: "leads", label: "Leads", icon: "🧲" },
    { id: "tasks", label: "Tâches", icon: "✅" },
    { id: "deals", label: "Deals", icon: "💼" },
    { id: "import", label: "Import Leads", icon: "📥" },
    { id: "automations", label: "Automations", icon: "⚡" },
    { id: "history", label: "Historique", icon: "📜" },
  ];

  return (
    <aside className="glass rounded-2xl col-span-12 lg:col-span-3 p-4 md:p-5 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50 mb-3">Navigation</p>
        <nav className="grid gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`tab-btn btn flex items-center justify-between w-full rounded-xl px-3 py-2.5 hover:bg-white/10 ${
                activeTab === tab.id ? "bg-white/10" : "glass"
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.icon} <span>{tab.label}</span>
              </span>
              {tab.badge && (
                <span className="tag text-xs rounded-md px-2 py-0.5">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-white/50 mb-3">Raccourcis</p>
        <div className="grid gap-2">
          <button className="btn rounded-xl px-3 py-2 glass hover:bg-white/10 text-left">
            ✨ Proposer la prochaine meilleure action
          </button>
          <button className="btn rounded-xl px-3 py-2 glass hover:bg-white/10 text-left">
            ⚙️ Lancer un scénario n8n (démo)
          </button>
          <a
            href="https://www.espocrm.com/documentation/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn rounded-xl px-3 py-2 glass hover:bg-white/10 text-left"
          >
            📘 Docs EspoCRM
          </a>
          <a
            href="https://docs.n8n.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn rounded-xl px-3 py-2 glass hover:bg-white/10 text-left"
          >
            🔗 Docs n8n
          </a>
        </div>
      </div>
    </aside>
  );
}
