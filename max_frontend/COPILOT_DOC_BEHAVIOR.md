# Comportement mock/live

- VITE_FLAG_USE_MOCKS=true (dev) : UI toujours fonctionnelle, mock par défaut.
- VITE_FLAG_USE_MOCKS=false (prod) : live Espo/n8n ; fallback mock si live KO (toast).
- /api/menu pilote l'affichage des onglets.
- /api/mode permet Assist/Auto (ACL admin) [si activé dans la branche].

🔒 Rappels importants

Contrats figés :

Reporting → GET /api/dashboard?range=... retourne toujours { ok, range, kpis:{…}, timeline:[] }.

Audit → GET /api/actions/:id/audit.

Sécurité : masking regex actif (jamais d'email/token en clair).

Contexte : headers serveur > localStorage (toujours).

SSE : un seul EventSource, reconnexion silencieuse.