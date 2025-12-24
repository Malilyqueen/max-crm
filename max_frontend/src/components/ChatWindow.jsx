import React, { useState } from "react";

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);

  const sendMessage = async () => {
    if (!input.trim() && !file) return;

    const newMessage = { role: "user", content: input || (file && file.name) };
    setMessages((prev) => [...prev, newMessage]);

    try {
      let res, data;

      if (file) {
        // 🔹 Lire contenu fichier CSV
        const text = await file.text();

        res = await fetch("http://localhost:3005/api/ask-task-with-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: input || "Analyse et propose un import",
            fileType: "csv",
            fileContent: text,
          }),
        });
        data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `📥 ${data.count || 0} leads détectés dans ${file.name}`,
            preview: data.sample || [],
            actions: ["import", "cancel"],
          },
        ]);
      } else {
        // 🔹 Cas normal sans fichier
        res = await fetch("http://localhost:3005/api/ask-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: input }),
        });
        data = await res.json();

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "❌ Erreur serveur" },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Erreur côté serveur" },
      ]);
    }

    setInput("");
    setFile(null);
  };

  const handleAction = async (action, preview) => {
    if (action === "import") {
      const res = await fetch("http://localhost:3005/api/leads/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: preview }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ ${data.insertedCount || 0} leads ajoutés, ${data.duplicateCount || 0} doublons ignorés.`,
        },
      ]);
    }
    if (action === "cancel") {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Import annulé." },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-lg ${
              msg.role === "user"
                ? "ml-auto bg-blue-500 text-white"
                : "bg-gray-800 text-gray-100"
            }`}
          >
            <p>{msg.content}</p>

            {/* Preview leads */}
            {msg.preview && msg.preview.length > 0 && (
              <div className="mt-2 border border-gray-700 rounded-lg bg-gray-900 p-2">
                <h4 className="font-semibold mb-1">Prévisualisation :</h4>
                <ul className="text-sm">
                  {msg.preview.map((lead, i) => (
                    <li key={i}>
                      {lead.firstName} {lead.lastName} – {lead.email}
                    </li>
                  ))}
                </ul>

                {/* Boutons actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAction("import", msg.preview)}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-1 rounded-lg"
                  >
                    ✅ Valider l’import
                  </button>
                  <button
                    onClick={() => handleAction("cancel")}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 rounded-lg"
                  >
                    ❌ Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Zone input */}
      <div className="border-t border-gray-800 p-3 flex items-center gap-2 bg-gray-900">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris un message ou ajoute un fichier..."
          className="flex-1 p-2 rounded-lg bg-gray-800 text-gray-100 focus:outline-none"
        />
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          📎
        </label>
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
