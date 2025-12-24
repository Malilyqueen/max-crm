import React, { useState } from 'react';

function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ask-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResponse(data.reply);
    } catch {
      setResponse("❌ Une erreur est survenue.");
    }
    setLoading(false);
    setPrompt('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendPrompt();
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6 shadow border border-purple-600">
      <label className="text-white font-semibold block mb-2">Pose ta question à M.A.X.</label>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyPress}
        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring focus:border-purple-500"
        placeholder="Ex : Que puis-je faire aujourd’hui ?"
      />
      <button
        onClick={sendPrompt}
        disabled={loading}
        className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
      >
        {loading ? "Envoi..." : "Envoyer à M.A.X."}
      </button>

      {response && (
        <div className="mt-4 p-3 bg-gray-700 rounded text-white">
          <strong className="text-purple-300">Réponse de M.A.X. :</strong>
          <p className="mt-2">{response}</p>
        </div>
      )}
    </div>
  );
}

export default PromptInput;
