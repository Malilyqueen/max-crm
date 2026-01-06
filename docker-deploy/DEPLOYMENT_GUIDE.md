# MAX Infrastructure - Scaleway Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE (SSL/DDoS/Cache)                 │
│  - Full (strict) SSL Mode                                    │
│  - Origin Certificate (15-year)                              │
│  - Rate limiting & WAF                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│           SCALEWAY UBUNTU 22.04 (Docker Infrastructure)      │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ Nginx (HTTPS)  │  │  MAX Backend   │  │   EspoCRM      ││
│  │ :80, :443      │→ │  Node.js:3005  │→ │  PHP:8080      ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                            ↓                      ↓          │
│                      ┌────────────────────────────────┐     │
│                      │     MariaDB :3306              │     │
│                      │     (EspoCRM DB)               │     │
│                      └────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (External - Mémoire MAX)           │
│  - tenant_memory, max_logs, sessions                        │
│  - RLS policies (tenant_id isolation)                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Scaleway Server Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 50GB minimum
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### DNS Configuration
- `api.max.studiomacrea.cloud` → Scaleway Server IP
- `crm.studiomacrea.cloud` → Scaleway Server IP

### Cloudflare Setup
- Domain added to Cloudflare
- SSL/TLS mode: **Full (strict)**
- Origin Certificate generated (see below)

---

## Step 1: Install Docker on Scaleway

```bash
# SSH to Scaleway
ssh root@YOUR_SCALEWAY_IP

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Logout and login again for group changes
exit
```

---

## Step 2: Generate Cloudflare Origin Certificate

1. **Cloudflare Dashboard** → Select `studiomacrea.cloud`
2. **SSL/TLS** → **Origin Server** → **Create Certificate**

### Configuration:
- **Private key type**: RSA (2048)
- **Certificate validity**: 15 years
- **Hostnames**:
  - `*.studiomacrea.cloud`
  - `studiomacrea.cloud`

3. **Download and save**:
   - Origin Certificate → Copy content
   - Private Key → Copy content

4. **Upload to Scaleway**:

```bash
# SSH to Scaleway
ssh root@YOUR_SCALEWAY_IP

# Create SSL directory (will be created later with full deployment)
sudo mkdir -p /opt/max-infrastructure/services/nginx/ssl
sudo chmod 700 /opt/max-infrastructure/services/nginx/ssl

# Create certificate file
sudo nano /opt/max-infrastructure/services/nginx/ssl/cloudflare-origin-cert.pem
# Paste Origin Certificate (including -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----)

# Create private key file
sudo nano /opt/max-infrastructure/services/nginx/ssl/cloudflare-origin-key.pem
# Paste Private Key (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)

# Set permissions
sudo chmod 600 /opt/max-infrastructure/services/nginx/ssl/*.pem
```

5. **Configure Cloudflare SSL Settings**:
   - **SSL/TLS** → **Overview** → Encryption mode: **Full (strict)**
   - **SSL/TLS** → **Edge Certificates**:
     - Always Use HTTPS: **On**
     - Minimum TLS Version: **TLS 1.2**
     - TLS 1.3: **On**

---

## Step 3: Clone Repository on Scaleway

```bash
# SSH to Scaleway
ssh root@YOUR_SCALEWAY_IP

# Clone repository
sudo mkdir -p /opt
cd /opt
sudo git clone YOUR_GIT_REPO_URL max-infrastructure
cd max-infrastructure/docker-deploy

# Set ownership
sudo chown -R $USER:$USER /opt/max-infrastructure
```

---

## Step 4: Configure Environment Variables

```bash
cd /opt/max-infrastructure/docker-deploy

# Copy example and edit
cp .env.production.example .env.production
nano .env.production
```

### Fill with real values:

```env
# Supabase (from Supabase Dashboard)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=YOUR_ANON_KEY

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY

# Database
MYSQL_ROOT_PASSWORD=GENERATE_STRONG_PASSWORD
ESPO_DB_PASSWORD=GENERATE_STRONG_PASSWORD

# EspoCRM Admin
ESPO_API_KEY=GENERATE_API_KEY_AFTER_FIRST_DEPLOY
ESPO_USERNAME=admin
ESPO_PASSWORD=GENERATE_STRONG_PASSWORD

# Green-API
GREENAPI_INSTANCE_ID=YOUR_INSTANCE_ID
GREENAPI_API_TOKEN=YOUR_TOKEN

# JWT
JWT_SECRET=GENERATE_MIN_32_CHARS_SECRET

# SMTP
SMTP_USER=YOUR_EMAIL@malalacrea.fr
SMTP_PASSWORD=YOUR_PASSWORD
SMTP_FROM=YOUR_EMAIL@malalacrea.fr
```

**IMPORTANT**: Never commit `.env.production` to Git!

```bash
# Secure .env file
chmod 600 .env.production
```

---

## Step 5: Copy MAX Backend Code

The `services/max-backend/` directory needs to contain the actual MAX backend code.

```bash
cd /opt/max-infrastructure/docker-deploy/services/max-backend

# Copy from local development (or use Git)
# Option 1: Git submodule (recommended)
git submodule add YOUR_MAX_BACKEND_REPO .

# Option 2: Copy files directly
# rsync -av /local/path/to/max_backend/ .

# Verify package.json exists
ls -la package.json
```

---

## Step 6: Deploy Infrastructure

```bash
cd /opt/max-infrastructure/docker-deploy

# Run deployment script
./scripts/deploy.sh
```

### Manual deployment (if script fails):

```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f max-backend
docker-compose logs -f espocrm
```

---

## Step 7: Configure EspoCRM

1. **Access EspoCRM**: https://crm.studiomacrea.cloud

2. **First-time setup** (if fresh install):
   - Language: English or Français
   - Database: Already configured via Docker
   - Admin user: Use `ESPO_USERNAME` and `ESPO_PASSWORD` from `.env`

3. **Custom fields migration**:
   - Custom fields from XAMPP are already mounted via Docker volume
   - EspoCRM will detect them automatically
   - Navigate to: **Administration** → **Entity Manager** → **Lead**
   - Verify custom fields are present

4. **Generate API Key**:
   - Login as admin
   - **User menu** → **Preferences** → **API User**
   - Create new API user or use existing
   - Copy API Key → Update `.env.production`:
     ```bash
     nano /opt/max-infrastructure/docker-deploy/.env.production
     # Set ESPO_API_KEY=YOUR_GENERATED_KEY
     ```
   - Restart MAX Backend:
     ```bash
     docker-compose restart max-backend
     ```

5. **Rebuild & Clear Cache**:
   ```bash
   docker exec espocrm php command.php rebuild
   docker exec espocrm php command.php clear-cache
   ```

---

## Step 8: Configure Green-API Webhooks

1. **Green-API Dashboard**: https://console.green-api.com

2. **Select your instance** (created yesterday)

3. **Webhooks** → **Webhook URL**:
   ```
   https://api.max.studiomacrea.cloud/webhooks/greenapi
   ```

4. **Enable webhook types**:
   - ✅ Incoming messages
   - ✅ Message status
   - ✅ Device status (optional)

5. **Test webhook**:
   - Click "Test" button in Green-API dashboard
   - Check MAX logs:
     ```bash
     docker-compose logs -f max-backend | grep GREENAPI
     ```

---

## Step 9: End-to-End Validation

### E2E Test Checklist

#### Infrastructure
- [ ] `docker-compose ps` shows all services healthy
- [ ] `curl https://api.max.studiomacrea.cloud/api/health` returns 200
- [ ] `curl https://crm.studiomacrea.cloud/api/v1/App/user` returns user data

#### Supabase Integration
```bash
# SSH to Oracle
docker-compose exec max-backend node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('max_logs').select('*').limit(1).then(console.log);
"
```
- [ ] No errors, returns data or empty array

#### EspoCRM Integration
```bash
# Test Lead creation
curl -X POST https://crm.studiomacrea.cloud/api/v1/Lead \
  -H "X-Api-Key: YOUR_ESPO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Docker",
    "status": "New"
  }'
```
- [ ] Returns created Lead with ID

#### WhatsApp E2E Flow
1. **Send WhatsApp message** to Green-API instance
2. **Check logs**:
   ```bash
   docker-compose logs -f max-backend
   ```
   - [ ] `[GREENAPI_WEBHOOK] Message reçu`
   - [ ] `[ChatRoute] Tool calls détectés`
   - [ ] `[ESPO_CLIENT] Request: POST .../Lead`
   - [ ] `[SUPABASE] Write to max_logs`
3. **Verify Lead in EspoCRM**: https://crm.studiomacrea.cloud
4. **Verify log in Supabase**: Check `max_logs` table
5. **Verify WhatsApp response** received by user

---

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f max-backend
docker-compose logs -f espocrm
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 max-backend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart max-backend
```

### Update Deployment
```bash
cd /opt/max-infrastructure/docker-deploy
./scripts/deploy.sh
```

### Backup
```bash
cd /opt/max-infrastructure/docker-deploy
./scripts/backup.sh
```

### Check Resource Usage
```bash
docker stats
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs SERVICE_NAME

# Check health
docker inspect CONTAINER_NAME | grep -A 10 Health
```

### SSL Certificate Issues
```bash
# Verify certificate
openssl s_client -connect api.max.studiomacrea.cloud:443 -servername api.max.studiomacrea.cloud

# Check Nginx config
docker exec nginx nginx -t
```

### Database Connection Issues
```bash
# Check MariaDB
docker exec mariadb mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SHOW DATABASES;"

# Check EspoCRM database
docker exec espocrm php command.php check-database
```

### Webhook Not Received
```bash
# Check Nginx logs
docker-compose logs nginx | grep webhooks

# Check MAX logs
docker-compose logs max-backend | grep GREENAPI

# Test webhook manually
curl -X POST https://api.max.studiomacrea.cloud/webhooks/greenapi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Security Checklist

- [ ] `.env.production` permissions set to 600
- [ ] Cloudflare SSL mode: Full (strict)
- [ ] Strong passwords (20+ chars, mixed case, numbers, symbols)
- [ ] API keys rotated regularly
- [ ] Firewall configured (only 80/443 open)
- [ ] Regular backups enabled
- [ ] Docker containers run as non-root
- [ ] Supabase RLS policies enabled

---

## Multi-Tenant Strategy (Future)

Current MVP: Single EspoCRM instance with `tenant_id` custom field

### When to scale:
- **Option A** (current): 1 EspoCRM shared, tenant filtering in MAX
- **Option B** (10+ tenants): Dynamic EspoCRM instances per tenant

### Implementation (Option B):
```yaml
# docker-compose.yml
services:
  espocrm-macrea:
    # ...
  espocrm-client2:
    # ...
```

MAX backend would route requests based on `tenant_id`.

---

## Support

**Issues**: Contact your infrastructure admin
**Logs**: `/opt/max-infrastructure/docker-deploy/logs/`
**Backups**: `/opt/max-infrastructure/docker-deploy/backups/`
