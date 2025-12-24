import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function HeaderBar({ onToggleSidebar }) {
  const [espoOk, setEspoOk] = useState(null);

  const [config, setConfig] = useState({ mode: 'assist', allowAutoActions: false });

  useEffect(() => {
    api.get('/api/config').then((res) => {
      if (res?.ok && res.config) setConfig(res.config);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    api.get("/api/actions/etiquette/_probe")
      .then((d) => { if (mounted) setEspoOk(Boolean(d?.ok)); })
      .catch(() => { if (mounted) setEspoOk(false); });
    return () => { mounted = false; };
  }, []);
  return (
    <header className="glass rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Bouton hamburger visible uniquement sur petits écrans */}
        <button className="lg:hidden p-2 -ml-1 mr-1" onClick={onToggleSidebar} aria-label="Ouvrir le menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        {/* Logo carré avec M - à remplacer plus tard par une image <img src="/logo-max.png" alt="M.A.X. logo" className="h-10 w-10 rounded-xl" /> */}
        <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-indigo-400/80 to-cyan-300/80 text-white font-black">
          M
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-semibold tracking-tight">M.A.X.</h1>
            <span className="pill text-xs px-2 py-0.5 rounded-full text-indigo-200">
              Copilote IA CRM
            </span>
          </div>
          <p className="text-xs md:text-sm text-white/60">
            Analyse. Propose. Exécute. Connecté à EspoCRM + n8n.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="flex-1 max-w-xl hidden md:flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Rechercher un lead, une tâche, un deal…"
            className="w-full glass rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:shadow-focus"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-white/50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M21 21l-4.3-4.3"></path>
          </svg>
        </div>
        <button className="btn glass rounded-xl px-3 py-2 text-sm hover:bg-white/10">
          + Nouveau
        </button>
      </div>

      {/* Profil & aide */}
      <div className="flex items-center gap-2">
        <button className="btn glass rounded-xl px-3 py-2 text-sm hover:bg-white/10">
          Centre d’aide
        </button>
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-white/10">👩‍💼</div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-70">Mode</label>
          <select
            value={config.mode}
            onChange={async (e) => {
              const mode = e.target.value;
              const res = await api.post('/api/config', { mode });
              if (res?.ok && res.config) setConfig(res.config);
            }}
            className="border rounded-md px-2 py-1 text-sm bg-transparent"
          >
            <option value="chat">🧭 Chat seul</option>
            <option value="assist">⚙️ Validation assistée</option>
            <option value="auto">🤖 Automatique</option>
          </select>
        </div>

        <span
          className={
            "pill text-xs px-2 py-1 rounded " +
            (espoOk === null ? "text-white/70" : espoOk ? "text-emerald-300" : "text-red-300")
          }
        >
          {espoOk === null ? "Test connexion…" : espoOk ? "🟢 Connecté à EspoCRM" : "🔴 Hors ligne"}
        </span>
      </div>
    </header>
  );
}
