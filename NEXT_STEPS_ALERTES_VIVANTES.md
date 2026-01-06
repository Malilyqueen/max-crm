# 🚀 Prochaines Étapes - Système d'Alertes Vivantes M.A.X.

**Date**: 2025-12-27
**État actuel**: Step 2 terminé (DB + Backend + API routes)

---

## ✅ COMPLÉTÉ

### Step 1: Philosophie 100% Enrichissement
- [x] emailAnalyzer.js corrigé (ZÉRO lead ignoré)
- [x] Prompt système aligné (stratège commercial)
- [x] Messages "100% traités"
- [x] Test unitaire validé (7/7 leads enrichis)

### Step 2: Infrastructure Alertes
- [x] Migration Supabase créée (lead_activities, max_alerts)
- [x] Backend branché Supabase (activityLogger.js, alertGenerator.js)
- [x] 2 alertes MVP (NoContact7d, NoReply3d)
- [x] Routes API (POST /activities/log, GET /alerts/active)
- [x] Script de test créé

---

## ⏳ EN COURS

### Migration Supabase (BLOQUANT)
**Status**: À faire manuellement dans Supabase Dashboard

**Actions**:
1. Ouvrir https://app.supabase.com/project/jcegkuyagbthpbklyawz/sql/new
2. Copier contenu de `max_backend/migrations/supabase_create_lead_activities.sql`
3. Coller et cliquer **Run**
4. Vérifier création tables: `lead_activities`, `max_alerts`, vue `active_alerts`

**Test validation**:
```powershell
cd max_backend
.\test-alerts-mvp.ps1
```

---

## 📋 TODO - Step 3: Intégration Code Existant

### 3.1 Intégrer logActivity() dans routes WhatsApp

**Fichiers à modifier**:

#### A. routes/whatsapp-messages.js (messages sortants)
**Ligne ~280** - Après envoi message réussi:

```javascript
import { logActivity } from '../lib/activityLogger.js';

// Dans route POST /messages/:id/send
// Après: const result = await sendWhatsAppMessage(...)

if (result.success) {
  // Logger activité sortante
  try {
    await logActivity({
      leadId,
      channel: 'whatsapp',
      direction: 'out',
      status: 'sent',
      messageSnippet: finalMessageText.substring(0, 100),
      meta: {
        messageId: req.params.id,
        messageName: message.name,
        twilioSid: result.sid
      }
    });
  } catch (logError) {
    console.error('[WhatsApp] Erreur log activité:', logError);
    // Ne pas bloquer l'envoi si logging échoue
  }
}
```

#### B. routes/whatsapp-webhook.js (messages entrants)
**Ligne ~50** - Après réception message:

```javascript
import { logActivity } from '../lib/activityLogger.js';

// Dans route POST /whatsapp/webhook
// Après extraction du message entrant

try {
  await logActivity({
    leadId: lead.id, // Lead identifié via phoneNumber
    channel: 'whatsapp',
    direction: 'in',
    status: 'replied',
    messageSnippet: incomingBody.substring(0, 100),
    meta: {
      from: incomingFrom,
      twilioSid: incomingMessageSid
    }
  });
} catch (logError) {
  console.error('[WhatsApp] Erreur log activité:', logError);
}
```

#### C. routes/chat.js (envoi via M.A.X.)
**Ligne ~800** - Après tool call send_whatsapp_greenapi:

```javascript
// Après envoi WhatsApp via M.A.X.
if (toolResult.success) {
  await logActivity({
    leadId: toolParams.leadId || extractedLeadId,
    channel: 'whatsapp',
    direction: 'out',
    status: 'sent',
    messageSnippet: toolParams.message.substring(0, 100),
    meta: {
      source: 'max_ai',
      toolCall: 'send_whatsapp_greenapi'
    }
  });
}
```

---

### 3.2 Cron Job - Génération Alertes Quotidienne

**Créer**: `max_backend/tasks/generate-daily-alerts.js`

```javascript
import { espoFetch } from '../lib/espoClient.js';
import { generateAlertsForLead } from '../lib/alertGenerator.js';

async function generateDailyAlerts() {
  console.log('[DailyAlerts] Début génération alertes...');

  // Récupérer tous les leads actifs
  const leads = await espoFetch('/Lead', {
    params: {
      select: 'id,createdAt',
      where: { status: ['New', 'Assigned', 'In Process'] }
    }
  });

  let processed = 0;
  for (const lead of leads.list) {
    try {
      await generateAlertsForLead(lead.id);
      processed++;
    } catch (error) {
      console.error(`[DailyAlerts] Erreur lead ${lead.id}:`, error);
    }
  }

  console.log(`[DailyAlerts] Terminé: ${processed}/${leads.total} leads traités`);
}

// Exécution
generateDailyAlerts().catch(console.error);
```

**Scheduler** (node-cron):
```javascript
// Dans server.js
import cron from 'node-cron';
import { exec } from 'child_process';

// Tous les jours à 8h00
cron.schedule('0 8 * * *', () => {
  console.log('[Cron] Lancement génération alertes quotidiennes...');
  exec('node tasks/generate-daily-alerts.js', (error, stdout) => {
    if (error) console.error('[Cron] Erreur:', error);
    else console.log('[Cron] OK:', stdout);
  });
});
```

---

### 3.3 Widget Dashboard Frontend

**Créer**: `max_frontend/src/components/dashboard/AlertsWidget.tsx`

```typescript
import { useEffect, useState } from 'react';

interface Alert {
  id: string;
  type: 'NoContact7d' | 'NoReply3d';
  severity: 'low' | 'med' | 'high';
  message: string;
  lead_name: string;
  lead_id: string;
  suggested_action: {
    action: string;
    channel: string;
    template: string;
  };
  created_at: string;
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    by_severity: { high: 0, med: 0, low: 0 }
  });

  useEffect(() => {
    fetch('/api/alerts/active', {
      headers: { 'X-Tenant': 'macrea' }
    })
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts);
        setStats(data.stats);
      });
  }, []);

  const handleResolve = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'X-Tenant': 'macrea', 'X-Role': 'admin' }
    });

    // Rafraîchir
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  return (
    <div className="alerts-widget">
      <h3>
        Alertes Actives: {stats.total}
        {stats.by_severity.high > 0 && (
          <span className="badge-urgent">{stats.by_severity.high} urgentes</span>
        )}
      </h3>

      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={alert.id} className={`alert severity-${alert.severity}`}>
            <div className="alert-header">
              <span className="alert-type">{alert.type}</span>
              <span className="alert-lead">{alert.lead_name}</span>
            </div>

            <p className="alert-message">{alert.message}</p>

            <div className="alert-actions">
              <button onClick={() => {
                // Action suggérée
                if (alert.suggested_action.channel === 'whatsapp') {
                  window.location.href = `/leads/${alert.lead_id}/whatsapp`;
                }
              }}>
                {alert.suggested_action.action}
              </button>

              <button onClick={() => handleResolve(alert.id)}>
                Marquer traité
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Step 4: Alertes Additionnelles (Optionnel)

### 4.1 PreferredChannel
**Règle**: Taux de réponse >30% sur un canal
**Message**: "Ce lead répond mieux sur WhatsApp (80%) ! Continue comme ça."

### 4.2 HotLead24h
**Règle**: Réponse <24h + intention détectée
**Message**: "Lead chaud ! Réponse récente avec intention. Répondre maintenant."

### 4.3 NoFollowup7d
**Règle**: Dernier contact ≥7j (in ou out)
**Message**: "Pas de contact depuis 8 jours. Relance contextualisée ou appel direct ?"

### 4.4 StaleLead30d
**Règle**: Aucune activité ≥30j
**Message**: "Lead inactif depuis 32 jours. Dernier essai avant archivage ?"

---

## 🎯 KPIs de Succès

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| Taux relance | +40% | Comparer avant/après alertes |
| Temps réponse leads chauds | <2h | Moyenne HotLead24h → contact |
| Conversion canal préféré | +25% | WhatsApp vs Email sur PreferredChannel |
| Leads perdus/oubliés | -80% | NoContact7d résolues |

---

## ✅ Checklist Finale

- [ ] Migration Supabase appliquée
- [ ] Test script PowerShell réussi
- [ ] logActivity() intégré dans WhatsApp (out + in)
- [ ] logActivity() intégré dans chat.js (M.A.X.)
- [ ] Cron job quotidien configuré
- [ ] Widget frontend déployé
- [ ] Tests sur vrais leads EspoCRM
- [ ] Dashboard analytics (KPIs)
- [ ] Documentation utilisateur

---

**Une fois ces étapes complétées, M.A.X. sera un système nerveux vivant du pipeline commercial! 🔔**
