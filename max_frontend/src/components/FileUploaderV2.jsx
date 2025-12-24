// src/components/FileUploaderV2.jsx
import React, { useState } from "react";

export default function FileUploaderV2({ onAnalyze, onAfterSuccess, promptDefault = "Analyse ces leads et propose les bons tags." }) {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [status, setStatus] = useState(null); // "loading" | "ok" | "error"
  const [message, setMessage] = useState(null);
  const [prompt, setPrompt] = useState(promptDefault);

  function detectColumnsFromCSV(text) {
    const firstLine = (text.split(/\r?\n/)[0] || "").trim();
    // essaie ; puis ,
    const bySemicolon = firstLine.split(";");
    const cols = (bySemicolon.length > 1 ? bySemicolon : firstLine.split(","))
      .map(c => c.trim().replaceAll('"', ""));
    return cols.filter(Boolean);
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus(null);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (ev) => setColumns(detectColumnsFromCSV(String(ev.target.result || "")));
    reader.readAsText(f);
  };

  async function toBase64(f) {
    const fr = new FileReader();
    return new Promise((resolve, reject) => {
      fr.onload = () => resolve(String(fr.result || "").split(",")[1] || "");
      fr.onerror = reject;
      fr.readAsDataURL(f);
    });
  }

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("loading");
    setMessage("⏳ Analyse en cours…");

    try {
      // -- API attend base64 + encoding
      const b64 = await toBase64(file);
      const res = await fetch(`/api/ask-task-with-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          prompt,
          fileType: "csv",
          fileContent: b64,
          encoding: "base64",
        }),
      });

      const result = await res.json();
      if (!result?.ok) throw new Error(result?.error || "Erreur inconnue");

      // enchaîne par un refresh d’analyse côté backend
      let analyze = null;
      try {
        const r = await fetch(`/api/leads/analyze`);
        analyze = await r.json();
  } catch { analyze = null; }

      const payload = {
        ...result,
        analyze,
        _fileName: file.name,
        _at: new Date().toISOString(),
      };

      setStatus("ok");
      setMessage("✅ Import et analyse terminés.");
      onAnalyze?.(payload);
      onAfterSuccess?.(payload); // pour scroller/ouvrir le journal
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("❌ Échec de l’analyse. Vérifie le backend et le format CSV (UTF-8).");
    }
  };

  return (
    <div style={{ padding: 16, border: "1px dashed #555", borderRadius: 12, background: "#111", color: "#fff" }}>
      <h3 style={{ margin: 0, marginBottom: 8, color: "#ff0" }}>📁 Import CSV</h3>

      {/* bouton unique */}
      <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="csv-input"
               style={{ background: "#ff0", color: "#000", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          ➕ Choisir un fichier
        </label>

        {/* prompt (facultatif) */}
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Consigne IA (facultatif)"
          style={{ flex: 1, minWidth: 280, background: "#000", color: "#fff", border: "1px solid #333", borderRadius: 8, padding: "8px 10px" }}
        />

        <button onClick={handleAnalyze}
                disabled={!file || status === "loading"}
                style={{ padding: "8px 14px", background: "#2ecc71", border: "none", borderRadius: 8, fontWeight: 700, opacity: !file || status==="loading" ? .6 : 1 }}>
          🤖 Analyser les leads
        </button>
      </div>

      {/* infos fichier */}
      {file && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#aaa" }}>
          <div>Import : <b style={{ color: "#fff" }}>{file.name}</b></div>
          <div>Colonnes détectées : {columns.join(", ") || "—"}</div>
        </div>
      )}

      {/* état */}
      {status && (
        <div style={{ marginTop: 10, fontWeight: 600, color: status === "ok" ? "#00ff88" : status === "error" ? "#ff6666" : "#ddd" }}>
          {message}
        </div>
      )}
    </div>
  );
}
