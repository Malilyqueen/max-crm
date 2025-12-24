import React, { useState } from 'react';

export default function ImportWithContext({ onAnalyze, onAfterSuccess }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('upsert+tag');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('prompt', prompt);

    try {
      const res = await fetch('http://localhost:3005/api/ask-task-with-file', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setResponse(data);
      setLoading(false);

      onAnalyze?.(data);
      onAfterSuccess?.(data);
    } catch (error) {
      console.error('Erreur analyse IA', error);
      setResponse({ error: 'Erreur lors de la requête à M.A.X.' });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 border rounded p-4 bg-white shadow">
      <h2 className="text-xl font-semibold">Importer des leads avec contexte IA</h2>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
        className="block border p-2 rounded w-full"
      />

      <textarea
        placeholder="Contexte IA (ex : campagne rentrée, relance WhatsApp...)"
        className="w-full border p-2 rounded"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <select
        className="border p-2 rounded w-full"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
      >
        <option value="analyze">Analyser uniquement</option>
        <option value="upsert">Ajouter dans le CRM</option>
        <option value="upsert+tag">Ajouter + Taguer automatiquement</option>
      </select>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Analyse en cours...' : 'Envoyer à M.A.X.'}
      </button>

      {response && (
        <pre className="bg-gray-100 text-sm p-3 rounded overflow-x-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
