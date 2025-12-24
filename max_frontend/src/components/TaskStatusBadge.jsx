// src/components/TaskStatusBadge.jsx
import React, { useEffect, useState } from 'react';

function TaskStatusBadge({ filename }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch(`/api/executions/by-task/${filename}`)
      .then((res) => res.json())
      .then((data) => setStatus(data));
  }, [filename]);

  if (!status) {
    return <span className="text-sm text-gray-500">Chargement...</span>;
  }

  if (status.executed) {
    const date = new Date(status.details.date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    return (
      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
        ✅ Validée le {date}
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs">
      ⏳ En attente de validation
    </span>
  );
}

export default TaskStatusBadge;
