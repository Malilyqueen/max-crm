# 📌 M.A.X. - Plan de projet standard (Template duplicable)

Ce fichier sert de **référence stable** pour toute duplication de l’agent M.A.X. pour un nouveau client.  
Il contient les **objectifs ancrés**, les routes essentielles, les fichiers à modifier, et les extensions prévues.

---

## ✅ Modules déjà fonctionnels

- **Backend M.A.X.** tourne sur `http://127.0.0.1:3005`
- Lecture de leads via `/api/crm/health` : ✔️ OK
- Connexion stable à EspoCRM via `.env` :
  ```env
  ESPO_URL=https://crm-client.macreastudio.cloud
  ESPO_API_KEY=...
  PORT=3005
