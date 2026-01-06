# 🔔 Système d'Alertes Vivantes M.A.X.

**Objectif**: Transformer M.A.X. en système nerveux du pipeline commercial
**Philosophie**: Observer, apprendre, alerter, proposer
**Date**: 2025-12-27

---

## 🎯 Vision

M.A.X. n'est pas un CRM passif qui attend qu'on lui demande des infos.
**M.A.X. observe en continu** et signale proactivement ce qui nécessite attention.

### Ce que M.A.X. détecte automatiquement

- ⏰ Leads en attente de relance
- 📱 Canal de réponse préféré de chaque lead
- 🔇 Silence suspect après message
- 🔥 Leads chauds à prioriser
- 💀 Leads froids à réactiver ou archiver

---

## 📊 Types d'Alertes (MVP)

### A. **NoContact7d** - Jamais contacté
**Règle**: Lead créé depuis ≥7 jours, aucun message sortant
**Sévérité**: Moyenne
**Message**: "Lead jamais contacté depuis {X} jours"
**Action suggérée**: `"Envoyer premier message WhatsApp"` ou `"Email de prise de contact"`

### B. **NoReply3d** - Silence après message
**Règle**: Message envoyé + pas de réponse depuis ≥3 jours
**Sévérité**: Moyenne
**Message**: "Message envoyé il y a {X} jours sans réponse"
**Action suggérée**: `"Relance douce sur WhatsApp"` ou `"Changer d'angle (appel)"`

### C. **NoFollowup7d** - Lead inactif
**Règle**: Dernier contact (in/out) ≥7 jours
**Sévérité**: Moyenne
**Message**: "Pas de contact depuis {X} jours"
**Action suggérée**: `"Relance contextualisée"` ou `"Appeler directement"`

### D. **PreferredChannel** - Canal préféré détecté
**Règle**: Taux de réponse significatif sur un canal
**Sévérité**: Info
**Message**: "Ce lead répond mieux sur {canal} ({taux}%)"
**Action suggérée**: `"Privilégier WhatsApp"` ou `"Continuer par email"`

### E. **HotLead24h** - Lead chaud
**Règle**: Réponse entrante <24h + intention détectée
**Sévérité**: Urgente
**Message**: "Lead chaud ! Réponse récente avec intention"
**Action suggérée**: `"Répondre maintenant"` ou `"Programmer appel J+1"`

### F. **StaleLead30d** - Lead froid
**Règle**: Aucune activité ≥30 jours
**Sévérité**: Basse
**Message**: "Lead inactif depuis {X} jours"
**Action suggérée**: `"Dernier essai (offre spéciale)"` ou `"Archiver"`

---

## 🗄️ Schéma Base de Données

### Table: `lead_activities`
Track TOUTES les interactions avec les leads.

```sql
CREATE TABLE lead_activities (
  id VARCHAR(17) PRIMARY KEY,
  lead_id VARCHAR(17) NOT NULL,
  channel ENUM('whatsapp', 'email', 'call', 'manual') NOT NULL,
  direction ENUM('in', 'out') NOT NULL,
  status ENUM('sent', 'delivered', 'replied', 'no_answer', 'read') DEFAULT 'sent',
  message_preview TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_lead_timestamp (lead_id, timestamp),
  INDEX idx_channel (channel),
  INDEX idx_status (status)
);
```

### Table: `max_alerts`
Alertes générées automatiquement par M.A.X.

```sql
CREATE TABLE max_alerts (
  id VARCHAR(17) PRIMARY KEY,
  lead_id VARCHAR(17) NOT NULL,
  type ENUM('NoContact7d', 'NoReply3d', 'NoFollowup7d', 'PreferredChannel', 'HotLead24h', 'StaleLead30d') NOT NULL,
  severity ENUM('info', 'medium', 'high', 'urgent') NOT NULL,
  message TEXT NOT NULL,
  suggested_action VARCHAR(255),
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,

  INDEX idx_lead (lead_id),
  INDEX idx_type (type),
  INDEX idx_unresolved (resolved_at),
  INDEX idx_severity (severity)
);
```

---

## 🧮 Calcul du Canal Préféré

### Algorithme Simple

Pour chaque lead, sur les **30 derniers jours**:

```javascript
function calculatePreferredChannel(leadId) {
  // Récupérer activités du lead (30 derniers jours)
  const activities = getLeadActivities(leadId, 30);

  // Calculer taux de réponse par canal
  const channels = ['whatsapp', 'email', 'call'];
  const stats = {};

  channels.forEach(channel => {
    const sent = activities.filter(a => a.channel === channel && a.direction === 'out').length;
    const replied = activities.filter(a => a.channel === channel && a.direction === 'in').length;

    stats[channel] = {
      sent,
      replied,
      rate: sent > 0 ? (replied / sent) * 100 : 0
    };
  });

  // Canal préféré = meilleur taux (minimum 2 tentatives)
  const validChannels = Object.entries(stats)
    .filter(([ch, s]) => s.sent >= 2)
    .sort((a, b) => b[1].rate - a[1].rate);

  if (validChannels.length === 0) return 'inconnu';

  const [preferredChannel, { rate }] = validChannels[0];

  // Créer alerte si différence significative (>30%)
  if (validChannels.length > 1) {
    const [secondChannel, { rate: secondRate }] = validChannels[1];
    if (rate - secondRate > 30) {
      createAlert({
        leadId,
        type: 'PreferredChannel',
        severity: 'info',
        message: `Ce lead répond mieux sur ${preferredChannel} (${rate.toFixed(0)}% vs ${secondRate.toFixed(0)}%)`,
        suggestedAction: `Privilégier ${preferredChannel}`,
        metadata: { preferredChannel, rate }
      });
    }
  }

  return preferredChannel;
}
```

---

## ⚙️ Génération Automatique des Alertes

### Cron Job (ou webhook après chaque action)

```javascript
// Exécuté quotidiennement OU après chaque interaction

async function generateAlerts() {
  const leads = await getAllActiveLeads();

  for (const lead of leads) {
    const activities = await getLeadActivities(lead.id, 30);
    const lastActivity = activities[0]; // Plus récent

    // 1. NoContact7d
    if (!lastActivity && daysSinceCreated(lead) >= 7) {
      await createAlert({
        leadId: lead.id,
        type: 'NoContact7d',
        severity: 'medium',
        message: `Lead ${lead.name} jamais contacté depuis ${daysSinceCreated(lead)} jours`,
        suggestedAction: 'Envoyer premier message WhatsApp'
      });
    }

    // 2. NoReply3d
    const lastOutbound = activities.find(a => a.direction === 'out');
    if (lastOutbound && daysSince(lastOutbound.timestamp) >= 3) {
      const hasReply = activities.some(a =>
        a.direction === 'in' && a.timestamp > lastOutbound.timestamp
      );
      if (!hasReply) {
        await createAlert({
          leadId: lead.id,
          type: 'NoReply3d',
          severity: 'medium',
          message: `Message envoyé il y a ${daysSince(lastOutbound.timestamp)} jours sans réponse`,
          suggestedAction: 'Relance douce sur WhatsApp'
        });
      }
    }

    // 3. NoFollowup7d
    if (lastActivity && daysSince(lastActivity.timestamp) >= 7) {
      await createAlert({
        leadId: lead.id,
        type: 'NoFollowup7d',
        severity: 'medium',
        message: `Pas de contact depuis ${daysSince(lastActivity.timestamp)} jours`,
        suggestedAction: 'Relance contextualisée'
      });
    }

    // 4. HotLead24h
    const recentInbound = activities.find(a =>
      a.direction === 'in' && daysSince(a.timestamp) < 1
    );
    if (recentInbound && hasIntention(recentInbound.message_preview)) {
      await createAlert({
        leadId: lead.id,
        type: 'HotLead24h',
        severity: 'urgent',
        message: 'Lead chaud ! Réponse récente avec intention',
        suggestedAction: 'Répondre maintenant'
      });
    }

    // 5. StaleLead30d
    if (!lastActivity || daysSince(lastActivity.timestamp) >= 30) {
      await createAlert({
        leadId: lead.id,
        type: 'StaleLead30d',
        severity: 'low',
        message: `Lead inactif depuis ${daysSince(lastActivity.timestamp)} jours`,
        suggestedAction: 'Dernier essai (offre spéciale) ou Archiver'
      });
    }

    // 6. PreferredChannel (calculé ci-dessus)
    calculatePreferredChannel(lead.id);
  }
}
```

---

## 🎨 Affichage Dashboard

### Bandeau d'Alertes

```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Alertes aujourd'hui: 12 (4 urgentes)                     │
│ [À relancer: 5] [Leads chauds: 4] [Canal préféré: 3]       │
└─────────────────────────────────────────────────────────────┘
```

### Widgets par Type

```
╔═══════════════════════╗  ╔═══════════════════════╗
║ ⏰ À Relancer (5)     ║  ║ 🔥 Leads Chauds (4)   ║
║                       ║  ║                       ║
║ • Jean Dupont         ║  ║ • Sophie Martin       ║
║   7j sans contact     ║  ║   Réponse + intention ║
║   → WhatsApp          ║  ║   → Répondre NOW      ║
║                       ║  ║                       ║
║ • Restaurant Bella    ║  ║ • TechCorp SAS        ║
║   3j sans réponse     ║  ║   Demande prix reçue  ║
║   → Relance douce     ║  ║   → Envoyer devis     ║
╚═══════════════════════╝  ╚═══════════════════════╝
```

### Liste Actionnable

```json
{
  "alerts": [
    {
      "id": "alert_001",
      "leadId": "691b2816e43817b92",
      "leadName": "Sophie Martin",
      "type": "HotLead24h",
      "severity": "urgent",
      "message": "Lead chaud ! Réponse récente avec intention",
      "suggestedAction": "Répondre maintenant",
      "createdAt": "2025-12-27T14:32:00Z",
      "cta": [
        { "label": "Répondre WhatsApp", "action": "openWhatsApp", "params": { "leadId": "..." } },
        { "label": "Préparer message", "action": "draftMessage", "params": { "leadId": "..." } },
        { "label": "Marquer comme traité", "action": "resolveAlert", "params": { "alertId": "..." } }
      ]
    }
  ]
}
```

---

## 🚀 Implémentation Progressive

### Phase 1: Fondations (Semaine 1)
- ✅ Créer tables `lead_activities` et `max_alerts`
- ✅ API pour logger les activités (`POST /api/activities/log`)
- ✅ Script de génération d'alertes manuel (`node generateAlerts.js`)

### Phase 2: Automatisation (Semaine 2)
- ✅ Cron job quotidien pour générer alertes
- ✅ Webhook après chaque message envoyé/reçu
- ✅ API dashboard (`GET /api/alerts`)

### Phase 3: Dashboard (Semaine 3)
- ✅ Widget "Alertes du jour" dans tour de contrôle
- ✅ Liste triée par sévérité
- ✅ Boutons CTA actionnables

### Phase 4: Intelligence (Semaine 4)
- ✅ Détection d'intention dans messages (IA)
- ✅ Apprentissage canal préféré
- ✅ Recommandations contextualisées

---

## 💡 Personnalité M.A.X. Préservée

### Messages Vivants

❌ **Rigide**: "Alert NoReply3d triggered for lead 691b28"
✅ **Vivant**: "Sophie n'a pas répondu depuis 3 jours. Peut-être essayer WhatsApp ?"

❌ **Froid**: "Channel preference: whatsapp (85%)"
✅ **Commercial**: "Ce lead répond super bien sur WhatsApp (85%) ! Continue comme ça."

❌ **Technique**: "StaleLead30d: inactivity threshold exceeded"
✅ **Humain**: "Ça fait 32 jours sans nouvelles... Dernier essai avant d'archiver ?"

### Recommandations Contextualisées

**Lead "Restaurant Bella"** (préfère WhatsApp, répond rarement email):
```
🔔 Alerte: Pas de réponse depuis 3 jours

💡 Stratégie M.A.X.:
Ce lead répond bien sur WhatsApp (80% vs 20% email).
→ Relance douce WhatsApp avec photo menu/plat
→ Si silence → appel direct à 10h (hors service)

[Préparer message WhatsApp] [Programmer appel]
```

---

## 🎯 KPI de Succès

| Métrique | Objectif |
|----------|----------|
| **Taux de relance** | +40% (alertes auto vs manuel) |
| **Temps de réponse leads chauds** | <2h (vs 24h actuellement) |
| **Conversion canal préféré** | +25% (utiliser bon canal) |
| **Leads perdus/oubliés** | -80% (alertes NoContact/Stale) |

---

## 🔧 API Routes (MVP)

```javascript
// Logger une activité
POST /api/activities/log
{
  "leadId": "691b2816e43817b92",
  "channel": "whatsapp",
  "direction": "out",
  "status": "sent",
  "message_preview": "Bonjour Sophie, avez-vous reçu..."
}

// Récupérer alertes actives
GET /api/alerts
GET /api/alerts?severity=urgent
GET /api/alerts?type=HotLead24h

// Résoudre une alerte
POST /api/alerts/:alertId/resolve

// Dashboard stats
GET /api/alerts/stats
→ { total: 12, urgent: 4, byType: {...} }

// Générer alertes manuellement (admin)
POST /api/alerts/generate
```

---

## ✅ Résultat Final

M.A.X. devient un **système nerveux vivant**:

✅ Observe en continu
✅ Apprend les préférences (canal, timing)
✅ Alerte proactivement
✅ Propose des actions prêtes
✅ Priorise intelligemment
✅ Garde un langage humain et commercial

**Le pipeline ne dort plus jamais.**
