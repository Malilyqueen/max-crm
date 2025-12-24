import React, { useEffect, useState } from 'react';

function AgentIdentityCard() {
  const [identity, setIdentity] = useState(null);

  useEffect(() => {
    fetch('/agent-identity.json')
      .then(res => res.json())
      .then(setIdentity)
      .catch(console.error);
  }, []);

  if (!identity) return null;

  return (
    <div className="card">
      <h2 className="title neon">🤖 {identity.nom} – IA Admin Copilot</h2>
      <p><span className="opacity-70">Rôle :</span> {identity.rôle}</p>
      <p><span className="opacity-70">Projet :</span> {identity.contexte_projet.projet}</p>
      <p><span className="opacity-70">Mission :</span> {identity.contexte_projet.mission_metier}</p>
      <p className="italic mt-3 text-yellow-300">« {identity.personnalité} »</p>
    </div>
  );
}

export default AgentIdentityCard;
