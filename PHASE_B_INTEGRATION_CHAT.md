# ✅ PHASE B - Intégration logActivity() Chat M.A.X.

**Date**: 2025-12-27
**Scope**: Route chat.js - Tool `send_whatsapp_greenapi`
**Status**: Implémenté - Prêt pour test

---

## 📝 FICHIER MODIFIÉ

### [routes/chat.js](max_backend/routes/chat.js)

**Aucun import ajouté** - `logMaxActivity` déjà importé ligne 39 (alias pour `logActivity`)

**Logging après envoi réussi** (lignes 3018-3042):
```javascript
console.log(`[send_whatsapp_greenapi] ✅ Message envoyé:`, result);

// Logger l'activité sortante (best effort - ne bloque jamais le chat)
const leadId = args.leadId; // Optionnel - peut être passé par M.A.X.
if (leadId) {
  try {
    await logMaxActivity({
      leadId,
      channel: 'whatsapp',
      direction: 'out',
      status: 'sent',
      messageSnippet: message.substring(0, 100),
      meta: {
        provider: 'green-api',
        instanceId,
        messageId: result.idMessage,
        phoneNumber: cleanNumber
      },
      tenantId: tenant || 'macrea'
    });
    console.log(`[send_whatsapp_greenapi] 📝 Activité loggée pour lead ${leadId}`);
  } catch (logError) {
    console.warn(`[send_whatsapp_greenapi] ⚠️  Erreur log activité (non bloquant):`, logError.message);
  }
} else {
  console.warn(`[send_whatsapp_greenapi] ⚠️  Pas de leadId - activité non loggée`);
}
```

**Logging après échec** (lignes 3056-3075):
```javascript
} catch (error) {
  console.error('[send_whatsapp_greenapi] ❌ Erreur:', error.message);

  // Logger l'échec (optionnel - best effort)
  const leadId = args.leadId;
  if (leadId) {
    try {
      await logMaxActivity({
        leadId,
        channel: 'whatsapp',
        direction: 'out',
        status: 'failed',
        messageSnippet: message ? message.substring(0, 100) : 'Erreur envoi',
        meta: {
          provider: 'green-api',
          error: error.message
        },
        tenantId: tenant || 'macrea'
      });
    } catch (logError) {
      // Silently fail - logging d'échec est purement informatif
    }
  }
```

**Contraintes respectées**:
- ✅ Logging uniquement si `args.leadId` présent (pas de dummy)
- ✅ Warning clair si pas de leadId: "Pas de leadId - activité non loggée"
- ✅ Snippet max 100 caractères
- ✅ Try/catch best effort (ne bloque jamais le chat)
- ✅ Logging du success ET du failed (optionnel)
- ✅ Même format tenant que Phase A

---

## 🎯 OÙ ÇA LOGGUE EXACTEMENT

### Tool: `send_whatsapp_greenapi`

**Fichier**: `routes/chat.js`
**Case statement**: Ligne 2984

**Moments de logging**:

1. **Succès** (lignes 3018-3042):
   - **Condition**: `result` contient `idMessage` (envoi Green-API réussi)
   - **Status**: `sent`
   - **Meta**: `provider`, `instanceId`, `messageId`, `phoneNumber`

2. **Échec** (lignes 3056-3075):
   - **Condition**: Exception catchée
   - **Status**: `failed`
   - **Meta**: `provider`, `error`

**Prérequis pour logging**:
- `args.leadId` doit être passé par M.A.X. dans les arguments du tool call
- Si `leadId` absent → warning + pas de logging (scope strict)

---

## 🧪 TEST PHASE B

**Script**: [test-alerts-phase-b.ps1](max_backend/test-alerts-phase-b.ps1)

**Scénarios testés**:
1. **Configuration** → Lead ID + phone + instance
2. **POST /api/activities/log** (simulation M.A.X.) → Logger message via Green-API
3. **GET /api/alerts/active** → Vérifier alertes générées

**Commande**:
```powershell
cd max_backend
.\test-alerts-phase-b.ps1
```

**Note**: Modifiez `$LEAD_ID` (ligne 18) et `$LEAD_PHONE` (ligne 19) avec vos vraies valeurs

**Résultat attendu**:
```
[2/3] STEP: Simuler envoi WhatsApp via M.A.X. (avec leadId)
OK Activite OUT loggee (simule M.A.X.):
   ID: c12d3e4f-...
   Lead: 694d0bed15df5b9e1
   Channel: whatsapp (out)
   Provider: green-api

[3/3] STEP: Verifier alertes actives
OK Alertes actives recuperees
```

**Vérification Supabase**:
```sql
SELECT * FROM lead_activities
WHERE lead_id = '694d0bed15df5b9e1'
AND meta->>'provider' = 'green-api'
ORDER BY created_at DESC;

-- Devrait montrer les activités loggées via M.A.X. Chat
```

---

## 📊 DIFF RÉSUMÉ

| Fichier | Lignes modifiées | Changements |
|---------|------------------|-------------|
| `routes/chat.js` | +56 | Logging success (25 lignes) + failed (19 lignes) |
| **TOTAL** | **+56 lignes** | **1 fichier modifié** |

---

## ✅ VALIDATION CONTRAINTES

| Contrainte | Status | Détails |
|------------|--------|---------|
| Après envoi réussi | ✅ | Logging après `result.idMessage` confirmé |
| Échec non bloquant | ✅ | Try/catch isolé + silently fail sur erreur |
| Snippet ≤ 100 char | ✅ | `.substring(0, 100)` partout |
| leadId réel ou rien | ✅ | `if (leadId)` sinon warn + skip |
| Warning clair | ✅ | "Pas de leadId - activité non loggée" |
| Best effort | ✅ | Jamais throw, console.warn uniquement |
| Format tenant | ✅ | `tenantId: tenant || 'macrea'` |

---

## 🔍 LOGS ATTENDUS

**Succès** (chat.js):
```
[send_whatsapp_greenapi] Envoi WhatsApp direct via Green-API à +33612345678
[send_whatsapp_greenapi] Numéro nettoyé: 33612345678
[send_whatsapp_greenapi] ✅ Message envoyé: { idMessage: '...' }
[send_whatsapp_greenapi] 📝 Activité loggée pour lead 694d0bed15df5b9e1
```

**Pas de leadId** (chat.js):
```
[send_whatsapp_greenapi] ✅ Message envoyé: { idMessage: '...' }
[send_whatsapp_greenapi] ⚠️  Pas de leadId - activité non loggée
```

**Échec** (chat.js):
```
[send_whatsapp_greenapi] ❌ Erreur: Instance non trouvée
```
(Pas de log activité si pas de leadId, silently fail sinon)

---

## 🎯 SCOPE PHASE B

**Ce qui est loggé**:
- ✅ `send_whatsapp_greenapi` (tool M.A.X. direct Green-API)
- ✅ Success ET failed (avec leadId uniquement)

**Ce qui N'est PAS loggé**:
- ❌ `send_whatsapp_message` (utilise n8n, pas de logging direct)
- ❌ `send_whatsapp_template` (utilise sendWhatsAppMessage déjà loggé en Phase A)

**Raison**: Phase A couvre déjà les routes WhatsApp classiques. Phase B ajoute uniquement le tool direct M.A.X. Chat.

---

## 📋 PHASES COMPLÈTES

| Phase | Scope | Status |
|-------|-------|--------|
| **A** | WhatsApp sortant + webhook entrant | ✅ Validé |
| **B** | Chat M.A.X. (send_whatsapp_greenapi) | ✅ Implémenté |
| **C** | Widget AlertsWidget.tsx (frontend) | ⏳ Suivant |

---

**Phase B complète et prête pour validation** ✅

**Prochaine étape: Phase C - Widget Dashboard Frontend**
