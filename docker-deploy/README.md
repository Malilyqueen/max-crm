# MAX Infrastructure - Scaleway Docker Deployment

Production-ready Docker infrastructure for MAX AI Assistant with EspoCRM integration.

**Infrastructure**: Scaleway Ubuntu 22.04 + Docker + Cloudflare SSL

## Quick Start

```bash
# 1. Copy environment template
cp .env.production.example .env.production

# 2. Fill with real values (Supabase, OpenAI, Green-API, etc.)
nano .env.production

# 3. Deploy
./scripts/deploy.sh

# 4. Verify
docker-compose ps
curl https://api.max.studiomacrea.cloud/api/health
```

## Architecture

```
Cloudflare (SSL/WAF) → Nginx (Reverse Proxy)
                         ↓
         ┌───────────────┴──────────────┐
         ↓                              ↓
    MAX Backend                    EspoCRM
    (Node.js:3005)                 (PHP:8080)
         ↓                              ↓
    Supabase (External)            MariaDB
```

## Services

### MAX Backend
- **Port**: 3005 (internal)
- **Public URL**: https://api.max.studiomacrea.cloud
- **Health**: `GET /api/health`
- **Webhooks**: `POST /webhooks/greenapi`

### EspoCRM
- **Port**: 8080 (internal)
- **Public URL**: https://crm.studiomacrea.cloud
- **API**: `/api/v1/`
- **Custom fields**: Auto-loaded from `services/espocrm/custom-backup/`

### MariaDB
- **Port**: 3306 (internal only)
- **Database**: espocrm
- **Backups**: Auto via `scripts/backup.sh`

### Nginx
- **Ports**: 80 (HTTP redirect), 443 (HTTPS)
- **SSL**: Cloudflare Origin Certificate (15 years)
- **Rate Limiting**: 100 req/min (API), 200 req/min (webhooks)

## File Structure

```
docker-deploy/
├── docker-compose.yml              # Stack definition
├── .env.production.example         # Environment template
├── .env.production                 # Real secrets (NOT in Git)
│
├── services/
│   ├── max-backend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── (copy MAX code here)
│   │
│   ├── espocrm/
│   │   ├── Dockerfile
│   │   └── custom-backup/          # Exported custom fields
│   │       └── custom/
│   │
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── api.max.studiomacrea.cloud.conf
│   │   │   └── crm.studiomacrea.cloud.conf
│   │   └── ssl/
│   │       ├── cloudflare-origin-cert.pem
│   │       └── cloudflare-origin-key.pem
│   │
│   └── mariadb/
│       └── backup/
│
├── scripts/
│   ├── deploy.sh                   # Deployment automation
│   └── backup.sh                   # Backup automation
│
├── docs/
│   ├── DEPLOYMENT_GUIDE.md         # Full deployment guide
│   └── E2E_VALIDATION_CHECKLIST.md # Validation checklist
│
└── backups/                        # Auto-generated backups
```

## Prerequisites

### Scaleway Server
- Ubuntu 22.04 (recommended)
- 4GB RAM minimum (8GB recommended)
- 50GB storage
- Docker 20.10+
- Docker Compose 2.0+

### Cloudflare
- Domain added to Cloudflare
- SSL/TLS mode: **Full (strict)**
- Origin Certificate generated (see `services/nginx/ssl/README.md`)

### DNS
- `api.max.studiomacrea.cloud` → Scaleway IP (Cloudflare Proxied)
- `crm.studiomacrea.cloud` → Scaleway IP (Cloudflare Proxied)

## Environment Variables

Critical variables (see `.env.production.example`):

### Supabase (REQUIRED)
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### OpenAI (REQUIRED)
```env
OPENAI_API_KEY=sk-proj-YOUR_KEY
```

### Green-API WhatsApp (REQUIRED)
```env
GREENAPI_INSTANCE_ID=YOUR_INSTANCE_ID
GREENAPI_API_TOKEN=YOUR_TOKEN
```

### EspoCRM (REQUIRED)
```env
ESPO_API_KEY=GENERATE_AFTER_FIRST_DEPLOY
ESPO_USERNAME=admin
ESPO_PASSWORD=YOUR_STRONG_PASSWORD
```

## Deployment

### Initial Deployment

1. **Prepare MAX Backend Code**:
   ```bash
   cd services/max-backend
   # Copy your MAX backend code here
   # OR: git submodule add YOUR_REPO .
   ```

2. **Configure Environment**:
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # Fill with real values
   chmod 600 .env.production
   ```

3. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Redeploy
./scripts/deploy.sh
```

## Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f max-backend
docker-compose logs -f espocrm
docker-compose logs -f nginx
```

### Restart Services
```bash
docker-compose restart max-backend
docker-compose restart espocrm
```

### Backup
```bash
./scripts/backup.sh
```

Backups location: `backups/`
- Database: `espocrm_db_YYYYMMDD_HHMMSS.sql.gz`
- Custom files: `custom_YYYYMMDD_HHMMSS.tar.gz`
- MAX data: `max_data_YYYYMMDD_HHMMSS.tar.gz`

### Health Checks

```bash
# MAX Backend
curl https://api.max.studiomacrea.cloud/api/health

# EspoCRM
curl https://crm.studiomacrea.cloud/api/v1/App/user

# Docker services
docker-compose ps
```

## End-to-End Test

### E2E Flow Validation

1. **Send WhatsApp** message to Green-API instance:
   ```
   "Salut MAX, crée un lead pour Test E2E, email e2e@test.com"
   ```

2. **Check Logs**:
   ```bash
   docker-compose logs -f max-backend
   ```
   Expected:
   - `[GREENAPI_WEBHOOK] Message reçu`
   - `[ChatRoute] Tool calls détectés: update_leads_in_espo`
   - `[ESPO_CLIENT] ✅ Lead créé`
   - `[SUPABASE] Write to max_logs`

3. **Verify Lead in EspoCRM**: https://crm.studiomacrea.cloud

4. **Verify Log in Supabase**: Check `max_logs` table

5. **Verify WhatsApp Response** received by user

**✅ E2E Complete**: WhatsApp → MAX → EspoCRM → Supabase → WhatsApp

## Multi-Tenant

Current implementation: **Single EspoCRM instance** with `tenant_id` filtering in MAX.

### Tenant Isolation

- **Supabase**: Full isolation via RLS policies (`tenant_id`)
- **MAX**: Filters all EspoCRM queries by `tenant_id`
- **EspoCRM**: Shared instance (custom field `tenantId` on entities)

**Note**: Zero cross-tenant data access enforced at application layer.

## Security

### SSL/TLS
- **Cloudflare**: Full (strict) mode
- **Nginx**: HTTPS with Origin Certificate
- **TLS**: 1.2 minimum, 1.3 enabled

### Secrets
- `.env.production`: Never committed to Git
- Permissions: 600 (owner read/write only)
- API keys: 32+ chars
- Passwords: 20+ chars (mixed case, numbers, symbols)

### Network
- **Exposed ports**: 80, 443 (Nginx only)
- **Internal**: 3005 (MAX), 8080 (EspoCRM), 3306 (MariaDB)
- **Firewall**: UFW or iptables configured

### Containers
- **Non-root**: All containers run as non-root users
- **Read-only**: Custom files mounted read-only where possible

## Troubleshooting

### Service Won't Start
```bash
docker-compose logs SERVICE_NAME
docker inspect CONTAINER_NAME | grep -A 10 Health
```

### SSL Issues
```bash
openssl s_client -connect api.max.studiomacrea.cloud:443
docker exec nginx nginx -t
```

### Database Issues
```bash
docker exec mariadb mysql -u root -p -e "SHOW DATABASES;"
docker exec espocrm php command.php check-database
```

### Webhook Not Received
```bash
docker-compose logs nginx | grep webhooks
docker-compose logs max-backend | grep GREENAPI

# Test webhook
curl -X POST https://api.max.studiomacrea.cloud/webhooks/greenapi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Full deployment instructions
- **[E2E_VALIDATION_CHECKLIST.md](E2E_VALIDATION_CHECKLIST.md)**: Complete validation checklist
- **[services/nginx/ssl/README.md](services/nginx/ssl/README.md)**: Cloudflare Origin Certificate setup

## Support

- **Issues**: Check logs (`docker-compose logs`)
- **Restarts**: `docker-compose restart`
- **Rollback**: `git checkout STABLE_TAG && ./scripts/deploy.sh`
- **Restore**: See `scripts/backup.sh` for backup/restore procedures

## License

Proprietary - Macrea CRM
