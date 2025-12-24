import React from "react";

export default function LeadPreview({ leads = [], onCancel, onConfirm }) {
  if (!leads.length) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mt-4 shadow-lg">
      <h2 className="text-lg font-semibold text-green-400 mb-2">
        Prévisualisation des leads à importer
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        {leads.length} lignes détectées. Vérifiez les données avant validation.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300 border border-gray-700 rounded-lg">
          <thead className="bg-gray-800 text-gray-200">
            <tr>
              <th className="px-3 py-2 border-b border-gray-700">Prénom</th>
              <th className="px-3 py-2 border-b border-gray-700">Nom</th>
              <th className="px-3 py-2 border-b border-gray-700">Email</th>
              <th className="px-3 py-2 border-b border-gray-700">Statut</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr
                key={i}
                className="hover:bg-gray-800 transition-colors border-b border-gray-700"
              >
                <td className="px-3 py-2">{lead.firstName || "—"}</td>
                <td className="px-3 py-2">{lead.lastName || "—"}</td>
                <td className="px-3 py-2">{lead.email || "—"}</td>
                <td className="px-3 py-2">{lead.status || "New"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          ❌ Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
        >
          ✅ Valider et ajouter {leads.length} leads
        </button>
      </div>
    </div>
  );
}
