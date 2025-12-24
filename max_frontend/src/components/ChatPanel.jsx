import React, { useEffect, useRef, useState } from "react";
import { api, askMAX } from "../lib/api";
import {
  getCurrentSessionId,
  setCurrentSessionId,
  touchSession,
  getOrCreateContextSession
} from "../lib/sessionManager";
import { SessionSelector } from "./SessionSelector";

const LS_KEY = "max.chat.v1";

function normalizeMsg(m) {
  if (typeof m === "string") {
    try { return normalizeMsg(JSON.parse(m)); } catch { return { role: "assistant", text: m }; }
  }
  const role = m?.role || m?.author || (m?.isUser ? "user" : "assistant");
  const text = m?.text ?? m?.message ?? m?.content ?? m?.answer ?? "";
  const task = m?.task ?? m?.data?.task ?? m?.payload?.task ?? null;
  return { role: role === "user" ? "user" : "assistant", text: String(text || ""), task };
}
function normalizeHistory(payload) {
  if (!payload) return [];
  const arr = Array.isArray(payload) ? payload :
              Array.isArray(payload?.messages) ? payload.messages :
              Array.isArray(payload?.history) ? payload.history : [];
  return arr.map(normalizeMsg).filter(m => m.text.trim() !== "");
}
function extractAnswer(data) {
  if (typeof data === "string") {
    try { return extractAnswer(JSON.parse(data)); } catch { return data; }
  }
  return String((data?.text ?? data?.answer ?? "") || "");
}
function loadLocal() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveLocal(msgs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(msgs)); } catch { void 0; }
}
function mergeUnique(a = [], b = []) {
  const seen = new Set();
  const out = [];
  [...a, ...b].forEach(m => {
    const key = `${m.role}:${m.text}`;
    if (!seen.has(key)) { seen.add(key); out.push(m); }
  });
  return out;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState(getCurrentSessionId());
  const listRef = useRef(null);

  // 1) Détecter params URL et créer session contextuelle si nécessaire
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entity = params.get('entity');
    const entityId = params.get('entityId');
    const source = params.get('source');

    console.log('[ChatPanel] URL params:', { entity, entityId, source, url: window.location.href });

    if (entity && entityId && source === 'bubble') {
      // Récupérer le contexte depuis EspoCRM pour obtenir le nom
      fetch('/api/max/bubble/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, entityId })
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.context?.entity) {
            const entityName = data.context.entity.name || entityId;
            const title = `${entity}: ${entityName}`;
            const sessionId = `session_${entity.toLowerCase()}_${entityId}`;

            // Créer la session sur le backend
            return fetch('/api/chat/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                entity,
                entityId,
                title,
                mode: 'assisté'
              })
            }).then(r => r.json()).then(() => {
              // Enregistrer dans sessionManager
              const newSessionId = getOrCreateContextSession(entity, entityId, title);
              setCurrentSessionId(newSessionId);
              setCurrentSession(newSessionId);

              // Charger les messages de cette session
              return fetch(`/api/chat/session/${newSessionId}`);
            });
          }
        })
        .then(r => r?.json())
        .then(data => {
          if (data?.ok && data.conversation?.messages) {
            const normalized = data.conversation.messages.map(m => ({
              role: m.role,
              text: m.content
            }));
            setMessages(normalized);

            // Message de bienvenue avec contexte si nouvelle session
            if (normalized.length === 0) {
              const contextInfo = data.context?.entity;
              if (contextInfo) {
                const welcomeText = `Bonjour ! Je suis M.A.X., et je suis prêt à vous aider avec le ${entity.toLowerCase()} **${contextInfo.name}**.\n\n` +
                  `📋 **Informations disponibles :**\n` +
                  `- Email : ${contextInfo.emailAddress || 'Non renseigné'}\n` +
                  `- Téléphone : ${contextInfo.phoneNumber || 'Non renseigné'}\n` +
                  `${contextInfo.accountName ? `- Entreprise : ${contextInfo.accountName}\n` : ''}` +
                  `${contextInfo.status ? `- Statut : ${contextInfo.status}\n` : ''}` +
                  `\nQue voulez-vous savoir ou faire concernant ce ${entity.toLowerCase()} ?`;

                setMessages([{
                  role: 'assistant',
                  text: welcomeText
                }]);
              } else {
                setMessages([{
                  role: 'assistant',
                  text: `Bonjour ! Je suis M.A.X., et je suis prêt à discuter de ce ${entity}. Que voulez-vous savoir ?`
                }]);
              }
            }
          }
        })
        .catch(err => {
          console.error('[ChatPanel] Erreur création session contextuelle:', err);
          // Fallback sur session générale
          loadDefaultSession();
        });
    } else {
      // Pas de params URL, charger session par défaut
      loadDefaultSession();
    }

    function loadDefaultSession() {
      const sessionId = getCurrentSessionId();
      setCurrentSession(sessionId);

      fetch(`/api/chat/session/${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.conversation?.messages) {
            const normalized = data.conversation.messages.map(m => ({
              role: m.role,
              text: m.content
            }));
            setMessages(normalized);
          } else {
            setMessages([]);
          }
        })
        .catch(err => {
          console.error('[ChatPanel] Erreur chargement session:', err);
          setMessages([]);
        });
    }
  }, []);

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function onSend(e) {
    e?.preventDefault?.();
    const content = input.trim();
    if (!content || loading) return;

    const userMsg = { role: "user", text: content };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 1) check EspoCRM status
      let crmOnline = false;
      try {
        const r = await fetch('/api/__espo-status', { cache: 'no-store' });
        const j = await r.json();
        crmOnline = !!j?.ok;
      } catch {
        crmOnline = false;
      }

      // 2) send to /api/chat avec sessionId
      const body = {
        message: content,
        mode: 'assisté',
        context: { crmOnline },
        sessionId: currentSession
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      // Mettre à jour sessionId si le backend en a créé un nouveau
      if (data.sessionId && data.sessionId !== currentSession) {
        setCurrentSession(data.sessionId);
        setCurrentSessionId(data.sessionId);
      }

      // Toucher la session pour mettre à jour lastActive
      touchSession(currentSession);

      const text = extractAnswer(data) || "[Réponse vide]";
      // si la réponse contient un objet `task`, on le conserve pour affichage d'appel à l'action
      const task = data?.task ?? data?.result?.task ?? null;
      setMessages(prev => [...prev, { role: "assistant", text, ...(task ? { task } : {}) }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ Erreur: " + (err.message || err) }]);
    } finally {
      setLoading(false);
    }
  }

  function clearLocal() {
    localStorage.removeItem(LS_KEY);
    setMessages([]);
  }

  function handleSessionChange(newSessionId) {
    setCurrentSession(newSessionId);
    setMessages([]);

    // Charger les messages de la nouvelle session
    fetch(`/api/chat/session/${newSessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.conversation?.messages) {
          const normalized = data.conversation.messages.map(m => ({
            role: m.role,
            text: m.content
          }));
          setMessages(normalized);
        }
      })
      .catch(err => {
        console.error('[ChatPanel] Erreur chargement session:', err);
      });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sélecteur de sessions */}
      <div className="mb-2">
        <SessionSelector onSessionChange={handleSessionChange} />
      </div>

      <div ref={listRef} className="mx-card p-4 h-[340px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-white/90 text-slate-900" : "glass"}`}>
              <p className="text-sm leading-6 whitespace-pre-wrap">{msg.text}</p>
            </div>
            {/* Task callout: only for assistant messages that include a task object */}
            {msg.task && msg.role !== 'user' ? (
              <div className="w-full mt-2">
                <TaskCallout task={msg.task} onInsert={(note) => setMessages(prev => [...prev, { role: 'assistant', text: note }])} />
              </div>
            ) : null}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 glass text-sm">… M.A.X. réfléchit</div>
          </div>
        )}
      </div>

      <form onSubmit={onSend} className="mt-3 flex items-end gap-2">
        <textarea
          rows="1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris ici…"
          className="flex-1 glass rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-500 outline-none resize-none leading-6"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
        />
        <button className="btn rounded-2xl px-4 py-3 bg-gradient-to-br from-indigo-400 to-cyan-300 text-slate-900 font-semibold">
          Envoyer
        </button>
      </form>
    </div>
  );
}

function TaskCallout({ task, onInsert }) {
  async function onValidate() {
    try {
      const res = await api.post('/api/actions/dispatch', task);
      // res may be { ok:true, result: { summary, affectedCount } } or { ok:true, summary, affectedCount }
      const summary = res?.result?.summary ?? res?.summary ?? 'Action exécutée';
      const affected = res?.result?.affectedCount ?? res?.affectedCount ?? 0;
      const note = `✅ ${summary} (affectés: ${affected})`;
      if (typeof onInsert === 'function') onInsert(note);
    } catch (e) {
      const note = `❌ Erreur exécution: ${e?.message || e}`;
      if (typeof onInsert === 'function') onInsert(note);
    }
  }

  return (
    <div className="mt-2 rounded-lg border p-3 text-sm bg-white/5">
      <div className="font-medium">Action proposée :</div>
      <pre className="text-xs opacity-80 whitespace-pre-wrap">{JSON.stringify(task, null, 2)}</pre>
      <button onClick={onValidate} className="mt-2 px-3 py-1 rounded-md border">
        Valider l'action
      </button>
    </div>
  );
}
