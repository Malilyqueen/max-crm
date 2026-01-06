# README_MVP1+ – Cerveau Quantique de M.A.X.

> **Objectif :** te donner un guide clair, pas-à-pas, **sans jargon**, pour brancher le **Quantum Brain** à ton backend M.A.X. et obtenir un MVP1 stable, avec 3 cerveaux actifs (logistique, coach, e‑commerce), des **modes RO/Assisté/Auto**, des **endpoints propres**, et **2–4 workflows n8n** déclenchables depuis l’UI.

---

## 0) Ce que tu as déjà
- `quantum-brain-implementation.js` ↔️ moteur sémantique universel (concepts communs + contextes métier + handlers de base)
- Backend Express **ia_admin_api** (port 3005)
- EspoCRM local (port 8081)
- n8n/NocoDB (déjà prêts côté Malala, à brancher)

---

## 1) Pré‑requis (rapide)
- **Node.js 18+**
- **PowerShell** (Windows)
- **EspoCRM** local accessible (ex: `http://127.0.0.1:8081`)
- **n8n** accessible (ex: `http://127.0.0.1:5678`)
- (Optionnel) **Redis** pour le stockage d’état
- (Optionnel) **OPENAI_API_KEY** si tu actives l’inférence vectorielle (sinon ça tourne quand même, juste moins “smart”)

**Variables d’environnement conseillées** (dans `ia_admin_api/.env`):
```
PORT=3005
ESPO_BASE=http://127.0.0.1:8081
N8N_BASE=http://127.0.0.1:5678
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=sk-...   # optionnel pour la couche vectorielle
```

---

## 2) Arborescence simple
```
ia_admin_api/
  server.js
  config/
    brain.config.js
  brains/
    quantum-brain-implementation.js
    universal.ontology.json   # (option) si tu veux externaliser plus tard
  utils/
    mcp-lite.js
  routes/
    brain.js
    lead.js
    trigger.js
    logs.js
```

---

## 3) Configurer les cerveaux & le mode
`config/brain.config.js`
```js
export default {
  activeBrains: ["logistique", "coach", "ecommerce"],
  mcpLite: false,           // ON plus tard pour mapper auto FR → champs CRM
  mode: "assist"            // "ro" | "assist" | "auto"
};
```

**Rappels modes**
- **RO (read‑only)** : aucune écriture CRM, endpoints d’update renvoient **403**.
- **Assisté** : propose l’action et attend la **validation** (tu cliques dans l’UI → exécute).
- **Auto** : exécute directement.

---

## 4) Brancher le Quantum Brain dans ton serveur
Dans `server.js` :
```js
import express from "express";
import QuantumBrain from "./brains/quantum-brain-implementation.js";
import brainConfig from "./config/brain.config.js";

const app = express();
app.use(express.json());

// 1) Initialiser le cerveau
const brain = new QuantumBrain({
  mode: "adaptive",              // interne au moteur (laisse comme ça)
  openaiKey: process.env.OPENAI_API_KEY, // optionnel
  redisUrl: process.env.REDIS_URL        // optionnel
});

// 2) Middleware MODE (RO/Assist/Auto) utilisable dans les routes
function guardMode(required) {
  return (req, res, next) => {
    const mode = brainConfig.mode; // ro | assist | auto
    if (required === "write" && mode === "ro") {
      return res.status(403).json({ ok:false, error:"READ_ONLY_MODE" });
    }
    // en assist → on ne bloque pas ici, la validation se fait côté UI/route
    next();
  };
}

// 3) Exposer routes (voir section 5)
import brainRoutes from "./routes/brain.js";
import leadRoutes from "./routes/lead.js";
import triggerRoutes from "./routes/trigger.js";
import logsRoutes from "./routes/logs.js";

app.use("/api/brain", brainRoutes({ brain, brainConfig }));
app.use("/api", leadRoutes({ brain, brainConfig, guardMode }));
app.use("/api", triggerRoutes({ brain, brainConfig, guardMode }));
app.use("/api", logsRoutes({ }));

app.listen(process.env.PORT || 3005, () => console.log("M.A.X. API on", process.env.PORT || 3005));
```

> **Note** : le moteur sait déjà reconnaître les contextes *logistique/coach/e‑commerce* et renvoyer une **action** adaptée. On l’utilise pour **proposer** des patches CRM et **déclencher** des webhooks n8n.

---

## 5) Endpoints minimum viables

### 5.1 `/api/brain/status` (GET)
- **But** : vérifier cerveau(s) actif(s) + mode + santé
- **Réponse attendue**
```json
{ "ok": true, "brains": ["logistique","coach","ecommerce"], "mode": "assist" }
```

**Implémentation (`routes/brain.js`)**
```js
export default ({ brain, brainConfig }) => {
  const router = (await import("express")).default.Router();
  router.get("/status", async (req, res) => {
    return res.json({ ok:true, brains: brainConfig.activeBrains, mode: brainConfig.mode });
  });
  return router;
};
```

---

### 5.2 `/api/updateLead` (POST)
- **But** : écrire dans EspoCRM (ou préparer un patch si mode Assisté)
- **Entrée** :
```json
{
  "id": "<leadId>",
  "fields": { "email": "a@b.com", "montant": 120 },
  "context": "ecommerce"   // ou coach, logistique
}
```
- **Comportement** :
  - **RO** → 403
  - **Assisté** → renvoie un **résumé** + `requiresApproval:true`
  - **Auto** → exécute l’écriture EspoCRM et renvoie `updated:true`

**Implémentation simple (`routes/lead.js`)**
```js
export default ({ brain, brainConfig, guardMode }) => {
  const router = (await import("express")).default.Router();

  // a) Préparer le patch (avec ou sans MCP-Lite)
  router.post("/updateLead", guardMode("write"), async (req, res) => {
    const { id, fields, context } = req.body || {};
    if (!id || !fields) return res.status(400).json({ ok:false, error:"MISSING_FIELDS" });

    // Option: MCP-Lite pour mapper FR → champs préfixés CRM
    let patch = fields;
    // if (brainConfig.mcpLite) patch = await mcpLiteMap(fields, context);

    if (brainConfig.mode === "assist") {
      return res.json({ ok:true, requiresApproval:true, patch });
    }

    // Mode auto → écrire dans EspoCRM (ex via fetch ou axios)
    try {
      const r = await fetch(`${process.env.ESPO_BASE}/api/v1/Lead/${id}`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ patch })
      });
      if (!r.ok) throw new Error("ESPCRM_PATCH_FAILED");
      const data = await r.json();
      return res.json({ ok:true, updated:true, data });
    } catch (e) {
      return res.status(500).json({ ok:false, error:e.message });
    }
  });

  return router;
};
```

> **Simple d’abord** : on commence par **patch** minimal. Ensuite on branchera MCP‑Lite.

---

### 5.3 `/api/trigger` (POST)
- **But** : déclencher un webhook n8n selon le **contexte** et l’**action** renvoyés par le cerveau
- **Entrée** :
```json
{ "message":"client a abandonné panier", "context":"ecommerce" }
```
- **Réponse** : `{ ok:true, sent:true, workflow:"EC_RECOVER_CART" }`

**Implémentation (`routes/trigger.js`)**
```js
const WORKFLOW_MAP = {
  ecommerce: {
    cart_recovery: "EC_RECOVER_CART"
  },
  logistique: {
    shipment_tracking: "LOG_TRACK_UPDATE",
    project_delay_notification: "LOG_DELAY_ALERT"
  },
  coach: {
    session_followup: "COACH_SESSION_REMINDER"
  }
};

export default ({ brain, brainConfig, guardMode }) => {
  const router = (await import("express")).default.Router();

  router.post("/trigger", guardMode("write"), async (req, res) => {
    const { message, context } = req.body || {};
    if (!message) return res.status(400).json({ ok:false, error:"MISSING_MESSAGE" });

    // 1) Faire raisonner le cerveau pour comprendre l’action
    const result = await brain.process({ data: message, user:"ui", hints:{ context } });

    // 2) Choisir le workflow n8n
    const action = result?.data?.action || "generic_process";
    const wf = WORKFLOW_MAP[context || result.detectedContext]?.[action] || "GENERIC";

    // 3) Appeler n8n
    const payload = { context: context || result.detectedContext, action, message };
    const url = `${process.env.N8N_BASE}/webhook/${wf}`;
    try {
      await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      return res.json({ ok:true, sent:true, workflow:wf, brain: result.detectedContext });
    } catch (e) {
      return res.status(500).json({ ok:false, error:"N8N_CALL_FAILED", detail:e.message });
    }
  });

  return router;
};
```

---

### 5.4 `/api/logs` (GET)
- **But** : l’UI peut afficher un historique simple (avant/après, brain, mode, datation)
- **MVP** : renvoyer un tableau en mémoire (améliorable plus tard)

**Implémentation (`routes/logs.js`)**
```js
export default ({ }) => {
  const router = (await import("express")).default.Router();
  const LOGS = [];

  router.get("/logs", async (req, res) => {
    return res.json({ ok:true, list: LOGS.slice(-50) });
  });

  return router;
};
```

> Tu pourras pousser des entrées dans `LOGS` depuis `/updateLead` et `/trigger` (avant/après, brain, mode, timestamp) pour ton **panneau Logs** côté UI.

---

## 6) MCP‑Lite (optionnel, activable plus tard)
**But :** mapper des mots FR naturels → **champs préfixés** de ton CRM selon le contexte.

`utils/mcp-lite.js` (spécification simple) :
```js
const MAP = {
  ecommerce: {
    email: "ec_customerEmail",
    montant: "ec_cartValue",
    abandonDate: "ec_abandonDate"
  },
  logistique: {
    tracking: "log_trackingNumber",
    statut: "log_status",
    eta: "log_estimatedArrival"
  },
  coach: {
    session: "coach_lastSession",
    objectif: "coach_objective",
    progression: "coach_progressLevel"
  }
};

export async function mcpLiteMap(fields, context="ecommerce") {
  const dic = MAP[context] || {};
  const out = {};
  for (const [k,v] of Object.entries(fields)) {
    out[dic[k] || k] = v;    // si inconnu → conserve
  }
  return out;
}
```

> **Toggle** : passe `mcpLite:true` dans `brain.config.js` et utilise `mcpLiteMap()` dans `/updateLead`.

---

## 7) Workflows n8n (exports à préparer)
Crée **4 webhooks** dans n8n (mêmes noms que dans `WORKFLOW_MAP`) :
- `LOG_TRACK_UPDATE` → met à jour un statut de colis
- `LOG_DELAY_ALERT` → envoie un SMS/WhatsApp de retard
- `EC_RECOVER_CART` → séquence d’emails de relance (H+1, H+24, H+72)
- `COACH_SESSION_REMINDER` → rappel avant/après session

**Payload type** (ex. envoyé par `/api/trigger`) :
```json
{
  "context": "ecommerce",
  "action": "cart_recovery",
  "message": "client a abandonné panier"
}
```

---

## 8) Tests d’acceptation (DoD)
**Jalon 1 – `/api/brain/status`**
- [ ] Retourne `{ ok:true, brains:[...], mode:"assist" }`

**Jalon 2 – Mode RO**
- [ ] `/api/updateLead` répond **403** (READ_ONLY_MODE)

**Jalon 3 – Mode Assisté**
- [ ] `/api/updateLead` renvoie `{ requiresApproval:true, patch }`
- [ ] UI affiche **Bouton Valider** → PATCH CRM OK

**Jalon 4 – Mode Auto**
- [ ] `/api/updateLead` écrit bien dans EspoCRM (champ préfixé)

**Jalon 5 – Trigger n8n**
- [ ] `/api/trigger` renvoie `{ sent:true, workflow }`
- [ ] Webhook côté n8n reçoit le payload

**Jalon 6 – Logs**
- [ ] `/api/logs` retourne une liste (brain, mode, before/after, timestamp)

**Jalon 7 – MCP‑Lite (option)**
- [ ] `mcpLite:true` → `fields` FR mappés → patch **préfixé** CRM

---

## 9) Commandes PowerShell utiles
**Status cerveau**
```powershell
Invoke-RestMethod http://127.0.0.1:3005/api/brain/status -Method GET
```
**Update Lead (assisté)**
```powershell
$body = @{ id="68d1048b696e83222"; fields=@{ email="sarah@ex.com"; montant=120 }; context="ecommerce" } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3005/api/updateLead -Method POST -ContentType "application/json" -Body $body
```
**Déclencher n8n**
```powershell
$body = @{ message="client a abandonné panier"; context="ecommerce" } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3005/api/trigger -Method POST -ContentType "application/json" -Body $body
```

---

## 10) Dépannage rapide
- **403 READ_ONLY_MODE** : passe `mode: "assist"` ou `"auto"` dans `brain.config.js`.
- **n8n ne reçoit rien** : vérifie `N8N_BASE` + nom du webhook (exact).
- **PATCH EspoCRM échoue** : l’ID Lead est valide ? URL `ESPO_BASE` correcte ? En **Assisté**, rien n’écrit tant que tu n’as pas validé.
- **OPENAI_API_KEY manquant** : le moteur tourne quand même. L’analyse vectorielle est juste désactivée.
- **Redis absent** : pas bloquant. Le stockage d’états devient mémoire‑process (OK pour MVP local).

---

## 11) Roadmap P0 → P3 (T‑shirt sizing)
- **P0 (S) – Immuable** : Modes + endpoints + logs + 3 cerveaux actifs
- **P1 (M) – Valeur immédiate** : 2–4 workflows n8n + UI badges + Actions + Logs
- **P2 (S) – Intelligence légère** : MCP‑Lite ON (mapping FR → préfixes CRM)
- **P3 (S) – Extensibilité** : gabarits `btp.json` / `b2b.json` prêts (champs + actions placeholders)

---

## 12) Résumé clair
1) **Brancher** le fichier `quantum-brain-implementation.js` dans ton `server.js`.
2) **Créer** `brain.config.js` (cerveaux + mode).
3) **Ajouter** 4 **routes** min: `status`, `updateLead`, `trigger`, `logs`.
4) **Tester** en RO → Assisté → Auto.
5) **Brancher n8n** avec 2–4 webhooks.
6) **(Option)** activer **MCP‑Lite** pour le mapping FR → champs CRM.

---

## Annexe A — Philosophie système (simple & duplicable)
**EspoCRM** = le **cœur** (entités, champs, ACL, vues, email, tâches). 
**M.A.X.** = le **cerveau administrateur** qui :
- comprend le **contexte** (logistique, coach, e‑commerce, B2B…),
- **suggère** ou **crée** des champs si besoin,
- **tague** les fiches (priorité, relance, statut),
- **déclenche** des workflows (n8n) et **documente** (Logs),
- reste **désactivable** (mode RO) et **validable** (Assisté) pour éviter toute surprise.

Ainsi, **le CRM reste simple**, et **l’intelligence est optionnelle**.

---

## Annexe B — MVP1 "Tags‑first" (ultra simple, compatible Quantum Brain)
> But : ne rien complexifier. MAX apprend d’abord **Espo** (schéma) et opère **par tags**. Le Quantum Brain reste chargé mais en rôle **assisté**, sans OpenAI/Redis si tu veux.

### B.1 Principe
- **Lire le schéma Espo** (metadata, entités, champs existants).
- **Ne pas créer de nouveaux champs au départ** : utiliser **TAGS** dans `description` du Lead (ou un champ `tags` si déjà présent chez toi).
- **Tout driver par tags** : `#chaud`, `#a_relancer`, `#rdv`, `#logistique_retard`, `#panier_abandonné`, etc.
- **n8n écoute les tags** : quand un tag clé est appliqué, n8n **agit** (email, WhatsApp, rappel…).

### B.2 Endpoints supplémentaires
- `POST /api/tags/suggest` → renvoie des **tags proposés** à partir d’un court message.
```json
{ "text": "client a abandonné son panier hier" }
→ { "ok":true, "tags":["#panier_abandonné","#relance_H+24"] }
```
- `POST /api/tags/apply` → applique les tags au Lead (RO=403, Assisté=requiresApproval, Auto=patch direct).
```json
{ "id":"<leadId>", "tags":["#panier_abandonné","#relance_H+24"] }
→ { "ok":true, "applied":["#panier_abandonné","#relance_H+24"] }
```

**Implémentation (esquisse)**
```js
// routes/tags.js
export default ({ brainConfig, guardMode }) => {
  const router = (await import("express")).default.Router();

  router.post("/tags/suggest", async (req, res) => {
    const { text="" } = req.body || {};
    const t = text.toLowerCase();
    const out = [];
    if (t.includes("panier") || t.includes("abandon")) out.push("#panier_abandonné","#relance_H+24");
    if (t.includes("retard") || t.includes("tracking")) out.push("#logistique_retard");
    if (t.includes("session") || t.includes("coach")) out.push("#coach_suivi");
    return res.json({ ok:true, tags:[...new Set(out)] });
  });

  router.post("/tags/apply", guardMode("write"), async (req, res) => {
    const { id, tags=[] } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:"MISSING_ID" });

    if (brainConfig.mode === "assist") {
      return res.json({ ok:true, requiresApproval:true, patch:{ description:`TAGS: ${tags.join(" ")}` } });
    }

    // Auto: écrire dans description (ou champ dédié si tu en as un)
    try {
      const rLead = await fetch(`${process.env.ESPO_BASE}/api/v1/Lead/${id}`);
      const lead = await rLead.json();
      const before = lead.description || "";
      const after = (before + "
" + `TAGS: ${tags.join(" ")}`).trim();
      const r = await fetch(`${process.env.ESPO_BASE}/api/v1/Lead/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ patch:{ description: after } }) });
      if (!r.ok) throw new Error("ESPCRM_PATCH_FAILED");
      return res.json({ ok:true, applied: tags });
    } catch (e) {
      return res.status(500).json({ ok:false, error:e.message });
    }
  });

  return router;
};
```

> **Option** : plus tard, on remplacera le stockage des tags dans `description` par un **champ Tags** propre (ou la relation Étiquette si activée dans Espo) — sans rien casser côté n8n/UX.

### B.3 n8n (écouteur de tags)
- Webhook unique `TAG_EVENT`.
- Logique : si payload contient `#panier_abandonné` → lancer séquence relance ; si `#logistique_retard` → SMS statut ; si `#coach_suivi` → rappel session.

**Payload simple**
```json
{ "leadId":"...", "tags":["#panier_abandonné"] }
```

### B.4 Modes avec tags
- **RO** → refuse l’écriture de tags (403).
- **Assisté** → propose le patch `description` et attend validation UI.
- **Auto** → écrit directement, puis notifie n8n (`TAG_EVENT`).

### B.5 Tests (DoD express)
- [ ] `/api/tags/suggest` renvoie une liste pertinente.
- [ ] `/api/tags/apply` 403 en RO ; `requiresApproval` en Assisté ; écrit en Auto.
- [ ] n8n reçoit `TAG_EVENT` et déclenche la bonne action.

---

## Annexe C — Paramétrage "léger" du Quantum Brain pour MVP
- Tu peux **désactiver** OpenAI/Redis (pas obligatoires), le cerveau reste utile en **Assisté**.
- Laisse les **handlers** (e‑commerce/coach/logistique) comme **guides** : même si les actions proposées ne sont pas utilisées au début, ça te sert d’orientation.
- Dès que le *Tags‑first* tourne, on peut **brancher** progressivement : MCP‑Lite → champs préfixés → handlers plus intelligents.

---

## Fin du README
Tu peux suivre les annexes pour un MVP **très simple** (par **tags**), 100% compatible avec le **Cerveau Quantique** et **EspoCRM**.

