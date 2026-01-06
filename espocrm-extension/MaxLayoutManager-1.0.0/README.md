# MaxLayoutManager Extension v1.0.0

Extension EspoCRM native permettant à MAX de gérer automatiquement les layouts via API REST sécurisée.

## Fonctionnalités

- ✅ **Création automatique de layouts** via API POST
- ✅ **Ajout de champs aux layouts** (detail, list, detailSmall)
- ✅ **Rebuild + clear cache** automatisé
- ✅ **Sécurité** via header `X-Max-Plugin-Key`
- ✅ **Multi-tenant safe** (aucun hardcode)
- ✅ **Retours JSON stricts** avec détails des actions

---

## Installation

### 1. Upload Extension

1. Login EspoCRM en tant qu'admin
2. **Administration > Extensions**
3. Cliquer **Upload**
4. Sélectionner `MaxLayoutManager-1.0.0.zip`
5. Cliquer **Install**
6. Attendre rebuild automatique

### 2. Récupérer l'API Key

Après installation, check les logs EspoCRM:

```bash
docker compose logs espocrm | grep "MAX_PLUGIN_KEY"
```

Vous verrez:
```
MAX_PLUGIN_KEY=55f49f7a951a2e41dfa9faa8d6019ad378e4ef88abfe9b44de4b755c07afbffb
```

### 3. Configurer MAX Backend

Ajouter la clé dans `/opt/max-infrastructure/.env`:

```bash
MAX_PLUGIN_KEY=55f49f7a951a2e41dfa9faa8d6019ad378e4ef88abfe9b44de4b755c07afbffb
```

Redémarrer backend:
```bash
docker compose restart max-backend
```

---

## API Endpoints

### Health Check

```bash
curl "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/health"
```

**Response**:
```json
{
  "status": "ok",
  "module": "MaxLayoutManager",
  "version": "1.0.0",
  "timestamp": "2025-12-26 16:30:00"
}
```

### Add Field to Layouts

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/addField" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: YOUR_KEY_HERE" \
  -d '{
    "entity": "Lead",
    "fieldName": "secteurActivite",
    "layoutTypes": ["detail", "detailSmall", "list"]
  }'
```

**Response**:
```json
{
  "success": true,
  "entity": "Lead",
  "fieldName": "secteurActivite",
  "layoutsModified": 3,
  "layoutsSkipped": 0,
  "details": [
    "detail: added",
    "detailSmall: added",
    "list: added"
  ],
  "timestamp": "2025-12-26 16:31:00"
}
```

### Apply Complete Layout

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/applyLayout" \
  -H "Content-Type: application/json" \
  -H "X-Max-Plugin-Key: YOUR_KEY_HERE" \
  -d '{
    "entity": "Lead",
    "layoutType": "detail",
    "layout": {
      "layout": [
        {
          "label": "Overview",
          "rows": [
            [{"name": "firstName"}, {"name": "lastName"}],
            [{"name": "secteurActivite"}]
          ]
        }
      ]
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "entity": "Lead",
  "layoutType": "detail",
  "fieldsAdded": 3,
  "timestamp": "2025-12-26 16:32:00"
}
```

### Rebuild

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "X-Max-Plugin-Key: YOUR_KEY_HERE"
```

**Response**:
```json
{
  "success": true,
  "message": "Rebuild and cache clear completed",
  "timestamp": "2025-12-26 16:33:00"
}
```

---

## Workflow MAX Complet

### Exemple: Créer champ + ajouter aux layouts

```javascript
// 1. Créer le champ via API EspoCRM standard
await espoAdminFetch('/Admin/fieldManager/Lead/secteurActivite', {
  method: 'PUT',
  body: JSON.stringify({
    type: 'enum',
    options: ['Artisanat', 'Commerce', 'Services'],
    required: false
  })
});

// 2. Ajouter aux layouts via MaxLayoutManager
const response = await fetch('https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/addField', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Max-Plugin-Key': process.env.MAX_PLUGIN_KEY
  },
  body: JSON.stringify({
    entity: 'Lead',
    fieldName: 'secteurActivite',
    layoutTypes: ['detail', 'detailSmall', 'list']
  })
});

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "layoutsModified": 3,
//   "details": ["detail: added", "detailSmall: added", "list: added"]
// }

// 3. Rebuild
await fetch('https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild', {
  method: 'POST',
  headers: { 'X-Max-Plugin-Key': process.env.MAX_PLUGIN_KEY }
});

// ✅ Champ visible dans UI EspoCRM
```

---

## Sécurité

### Authentication
- Tous les endpoints (sauf `/health`) requièrent header `X-Max-Plugin-Key`
- Timing-attack safe (`hash_equals()`)
- Pas de secrets dans les logs

### Multi-tenant Safe
- Aucun userId hardcodé
- Pas de path OS
- Pas de localhost
- Entity names paramétrés

### Audit Logging
- Toutes actions loggées dans `data/logs/espo-YYYY-MM-DD.log`
- Format: `[timestamp] INFO: MaxLayoutManager: {action}`

---

## Désinstallation

1. **Administration > Extensions**
2. Trouver **MaxLayoutManager**
3. Cliquer **Uninstall**
4. API key automatiquement supprimée de `data/config.php`
5. Supprimer `MAX_PLUGIN_KEY` du backend `.env` si nécessaire

---

## Troubleshooting

### Erreur: "API key not configured"

L'extension n'a pas généré la clé. Relancer le script:

```bash
docker compose exec espocrm php application/Espo/Modules/MaxLayoutManager/scripts/AfterInstall.php
```

### Erreur: 403 Forbidden

Header `X-Max-Plugin-Key` manquant ou invalide. Vérifier:

```bash
# Check config.php
docker compose exec espocrm grep maxLayoutManagerApiKey data/config.php

# Check backend .env
grep MAX_PLUGIN_KEY /opt/max-infrastructure/.env
```

### Erreur: 405 Method Not Allowed

Routes POST non chargées. Vérifier:

```bash
# Check Routes.php existe
docker compose exec espocrm ls -la application/Espo/Modules/MaxLayoutManager/Routes.php

# Rebuild
docker compose exec espocrm php command.php rebuild
```

### Champ ajouté mais pas visible

Rebuild requis:

```bash
curl -X POST "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/rebuild" \
  -H "X-Max-Plugin-Key: YOUR_KEY"
```

---

## Support

**MACREA Studio**
- Email: support@macrea.fr
- Documentation: [PLAN_EXTENSION_NATIVE.md](../PLAN_EXTENSION_NATIVE.md)

---

## Version History

### 1.0.0 (2025-12-26)
- Initial release
- POST routes via Routes.php
- Authentication par X-Max-Plugin-Key
- Endpoints: addField, applyLayout, rebuild, health
- Multi-tenant safe
- Auto-generation API key lors install
