# ✅ MAX Infrastructure Scaleway - PRÊT À DÉPLOYER

## Infrastructure

- **Serveur**: Scaleway Ubuntu 22.04
- **SSL**: Cloudflare Full (strict) + Origin Certificate
- **Services**: Docker + Docker Compose
- **Port MAX**: 3005 (figé)

---

## 📁 Fichiers Livrés

```
docker-deploy/
├── docker-compose.yml                  # Stack Docker complète
├── .env.production.example             # Template (REMPLIR)
├── .gitignore                          # Protection secrets
│
├── SCALEWAY_QUICKSTART.md              # ⭐ Guide déploiement Scaleway
├── SCALEWAY_DEPLOY.sh                  # Script auto déploiement
├── COMMANDES_SCALEWAY.txt              # ⭐ Toutes commandes copier-coller
├── DEPLOYMENT_GUIDE.md                 # Guide complet (adapté Scaleway)
├── E2E_VALIDATION_CHECKLIST.md         # Checklist 9 phases
├── LIVRAISON.md                        # Synthèse (adapté Scaleway)
├── README.md                           # Vue d'ensemble (adapté Scaleway)
│
├── services/
│   ├── max-backend/
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   ├── espocrm/
│   │   ├── Dockerfile
│   │   └── custom-backup/custom/       # ✅ Config EspoCRM migrée
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── api.max.studiomacrea.cloud.conf
│   │   │   └── crm.studiomacrea.cloud.conf
│   │   └── ssl/README.md
│   └── mariadb/
│
└── scripts/
    ├── deploy.sh
    └── backup.sh
```

---

## 🚀 Déploiement Rapide (3 Étapes)

### 1️⃣ LOCAL: Préparer

```bash
# .env.production
cp .env.production.example .env.production
notepad .env.production  # REMPLIR VRAIES VALEURS

# Cloudflare Origin Certificate
# Dashboard → SSL/TLS → Origin Server → Create (15 years)
# Télécharger: cloudflare-origin-cert.pem + cloudflare-origin-key.pem

# Code MAX backend
xcopy /E /I d:\Macrea\CRM\max_backend\* services\max-backend\
```

### 2️⃣ UPLOAD SCALEWAY

```bash
# Fichiers secrets
scp .env.production root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/
scp services/nginx/ssl/cloudflare-origin-*.pem root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/

# Code MAX
scp -r max_backend/* root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/max-backend/
```

### 3️⃣ SCALEWAY: Déployer

```bash
ssh root@SCALEWAY_IP
cd /opt && git clone YOUR_REPO max-infrastructure
cd max-infrastructure/docker-deploy
./SCALEWAY_DEPLOY.sh
```

**OU Manuel**:

```bash
# Installer Docker
apt-get update && apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Démarrer
chmod 600 .env.production services/nginx/ssl/*.pem
docker compose build --no-cache
docker compose up -d
```

---

## ✅ Post-Déploiement (3 Actions)

### 1. Générer API Key EspoCRM

```
https://crm.studiomacrea.cloud
→ Login admin
→ User menu → Preferences → API User → Create
→ Copier Key
```

```bash
# Scaleway
nano .env.production  # ESPO_API_KEY=VOTRE_CLE
docker compose restart max-backend
```

### 2. Configurer Webhook Green-API

```
https://console.green-api.com
→ Instance → Webhooks
→ URL: https://api.max.studiomacrea.cloud/webhooks/greenapi
→ ✅ Incoming messages
```

### 3. Test E2E

```
WhatsApp: "Salut MAX, crée un lead Test, email test@scaleway.com"

Vérifier:
→ docker compose logs -f max-backend
→ https://crm.studiomacrea.cloud (Lead créé)
→ Supabase max_logs (nouvelle entrée)
→ WhatsApp réponse reçue
```

---

## 📋 Checklist Validation

- [ ] `docker compose ps` → tous "healthy"
- [ ] `curl http://localhost:3005/api/health` → 200 OK
- [ ] `https://api.max.studiomacrea.cloud/api/health` → 200 OK
- [ ] `https://crm.studiomacrea.cloud` → Login OK
- [ ] Custom fields EspoCRM visibles
- [ ] Webhook Green-API reçu (logs)
- [ ] Lead créé dans EspoCRM
- [ ] Log dans Supabase
- [ ] Réponse WhatsApp reçue

---

## 🔧 Commandes Essentielles

```bash
# Logs
docker compose logs -f max-backend

# Restart
docker compose restart max-backend

# Rebuild
git pull && docker compose build --no-cache && docker compose up -d

# Backup
./scripts/backup.sh

# Shell
docker exec -it max-backend sh
```

---

## 📚 Documentation Complète

1. **SCALEWAY_QUICKSTART.md** ⭐ - Guide étape par étape Scaleway
2. **COMMANDES_SCALEWAY.txt** ⭐ - Toutes commandes prêtes à copier-coller
3. **DEPLOYMENT_GUIDE.md** - Guide détaillé (adapté Scaleway)
4. **E2E_VALIDATION_CHECKLIST.md** - Checklist 100+ checks
5. **LIVRAISON.md** - Synthèse complète

---

## ✅ Statut

**PRÊT À DÉPLOYER SUR SCALEWAY**

Actions requises:
1. Remplir `.env.production`
2. Générer Cloudflare Origin Certificate
3. Copier code MAX backend
4. Upload Scaleway
5. Exécuter `./SCALEWAY_DEPLOY.sh`

Délai estimé: **2-3 heures** (si Cloudflare/DNS OK)
