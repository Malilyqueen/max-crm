import { useState } from "react";

export default function PromptInput({ onSend }) {
  const [input, setInput] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const txt = input.trim();
    if (!txt) return;
    onSend?.(txt);
    setInput("");
  };

  async function _handleFileUpload(promptText, file) {
    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = reader.result;
      const fileType = file.name.endsWith('.csv') ? 'csv' : 'json';

      const res = await fetch('/api/ask-task-with-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, fileContent, fileType }),
      });
      const data = await res.json();
      if (data.ok) {
        console.log("✅ Réponse M.A.X. :", data.reply);
      }
    };
    reader.readAsText(file);
  }

  return (
    <form onSubmit={submit} className="card sticky bottom-0">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-black text-white border border-[var(--color-border)]
                     rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-accent)]
                     shadow-[0_0_6px_rgba(255,252,0,0.25)]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pose ta question à M.A.X.…"
        />
        <button type="submit" className="px-4 py-2 rounded-lg font-bold"
          title="Envoyer à M.A.X.">
          ⚡ Envoyer
        </button>
      </div>
      <div className="text-xs opacity-60 mt-2">
        Astuce : <span className="neon">Shift + Enter</span> pour aller à la ligne.
      </div>
    </form>
  );
}
