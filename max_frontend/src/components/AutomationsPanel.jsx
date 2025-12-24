import React from "react";

export default function AutomationsPanel() {
  // Plus tard tu pourras charger dynamiquement la liste des workflows n8n
  const workflows = [
    { id: 1, name: "Relance WhatsApp", status: "Actif" },
    { id: 2, name: "Email de bienvenue", status: "Inactif" },
    { id: 3, name: "Pipeline CRM", status: "Actif" },
  ];

  return (
    <div className="p-6 bg-gray-900 text-gray-100 h-full">
      <h1 className="text-2xl font-bold text-blue-400 mb-4">⚙️ Automatisations</h1>

      <p className="text-gray-400 mb-6">
        Voici la liste des scénarios d’automatisation connectés à M.A.X.
        (via n8n). Active ou lance un workflow en un clic.
      </p>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <div>
              <h2 className="font-semibold text-lg">{wf.name}</h2>
              <p className="text-sm text-gray-400">Statut : {wf.status}</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-2 rounded-lg font-semibold">
                ▶ Lancer
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg">
                ⚙ Configurer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
