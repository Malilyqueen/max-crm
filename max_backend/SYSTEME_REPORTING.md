# Système de Reporting M.A.X.

## Vue d'ensemble

Le système de reporting permet de tracer toutes les actions effectuées par M.A.X. sur le CRM EspoCRM. Chaque action (création de champ, modification de layout, listage de données, etc.) est enregistrée dans un fichier de log et affichée dans l'onglet **Reporting** du frontend.

## Architecture

### Fichiers impliqués

1. **`lib/activityLogger.js`** - Module de logging
   - `logMaxActivity(action)` : Enregistre une action dans le fichier JSONL
   - `getRecentMaxActivity(limit)` : Récupère les N dernières actions
   - `formatActivityForReporting(action)` : Formate pour l'affichage frontend

2. **`routes/chat.js`** - Handlers des outils M.A.X.
   - Appelle `logMaxActivity()` après chaque opération réussie
   - Enregistre : configure_entity_layout, query_espo_leads, update_leads_in_espo, delete_leads_from_espo

3. **`routes/reporting.js`** - Endpoint API de reporting
   - GET `/api/reporting` : Retourne les KPIs et les activités M.A.X.
   - Utilise `getRecentMaxActivity()` et `formatActivityForReporting()`

4. **`logs/max_activity.jsonl`** - Fichier de log (JSONL)
   - Une ligne JSON par action
   - Format append-only (jamais supprimé, toujours ajouté)

## Types d'actions loggées

| Type | Description | Quand |
|------|-------------|-------|
| `field_created` | Champ custom créé | configure_entity_layout avec createField=true |
| `layout_modified` | Layout modifié | configure_entity_layout avec createField=false |
| `data_listed` | Données listées | query_espo_leads |
| `data_updated` | Données mises à jour | update_leads_in_espo |
| `data_deleted` | Données supprimées | delete_leads_from_espo |

## Format des logs

### Entrée brute (dans max_activity.jsonl)

```json
{
  "timestamp": "2025-11-16T12:16:12.301Z",
  "actor": "M.A.X.",
  "type": "field_created",
  "entity": "Lead",
  "fieldName": "tags",
  "fieldType": "array",
  "details": "Champ tags (array) créé et ajouté aux layouts"
}
```

### Entrée formatée (pour le frontend)

```json
{
  "ts": 1763295372301,
  "type": "field_created",
  "title": "🔧 Champ créé : tags (array)",
  "meta": {
    "entityType": "Lead",
    "entityId": "tags",
    "details": "Champ tags (array) créé et ajouté aux layouts",
    "count": 0,
    "actor": "M.A.X.",
    "entity": "Lead"
  }
}
```

## Exemples d'utilisation

### Dans un handler d'outil (routes/chat.js)

```javascript
// Après une création de champ réussie
logMaxActivity({
  type: 'field_created',
  entity: 'Lead',
  fieldName: 'tags',
  fieldType: 'array',
  details: `Champ tags (array) créé et ajouté aux layouts`
});

// Après un listage de leads
logMaxActivity({
  type: 'data_listed',
  entity: 'Lead',
  count: 15,
  total: 42,
  filters: { status: 'New' },
  details: `Listage de 15 lead(s) sur 42 total`
});

// Après une mise à jour
logMaxActivity({
  type: 'data_updated',
  entity: 'Lead',
  count: 3,
  leadIds: ['lead-001', 'lead-002', 'lead-003'],
  updates: { status: 'In Process' },
  details: `Mise à jour de 3 lead(s), création de 0 lead(s)`
});
```

### Récupérer les activités

```javascript
import { getRecentMaxActivity, formatActivityForReporting } from '../lib/activityLogger.js';

// Récupérer les 50 dernières activités
const activities = getRecentMaxActivity(50);

// Formater pour le frontend
const formattedActivities = activities.map(formatActivityForReporting);
```

### Filtrer les activités

```javascript
import { getMaxActivity } from '../lib/activityLogger.js';

// Filtrer par type
const fieldCreations = getMaxActivity({ type: 'field_created', limit: 20 });

// Filtrer par entité
const leadActivities = getMaxActivity({ entity: 'Lead', limit: 30 });

// Filtrer par date
const recentActivities = getMaxActivity({
  since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
  limit: 100
});
```

## Test du système

### Script de test

Exécutez le script de test pour générer des activités de démonstration :

```powershell
powershell -ExecutionPolicy Bypass -File "d:\Macrea\CRM\max_backend\test_logger.ps1"
```

Ce script :
1. Crée le dossier `logs/` s'il n'existe pas
2. Ajoute 3 activités de test au fichier `max_activity.jsonl`
3. Affiche les dernières activités

### Test de l'endpoint

```bash
curl http://localhost:3005/api/reporting
```

Réponse attendue :

```json
{
  "ok": true,
  "kpis": {
    "leads": 42,
    "hot": 7,
    "tasksRunning": 2
  },
  "activity": [
    {
      "ts": 1763295372301,
      "type": "field_created",
      "title": "🔧 Champ créé : testField (varchar)",
      "meta": {
        "entityType": "Lead",
        "entityId": "testField",
        "details": "Champ testField (varchar) créé et ajouté aux layouts",
        "count": 0,
        "actor": "M.A.X.",
        "entity": "Lead"
      }
    },
    ...
  ]
}
```

## Affichage dans le frontend

L'onglet **Reporting** du frontend récupère automatiquement les activités via l'endpoint `/api/reporting` et les affiche dans une liste chronologique avec :

- **Icône** : Selon le type d'action (🔧, 📋, ✏️, 📊, 🗑️)
- **Titre** : Description courte de l'action
- **Timestamp** : Heure de l'action
- **Détails** : Informations complémentaires (entité, nombre d'éléments, etc.)

## Maintenance

### Purge des logs

Si le fichier `max_activity.jsonl` devient trop volumineux, vous pouvez le purger :

```powershell
# Garder seulement les 1000 dernières lignes
$logFile = "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
$lines = Get-Content $logFile | Select-Object -Last 1000
Set-Content $logFile -Value $lines
```

### Rotation des logs

Pour mettre en place une rotation automatique, ajoutez cette fonction dans `activityLogger.js` :

```javascript
export function rotateLogFile(maxLines = 10000) {
  if (!fs.existsSync(ACTIVITY_LOG_FILE)) return;

  const lines = fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8').split('\n').filter(l => l.trim());

  if (lines.length > maxLines) {
    const recentLines = lines.slice(-maxLines);
    fs.writeFileSync(ACTIVITY_LOG_FILE, recentLines.join('\n') + '\n');
    console.log(`[ActivityLogger] Log rotated: kept ${maxLines} most recent entries`);
  }
}
```

Puis appelez-la périodiquement ou au démarrage du serveur.

## Prochaines étapes

### Améliorations possibles

1. **Dashboard de statistiques**
   - Nombre d'actions par jour/semaine/mois
   - Types d'actions les plus fréquents
   - Graphiques de tendances

2. **Filtrage dans le frontend**
   - Filtrer par type d'action
   - Filtrer par entité
   - Recherche par mot-clé

3. **Export des logs**
   - Export CSV pour analyse
   - Export JSON pour backup

4. **Notifications**
   - Alertes sur certaines actions critiques
   - Résumé quotidien par email

5. **Intégration avec EspoCRM Stream**
   - Publier les actions M.A.X. dans le Stream EspoCRM
   - Lier les activités aux entités concernées

## Dépannage

### Les activités n'apparaissent pas dans le Reporting

1. Vérifiez que le fichier de log existe :
   ```powershell
   Test-Path "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
   ```

2. Vérifiez que le fichier contient des données :
   ```powershell
   Get-Content "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
   ```

3. Testez l'endpoint directement :
   ```bash
   curl http://localhost:3005/api/reporting
   ```

4. Vérifiez les logs du serveur pour des erreurs

### Les activités ne sont pas loggées

1. Vérifiez que `logMaxActivity()` est appelé dans le handler
2. Vérifiez que le dossier `logs/` a les bonnes permissions
3. Vérifiez les logs console pour `[ActivityLogger] Action logged:`

### Format JSON invalide

Si le fichier JSONL est corrompu, supprimez-le et laissez-le se recréer :

```powershell
Remove-Item "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
```

Les nouvelles actions créeront un nouveau fichier propre.
