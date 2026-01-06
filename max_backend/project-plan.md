
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
  ```

---

## 🎯 Objectifs ancrés (stable & évolutif)

### 1. Modifier un lead dans EspoCRM
- Route : `PATCH /api/crm/update-lead/:id`
- Fonction : Ajout de tags, changement de statut, mise à jour des champs
- ✅ Compatible future automatisation IA & n8n

### 2. Créer un nouveau lead
- Route : `POST /api/crm/create-lead`
- Fonction : Enregistrement d’un nouveau prospect (via IA ou webhook)
- Utilisable via form, export CSV, ORYON, etc.

### 3. Proposer une action IA via M.A.X.
- Route : `POST /api/ask-task`
- Fonction : L’IA reçoit une consigne et propose un plan JSON d’action CRM
- Mode actuel : semi-automatique (proposition sans exécution)

### 4. Déclencher n8n depuis le CRM
- Fonction : Lorsqu’un tag comme `client_urgent` est ajouté, une route secondaire peut appeler un webhook n8n
- Exemple : envoi de message automatique via WhatsApp ou email

---

## 📁 Fichiers à adapter par client

- `.env` : changer l’URL EspoCRM, la clé API et éventuellement le port
- `espoClient.js` : structure générique — aucun changement sauf si endpoints EspoCRM modifiés
- `server.js` : routes personnalisées à dupliquer si tu veux des comportements clients spécifiques

---

## 🧠 Convention de tag par défaut (modèle)

- `client_urgent`
- `à_relancer`
- `contacté`
- `pas_interessé`
- `rdv_programmé`

Tu peux ajouter d’autres tags dans le fichier `tagConfig.json` si besoin par client.

---

## 🧪 Bonnes pratiques

- ✅ Toujours tester `/api/crm/health` avant toute action
- ✅ Toujours valider les `id` EspoCRM dans la console avant exécution de tâches
- 🧩 Envisager une structure `/tasks_autogen/` par client pour isoler les workflows IA

---

## 🧱 Architecture pensée pour l’avenir

| Module futur       | Compatible dès maintenant |
|--------------------|---------------------------|
| Atena UI           | ✔️ Oui                    |
| Oryon Agent        | ✔️ Oui                    |
| RehoBooth CRM Link | ✔️ Oui                    |
| N8N workflows      | ✔️ Oui                    |
| Chat vocal (Andromède) | ✔️ Oui              |

---

## 📦 Dossier recommandé pour chaque duplication

```
ia_admin_api/
├── .env                         # À adapter
├── project-plan.md             # Ce fichier
├── server.js                   # Backend Express
├── espoClient.js               # Appel EspoCRM REST
├── tasks_autogen/              # Tâches IA pour ce client
├── backups/                    # Sauvegardes React ou données
```

---

## 📝 Notes

- Ce template est volontairement **minimal et stable**.  
- Si tu ajoutes des fonctions spécifiques (ex : rappel vocal, scoring automatique, module d’emailing), ajoute-les en modules séparés.
- Toute modification impactant l’architecture doit être ajoutée ici pour conserver la cohérence.

---

🛠️ Pour dupliquer ce modèle :

1. Copier le dossier `ia_admin_api` → `ia_admin_api_client_B`
2. Modifier `.env` avec les infos du nouveau client
3. Adapter les routes si besoin
4. Ajouter une note dans `project-plan.md` (ex : "Ajout route scoring automatique le 2025-09-01")

---

_Mis à jour le :_ **2025-08-29**
