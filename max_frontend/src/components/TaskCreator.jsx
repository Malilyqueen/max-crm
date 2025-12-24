import React, { useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3005';

export default function TaskCreator({ onTaskCreated }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = async () => {
    if (!name) return alert("Nom de tâche requis");

    try {
      const res = await fetch(`${API}/api/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc })
      });
      const data = await res.json();
      if (data.ok) {
        onTaskCreated?.(data.task);
        setName('');
        setDesc('');
        alert(`Tâche "${data.task.task}" créée`);
      } else {
        alert("Erreur création tâche : " + (data.error || 'inconnue'));
      }
    } catch (e) {
      alert("Erreur réseau : " + e.message);
    }
  };

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 6 }}>
      <h3>Créer une tâche IA</h3>
      <input 
        type="text" 
        placeholder="Nom de la tâche" 
        value={name} 
        onChange={e => setName(e.target.value)} 
        style={{ width: '100%', marginBottom: 6 }}
      />
      <textarea 
        placeholder="Description de la tâche" 
        value={desc} 
        onChange={e => setDesc(e.target.value)} 
        style={{ width: '100%', marginBottom: 6 }}
      />
      <button onClick={handleCreate}>Créer la tâche</button>
    </div>
  );
}
