# MAX Infrastructure - Scaleway Quick Start

## Serveur

**Scaleway Ubuntu 22.04**
- RAM: 8GB minimum
- Storage: 50GB
- IP publique: `YOUR_SCALEWAY_IP`

---

## Étape 1: Préparer Localement

### 1.1 Créer `.env.production`

```bash
cd d:\Macrea\CRM\docker-deploy
cp .env.production.example .env.production
nano .env.production
```

**Remplir avec VRAIES valeurs**:
```env
SUPABASE_URL=https://jcegkuyagbthpbklyawz.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...VOTRE_SERVICE_KEY
SUPABASE_ANON_KEY=eyJhbGciOi...VOTRE_ANON_KEY

OPENAI_API_KEY=sk-proj-VOTRE_CLE

GREENAPI_INSTANCE_ID=7105440259
GREENAPI_API_TOKEN=VOTRE_TOKEN

MYSQL_ROOT_PASSWORD=STRONG_PASSWORD_32_CHARS
ESPO_DB_PASSWORD=STRONG_PASSWORD_32_CHARS
ESPO_USERNAME=admin
ESPO_PASSWORD=STRONG_PASSWORD_32_CHARS
ESPO_API_KEY=GENERER_APRES_DEPLOY

JWT_SECRET=STRONG_SECRET_MIN_32_CHARS

SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_USER=contact@malalacrea.fr
SMTP_PASSWORD=VOTRE_PASSWORD
SMTP_FROM=contact@malalacrea.fr
```

### 1.2 Générer Cloudflare Origin Certificate

1. **Cloudflare Dashboard** → `studiomacrea.cloud` → **SSL/TLS** → **Origin Server**
2. **Create Certificate**:
   - Type: RSA 2048
   - Validity: 15 years
   - Hostnames: `*.studiomacrea.cloud`, `studiomacrea.cloud`
3. **Télécharger**:
   - Origin Certificate → Sauver comme `cloudflare-origin-cert.pem`
   - Private Key → Sauver comme `cloudflare-origin-key.pem`

### 1.3 Copier Code MAX Backend

```bash
# Option 1: Copier depuis max_backend existant
cd d:\Macrea\CRM\docker-deploy\services\max-backend
xcopy /E /I d:\Macrea\CRM\max_backend\* .

# Option 2: Git submodule (si repo séparé)
cd d:\Macrea\CRM\docker-deploy\services\max-backend
git submodule add YOUR_MAX_REPO .
```

**Vérifier**:
```bash
ls services/max-backend/package.json
ls services/max-backend/server.js
```

### 1.4 Configurer Cloudflare DNS

**Dashboard Cloudflare** → **DNS** → **Records**:

| Type | Name | Content            | Proxy |
|------|------|--------------------|-------|
| A    | api.max | `YOUR_SCALEWAY_IP` | ✅ Proxied |
| A    | crm     | `YOUR_SCALEWAY_IP` | ✅ Proxied |

**SSL/TLS Settings**:
- Encryption mode: **Full (strict)**
- Always Use HTTPS: **On**
- Min TLS: **1.2**

---

## Étape 2: Upload vers Scaleway

### 2.1 SSH Scaleway

```bash
ssh root@YOUR_SCALEWAY_IP
```

### 2.2 Clone Repo

```bash
cd /opt
git clone https://github.com/YOUR_ORG/max-infrastructure.git
cd max-infrastructure/docker-deploy
```

### 2.3 Upload Fichiers Secrets (depuis local)

```bash
# Depuis Windows local
scp d:\Macrea\CRM\docker-deploy\.env.production root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/

scp d:\Macrea\CRM\docker-deploy\services\nginx\ssl\cloudflare-origin-cert.pem root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/

scp d:\Macrea\CRM\docker-deploy\services\nginx\ssl\cloudflare-origin-key.pem root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/
```

### 2.4 Upload Code MAX Backend (si pas dans Git)

```bash
# Depuis Windows local
scp -r d:\Macrea\CRM\max_backend\* root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/max-backend/
```

---

## Étape 3: Déployer

### 3.1 Exécuter Script Déploiement

```bash
# Sur Scaleway
cd /opt/max-infrastructure/docker-deploy
chmod +x SCALEWAY_DEPLOY.sh
./SCALEWAY_DEPLOY.sh
```

**OU Manuel**:

```bash
# Installer Docker
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permissions
chmod 600 .env.production
chmod 600 services/nginx/ssl/*.pem

# Build et démarrer
docker compose build --no-cache
docker compose up -d

# Vérifier
docker compose ps
```

### 3.2 Vérifier Services

```bash
# Healthchecks
curl http://localhost:3005/api/health
curl http://localhost:8080/api/v1/App/user

# Logs
docker compose logs -f max-backend
docker compose logs -f espocrm
docker compose logs -f nginx

# Status
docker compose ps
```

---

## Étape 4: Configuration Post-Déploiement

### 4.1 Configurer EspoCRM

1. **Accès Web**: https://crm.studiomacrea.cloud
2. **Login**: admin / `ESPO_PASSWORD` (depuis .env)
3. **Vérifier Custom Fields**:
   - Administration → Entity Manager → Lead
   - Custom fields présents (industry, status, source, etc.)
4. **Rebuild**:
   ```bash
   docker exec espocrm php command.php rebuild
   docker exec espocrm php command.php clear-cache
   ```

### 4.2 Générer API Key EspoCRM

1. **EspoCRM UI** → User menu → **Preferences** → **API User**
2. **Create API User** ou utiliser existant
3. **Copier API Key**
4. **Mettre à jour .env**:
   ```bash
   # Sur Scaleway
   nano /opt/max-infrastructure/docker-deploy/.env.production
   # Modifier: ESPO_API_KEY=VOTRE_CLE_GENEREE
   ```
5. **Restart MAX**:
   ```bash
   docker compose restart max-backend
   ```

### 4.3 Configurer Green-API Webhook

1. **Green-API Dashboard**: https://console.green-api.com
2. **Instance** → **Webhooks**
3. **Webhook URL**:
   ```
   https://api.max.studiomacrea.cloud/webhooks/greenapi
   ```
4. **Activer**:
   - ✅ Incoming messages
   - ✅ Message status
5. **Test**:
   ```bash
   # Logs MAX
   docker compose logs -f max-backend | grep GREENAPI
   ```

---

## Étape 5: Validation E2E

### Test Complet

1. **Envoyer message WhatsApp** à instance Green-API:
   ```
   Salut MAX, crée un lead pour Test Scaleway, email test@scaleway.com
   ```

2. **Vérifier Logs MAX**:
   ```bash
   docker compose logs -f max-backend
   ```
   Attendu:
   ```
   [GREENAPI_WEBHOOK] Message reçu
   [ChatRoute] Tool calls: update_leads_in_espo
   [ESPO_CLIENT] ✅ Lead créé
   [SUPABASE] Write to max_logs
   ```

3. **Vérifier Lead EspoCRM**: https://crm.studiomacrea.cloud → Leads

4. **Vérifier Supabase**: Table `max_logs` (tenant_id: macrea)

5. **Vérifier Réponse WhatsApp** reçue par utilisateur

**✅ E2E Validé**: Tous les points ci-dessus sans erreur

---

## Commandes Utiles

### Logs
```bash
docker compose logs -f max-backend
docker compose logs -f espocrm
docker compose logs -f nginx
docker compose logs -f mariadb
```

### Restart
```bash
docker compose restart max-backend
docker compose restart espocrm
docker compose restart
```

### Stop/Start
```bash
docker compose down
docker compose up -d
```

### Backup
```bash
cd /opt/max-infrastructure/docker-deploy
./scripts/backup.sh
ls -lh backups/
```

### Rebuild (si changement code)
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

### Shell dans container
```bash
docker exec -it max-backend sh
docker exec -it espocrm bash
docker exec -it mariadb mysql -u root -p
```

---

## Troubleshooting

### Service ne démarre pas
```bash
docker compose logs SERVICE_NAME
docker compose ps
```

### SSL invalide
```bash
openssl s_client -connect api.max.studiomacrea.cloud:443
```

### EspoCRM DB erreur
```bash
docker exec espocrm php command.php check-database
docker exec mariadb mysql -u root -p -e "SHOW DATABASES;"
```

### Webhook non reçu
```bash
# Test manuel
curl -X POST https://api.max.studiomacrea.cloud/webhooks/greenapi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Logs
docker compose logs nginx | grep webhooks
docker compose logs max-backend | grep GREENAPI
```

---

## URLs Finales

- **MAX API**: https://api.max.studiomacrea.cloud
- **MAX Health**: https://api.max.studiomacrea.cloud/api/health
- **EspoCRM**: https://crm.studiomacrea.cloud
- **Webhook Green-API**: https://api.max.studiomacrea.cloud/webhooks/greenapi

---

## Résumé Commandes

```bash
# Local
cp .env.production.example .env.production
# Remplir .env.production

# Upload
scp .env.production root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/
scp cloudflare-origin-*.pem root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/
scp -r max_backend/* root@SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/max-backend/

# Scaleway
ssh root@SCALEWAY_IP
cd /opt && git clone REPO max-infrastructure
cd max-infrastructure/docker-deploy
./SCALEWAY_DEPLOY.sh

# Post-deploy
# 1. Login https://crm.studiomacrea.cloud
# 2. Generate API Key
# 3. Update .env.production ESPO_API_KEY
# 4. docker compose restart max-backend
# 5. Configure Green-API webhook
# 6. Test E2E WhatsApp
```
