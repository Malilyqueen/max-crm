# 🎫 Support Lite MVP - Documentation

## 📋 Vue d'Ensemble

Système de support client **minimaliste** pour le MVP, permettant aux clients de créer des tickets et au support (admin) de répondre.

**Temps de développement** : 3-4h
**Objectif** : 30 clients actifs sans dette opérationnelle

---

## ✅ Fonctionnalités Implémentées

### Client (Utilisateur Standard)
- ✅ Créer un nouveau ticket (sujet, message, priorité urgent/normal)
- ✅ Voir la liste de SES tickets uniquement
- ✅ Voir le détail d'un ticket + conversation complète
- ✅ Ajouter des messages à un ticket ouvert
- ✅ Réouvrir un ticket fermé

### Admin (Support MaCréa)
- ✅ Voir TOUS les tickets de TOUS les tenants
- ✅ Répondre aux tickets (statut passe automatiquement à "replied")
- ✅ Fermer un ticket (statut "closed")
- ✅ Voir tous les messages d'une conversation

### Système
- ✅ Numérotation automatique des tickets (TICK-0001234)
- ✅ Statuts simples : open / replied / closed
- ✅ Support multi-tenant (isolation par tenant_id)
- ✅ Upload de 1 pièce jointe par message (max 5 MB)
- ✅ Types de fichiers acceptés : images, PDF, TXT, LOG, JSON

---

## 🗄️ Base de Données

### Table `support_tickets`

```sql
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Auto-généré: TICK-0001234

  -- Identité
  tenant_id VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  user_email VARCHAR(255) NOT NULL,

  -- Contenu
  subject VARCHAR(255) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal'

  -- Statut simple
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'replied', 'closed'

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);
```

### Table `support_messages`

```sql
CREATE TABLE support_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Auteur
  user_id INTEGER NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  is_support BOOLEAN DEFAULT false, -- true si admin/support

  -- Contenu
  message TEXT NOT NULL,

  -- Pièce jointe (1 seule, optionnelle)
  attachment_filename VARCHAR(255),
  attachment_url TEXT,
  attachment_size INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Triggers Automatiques

1. **Auto-génération du ticket_number** : `TICK-0001234` format
2. **Update last_activity_at** : Quand nouveau message ajouté
3. **Changement statut auto** : `replied` quand admin répond

---

## 🔌 API Routes Backend

**Base URL** : `/api/support`
**Auth** : JWT requis via `authMiddleware`
**Tenant** : Isolation automatique via `resolveTenant()`

### Endpoints Disponibles

#### 1. Liste des tickets
```http
GET /api/support/tickets
```
**Réponse** :
```json
{
  "success": true,
  "tickets": [
    {
      "id": 1,
      "ticket_number": "TICK-0000001",
      "subject": "Impossible d'envoyer des emails",
      "priority": "urgent",
      "status": "open",
      "created_at": "2026-01-07T10:23:00Z",
      "last_activity_at": "2026-01-07T10:23:00Z"
    }
  ]
}
```

**Règles** :
- Utilisateur standard : voit uniquement SES tickets
- Admin : voit TOUS les tickets du tenant

---

#### 2. Créer un ticket
```http
POST /api/support/tickets
Content-Type: application/json

{
  "subject": "Impossible d'envoyer des emails via Mailjet",
  "message": "Depuis ce matin, j'ai l'erreur...",
  "priority": "urgent"
}
```

**Réponse** :
```json
{
  "success": true,
  "ticket": {
    "id": 1,
    "ticket_number": "TICK-0000001",
    "subject": "...",
    "status": "open",
    "created_at": "2026-01-07T10:23:00Z"
  }
}
```

**Validation** :
- `subject` : obligatoire, max 255 caractères
- `message` : obligatoire
- `priority` : `urgent` ou `normal` (défaut: `normal`)

---

#### 3. Détails d'un ticket
```http
GET /api/support/tickets/:id
```

**Réponse** :
```json
{
  "success": true,
  "ticket": { ... },
  "messages": [
    {
      "id": 1,
      "user_name": "John Doe",
      "is_support": false,
      "message": "Depuis ce matin...",
      "attachment_filename": "screenshot.png",
      "attachment_url": "/uploads/support/123-screenshot.png",
      "attachment_size": 245000,
      "created_at": "2026-01-07T10:23:00Z"
    },
    {
      "id": 2,
      "user_name": "Support MaCréa",
      "is_support": true,
      "message": "Bonjour John, j'ai vérifié...",
      "created_at": "2026-01-07T10:38:00Z"
    }
  ]
}
```

**Sécurité** :
- Utilisateur standard : accès uniquement à SES tickets
- Admin : accès à tous les tickets

---

#### 4. Ajouter un message
```http
POST /api/support/tickets/:id/messages
Content-Type: multipart/form-data

message=Merci pour votre aide !
attachment=<fichier optionnel>
```

**Réponse** :
```json
{
  "success": true,
  "message": {
    "id": 3,
    "message": "Merci pour votre aide !",
    "created_at": "2026-01-07T10:52:00Z"
  }
}
```

**Upload** :
- 1 fichier max par message
- Taille max : 5 MB
- Types acceptés : `.jpg`, `.png`, `.pdf`, `.txt`, `.log`, `.json`
- Stockage : `max_backend/uploads/support/`

**Effets** :
- `last_activity_at` du ticket mis à jour
- Si auteur = admin → statut passe à `replied`

---

#### 5. Fermer un ticket
```http
PUT /api/support/tickets/:id/close
```

**Réponse** :
```json
{
  "success": true,
  "ticket": {
    "status": "closed",
    "closed_at": "2026-01-07T10:55:00Z"
  }
}
```

**Sécurité** : Réservé aux admins uniquement

---

#### 6. Réouvrir un ticket
```http
PUT /api/support/tickets/:id/reopen
```

**Réponse** :
```json
{
  "success": true,
  "ticket": {
    "status": "open",
    "closed_at": null
  }
}
```

**Accessible** : Client ET admin

---

## 🎨 Pages Frontend

### 1. `/support` - Liste des tickets

**Composant** : [SupportPage.tsx](max_frontend/src/pages/SupportPage.tsx)

**Fonctionnalités** :
- Statistiques rapides (ouverts, répondus, fermés)
- Filtres : Tous / Actifs / Fermés
- Bouton "Nouveau Ticket" → Modale de création
- Clic sur un ticket → Navigation vers `/support/:id`

**UX** :
- Badge 🔴 URGENT si priorité = urgent
- Badge de statut : 🟢 Ouvert / 💬 Répondu / ✅ Fermé
- Format date lisible français

---

### 2. `/support/:id` - Détail d'un ticket

**Composant** : [TicketDetailPage.tsx](max_frontend/src/pages/TicketDetailPage.tsx)

**Fonctionnalités** :
- Header avec ticket_number, sujet, priorité, statut
- Conversation complète (messages client ↔ support)
- Formulaire pour ajouter un message
- Bouton "Fermer" (admin uniquement)
- Bouton "Réouvrir" (si ticket fermé)
- Lien de retour vers `/support`

**UX** :
- Messages client : fond blanc + icône 👤
- Messages support : fond bleu clair + icône 🛠️
- Pièces jointes cliquables avec taille affichée
- Désactivation du formulaire si ticket fermé

---

## 🚀 Déploiement

### 1. Migration Base de Données

```bash
# Postgres (production)
psql -U postgres -d max_crm -f max_backend/migrations/007_support_lite.sql

# Ou via un outil de migration
# npm run migrate:up
```

### 2. Installation dépendance `multer`

```bash
cd max_backend
npm install multer
```

### 3. Créer le dossier uploads

```bash
mkdir -p max_backend/uploads/support
chmod 755 max_backend/uploads/support
```

### 4. Variables d'environnement

Aucune variable supplémentaire requise. Le système utilise :
- `JWT_SECRET` (déjà configuré)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` (pour PostgreSQL)

### 5. Redémarrer le backend

```bash
cd max_backend
npm run dev
```

### 6. Rebuild frontend

```bash
cd max_frontend
npm run build
```

---

## 🧪 Tests Manuels

### Scénario 1 : Création de ticket client

1. Se connecter en tant qu'utilisateur standard
2. Aller sur `/support`
3. Cliquer "Nouveau Ticket"
4. Remplir :
   - Priorité : Urgent
   - Sujet : "Impossible d'envoyer emails Mailjet"
   - Message : "J'ai l'erreur 'Invalid API Key'"
5. Soumettre
6. Vérifier :
   - ✅ Ticket apparaît dans la liste
   - ✅ Statut = 🟢 Ouvert
   - ✅ Badge 🔴 URGENT visible
   - ✅ Ticket_number au format TICK-0000001

---

### Scénario 2 : Réponse du support

1. Se connecter en tant qu'admin
2. Aller sur `/support`
3. Voir TOUS les tickets (cross-tenant)
4. Cliquer sur le ticket créé précédemment
5. Ajouter un message : "Bonjour, j'ai vérifié vos logs..."
6. Soumettre
7. Vérifier :
   - ✅ Message apparaît avec badge 🛠️ Support
   - ✅ Statut du ticket passe à 💬 Répondu
   - ✅ `last_activity_at` mis à jour

---

### Scénario 3 : Conversation complète

1. Client répond au ticket
2. Admin répond à nouveau
3. Vérifier :
   - ✅ Alternance fond blanc / bleu clair
   - ✅ Ordre chronologique respecté
   - ✅ Noms d'utilisateur corrects

---

### Scénario 4 : Fermeture de ticket

1. Admin ouvre le ticket
2. Cliquer "Fermer"
3. Confirmer
4. Vérifier :
   - ✅ Statut passe à ✅ Fermé
   - ✅ Formulaire de réponse désactivé
   - ✅ Bouton "Réouvrir" apparaît
   - ✅ `closed_at` renseigné en BDD

---

### Scénario 5 : Upload pièce jointe

1. Client crée un ticket
2. Ajouter un message avec une capture d'écran (PNG, < 5 MB)
3. Soumettre
4. Vérifier :
   - ✅ Fichier apparaît avec lien cliquable
   - ✅ Taille affichée en KB
   - ✅ Fichier accessible via `/uploads/support/...`

---

## ❌ Fonctionnalités EXCLUES du MVP

Ces fonctionnalités sont **volontairement repoussées** en V2/V3 :

- ❌ SLA calculés (temps de première réponse, résolution)
- ❌ Escalades niveau 1/2/3
- ❌ Notes internes séparées (invisibles pour client)
- ❌ Satisfaction rating (étoiles)
- ❌ Dashboard support avancé (KPI, graphiques)
- ❌ Base de connaissances / FAQ automatique
- ❌ Upload multi-fichiers (limité à 1 par message)
- ❌ Notifications email automatiques
- ❌ Assignation de tickets à un agent spécifique
- ❌ Templates de réponses pré-écrites
- ❌ Recherche full-text dans tickets
- ❌ Export CSV des tickets

**Raison** : MVP = 30 clients actifs sans dette opérationnelle. On valide le besoin d'abord.

---

## 📊 Métriques de Succès

Pour valider que Support Lite fonctionne :

1. **Volume** : Au moins 10 tickets créés par mois
2. **Réactivité** : 80% des tickets reçoivent une première réponse < 24h
3. **Résolution** : 70% des tickets fermés en < 48h
4. **Satisfaction** : < 5% de tickets réouverts après fermeture

Si ces métriques sont atteintes → passer à Support V2 avec SLA, ratings, etc.

---

## 🔒 Sécurité

### Authentification
- ✅ JWT requis sur toutes les routes
- ✅ Middleware `authMiddleware` avant `resolveTenant()`

### Isolation Tenant
- ✅ Utilisateur voit uniquement SES tickets
- ✅ Admin voit tous les tickets de SON tenant
- ✅ Impossible d'accéder aux tickets d'un autre tenant

### Upload Fichiers
- ✅ Types de fichiers validés (whitelist)
- ✅ Taille max 5 MB
- ✅ Stockage local (pas d'exécution de code)
- ⚠️ **TODO V2** : Scanner antivirus pour uploads

### Injection SQL
- ✅ Utilisation de requêtes paramétrées (`$1`, `$2`)
- ✅ Pas de concaténation de chaînes SQL

---

## 🐛 Dépannage

### Erreur : "Cannot find module 'multer'"
```bash
cd max_backend
npm install multer
```

### Erreur : "ENOENT: no such file or directory, open 'uploads/support/...'"
```bash
mkdir -p max_backend/uploads/support
chmod 755 max_backend/uploads/support
```

### Erreur : "relation 'support_tickets' does not exist"
```bash
# Migration non appliquée
psql -U postgres -d max_crm -f max_backend/migrations/007_support_lite.sql
```

### Erreur 403 : "Accès refusé à ce ticket"
→ Vérifier que l'utilisateur est soit :
- Le créateur du ticket
- OU un admin (role = 'admin')

### Ticket_number toujours NULL
→ Vérifier que le trigger `trigger_set_ticket_number` est bien créé :
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_ticket_number';
```

---

## 📚 Fichiers Modifiés

### Backend
- ✅ `max_backend/migrations/007_support_lite.sql` - Migration BDD
- ✅ `max_backend/routes/support.js` - Routes API
- ✅ `max_backend/server.js` - Montage routes + static uploads

### Frontend
- ✅ `max_frontend/src/pages/SupportPage.tsx` - Liste tickets
- ✅ `max_frontend/src/pages/TicketDetailPage.tsx` - Détail ticket
- ✅ `max_frontend/src/App.jsx` - Routes React Router
- ✅ `max_frontend/src/pages/AppShellSimple.tsx` - Menu navigation

---

## 🎯 Prochaines Étapes (Post-MVP)

Une fois Support Lite validé avec 30 clients actifs :

### V1.5 (6-8h)
- [ ] Notifications email (création + réponse)
- [ ] Dashboard support simple (stats basiques)
- [ ] Templates de réponses pré-écrites
- [ ] Assignation de tickets à un agent

### V2.0 (12-15h)
- [ ] SLA calculés avec alertes
- [ ] Satisfaction client (rating 1-5 étoiles)
- [ ] Base de connaissances / FAQ
- [ ] Recherche full-text dans tickets
- [ ] Export CSV / Excel

### V3.0 (20h+)
- [ ] Chat support en direct (WebSocket)
- [ ] Escalades niveau 1/2/3
- [ ] Intégrations externes (Slack, Zendesk)
- [ ] Multi-upload (plusieurs fichiers)
- [ ] Scanner antivirus pour uploads

---

## 📞 Support

Pour toute question sur cette implémentation :
- 📧 Email : support@studiomacrea.cloud
- 📝 Documentation : Ce fichier
- 🐛 Bugs : Créer un ticket dans `/support` 😉

---

**Version** : 1.0.0 MVP
**Date** : 2026-01-07
**Auteur** : Claude Sonnet 4.5 + MaCréa Team