import React, { useState } from "react";

export default function ChatInput({ onSend }) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSend = () => {
    if (!input.trim() && !file) return;

    onSend({ text: input, file });
    setInput("");
    setFile(null);
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-3 flex flex-col gap-2">
      {file && (
        <div className="text-sm bg-gray-800 px-3 py-2 rounded-lg flex justify-between items-center">
          📎 {file.name}
          <button
            onClick={() => setFile(null)}
            className="text-red-400 hover:text-red-500"
          >
            ❌
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris ton message à M.A.X..."
          className="flex-1 p-2 rounded-lg bg-gray-800 text-gray-100 focus:outline-none"
        />
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
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
          onClick={handleSend}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}