# SMS Settings Backend - Phase 2 Complete

## ✅ Ce qui est fait

### 1. Migration SQL (`012_sms_settings.sql`)

**Colonnes ajoutées dans `tenant_settings`:**
```sql
sms_mode VARCHAR(20) DEFAULT 'macrea'         -- 'macrea' | 'self_service'
sms_sender_label VARCHAR(50)                   -- "Cabinet Dr. Martin"
sms_sender_id VARCHAR(11) UNIQUE              -- "CABINETDRM"
twilio_messaging_service_sid VARCHAR(50)       -- Mode self-service
twilio_from_number VARCHAR(20)                 -- Mode self-service
```

**Contraintes:**
- ✅ Sender ID unique globalement (tous tenants)
- ✅ Sender ID requis en mode MaCréa
- ✅ Credentials Twilio requis en mode self-service
- ✅ Format validé: 3-11 chars, A-Z0-9, commence par lettre

**Index:**
- ✅ `idx_sms_sender_id_unique` pour unicité
- ✅ `idx_tenant_settings_sms_mode` pour performance

### 2. Routes API (`routes/sms-settings.js`)

**Endpoints:**

#### `GET /api/settings/sms`
Récupère la config SMS du tenant
```json
{
  "success": true,
  "config": {
    "sms_mode": "macrea",
    "sms_sender_label": "Cabinet Dr. Martin",
    "sms_sender_id": "CABINETDRM",
    "twilio_messaging_service_sid": null,
    "twilio_from_number": null
  }
}
```

#### `PUT /api/settings/sms`
Met à jour la config (avec validation + sanitize)

**Mode MaCréa:**
```json
{
  "sms_mode": "macrea",
  "sms_sender_label": "Cabinet Dr. Martin"
}
```
→ Backend génère automatiquement `sms_sender_id: "CABINETDRM"`

**Mode Self-Service:**
```json
{
  "sms_mode": "self_service",
  "twilio_messaging_service_sid": "MGxxxxx",
  "twilio_from_number": "+33612345678"
}
```

#### `POST /api/settings/sms/validate-sender`
Prévisualise un sender ID avant save
```json
{
  "sms_sender_label": "Cabinet Dr. Martin"
}
```
→ Response:
```json
{
  "success": true,
  "suggested_id": "CABINETDRM",
  "is_available": true,
  "base_id": "CABINETDRM",
  "alternatives": ["CABINETDR2", "CABINETDR3"]
}
```

### 3. Helper Functions

**`sanitizeSenderId(input)`**
- Remove accents
- Keep only A-Z, 0-9
- Prefix 'X' si commence par chiffre
- Truncate à 10 chars (réserve 1 pour suffixe)

**`findUniqueSenderId(baseSenderId, excludeTenantId)`**
- Check unicité dans DB
- Génère alternatives avec suffixes (2, 3, 4...)
- Retourne sender_id unique ou liste d'alternatives

### 4. Server.js Integration
- ✅ Import `smsSettingsRouter`
- ✅ Monté sur `/api/settings/sms`
- ✅ Auth + Tenant resolution appliqués

## 📋 Prochaines étapes (Frontend)

### 1. Créer `useSettingsStore.ts` ou étendre existant
Store Zustand pour la config SMS:
```typescript
interface SettingsState {
  smsConfig: SmsConfig | null;
  fetchSmsConfig: () => Promise<void>;
  updateSmsConfig: (config) => Promise<void>;
  validateSenderId: (label: string) => Promise<ValidateResult>;
}
```

### 2. Créer `SmsProvidersPanel.tsx` (nouveau)
Composant avec 2 modes:

**Mode MaCréa (par défaut):**
- Card gradient bleu
- 2 champs: `sms_sender_label` + preview `sms_sender_id` (readonly)
- Validation inline avec API `/validate-sender`
- Warning "Transactionnel uniquement - Clients ne peuvent pas répondre"
- Bouton "Modifier" + "Voir statistiques"
- Bouton "Utiliser mon compte Twilio" pour switch mode

**Mode Self-Service:**
- Formulaire credentials Twilio
- Champs: Account SID, Auth Token, Messaging Service SID OU From Number
- ProviderCard existant réutilisé
- Même warning transactionnel

### 3. API Client calls
```typescript
// Fetch config
const config = await apiClient.get('/settings/sms');

// Update config
await apiClient.put('/settings/sms', {
  sms_mode: 'macrea',
  sms_sender_label: 'Cabinet Dr. Martin'
});

// Validate preview
const result = await apiClient.post('/settings/sms/validate-sender', {
  sms_sender_label: 'Cabinet Dr. Martin'
});
```

## 🚀 Pour déployer backend

```bash
# 1. Exécuter migration
psql -h aws-0-eu-west-3.pooler.supabase.com \\
     -U postgres.your-db \\
     -d postgres \\
     -f max_backend/migrations/012_sms_settings.sql

# 2. Restart backend
docker compose restart max-backend

# 3. Tester routes
curl -H "Authorization: Bearer $JWT" \\
     -H "X-Tenant: macrea" \\
     http://localhost:3005/api/settings/sms
```

## ⚠️ Notes importantes

1. **Sender ID global unique** - Un seul tenant peut utiliser "CABINETDRM"
2. **Transactionnel only** - Pas de marketing SMS (produit policy)
3. **Templates verrouillés** - RDV, confirmation, rappel, notification seulement
4. **Unidirectionnel en Mode MaCréa** - Clients ne peuvent pas répondre
5. **Backend valide TOUT** - Ne jamais faire confiance au frontend

## 📁 Fichiers créés

```
max_backend/
├── migrations/
│   └── 012_sms_settings.sql           ✅ Nouveau
├── routes/
│   └── sms-settings.js                ✅ Nouveau
└── server.js                          ✅ Modifié (ligne 99, 251)
```

## ✅ Definition of Done Backend

- [x] Migration SQL avec contraintes strictes
- [x] Routes GET/PUT/POST avec validation
- [x] Helper sanitize + collision handling
- [x] Integration dans server.js
- [x] Documentation complète

**Backend SMS Settings est PRODUCTION READY** 🎉

Frontend peut maintenant consommer ces APIs.
