import React, { useEffect, useState } from 'react';
import TaskStatusBadge from './TaskStatusBadge';

function AnalyzeViewer() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads/analyze')
      .then(res => res.json())
      .then(data => {
        setLeads(data.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur récupération leads IA :', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4 text-yellow-700">Chargement des leads IA...</p>;

  return (
    <div className="p-4 overflow-auto">
      <table className="min-w-full border border-yellow-300 text-sm">
        <thead className="bg-yellow-100">
          <tr>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Nom</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Email</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Téléphone</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Tags IA</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Statut</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">Confiance</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">📧 Email IA</th>
            <th className="border border-yellow-300 px-2 py-1 text-yellow-700">💬 WhatsApp IA</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={i} className="hover:bg-yellow-50">
              <td className="border border-yellow-200 px-2 py-1">{lead.fullName}</td>
              <td className="border border-yellow-200 px-2 py-1">{lead.email}</td>
              <td className="border border-yellow-200 px-2 py-1">{lead.whatsapp}</td>
              <td className="border border-yellow-200 px-2 py-1">{lead.tags?.join(', ')}</td>
              <td className="border border-yellow-200 px-2 py-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                    {lead.status}
                  </span>
                  <TaskStatusBadge filename={lead.taskFilename} />
                </div>
              </td>
              <td className="border border-yellow-200 px-2 py-1">{lead.confidence}</td>
              <td className="border border-yellow-200 px-2 py-1 whitespace-pre-wrap">{lead.emailMessage}</td>
              <td className="border border-yellow-200 px-2 py-1 whitespace-pre-wrap">{lead.whatsappMessage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AnalyzeViewer;
