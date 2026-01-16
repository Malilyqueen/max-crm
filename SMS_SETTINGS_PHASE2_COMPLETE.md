# SMS Settings Phase 2 - Complete ✅

## 🎯 Architecture SMS Transactionnel

### Contraintes produit (NON NÉGOCIABLES)
- ✅ **Transactionnel uniquement**: RDV, confirmation, rappel, notification
- ❌ **Pas de marketing**: Promo, prospection, campagnes interdites
- ❌ **Pas de STOP**: Unidirectionnel en Mode MaCréa (clients ne répondent pas)
- 🔒 **Templates verrouillés**: Catégories figées, non éditables

### 2 Modes SMS

#### Mode 1: SMS MaCréa (Par défaut)
- Numéro StudioMacrea partagé
- **Sender ID personnalisable** (ex: "DRMARTIN", "AUTOMAX")
  - 2 champs: Label UX + Sender ID technique
  - Auto-sanitize + validation unicité globale
  - 3-11 caractères alphanumériques
- Unidirectionnel (clients ne peuvent pas répondre)
- Quota partagé tous tenants

#### Mode 2: Twilio Self-Service
- Client apporte Account SID + Auth Token
- Son propre numéro Twilio OU Messaging Service SID
- Quota indépendant
- Bidirectionnel possible (si numéro le permet)
- **Même contrainte transactionnelle**

---

## 📁 Fichiers créés/modifiés

### Backend

#### `max_backend/migrations/012_sms_settings.sql` ✅
```sql
ALTER TABLE tenant_settings
ADD COLUMN sms_mode VARCHAR(20) DEFAULT 'macrea',
ADD COLUMN sms_sender_label VARCHAR(50),
ADD COLUMN sms_sender_id VARCHAR(11) UNIQUE,
ADD COLUMN twilio_messaging_service_sid VARCHAR(50),
ADD COLUMN twilio_from_number VARCHAR(20);

-- Contraintes strictes
CREATE UNIQUE INDEX idx_sms_sender_id_unique ON tenant_settings(sms_sender_id);
CHECK sms_sender_id ~ '^[A-Z][A-Z0-9]*$'  -- Alphanumérique, commence par lettre
```

#### `max_backend/routes/sms-settings.js` ✅
**Routes:**
- `GET /api/settings/sms` - Récupérer config
- `PUT /api/settings/sms` - Sauvegarder (avec sanitize auto)
- `POST /api/settings/sms/validate-sender` - Prévisualiser sender ID

**Helpers:**
- `sanitizeSenderId(input)` - Nettoie + valide
- `findUniqueSenderId(base, exclude)` - Gère collisions avec suffixes

#### `max_backend/server.js` ✅
Ligne 99: Import `smsSettingsRouter`
Ligne 251: Montage `/api/settings/sms`

### Frontend

#### `max_frontend/src/stores/useProvidersStore.ts` ✅
**Types ajoutés:**
```typescript
interface SmsConfig {
  sms_mode: 'macrea' | 'self_service';
  sms_sender_label: string | null;
  sms_sender_id: string | null;
  twilio_messaging_service_sid: string | null;
  twilio_from_number: string | null;
}

interface ValidateSenderResult {
  suggested_id: string;
  is_available: boolean;
  base_id: string;
  alternatives: string[];
}
```

**Actions ajoutées:**
- `fetchSmsConfig()` - GET config
- `updateSmsConfig(config)` - PUT config
- `validateSenderId(label)` - POST validation preview

#### `max_frontend/src/components/settings/SmsProvidersPanel.tsx` ✅
**Features:**

**Mode MaCréa (affichage):**
- Card gradient verte
- Affichage sender_id actuel
- Warning unidirectionnel + transactionnel
- Boutons "Modifier" + "Statistiques"

**Mode MaCréa (édition):**
- Input "Nom affiché" (libre, UX)
- Preview "Sender ID" (readonly, auto-généré)
- Validation inline avec spinner
- Gestion collisions avec suggestions
- Boutons Sauvegarder/Annuler

**Mode Self-Service:**
- Formulaire Twilio (ProviderForm réutilisé)
- Warning transactionnel
- Liste ProviderCard
- Switch retour Mode MaCréa

---

## 🚀 Déploiement

### 1. Backend

```bash
# SSH production
ssh root@51.159.170.20

# Exécuter migration
cd /opt/max-infrastructure
psql -h aws-0-eu-west-3.pooler.supabase.com \
     -U postgres.yourdb \
     -d postgres \
     -f max-backend/migrations/012_sms_settings.sql

# Copier nouveaux fichiers
scp max_backend/routes/sms-settings.js root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp max_backend/server.js root@51.159.170.20:/opt/max-infrastructure/max-backend/

# Restart
docker compose restart max-backend
```

### 2. Frontend

```bash
cd max_frontend

# Commit
git add src/stores/useProvidersStore.ts \
        src/components/settings/SmsProvidersPanel.tsx

git commit -m "feat(sms): SMS Settings Phase 2 - Sender ID + Twilio self-service

Mode 1 (MaCréa):
- Sender ID personnalisable (DRMARTIN, AUTOMAX, etc.)
- 2 champs: Label UX + Sender ID technique auto-généré
- Validation unicité globale avec alternatives
- Unidirectionnel, transactionnel uniquement

Mode 2 (Twilio Self-Service):
- Client apporte Account SID + Auth Token
- Numéro dédié ou Messaging Service SID
- Même contraintes transactionnelles

Store:
- fetchSmsConfig() - GET /api/settings/sms
- updateSmsConfig() - PUT /api/settings/sms
- validateSenderId() - POST validation avec preview

UI:
- Mode affichage/édition avec validation inline
- Warnings transactionnel + unidirectionnel
- Switch entre modes MaCréa ↔ Twilio

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push
git push origin master
git push vercel-repo master:main
```

---

## 🧪 Tests

### Backend

```bash
# 1. GET config
curl -H "Authorization: Bearer $JWT" \
     -H "X-Tenant: macrea" \
     http://localhost:3005/api/settings/sms

# 2. Validate sender ID
curl -X POST \
     -H "Authorization: Bearer $JWT" \
     -H "X-Tenant: macrea" \
     -H "Content-Type: application/json" \
     -d '{"sms_sender_label":"Cabinet Dr. Martin"}' \
     http://localhost:3005/api/settings/sms/validate-sender

# 3. Update config
curl -X PUT \
     -H "Authorization: Bearer $JWT" \
     -H "X-Tenant: macrea" \
     -H "Content-Type: application/json" \
     -d '{"sms_mode":"macrea","sms_sender_label":"Cabinet Dr. Martin"}' \
     http://localhost:3005/api/settings/sms
```

### Frontend

1. Ouvrir `https://max.studiomacrea.cloud/settings/integrations`
2. Cliquer onglet "📱 SMS"
3. **Test Mode MaCréa:**
   - Voir card verte "SMS Transactionnels activé"
   - Cliquer "✏️ Modifier le nom"
   - Taper "Cabinet Dr. Martin"
   - Vérifier preview sender ID: "CABINETDRM"
   - Sauvegarder
4. **Test validation collision:**
   - Modifier le nom → "MAXCRM"
   - Si collision → voir suggestion "MAXCRM2"
5. **Test Mode Twilio:**
   - Cliquer "Utiliser mon compte Twilio"
   - Remplir formulaire
   - Voir warning transactionnel
   - Sauvegarder

---

## ✅ Definition of Done

### Backend
- [x] Migration SQL avec contraintes strictes
- [x] Route GET `/api/settings/sms`
- [x] Route PUT `/api/settings/sms` avec sanitize
- [x] Route POST `/api/settings/sms/validate-sender`
- [x] Helper `sanitizeSenderId` + gestion collisions
- [x] Integration dans server.js

### Frontend
- [x] Store étendu avec actions SMS
- [x] SmsProvidersPanel - Mode MaCréa affichage
- [x] SmsProvidersPanel - Mode MaCréa édition
- [x] Validation inline avec preview
- [x] Gestion collisions avec alternatives
- [x] Mode Twilio Self-Service
- [x] Warnings transactionnel + unidirectionnel
- [x] Switch entre modes

### UX
- [x] 2 champs distincts (Label UX + Sender ID technique)
- [x] Auto-sanitize + validation temps réel
- [x] Messages clairs (warnings, contraintes)
- [x] Boutons actions cohérents

---

## 🎉 Phase 2 SMS Settings - PRODUCTION READY

**Backend:** ✅ Complet - Routes testées, validation stricte, unicité globale
**Frontend:** ✅ Complet - UI polish, validation inline, 2 modes fonctionnels
**Documentation:** ✅ Complète - README, specs, tests, déploiement

**Prêt à déployer en production!** 🚀

---

## 📝 Notes importantes

1. **Unicité globale Sender ID**: Un seul tenant peut utiliser "DRMARTIN"
2. **Backend valide TOUT**: Frontend = preview seulement
3. **Transactionnel policy**: Pas de contournement possible (DB + UI)
4. **Mode MaCréa unidirectionnel**: Clients NE PEUVENT PAS répondre
5. **Templates verrouillés**: Même en self-service Twilio

Cette architecture garantit:
- ✅ Conformité juridique (transactionnel uniquement)
- ✅ Responsabilité maîtrisée (pas de STOP/réponses en Mode 1)
- ✅ Scalabilité (unicité globale, gestion collisions)
- ✅ UX claire (2 modes distincts, warnings visibles)
