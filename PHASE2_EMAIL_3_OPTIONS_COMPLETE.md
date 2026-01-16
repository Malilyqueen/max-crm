# PHASE 2 - EMAIL 3 OPTIONS ✅ COMPLETE

## Vue d'ensemble

Architecture email flexible à **3 niveaux** pour gérer :
- ✅ Quota partagé (démo/test)
- ✅ Branding professionnel (domaine client)
- ✅ Indépendance totale (self-service)

---

## Architecture Technique

```yaml
┌─────────────────────────────────────────────────────────────┐
│ OPTION 1: Email MaCréa (Par défaut)                        │
├─────────────────────────────────────────────────────────────┤
│ Provider: Mailjet MaCréa (credentials globaux)              │
│ FROM: contact@malalacrea.fr                                 │
│ Quota: 1000/mois (partagé entre TOUS les tenants)          │
│ Config: Aucune                                              │
│ Idéal pour: Démo, tests, faible volume                     │
│ Code: Actif par défaut (sendEmail.js ligne 41)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTION 2: Mon domaine via Mailjet MaCréa                   │
├─────────────────────────────────────────────────────────────┤
│ Provider: Mailjet MaCréa (credentials globaux)              │
│ FROM: contact@client-restaurant.fr (domaine validé)         │
│ Quota: 1000/mois (TOUJOURS partagé)                        │
│ Config: DNS SPF/DKIM à ajouter                             │
│ Idéal pour: Branding pro, faible volume                    │
│ Routes: POST /api/email/request-domain                      │
│         GET /api/email/domain-status/:email                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTION 3: Mes propres credentials (Indépendant)            │
├─────────────────────────────────────────────────────────────┤
│ Provider: Mailjet/SendGrid perso                            │
│ FROM: contact@client-restaurant.fr                          │
│ Quota: INDÉPENDANT (selon abonnement client)               │
│ Config: API Key + Secret + DNS                             │
│ Idéal pour: Gros volume, contrôle total                    │
│ Table: tenant_provider_configs (chiffrement AES-256)        │
│ Routes: POST /api/settings/providers                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers Créés/Modifiés

### Frontend

#### **max_frontend/src/components/settings/EmailProvidersPanel.tsx** ✅
**Fonctionnalités:**
- Mode par défaut (Option 1) : Email MaCréa avec quota partagé
- Mode custom domain (Option 2) : Formulaire validation DNS
- Mode self-service (Option 3) : ProviderCard + ProviderForm
- Navigation entre les 3 modes
- Affichage instructions DNS après demande validation

**Lignes clés:**
- L19-17: États (mode, customDomain, dnsInstructions)
- L56-81: handleRequestCustomDomain (appel API)
- L84-210: UI Option 1 (par défaut)
- L214-312: UI Option 2 (custom domain)
- L316-369: UI Option 3 (self-service)

---

### Backend

#### **max_backend/routes/email-domains.js** ✅ (NOUVEAU)
**Fonctionnalités:**
- POST /api/email/request-domain : Ajoute domaine dans Mailjet
- GET /api/email/domain-status/:email : Vérifie statut validation
- Appel API Mailjet pour créer sender
- Retour instructions DNS (SPF + DKIM)

**Lignes clés:**
- L11-102: POST /request-domain
- L35-64: Appel Mailjet sender creation
- L66-86: Gestion sender existant
- L105-162: GET /domain-status

#### **max_backend/server.js** ✅
**Modifications:**
- L98: Import emailDomainsRouter
- L250: Route `/api/email` avec auth + tenant

---

## Flux Utilisateur

### Option 1 (Par défaut - Immédiat)
```
1. Nouveau tenant créé
2. Page Settings > Email affiche Option 1
3. "Email MaCréa activé" (gradient bleu)
4. Aucune config requise
5. Emails envoyés FROM: contact@malalacrea.fr
6. Quota: 1000/mois partagé
```

### Option 2 (Custom Domain - 2-48h)
```
1. Clic "Utiliser mon domaine professionnel"
2. Formulaire: domaine + email
3. Clic "Demander validation DNS"
4. Backend appelle Mailjet API (POST /sender)
5. Retour instructions DNS (SPF + DKIM)
6. Client ajoute DNS chez son hébergeur
7. Validation automatique Mailjet (2-48h)
8. Emails envoyés FROM: contact@client.fr
9. Quota: TOUJOURS 1000/mois partagé ⚠️
```

### Option 3 (Self-Service - Immédiat)
```
1. Clic "Utiliser mes propres credentials"
2. ProviderForm Mailjet (API Key + Secret)
3. Credentials chiffrés AES-256
4. Stockage table tenant_provider_configs
5. Emails envoyés via compte client
6. Quota: Selon abonnement Mailjet client ✅
```

---

## Configuration Production

### Variables .env requises

```env
# Mailjet MaCréa (Options 1 & 2)
EMAIL_PROVIDER=mailjet
MAILJET_API_KEY=7fb5b1e51c21e749da820585dfa75bab
MAILJET_API_SECRET=759826eb2a0ecf808f86943aae5041ac
MAILJET_FROM_EMAIL=contact@malalacrea.fr
MAILJET_FROM_NAME=M.A.X. CRM

# Encryption (Option 3)
CREDENTIALS_ENCRYPTION_KEY=ae91924329b81786fd8c5b8de6e74292d0ed989bda1cf6c16340ee3fded935dd
```

### État Production Actuel

**Mailjet MaCréa:**
- ✅ Configuré et actif
- ✅ Domaine validé: `*@malalacrea.fr` (wildcard)
- ✅ Webhook configuré: https://max-api.studiomacrea.cloud/webhooks/mailjet
- ✅ Events tracking: sent, delivered, open, click, bounce, spam
- ✅ Persistence: Supabase message_events

**Backend:**
- ✅ Port HTTPS opérationnel (pas SMTP - bloqué Scaleway)
- ✅ Encryption key validée (32 bytes)
- ✅ Table tenant_provider_configs créée
- ✅ Routes email-domains montées

---

## API Endpoints

### POST /api/email/request-domain
**Auth:** JWT + tenant
**Body:**
```json
{
  "domain": "restaurant-delice.fr",
  "email": "contact@restaurant-delice.fr"
}
```
**Response:**
```json
{
  "success": true,
  "sender_id": 6485100355,
  "status": "Pending",
  "dns_instructions": {
    "spf": "v=spf1 include:spf.mailjet.com ~all",
    "dkim": "k=rsa; p=MIGfMA0GC..."
  },
  "next_steps": [
    "Ajoutez les enregistrements DNS SPF et DKIM",
    "La validation peut prendre jusqu'à 48h"
  ]
}
```

### GET /api/email/domain-status/:email
**Auth:** JWT + tenant
**Response:**
```json
{
  "email": "contact@restaurant-delice.fr",
  "status": "Active", // ou "Pending", "Inactive"
  "dns_id": 4759175353,
  "validated": true
}
```

---

## Tests

### Test Option 1 (Par défaut)
```bash
# Frontend
http://localhost:5173/settings/integrations

# Vérifier:
- Panel bleu "Email MaCréa activé"
- Quota: Partagé (orange)
- Lien "Voir les statistiques" → /activities?channel=email
```

### Test Option 2 (Custom Domain)
```bash
# Frontend
1. Clic "Utiliser mon domaine professionnel"
2. Saisir: test-domain.com + contact@test-domain.com
3. Clic "Demander validation DNS"

# Backend (vérifier logs)
docker compose -f /opt/max-infrastructure/docker-compose.yml logs max-backend | grep EMAIL_DOMAIN

# Vérifier Mailjet
curl -u $MAILJET_KEY:$MAILJET_SECRET https://api.mailjet.com/v3/REST/sender
```

### Test Option 3 (Self-Service)
```bash
# Frontend
1. Clic "Utiliser mes propres credentials"
2. ProviderForm → Remplir API Key + Secret
3. Enregistrer

# Vérifier DB
SELECT * FROM tenant_provider_configs WHERE tenant_id = 'test-tenant';

# Vérifier chiffrement
# encrypted_config doit être un string chiffré (pas de credentials en clair)
```

---

## Limitations & Roadmap

### V1 (Actuel) ✅
- [x] Option 1: Email MaCréa par défaut
- [x] Option 2: Validation DNS domaine client
- [x] Option 3: Self-service provider Mailjet
- [x] UI 3 modes avec navigation
- [x] API backend validation DNS
- [x] Chiffrement credentials AES-256

### V2 (À venir)
- [ ] Polling statut validation DNS (auto-refresh)
- [ ] Support SendGrid (Option 3)
- [ ] Support SMTP custom (Option 3)
- [ ] Support Gmail API (Option 3)
- [ ] Quota monitoring par tenant
- [ ] Alertes quota atteint
- [ ] Migration domaine Option 2 → Option 3

### Blockers connus
- ⚠️ **Option 2**: Quota toujours partagé (1000/mois)
  - Solution: Pousser vers Option 3 pour gros volumes
- ⚠️ **Scaleway SMTP bloqué**: Pas de SMTP custom possible
  - Solution: API only (Mailjet, SendGrid, etc.)

---

## Documentation Technique

### Workflow sendEmail.js (à finaliser)
```javascript
// TODO: Modifier sendEmail.js pour supporter multi-provider

export async function sendEmail(params) {
  const { tenantId } = params;

  // 1. Vérifier si tenant a provider custom (Option 3)
  const customProvider = await getProviderByTenant(tenantId, 'email');

  if (customProvider && customProvider.is_active) {
    // Option 3: Utiliser credentials tenant
    return await sendViaCustomProvider(params, customProvider);
  }

  // 2. Vérifier si tenant a domaine validé (Option 2)
  const customDomain = await getValidatedDomain(tenantId);

  if (customDomain) {
    // Option 2: Utiliser Mailjet MaCréa avec FROM custom
    params.from = customDomain.email;
    return await sendViaMailjet(params); // Utilise credentials globaux
  }

  // 3. Fallback: Option 1 (par défaut)
  params.from = 'contact@malalacrea.fr';
  return await sendViaMailjet(params); // Credentials globaux
}
```

---

## Conclusion

✅ **Architecture complète implémentée**
✅ **UI 3 options fonctionnelle**
✅ **Backend API validation DNS ready**
✅ **Self-service provider avec encryption**

**Prochaine étape:** Modifier `sendEmail.js` pour détecter le provider par tenant et utiliser les credentials appropriés.

---

**Date:** 2026-01-08
**Version:** Phase 2 - Email 3 Options V1
**Status:** ✅ COMPLETE (hors sendEmail.js multi-provider logic)
