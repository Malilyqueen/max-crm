import React, { useState } from 'react';

const MessageStarter = () => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendPrompt = async (prompt) => {
    setLoading(true);
    setResponse('...');

    try {
      const res = await fetch('/api/ask-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      setResponse(data.reply || 'Pas de réponse reçue.');
    } catch (err) {
      setResponse("❌ Erreur de communication avec M.A.X.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-yellow-300 rounded-md mb-6 bg-white/5 text-white">
      <h2 className="text-lg font-semibold mb-2">💬 Parlez à M.A.X.</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => sendPrompt("Bonjour")}
          className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 transition"
        >
          👋 Bonjour
        </button>
        <button
          onClick={() => sendPrompt("Ajoute un tag rentrée à tous les nouveaux leads")}
          className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 transition"
        >
          🏷️ Tag rentrée
        </button>
        <button
          onClick={() => sendPrompt("Propose une stratégie de tagging pour la campagne Damath")}
          className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 transition"
        >
          🧠 Stratégie tags
        </button>
        <button
          onClick={async () => {
            const res = await fetch('/api/actions/tag-rentree', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sinceDays: 7, statuses: ['Nouveau','À contacter'] })});
            const data = await res.json();
            setResponse(`📌 Tag "rentrée" appliqué → ciblés: ${data.targeted}, mis à jour: ${data.updated}`);
          }}
          className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 transition"
        >
          📌 Appliquer tag rentrée
        </button>
        <button
          onClick={async () => {
            const res = await fetch('/api/actions/create-campaign-rentree', { method: 'POST' });
            const data = await res.json();
            setResponse(data.ok ? `📝 Tâche créée: ${data.filename}` : '❌ Erreur création tâche.');
          }}
          className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 transition"
        >
          📨 Créer tâche “Campagne rentrée”
        </button>
      </div>

      <input
        type="text"
        placeholder="Tapez une question libre à M.A.X."
        className="w-full p-2 text-black rounded mb-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter') sendPrompt(e.target.value);
        }}
      />

      {loading && <p className="text-yellow-300">⏳ M.A.X. réfléchit...</p>}
      {!loading && response && (
        <div className="mt-3 p-2 border border-yellow-200 rounded text-sm bg-black/30">
          <strong>🧠 Réponse :</strong><br />
          {response}
        </div>
      )}
    </div>
  );
};

export default MessageStarter;
