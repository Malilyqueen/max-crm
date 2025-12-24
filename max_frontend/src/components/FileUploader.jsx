import React, { useRef, useState } from "react";

// ✅ En mode proxy Vite, API = ""
const API = "";

export default function FileUploader({ accept = ".csv", onDone }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const [error, setError] = useState("");

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || "").split(",")[1] || "");
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    setError("");
    setBusy(true);
    try {
      const b64 = await readAsBase64(file);
      const res = await fetch(`${API}/api/ask-task-with-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyse ces leads et propose les bons tags.",
          fileType: "csv",
          fileContent: b64,
          encoding: "base64",
        }),
      });

      const data = await res.json();
      setLast(data);
      onDone?.(data);
      if (!data.ok) throw new Error(data.error || "Erreur inconnue");
    } catch (e) {
      console.error(e);
      setError("❌ Import échoué. Vérifie que le backend est bien démarré sur le port 3005.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      marginTop: 16,
      padding: 16,
      border: "1px dashed #555",
      borderRadius: 8,
      background: "#111",
      color: "#fff",
    }}>
      <h3 style={{ color: "#ff0", marginBottom: 8 }}>📁 Import CSV</h3>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          style={{ color: "#fff", background: "#222", padding: "4px 6px", borderRadius: 4 }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            padding: "8px 16px",
            background: busy ? "#555" : "#ff0",
            color: "#000",
            fontWeight: "bold",
            border: "none",
            borderRadius: 4,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Import en cours…" : "📤 Choisir un fichier"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#ff4444", marginTop: 12, fontWeight: "bold" }}>{error}</div>
      )}

      {last && (
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 6,
          background: "#222",
          border: "1px solid #333"
        }}>
          <div style={{ color: "#00ff88", fontWeight: "bold", marginBottom: 8 }}>
            ✅ {last.count} leads importés avec succès !
          </div>

          <div>
            <strong>🔑 Séparateur utilisé :</strong> <code>{last.sepUsed}</code>
          </div>
          <div>
            <strong>🧾 Colonnes détectées :</strong> {last.header?.join(", ")}
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>👁️‍🗨️ Échantillon :</strong>
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              {(last.sample || []).map((lead, i) => (
                <li key={i}>
                  {lead.firstName} {lead.lastName} — {lead.email || "📭 sans email"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
