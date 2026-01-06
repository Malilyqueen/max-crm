# TEST_PLAN.md — M.A.X. (MaCréa Studio) UI multi-tenant

> Couvre P0 → P9 du pipeline **COPILOT_TASKS.md**.
> Objectif : vérifier le fonctionnement **multi-tenant**, la séparation **Standard vs Extensions**, l’**Admin Preview**, les **exécutions unifiées** et la **résilience UI** sans crash.

---

## 1) Portée & prérequis

* **Cible UI** : `ia_admin_ui/` (vanilla HTML/CSS + JS minimal).
* **APIs** (mockées/actives) :

  * `GET /api/resolve-tenant`
  * `GET /api/reporting/stats`
  * `GET /api/agent/discover-actions`
  * `POST /api/chat/ask-action`
* **En-têtes obligatoires** (toutes requêtes API) :

  * `X-Tenant: <tenantKey>`
  * `X-Role: admin|user`
  * `X-Preview: true|false`
  * `X-Client: max-ui`
  * `Content-Type: application/json`
* **Règle d’or** : toute carte/élément **data-preview="true"** ne doit **jamais** déclencher un appel réseau.

---

## 2) Jeux de données mock (réponses-types)

### 2.1 `/api/resolve-tenant`

```json
// admin + preview ON
{
  "ok": true,
  "tenant": "client_demo",
  "role": "admin",
  "preview": true
}
```

```json
// admin + preview OFF
{
  "ok": true,
  "tenant": "client_demo",
  "role": "admin",
  "preview": false
}
```

```json
// user standard
{
  "ok": true,
  "tenant": "client_standard",
  "role": "user",
  "preview": false
}
```

### 2.2 `/api/reporting/stats`

```json
{
  "ok": true,
  "kpi": {
    "leadsIn": 247,
    "convRate": 0.34,
    "avgReplyHours": 2.4,
    "automations": 1842
  },
  "activity": [
    {"ts": "2025-01-15T14:35:12Z", "type": "workflow", "title": "Relance J+3 exécuté", "tag": "workflow"},
    {"ts": "2025-01-15T14:28:00Z", "type": "chat", "title": "M.A.X. a suggéré 3 leads prioritaires", "tag": "action"}
  ],
  "quotas": {"api": 0.76, "n8n": 0.52, "chat": 0.63}
}
```

### 2.3 `/api/agent/discover-actions`

```json
{
  "ok": true,
  "extensions": ["ecommerce"],
  "workflows": [
    {"id": "wf-relance-j3", "kind": "workflow", "title": "Relance automatique J+3", "desc": "Email J+3 si pas de réponse."},
    {"id": "wf-qualify", "kind": "workflow", "title": "Qualification lead automatique", "desc": "Scoring initial des nouveaux leads."}
  ],
  "agent": [
    {"id": "nba", "kind": "next-best-action", "title": "Prochaine meilleure action", "desc": "Suggestion sur pipeline."},
    {"id": "tag-hot", "kind": "tagging", "title": "Tag automatique #chaud", "desc": "Score engagement → #chaud."},
    {"id": "followup-j3", "kind": "followup", "title": "Relance intelligente J+3", "desc": "Contacts silencieux 3 jours."},
    {"id": "prop-create", "kind": "property-create", "title": "Créer propriété intelligente", "desc": "Propriété calculée par M.A.X."}
  ]
}
```

> Variante pour **user** : `extensions` peut être `[]`.
> Variante pour **admin preview ON** : l’UI doit **afficher** les extensions manquantes en **mode Preview** (pas d’exécution possible).

### 2.4 `/api/chat/ask-action` (réussite)

```json
{
  "ok": true,
  "task": {
    "id": "task-2025-01-15-143210",
    "status": "running",
    "actionId": "wf-relance-j3",
    "meta": {"count": 12}
  }
}
```

### 2.5 `/api/chat/ask-action` (échec)

```json
{
  "ok": false,
  "error": "TENANT_NOT_ALLOWED",
  "message": "Cette action n'est pas activée pour ce tenant."
}
```

---

## 3) Scénarios par périmètre (P0 → P9)

### P0 — Boot multi-tenant & headers

**But** : initialiser `{tenant, role, preview}`, cacher extensions par défaut, démasquer en admin+preview.
**Étapes** :

1. Simuler `/api/resolve-tenant` = admin+preview ON.
2. Recharger l’UI.
3. Vérifier : boutons sous-nav `Standard` visible; `Logistique/E-commerce/Coaching` **visibles** avec badge **Preview**.
4. Ouvrir console : aucun appel réseau d’exécution depuis éléments `data-preview="true"`.

**Attendu** : `fetchJson` appose les en-têtes sur tous les futurs appels.

---

### P1 — Reporting/stats

**But** : alimenter KPI, quotas, activity.
**Étapes** :

1. Simuler réponse 2.2 (OK) → UI affiche KPI & activity.
2. Couper API (timeout/500) → squelettes + toast discret.

**Attendu** : aucun crash, valeurs lisibles.

---

### P2 — Discover actions

**But** : hydrater Automatisation + Espace M.A.X. / Explorer.
**Étapes** :

1. Réponse 2.3 (extensions=["ecommerce"]) → sous-onglet `E-commerce` visible.
2. Passer en **user** (resolve-tenant user) avec `extensions=[]` → seul `Standard` visible.
3. Admin preview ON avec `extensions=[]` → toutes extensions **affichées en Preview** (bloquées).

**Attendu** : cartes classées par onglet; preview = pas d’exécution.

---

### P3 — Exécutions unifiées (TaskTray)

**But** : tous les boutons **Exécuter** → `POST /api/chat/ask-action`.
**Étapes** :

1. Cliquer "Exécuter" sur `Relance J+3` (non preview) → TaskTray s’ouvre, état `queued → running → done/failed`.
2. Cliquer "Exécuter" sur une carte **Preview** → toast “non activée”, **aucun** appel réseau.
3. Forcer `/api/chat/ask-action` erreur (2.5) → statut `failed` + message.

**Attendu** : journal cohérent, pas d’appels pour preview.

---

### P4 — Espace M.A.X. (Chat + Execution Log)

**But** : chat uniquement dans cet onglet, Execution Log mis à jour.
**Étapes** :

1. Envoyer un message “Créer un workflow J+3” → `ask-action` avec `source:"chat"`.
2. Vérifier l’ajout d’une ligne dans **Execution Log**.
3. Aller dans **CRM** : confirmer **absence** de chat.

**Attendu** : séparation claire.

---

### P5 — CRM (Résumé + Tâches)

**But** : fiche + tâches exécutables, sans chat.
**Étapes** :

1. Sélectionner un lead mock → voir champs de base + liste de tâches.
2. Cliquer "Exécuter" sur une tâche → confirmation (modal) → `ask-action` → TaskTray.

**Attendu** : expérience fluide, aucun composant chat présent.

---

### P6 — Automatisation (barre d’actions)

**But** : modales UI-only (Créer, Demander à M.A.X., Importer, Dupliquer).
**Étapes** :

1. Ouvrir chaque modal, remplir champs, valider → toasts.
2. Menu ⋯ sur cartes : Éditer/Cloner/Désactiver/Audit → toasts/audit modal.
3. Sur Exécuter : TaskTray s’ouvre automatiquement si fermé.

**Attendu** : aucun call réseau hors `ask-action`.

---

### P7 — Standard vs Extensions + Toggle Admin Preview

**But** : matrice rôles/preview.
**Étapes** :

1. `user` + preview off → Standard seul.
2. `admin` + preview off → périmètre réel (`extensions` de l’API).
3. `admin` + preview ON → tout visible mais bloqué (Preview) pour extensions non activées.
4. Utiliser **toggle** “Admin Preview” → commute visibilité **sans reload**.

**Attendu** : filtrage correct + blocage d’exécution sur Preview.

---

### P8 — Accessibilité & Responsive

**But** : focus, aria, mobile.
**Étapes** :

1. Navigation clavier : onglets, boutons, modales (trap focus).
2. Mobile (360–414 px) : cartes pleine largeur; TaskTray → drawer bas; aucun débordement.
3. Vérifier contrastes : texte ≥ AA.

**Attendu** : conforme.

---

### P9 — Résilience & Debug mode

**But** : pas de crash si API down, debug via query.
**Étapes** :

1. Simuler timeouts sur `stats` et `discover-actions` → squelettes + toasts.
2. Lancer UI avec `?tenant=client_demo&preview=1&role=admin` **si** `/api/resolve-tenant` indisponible → contexte forcé côté UI, **sans appels d’écriture**.

**Attendu** : logs `[MAX-UI]` sobres, UI exploitable.

---

## 4) Cas d’erreur supplémentaires

* **401/403** sur `ask-action` → TaskTray `failed` + message d’autorisation.
* **422** payload invalide → toast “Paramètres manquants”, aucune boucle.
* **429** rate limit → toast “Quota atteint”, badge quotas passe en alerte.
* **5xx** serveur → retry passif (UI-only), ne pas bloquer la page.

---

## 5) Checklist de validation finale

* [ ] En-têtes injectés à chaque requête (`X-*`).
* [ ] Chat **exclusif** à Espace M.A.X.
* [ ] CRM : exécution de tâches OK, **pas** de chat.
* [ ] Admin Preview : visible, commute sans reload, bloque l’exécution des extensions non activées.
* [ ] TaskTray : ouvert auto à l’exécution, états cohérents.
* [ ] Squelettes présents si API down, aucun crash.
* [ ] Responsive 360–1440px OK, focus/aria présents.

---

## 6) Aides de test (cURL rapides)

> Adapter `<BASE>` et headers selon tenant/role/preview.

**resolve-tenant**

```bash
curl -s <BASE>/api/resolve-tenant -H "X-Client: max-ui"
```

**reporting/stats**

```bash
curl -s <BASE>/api/reporting/stats \
 -H "X-Tenant: client_demo" -H "X-Role: admin" -H "X-Preview: true" -H "X-Client: max-ui"
```

**agent/discover-actions**

```bash
curl -s <BASE>/api/agent/discover-actions \
 -H "X-Tenant: client_demo" -H "X-Role: admin" -H "X-Preview: true" -H "X-Client: max-ui"
```

**chat/ask-action** (succès)

```bash
curl -s -X POST <BASE>/api/chat/ask-action \
 -H "Content-Type: application/json" \
 -H "X-Tenant: client_demo" -H "X-Role: admin" -H "X-Preview: false" -H "X-Client: max-ui" \
 -d '{"tenant":"client_demo","actionId":"wf-relance-j3","params":{},"source":"ui"}'
```

**chat/ask-action** (échec volontaire)

```bash
curl -s -X POST <BASE>/api/chat/ask-action \
 -H "Content-Type: application/json" \
 -H "X-Tenant: client_demo" -H "X-Role: admin" -H "X-Preview: true" -H "X-Client: max-ui" \
 -d '{"tenant":"client_demo","actionId":"wf-relance-j3","params":{},"source":"ui"}'
```

*(doit être bloqué côté UI si `data-preview="true"` — pas d’appel réseau en pratique ; ce cURL sert uniquement à valider la route côté serveur)*

---

## 7) Notes & limites

* Le **mode Debug** (`?tenant=...&preview=...&role=...`) est une **échappatoire UI** quand `/api/resolve-tenant` est KO. Ne jamais l’utiliser en prod.
* Les modales "Créer workflow" et "Demander à M.A.X." sont **UI-only** : aucun appel réseau tant que la route d’édition/brief n’est pas définie.
* Les **extensions** activées réellement pour un tenant doivent venir de l’API `discover-actions.extensions`.

---

## 8) Go/No-Go

* **GO** si 100% des cases Checklist sont cochées et les scénarios P0→P9 passent sans contournement.
* **NO-GO** si :

  * un élément Preview déclenche un appel réseau,
  * le chat est visible hors Espace M.A.X.,
  * l’UI crash en cas d’API down,
  * le toggle Admin Preview ne commute pas sans reload.
