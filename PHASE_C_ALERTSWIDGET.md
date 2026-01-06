# PHASE C - AlertsWidget.tsx Frontend

**Date**: 2025-12-27
**Scope**: Widget alertes vivantes dans Tour de Contrôle
**Status**: Implémenté - Prêt pour test UI

---

## FICHIERS CRÉÉS/MODIFIÉS

### 1. [max_frontend/src/components/dashboard/AlertsWidget.tsx](max_frontend/src/components/dashboard/AlertsWidget.tsx) (NEW)

**Lignes**: 286 lignes total

**Fonctionnalités implémentées**:

#### État Loading (lignes 118-127)
```typescript
if (loading) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes M.A.X.</h2>
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement des alertes...</span>
      </div>
    </div>
  );
}
```

#### État Error avec Réessayer (lignes 129-145)
```typescript
if (error) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes M.A.X.</h2>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchAlerts}
          className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
```

#### État Empty "Vivant" (lignes 147-171)
```typescript
if (stats.total === 0) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Alertes M.A.X.</h2>
        <button onClick={fetchAlerts} className="text-sm text-gray-600 hover:text-gray-800">
          Actualiser
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-green-900 font-medium mb-2">
          R.A.S. aujourd'hui. Ton pipeline est propre.
        </p>
        <p className="text-green-700 text-sm">
          Si tu veux, je peux surveiller les leads silencieux et te prévenir dès qu'un contact devient froid.
        </p>
      </div>
    </div>
  );
}
```

#### Header avec compteur total (lignes 176-187)
```typescript
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <h2 className="text-lg font-semibold text-gray-900">Alertes M.A.X.</h2>
    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
      {stats.total}
    </span>
  </div>
  <button onClick={fetchAlerts} className="text-sm text-gray-600 hover:text-gray-800">
    Actualiser
  </button>
</div>
```

#### Badges de sévérité (lignes 189-199)
```typescript
<div className="flex flex-wrap gap-2 mb-6">
  {stats.by_severity.high > 0 && (
    <SeverityBadge severity="high" count={stats.by_severity.high} />
  )}
  {stats.by_severity.med > 0 && (
    <SeverityBadge severity="med" count={stats.by_severity.med} />
  )}
  {stats.by_severity.low > 0 && (
    <SeverityBadge severity="low" count={stats.by_severity.low} />
  )}
</div>
```

**Badge Component** (lignes 104-121):
- `high`: Fond rouge, texte rouge foncé, bordure rouge
- `med`: Fond jaune, texte jaune foncé, bordure jaune
- `low`: Fond bleu, texte bleu foncé, bordure bleu

#### Liste triée des alertes (lignes 201-268)
```typescript
{alerts.map(alert => {
  const severityColors = {
    high: 'border-l-red-500 bg-red-50',
    med: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-blue-500 bg-blue-50'
  };

  const typeLabels = {
    NoContact7d: 'Aucun contact depuis 7 jours',
    NoReply3d: 'Pas de réponse depuis 3 jours'
  };

  return (
    <div key={alert.id} className={`border-l-4 ${severityColors[alert.severity]} rounded-r-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            {typeLabels[alert.type]}
          </span>
          <p className="text-gray-900 font-medium mb-1">
            {alert.lead_name || `Lead ${alert.lead_id.substring(0, 8)}`}
          </p>
          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
          {alert.lead_email && (
            <p className="text-xs text-gray-500">{alert.lead_email}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button onClick={() => resolveAlert(alert.id)} className="...">
            Résoudre
          </button>
          {alert.suggested_action && (
            <button onClick={() => handleAction(alert)} className="...">
              {alert.suggested_action.label || 'Action'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Créée le {new Date(alert.created_at).toLocaleDateString('fr-FR', ...)}
      </div>
    </div>
  );
})}
```

#### Fonctions principales

**fetchAlerts()** (lignes 53-69):
```typescript
const fetchAlerts = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await client.get<AlertsResponse>('/alerts/active', {
      headers: { 'X-Tenant': 'macrea' }
    });

    if (response.ok) {
      setAlerts(response.alerts || []);
      setStats(response.stats || { total: 0, by_severity: { high: 0, med: 0, low: 0 } });
    } else {
      setError('Erreur lors du chargement des alertes');
    }
  } catch (err) {
    console.error('Erreur fetch alertes:', err);
    setError('Impossible de charger les alertes');
  } finally {
    setLoading(false);
  }
};
```

**resolveAlert()** (lignes 71-96):
```typescript
const resolveAlert = async (alertId: string) => {
  try {
    const response = await client.post(`/alerts/${alertId}/resolve`, {
      headers: { 'X-Tenant': 'macrea' }
    });

    if (response.ok) {
      // Retirer l'alerte de la liste
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      // Mettre à jour les stats
      const resolvedAlert = alerts.find(a => a.id === alertId);
      if (resolvedAlert) {
        setStats(prev => ({
          total: prev.total - 1,
          by_severity: {
            ...prev.by_severity,
            [resolvedAlert.severity]: Math.max(0, prev.by_severity[resolvedAlert.severity] - 1)
          }
        }));
      }
    } else {
      alert('Erreur lors de la résolution');
    }
  } catch (err) {
    console.error('Erreur resolve alerte:', err);
    alert('Impossible de résoudre l\'alerte');
  }
};
```

**handleAction()** (lignes 98-102) - MVP Toast only:
```typescript
const handleAction = (alert: Alert) => {
  // MVP: Juste un toast pour montrer l'action
  const actionLabel = alert.suggested_action?.label || 'Action';
  alert(`${actionLabel} pour ${alert.lead_name || alert.lead_id}`);
};
```

---

### 2. [max_frontend/src/pages/DashboardPage.tsx](max_frontend/src/pages/DashboardPage.tsx) (MODIFIED)

**Import ajouté** (ligne 11):
```typescript
import AlertsWidget from '../components/dashboard/AlertsWidget';
```

**Widget intégré** (ligne 195):
```typescript
{/* Actions rapides */}
<div>
  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>Actions rapides</h2>
  <QuickActions />
</div>

{/* Alertes M.A.X. */}
<AlertsWidget />

{/* Activité récente */}
<div className="rounded-lg shadow p-6" style={{ background: colors.cardBg }}>
  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>Activité récente</h2>
  <RecentActivityList activities={recentActivity} />
</div>
```

**Position**: Entre QuickActions et RecentActivityList, dans la section principale du Dashboard.

---

## EXEMPLE JSON API RESPONSE

### GET /api/alerts/active

**Cas avec alertes**:
```json
{
  "ok": true,
  "alerts": [
    {
      "id": "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
      "tenant_id": "macrea",
      "lead_id": "694d0bed15df5b9e1",
      "type": "NoContact7d",
      "severity": "high",
      "message": "Aucun contact depuis 8 jours. Lead à risque de perte.",
      "suggested_action": {
        "label": "Relancer par WhatsApp",
        "action": "send_whatsapp",
        "params": {
          "leadId": "694d0bed15df5b9e1",
          "template": "relance_froide"
        }
      },
      "created_at": "2025-12-20T10:30:00Z",
      "resolved_at": null,
      "resolved_by": null,
      "lead_name": "Sophie Martin",
      "lead_email": "sophie.martin@example.com",
      "lead_phone": "+33612345678",
      "lead_secteur": "Transport"
    },
    {
      "id": "b2c3d4e5-6f78-9012-bcde-f12345678901",
      "tenant_id": "macrea",
      "lead_id": "691b2816e43817b92",
      "type": "NoReply3d",
      "severity": "med",
      "message": "Aucune réponse depuis 4 jours après notre dernier message.",
      "suggested_action": {
        "label": "Voir conversation",
        "action": "view_chat",
        "params": {
          "leadId": "691b2816e43817b92"
        }
      },
      "created_at": "2025-12-24T14:15:00Z",
      "resolved_at": null,
      "resolved_by": null,
      "lead_name": "Jean Dupont",
      "lead_email": "jean.dupont@transport.fr",
      "lead_phone": "+33698765432",
      "lead_secteur": "Logistique"
    }
  ],
  "stats": {
    "total": 2,
    "by_severity": {
      "high": 1,
      "med": 1,
      "low": 0
    },
    "by_type": {
      "NoContact7d": 1,
      "NoReply3d": 1
    }
  }
}
```

**Cas sans alertes (empty)**:
```json
{
  "ok": true,
  "alerts": [],
  "stats": {
    "total": 0,
    "by_severity": {
      "high": 0,
      "med": 0,
      "low": 0
    },
    "by_type": {
      "NoContact7d": 0,
      "NoReply3d": 0
    }
  }
}
```

### POST /api/alerts/:id/resolve

**Request**:
```http
POST /api/alerts/a1b2c3d4-5e6f-7890-abcd-ef1234567890/resolve
X-Tenant: macrea
```

**Response**:
```json
{
  "ok": true,
  "message": "Alerte résolue",
  "alert": {
    "id": "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "resolved_at": "2025-12-27T16:45:00Z",
    "resolved_by": "user_manual"
  }
}
```

---

## TEST FRONTEND

### Étape 1: Démarrer le frontend

```bash
cd max_frontend
npm run dev
```

### Étape 2: Naviguer vers le Dashboard

1. Ouvrir le navigateur: `http://localhost:5173`
2. Se connecter (si authentification activée)
3. Cliquer sur "Dashboard" dans la navigation

### Étape 3: Vérifier le widget

#### CAS 1: État Empty (aucune alerte)

**Vérifier**:
- Bloc "Alertes M.A.X." visible
- Message "R.A.S. aujourd'hui. Ton pipeline est propre."
- Fond vert clair avec icône ✓
- Bouton "Actualiser" présent

#### CAS 2: État avec alertes

**Vérifier**:
- Compteur total affiché (badge gris avec chiffre)
- Badges de sévérité affichés:
  - Rouge si `high > 0`
  - Jaune si `med > 0`
  - Bleu si `low > 0`
- Liste des alertes triée:
  1. D'abord par sévérité (high → med → low)
  2. Puis par date (plus récentes en premier)
- Chaque carte alerte affiche:
  - Barre colorée à gauche selon sévérité
  - Type (NoContact7d / NoReply3d)
  - Nom du lead
  - Message descriptif
  - Email (si disponible)
  - Date de création formatée
  - Bouton "Résoudre" (blanc avec bordure)
  - Bouton "Action" (bleu) si `suggested_action` présent

#### CAS 3: Résolution d'alerte

**Procédure**:
1. Cliquer sur "Résoudre" sur une alerte
2. Vérifier que l'alerte disparaît immédiatement de la liste
3. Vérifier que le compteur total décrémente
4. Vérifier que le badge de sévérité met à jour son compteur

**Vérification backend**:
```sql
SELECT * FROM max_alerts
WHERE id = 'a1b2c3d4-5e6f-7890-abcd-ef1234567890';

-- Devrait montrer resolved_at = NOW() et resolved_by = 'user_manual'
```

#### CAS 4: État Error

**Simulation**:
- Arrêter le backend (`max_backend/server.js`)
- Cliquer sur "Actualiser" dans le widget

**Vérifier**:
- Message d'erreur affiché en rouge
- Bouton "Réessayer" présent et fonctionnel

#### CAS 5: État Loading

**Simulation**:
- Throttler la connexion réseau (DevTools > Network > Throttling)
- Cliquer sur "Actualiser"

**Vérifier**:
- Spinner animé visible
- Message "Chargement des alertes..."

---

## CRITÈRES DE VALIDATION PHASE C

Validation réussie si:

- [ ] Bloc "Alertes M.A.X." visible dans Tour de Contrôle
- [ ] Compteur total affiché (badge gris)
- [ ] Badges de sévérité affichés (rouge/jaune/bleu selon stats)
- [ ] Liste triée par sévérité puis date
- [ ] Bouton "Résoudre" fonctionne (alerte disparaît après click + refresh)
- [ ] État Empty "vivant" affiché quand `stats.total === 0`
- [ ] État Loading avec spinner pendant fetch
- [ ] État Error avec bouton "Réessayer" si API fail
- [ ] Bouton "Actualiser" recharge les alertes
- [ ] Responsive design (fonctionne sur mobile/desktop)

---

## DIFF RÉSUMÉ

| Fichier | Lignes | Changement |
|---------|--------|------------|
| `max_frontend/src/components/dashboard/AlertsWidget.tsx` | +286 | Nouveau widget complet |
| `max_frontend/src/pages/DashboardPage.tsx` | +2 | Import + intégration widget |
| **TOTAL** | **+288 lignes** | **1 nouveau fichier + 1 modifié** |

---

## CONTRAINTES RESPECTÉES

| Contrainte | Status | Détail |
|------------|--------|--------|
| MVP simple | ✅ | Pas de sur-design, fonctionnalités essentielles uniquement |
| Non-blocking | ✅ | Fetch isolé, erreurs gérées, ne casse pas le dashboard |
| Pas de dépendances lourdes | ✅ | Utilise client.ts existant + React natif |
| Empty state "vivant" | ✅ | Message personnalité M.A.X. (ligne 162-168) |
| Loading/Error states | ✅ | 3 états gérés (lignes 118-145) |
| Tri sévérité + date | ✅ | Backend trie déjà, frontend affiche dans l'ordre |
| Compteur + badges | ✅ | Header (lignes 176-187) + badges (lignes 189-199) |
| Bouton Résoudre | ✅ | Optimistic update (lignes 71-96) |
| Bouton Action optionnel | ✅ | Toast MVP (lignes 98-102) |

---

## PROCHAINES ÉTAPES (HORS SCOPE PHASE C)

### Phase D: Auto-refresh (optionnel)
- Ajouter `setInterval(() => fetchAlerts(), 60000)` dans `useEffect`
- Gérer cleanup avec `clearInterval` au unmount

### Phase E: Intégration Action réelle
- Remplacer `alert()` par navigation vers chat
- Déclencher workflow M.A.X. depuis `suggested_action.action`

### Phase F: Filtres/tri manuel
- Dropdown "Trier par: Sévérité / Date / Type"
- Filtres par lead/secteur

---

**Phase C complète et prête pour test UI** ✅
