import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

export default function ProjectMapViewer() {
  const [map, setMap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/project-map.json`)
      .then(res => {
        if (!res.ok) throw new Error('Fichier project-map.json introuvable');
        return res.json();
      })
      .then(data => setMap(data))
      .catch(err => setError(err.message));
  }, []);

  if (error) return <div style={{ color: 'red' }}>Erreur : {error}</div>;
  if (!map) return <div>Chargement de la carte...</div>;

  return (
    <div>
      <h2>Carte du projet CRM</h2>
      <pre>{JSON.stringify(map, null, 2)}</pre>
    </div>
  );
}
