# GUIDE DÉPLOIEMENT - EMAIL 3 MODES

## ✅ Architecture implémentée

```
MODE 1 (Default):
  FROM: no-reply@malalacrea.fr
  REPLY-TO: email pro du client (à configurer)
  Quota: 1000/mois par tenant
  Credentials: Mailjet MaCréa (global)

MODE 2 (Custom Domain):
  FROM: contact@client.fr
  REPLY-TO: contact@client.fr
  Quota: 1000/mois partagé global
  Credentials: Mailjet MaCréa (global)
  DNS: SPF/DKIM requis

MODE 3 (Self-Service):
  FROM: contact@client.fr
  REPLY-TO: contact@client.fr
  Quota: Selon compte Mailjet client
  Credentials: Mailjet client (chiffré)
```

---

## 📦 Fichiers livrés

### Backend
- ✅ `actions/sendEmail.js` - Logique multi-mode
- ✅ `lib/emailModeResolver.js` - Résolution mode par tenant
- ✅ `routes/email-domains.js` - API validation DNS (Mode 2)
- ✅ `server.js` - Routes montées

### Frontend
- ✅ `components/settings/EmailProvidersPanel.tsx` - UI 3 modes
- ✅ `components/settings/ProviderCard.tsx` - Affichage providers
- ✅ `components/settings/ProviderForm.tsx` - Formulaire Mailjet

### Database
- ✅ Table `tenant_provider_configs` (Mode 3)
- ⚠️ **TODO:** Table `tenant_email_domains` (Mode 2 - voir ci-dessous)

---

## 🚀 Déploiement Production

### 1. Vérifier .env production

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure
cat .env | grep -E "EMAIL_PROVIDER|MAILJET|CREDENTIALS_ENCRYPTION_KEY"
```

**Doit afficher:**
```env
EMAIL_PROVIDER=mailjet
MAILJET_API_KEY=7fb5b1e51c21e749da820585dfa75bab
MAILJET_API_SECRET=759826eb2a0ecf808f86943aae5041ac
MAILJET_FROM_EMAIL=no-reply@malalacrea.fr  ← CHANGER de contact@ vers no-reply@
MAILJET_FROM_NAME=M.A.X. CRM
CREDENTIALS_ENCRYPTION_KEY=ae91924329b81786fd8c5b8de6e74292d0ed989bda1cf6c16340ee3fded935dd
```

**ACTION REQUISE:**
```bash
# Modifier FROM_EMAIL
sed -i 's/^MAILJET_FROM_EMAIL=contact@/MAILJET_FROM_EMAIL=no-reply@/' .env

# Vérifier
grep MAILJET_FROM_EMAIL .env
```

### 2. Déployer code backend

```bash
# Local
cd d:\Macrea\CRM\max_backend
git add actions/sendEmail.js lib/emailModeResolver.js routes/email-domains.js server.js
git commit -m "feat(email): Architecture 3 modes (default/custom_domain/self_service)"
git push

# Production
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose pull max-backend
docker compose restart max-backend

# Vérifier logs
docker compose logs max-backend --tail 50 | grep EMAIL_MODE
```

### 3. Déployer code frontend

```bash
# Local
cd d:\Macrea\CRM\max_frontend
git add src/components/settings/EmailProvidersPanel.tsx
git commit -m "feat(email): UI 3 modes email avec navigation"
git push

# Vercel deploy automatique
# Ou si manual:
npx vercel --prod
```

### 4. Créer table tenant_email_domains (Mode 2)

**Migration SQL à ajouter:** `max_backend/migrations/009_tenant_email_domains.sql`

```sql
CREATE TABLE IF NOT EXISTS tenant_email_domains (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  reply_to VARCHAR(255),
  mailjet_sender_id BIGINT,
  dns_status VARCHAR(20) DEFAULT 'pending' CHECK (dns_status IN ('pending', 'verified', 'failed')),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_tenant_email_domains_tenant ON tenant_email_domains(tenant_id);
CREATE INDEX idx_tenant_email_domains_status ON tenant_email_domains(dns_status);

COMMENT ON TABLE tenant_email_domains IS 'Domaines email custom validés par tenant (Mode 2)';
COMMENT ON COLUMN tenant_email_domains.dns_status IS 'pending: En attente validation DNS | verified: Domaine validé | failed: Échec validation';
```

**Exécuter en production:**
```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose exec -T postgres psql -U postgres -d max < /path/to/009_tenant_email_domains.sql
```

### 5. Créer table tenant_settings (Reply-To Mode 1)

**Migration SQL:** `max_backend/migrations/010_tenant_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS tenant_settings (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  email_reply_to VARCHAR(255), -- Email reply-to pour Mode 1
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);

COMMENT ON TABLE tenant_settings IS 'Paramètres généraux par tenant';
COMMENT ON COLUMN tenant_settings.email_reply_to IS 'Email de réponse (REPLY-TO) utilisé en Mode 1 (default)';
```

---

## 🧪 Tests

### Test Mode 1 (Default)

```javascript
// Backend test
const { sendEmail } = await import('./actions/sendEmail.js');

const result = await sendEmail({
  tenantId: 'test-tenant',
  to: 'destinataire@example.com',
  subject: 'Test Mode 1',
  body: 'Email envoyé en mode default'
});

console.log(result);
// Attendu:
// - FROM: no-reply@malalacrea.fr
// - REPLY-TO: email_reply_to du tenant (ou contact@malalacrea.fr)
// - Mode: 'default'
```

**Vérifier logs:**
```bash
docker compose logs max-backend | grep EMAIL_MODE
# Doit afficher: [EMAIL_MODE] ✅ Mode: DEFAULT
```

### Test Mode 3 (Self-Service)

```bash
# 1. Créer un provider Mailjet dans l'UI
http://localhost:5173/settings/integrations
→ Email → "Utiliser mes propres credentials"
→ Remplir API Key + Secret
→ Enregistrer

# 2. Vérifier DB
docker compose exec -T postgres psql -U postgres -d max -c \
  "SELECT id, tenant_id, provider_type, is_active FROM tenant_provider_configs;"

# 3. Envoyer email test
const result = await sendEmail({
  tenantId: 'test-tenant',
  to: 'test@example.com',
  subject: 'Test Mode 3',
  body: 'Email avec credentials tenant'
});

# Logs attendus:
# [EMAIL_MODE] ✅ Mode: SELF_SERVICE
# [Mailjet] Configuration: TENANT
```

---

## ⚠️ Points d'attention

### 1. Reply-To obligatoire (Mode 1)

**Problème:** En Mode 1, si `email_reply_to` n'est pas configuré, fallback vers `contact@malalacrea.fr`

**Solution V1:** Accepter le fallback
**Solution V2:** Rendre obligatoire dans onboarding tenant

### 2. Quota 1000/mois partagé

**Mode 1 & 2:** Le quota Mailjet MaCréa (1000/mois) est partagé entre TOUS les tenants.

**Monitoring requis:**
- Ajouter compteur emails envoyés par tenant
- Alerter si proche de la limite
- Afficher quota restant dans UI

**Code à ajouter:**
```javascript
// lib/quotaManager.js
export async function checkQuota(tenantId, mode) {
  if (mode === 'self_service') {
    return { ok: true, unlimited: true };
  }

  // Compter emails du mois
  const count = await supabase
    .from('message_events')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('channel', 'email')
    .gte('event_timestamp', startOfMonth())
    .single();

  const limit = 1000; // Par tenant
  const remaining = limit - (count.data || 0);

  return {
    ok: remaining > 0,
    used: count.data,
    limit,
    remaining
  };
}
```

### 3. Validation DNS Mode 2

**Actuellement:** Validation manuelle (client ajoute DNS, on ne vérifie pas auto)

**À implémenter:**
- Polling API Mailjet pour vérifier statut sender
- Auto-update `dns_status` dans `tenant_email_domains`
- Notification client quand validé

---

## 📋 Checklist déploiement

- [ ] Modifier `.env` production: `MAILJET_FROM_EMAIL=no-reply@malalacrea.fr`
- [ ] Créer migration `009_tenant_email_domains.sql`
- [ ] Créer migration `010_tenant_settings.sql`
- [ ] Exécuter migrations en production
- [ ] Déployer code backend (git push)
- [ ] Déployer code frontend (Vercel)
- [ ] Tester Mode 1 (default)
- [ ] Tester Mode 3 (self-service)
- [ ] Implémenter quota monitoring (V2)
- [ ] Implémenter validation DNS auto (V2)

---

## 🔄 Workflow client

### Nouveau tenant (Mode 1 par défaut)

```
1. Tenant créé
2. Page Settings > Email affiche:
   "✅ Email MaCréa activé (par défaut)"
   FROM: no-reply@malalacrea.fr
   REPLY-TO: [À configurer dans votre profil]

3. Client peut:
   - Envoyer emails immédiatement
   - Quota: 1000/mois
   - Clic "Voir stats"

4. Options upgrade:
   - "Utiliser mon domaine" → Mode 2
   - "Mes credentials" → Mode 3
```

### Upgrade vers Mode 2

```
1. Clic "Utiliser mon domaine professionnel"
2. Formulaire: domaine + email
3. Backend appelle POST /api/email/request-domain
4. Affichage instructions DNS
5. Client ajoute SPF/DKIM chez hébergeur
6. Validation Mailjet (2-48h)
7. Email envoyé FROM: contact@client.fr
8. Quota: TOUJOURS 1000/mois partagé
```

### Upgrade vers Mode 3

```
1. Clic "Utiliser mes propres credentials"
2. ProviderForm Mailjet
3. API Key + Secret du client
4. Enregistrement chiffré AES-256
5. Email envoyé via compte client
6. Quota: Selon abonnement Mailjet client
```

---

**Date:** 2026-01-08
**Version:** Phase 2 - Email 3 Modes V1
**Status:** ✅ CODE COMPLET - PRÊT DÉPLOIEMENT
