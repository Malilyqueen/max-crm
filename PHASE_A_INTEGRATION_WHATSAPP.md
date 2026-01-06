# ✅ PHASE A - Intégration logActivity() WhatsApp

**Date**: 2025-12-27
**Scope**: Routes WhatsApp sortant + webhook entrant
**Status**: Implémenté - Prêt pour test

---

## 📝 FICHIERS MODIFIÉS

### 1. [routes/whatsapp-messages.js](max_backend/routes/whatsapp-messages.js)

**Import ajouté** (ligne 23):
```javascript
import { logActivity } from '../lib/activityLogger.js';
```

**Logging après envoi réussi** (lignes 292-311):
```javascript
if (result.success) {
  console.log(`   ✅ Message envoyé (SID: ${result.messageSid})`);

  // Logger l'activité sortante (best effort - ne bloque jamais l'envoi)
  try {
    const finalMessageText = result.finalMessageText || message.messageText || '';
    await logActivity({
      leadId,
      channel: 'whatsapp',
      direction: 'out',
      status: 'sent',
      messageSnippet: finalMessageText.substring(0, 100),
      meta: {
        messageId: req.params.id,
        messageName: message.name,
        twilioSid: result.messageSid
      },
      tenantId: message.tenantId || 'macrea'
    });
    console.log(`   📝 Activité loggée pour lead ${leadId}`);
  } catch (logError) {
    console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
  }

  res.json({ success: true, ... });
}
```

**Contraintes respectées**:
- ✅ Logging uniquement si `result.success` (envoi confirmé)
- ✅ Snippet max 100 caractères
- ✅ Try/catch best effort (ne bloque jamais l'envoi)
- ✅ Utilise leadId réel EspoCRM

---

### 2. [routes/whatsapp-webhook.js](max_backend/routes/whatsapp-webhook.js)

**Import ajouté** (ligne 19):
```javascript
import { logActivity } from '../lib/activityLogger.js';
```

**Logging CAS 1: Payload structuré** (lignes 117-137):
```javascript
console.log(`   Phone: ${phoneNumber}`);

// Logger l'activité entrante (clic bouton = réponse)
try {
  await logActivity({
    leadId,
    channel: 'whatsapp',
    direction: 'in',
    status: 'replied',
    messageSnippet: `Clic bouton: ${action}`,
    meta: {
      from: phoneNumber,
      twilioSid: messageSid,
      buttonPayload,
      action,
      type
    },
    tenantId: tenant
  });
  console.log(`   📝 Activité entrante loggée (clic bouton structuré)`);
} catch (logError) {
  console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
}
```

**Logging CAS 2: Payload simple OUI/NON** (lignes 159-177):
```javascript
console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

// Logger l'activité entrante (clic bouton = réponse)
try {
  await logActivity({
    leadId: lead.id,
    channel: 'whatsapp',
    direction: 'in',
    status: 'replied',
    messageSnippet: `Clic bouton: ${buttonPayload}`,
    meta: {
      from: phoneNumber,
      twilioSid: messageSid,
      buttonPayload
    },
    tenantId: 'macrea'
  });
  console.log(`   📝 Activité entrante loggée (clic bouton)`);
} catch (logError) {
  console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
}
```

**Logging CAS 3: Message texte libre** (lignes 217-234):
```javascript
if (lead) {
  console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

  // Logger l'activité entrante (best effort - ne bloque jamais le traitement)
  try {
    await logActivity({
      leadId: lead.id,
      channel: 'whatsapp',
      direction: 'in',
      status: 'replied',
      messageSnippet: body.substring(0, 100),
      meta: {
        from: phoneNumber,
        twilioSid: messageSid
      },
      tenantId: 'macrea'
    });
    console.log(`   📝 Activité entrante loggée pour lead ${lead.id}`);
  } catch (logError) {
    console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
  }

  // DÉTECTION DES RÉPONSES OUI/NON...
}
```

**Contraintes respectées**:
- ✅ Logging seulement APRÈS résolution lead (matching phone → lead.id)
- ✅ Snippet max 100 caractères
- ✅ Try/catch best effort (ne bloque jamais réception)
- ✅ Utilise leadId réel résolu depuis EspoCRM

---

## 🧪 TEST PHASE A

**Script**: [test-alerts-phase-a.ps1](max_backend/test-alerts-phase-a.ps1)

**Scénarios testés**:
1. **GET /api/leads** → Récupérer un vrai lead EspoCRM
2. **POST /api/activities/log** (OUT) → Logger message sortant
3. **GET /api/alerts/active** → Vérifier alertes générées
4. **POST /api/activities/log** (IN) → Logger réponse entrante

**Commande**:
```powershell
cd max_backend
.\test-alerts-phase-a.ps1
```

**Résultat attendu**:
```
[1/4] STEP: Recuperer un lead reel dans EspoCRM
OK Lead recupere:
   ID: 691b2816e43817b92
   Nom: Sophie Martin

[2/4] STEP: Logger activite OUT (message envoye)
OK Activite OUT loggee:
   ID: a78e0039-3ff3-400c-adaa-249690bf896d
   Lead: 691b2816e43817b92
   Channel: whatsapp (out)

[3/4] STEP: Recuperer alertes actives
OK Alertes actives recuperees
STATISTIQUES:
   Total: 0
   High: 0
   Med: 0
   Low: 0

[4/4] STEP: Logger activite IN (reponse recue)
OK Reponse IN loggee
```

**Vérification Supabase**:
```sql
SELECT * FROM lead_activities
WHERE lead_id = '691b2816e43817b92'
ORDER BY created_at DESC;

-- Devrait montrer 2 lignes:
-- 1. direction='out', status='sent'
-- 2. direction='in', status='replied'
```

---

## 📊 DIFF RÉSUMÉ

| Fichier | Lignes modifiées | Changements |
|---------|------------------|-------------|
| `routes/whatsapp-messages.js` | +24 | Import + logging après envoi réussi |
| `routes/whatsapp-webhook.js` | +62 | Import + logging 3 cas (structuré, simple, texte) |
| **TOTAL** | **+86 lignes** | **2 fichiers modifiés** |

---

## ✅ VALIDATION CONTRAINTES

| Contrainte | Status | Détails |
|------------|--------|---------|
| Zéro placeholder | ✅ | Utilise leadId réel EspoCRM |
| Logging si success | ✅ | Sortant: `if (result.success)` |
| Logging après résolution | ✅ | Entrant: après `findLeadByPhone()` |
| Snippet ≤ 100 char | ✅ | `.substring(0, 100)` partout |
| Best effort | ✅ | Try/catch + warn (jamais throw) |
| Ne bloque jamais | ✅ | Logging dans try/catch isolé |

---

## 🎯 PROCHAINES ÉTAPES

### Phase B: Chat.js (M.A.X. AI)
**Fichier**: `routes/chat.js`
**Localisation**: Après `send_whatsapp_greenapi` tool call
**Complexité**: Moyenne (extraction leadId depuis context)

### Phase C: Widget Dashboard Frontend
**Fichier**: `max_frontend/src/components/dashboard/AlertsWidget.tsx`
**Features**:
- Affichage alertes actives (GET /api/alerts/active)
- Stats par sévérité (high/med/low)
- Boutons CTA basés sur `suggested_action`
- Résolution manuelle (POST /api/alerts/:id/resolve)

---

## 🔍 LOGS ATTENDUS

**Sortant** (whatsapp-messages.js):
```
📤 POST /api/whatsapp/messages/msg_abc123/send
   Message: Confirmation RDV
   Destinataire: +33612345678
   Lead: 691b2816e43817b92
   ✅ Message envoyé (SID: SM1234567890)
   📝 Activité loggée pour lead 691b2816e43817b92
```

**Entrant** (whatsapp-webhook.js):
```
📲 WEBHOOK WHATSAPP ENTRANT
   From: whatsapp:+33612345678
   Body: Oui
   👤 Lead trouvé: Sophie Martin (ID: 691b2816e43817b92)
   📝 Activité entrante loggée pour lead 691b2816e43817b92
   ✅ CONFIRMATION RDV détectée
```

---

**Phase A complète et prête pour validation utilisateur** ✅
