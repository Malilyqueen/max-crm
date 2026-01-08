# ARCHITECTURE EMAIL - DÉCISION FINALE VERROUILLÉE

## Cadre Produit (Non négociable)

### MODE 1: Email MaCréa (Par défaut)
```yaml
FROM: no-reply@malalacrea.fr
REPLY-TO: Email pro du client (champ obligatoire)
Credentials: Mailjet MaCréa (global)
Tracking: Automatique via webhook MaCréa
Webhook: https://api.max.studiomacrea.cloud/webhooks/mailjet
Quota: 1000 emails/mois inclus
Dépassement: 0,005 €/email (facturé)
Config client: ZÉRO (juste renseigner REPLY-TO)
```

**Avantages:**
- ✅ Prêt à l'emploi immédiatement
- ✅ Tracking automatique (open, click, bounce)
- ✅ Aucune manipulation technique
- ✅ Délivrabilité optimale (DKIM MaCréa)

**Limitations:**
- ⚠️ FROM = no-reply@malalacrea.fr (pas de branding)
- ⚠️ Quota partagé limité à 1000/mois

---

### MODE 2: Mon domaine (Hybride - Branding avancé)
```yaml
FROM: contact@client.fr (domaine client)
REPLY-TO: contact@client.fr
Credentials: Mailjet MaCréa (global - TOUJOURS)
Tracking: Automatique via webhook MaCréa
Webhook: https://api.max.studiomacrea.cloud/webhooks/mailjet
DNS requis: SPF, DKIM, DMARC (recommandé)
Quota: 1000 emails/mois MAX (partagé global)
Dépassement: 0,005 €/email (facturé)
Status DNS: pending → verified → active
```

**Workflow client:**
1. Client demande validation DNS (UI)
2. Backend appelle Mailjet API → génère DNS
3. UI affiche instructions DNS (SPF/DKIM/DMARC)
4. Client ajoute DNS chez son hébergeur
5. Validation auto Mailjet (2-48h)
6. Status → verified → Emails envoyés FROM client.fr

**Avantages:**
- ✅ Branding professionnel (FROM = domaine client)
- ✅ Tracking automatique
- ✅ Pas de credentials client à gérer

**Limitations:**
- ⚠️ Configuration DNS requise (technique)
- ⚠️ Quota TOUJOURS limité à 1000/mois global
- ⚠️ Pas d'indépendance quota

---

### MODE 3: Self-Service (Indépendance totale)
```yaml
FROM: contact@client.fr
REPLY-TO: contact@client.fr
Credentials: Mailjet/SendGrid client (propres)
Tracking: OBLIGATOIRE via webhook client
Webhook: https://api.max.studiomacrea.cloud/webhooks/mailjet (à configurer)
DNS: Géré par le client dans son compte Mailjet
Quota: Selon abonnement Mailjet client (INDÉPENDANT)
Dépassement: Selon facturation Mailjet client
Chiffrement: AES-256-GCM (credentials stockés chiffrés)
```

**Workflow client:**
1. Client possède compte Mailjet/SendGrid
2. Client crée API Key + Secret
3. Client configure dans MAX (ProviderForm)
4. Client configure webhook dans Mailjet dashboard:
   - URL: https://api.max.studiomacrea.cloud/webhooks/mailjet
   - Events: sent, delivered, open, click, bounce, spam
5. Tracking actif via webhook client

**Avantages:**
- ✅ Quota indépendant (selon abonnement client)
- ✅ Contrôle total (DNS, réputation, billing)
- ✅ Scalabilité (gros volumes possibles)

**Limitations:**
- ⚠️ Nécessite compte Mailjet client
- ⚠️ Configuration webhook OBLIGATOIRE (sinon pas de tracking)
- ⚠️ Support technique plus complexe

---

## Quotas & Facturation

### Quota Inclus
- **1000 emails/mois** inclus dans l'abonnement MAX
- Applicable à: Mode 1 + Mode 2 (combinés)
- Mode 3: Indépendant (pas compté dans quota MAX)

### Dépassement
- **0,005 € par email** au-delà de 1000/mois
- Facturé en fin de mois
- Compteur par tenant (Mode 1 + Mode 2)

### Monitoring
```sql
-- Requête quota tenant
SELECT
  tenant_id,
  COUNT(*) as emails_sent,
  1000 - COUNT(*) as remaining,
  CASE
    WHEN COUNT(*) > 1000 THEN (COUNT(*) - 1000) * 0.005
    ELSE 0
  END as overage_cost_eur
FROM message_events
WHERE channel = 'email'
  AND direction = 'out'
  AND event_timestamp >= date_trunc('month', NOW())
  AND tenant_id = 'xxx'
GROUP BY tenant_id;
```

---

## Tracking Email

### Mode 1 & 2: Tracking automatique ✅
```
Webhook: https://api.max.studiomacrea.cloud/webhooks/mailjet
Configuré: Par MaCréa (global)
Events: sent, delivered, open, click, bounce, spam, blocked, unsub
CustomID: Lead_{leadId} (corrélation auto)
Storage: message_events (Supabase)
Isolation: Par tenant_id
```

**Aucune action client requise.**

### Mode 3: Webhook OBLIGATOIRE ⚠️
```
Le client DOIT configurer le webhook dans son dashboard Mailjet:

URL: https://api.max.studiomacrea.cloud/webhooks/mailjet
Method: POST
Format: JSON
Events à activer:
  ✅ sent
  ✅ delivered
  ✅ open
  ✅ click
  ✅ bounce
  ✅ spam
  ✅ blocked
  ✅ unsub

IMPORTANT: Sans webhook configuré, PAS de tracking !
```

**UI doit afficher:**
```
⚠️ Configuration webhook requise
Sans webhook, vous ne verrez pas les statistiques d'ouverture/clics.

Instructions:
1. Connectez-vous à votre dashboard Mailjet
2. Menu: Account > Event Tracking (Webhooks)
3. Ajoutez cette URL: https://api.max.studiomacrea.cloud/webhooks/mailjet
4. Activez tous les events
```

---

## Workflow UI par Mode

### Mode 1 (Default - Zéro config)
```
┌─────────────────────────────────────────┐
│ ✅ Email MaCréa activé                  │
├─────────────────────────────────────────┤
│ FROM: no-reply@malalacrea.fr            │
│ REPLY-TO: [Votre email pro]            │
│                                         │
│ Quota: 847/1000 (inclus)               │
│ Tracking: Actif ✅                      │
│                                         │
│ [Voir les stats] [Upgrade branding]    │
└─────────────────────────────────────────┘

Champ obligatoire onboarding:
  "Votre email professionnel (reply-to)"
  → Stocké dans tenant_settings.email_reply_to
```

### Mode 2 (Custom Domain - DNS requis)
```
┌─────────────────────────────────────────┐
│ Branding Email Avancé                   │
├─────────────────────────────────────────┤
│ Votre domaine: [client.fr        ]      │
│ Email: [contact@client.fr   ]           │
│                                         │
│ [Demander validation DNS]               │
└─────────────────────────────────────────┘

Après demande:
┌─────────────────────────────────────────┐
│ ⚠️ Configuration DNS requise            │
├─────────────────────────────────────────┤
│ Ajoutez ces enregistrements:            │
│                                         │
│ SPF (TXT @ ):                           │
│ v=spf1 include:spf.mailjet.com ~all     │
│                                         │
│ DKIM (TXT mailjet._domainkey):          │
│ k=rsa; p=MIGfMA0GC...                   │
│                                         │
│ DMARC (TXT _dmarc):                     │
│ v=DMARC1; p=none; rua=mailto:...        │
│                                         │
│ Status: ⏳ En attente (48h max)         │
│                                         │
│ [Vérifier validation] [Copier DNS]     │
└─────────────────────────────────────────┘

⚠️ Important:
Quota: TOUJOURS limité à 1000/mois
Pour quota illimité → Mode 3 (Self-Service)
```

### Mode 3 (Self-Service - Indépendant)
```
┌─────────────────────────────────────────┐
│ Vos propres credentials Mailjet         │
├─────────────────────────────────────────┤
│ API Key: [**********************]       │
│ API Secret: [******************]        │
│ Email FROM: [contact@client.fr]         │
│                                         │
│ [Enregistrer]                           │
└─────────────────────────────────────────┘

Après enregistrement:
┌─────────────────────────────────────────┐
│ ✅ Provider Mailjet configuré           │
├─────────────────────────────────────────┤
│ Email: contact@client.fr                │
│ Status: ⚠️ Webhook manquant             │
│ Quota: Indépendant (selon votre compte)│
│                                         │
│ [Tester] [Modifier] [Supprimer]        │
│                                         │
│ ⚠️ Configuration webhook requise:       │
│ URL: https://api.max../webhooks/mailjet│
│                                         │
│ [Voir instructions] [Marquer configuré]│
└─────────────────────────────────────────┘
```

---

## Comparaison Modes

| Critère | Mode 1 (Default) | Mode 2 (Custom) | Mode 3 (Self-Service) |
|---------|------------------|-----------------|----------------------|
| **FROM** | no-reply@malalacrea.fr | contact@client.fr | contact@client.fr |
| **Branding** | ❌ MaCréa | ✅ Client | ✅ Client |
| **Config DNS** | ❌ Aucune | ✅ SPF/DKIM/DMARC | ✅ Géré par client |
| **Quota** | 1000/mois inclus | 1000/mois MAX | Indépendant |
| **Dépassement** | 0,005 €/email | 0,005 €/email | Selon compte client |
| **Tracking** | ✅ Auto | ✅ Auto | ⚠️ Webhook obligatoire |
| **Webhook** | MaCréa | MaCréa | Client (à configurer) |
| **Credentials** | MaCréa | MaCréa | Client |
| **Complexité** | 🟢 Simple | 🟡 Moyenne | 🔴 Avancé |
| **Support** | 🟢 Minimal | 🟡 DNS help | 🔴 Technique |

---

## Recommandations Clients

### Petit volume (< 1000/mois)
→ **Mode 1** (Default)
- Prêt à l'emploi
- Tracking auto
- Zéro config

### Branding important + petit volume
→ **Mode 2** (Custom Domain)
- FROM = domaine client
- Tracking auto
- Limité à 1000/mois

### Gros volume (> 1000/mois)
→ **Mode 3** (Self-Service)
- Quota indépendant
- Contrôle total
- Nécessite compte Mailjet

---

## Actions Techniques Requises

### Backend
- [x] sendEmail.js - Résolution mode par tenant
- [x] emailModeResolver.js - Logique 3 modes
- [x] email-domains.js - API validation DNS
- [ ] quotaManager.js - Compteur + alertes
- [ ] webhook-validator.js - Vérifier webhook Mode 3

### Frontend
- [x] EmailProvidersPanel.tsx - UI 3 modes
- [ ] QuotaDisplay.tsx - Affichage quota/dépassement
- [ ] WebhookInstructions.tsx - Guide Mode 3

### Database
- [x] tenant_provider_configs - Credentials Mode 3
- [ ] tenant_email_domains - Domaines Mode 2
- [ ] tenant_settings - Reply-To Mode 1
- [ ] email_quota_usage - Compteur mensuel

### Infrastructure
- [x] Webhook Mailjet configuré (global)
- [ ] Monitoring quota dépassement
- [ ] Facturation auto (0,005 €/email)

---

**Date:** 2026-01-08
**Status:** ✅ ARCHITECTURE VERROUILLÉE
**Version:** V1 Final
