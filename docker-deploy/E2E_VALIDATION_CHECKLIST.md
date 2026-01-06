# MAX Infrastructure - End-to-End Validation Checklist

## Pre-Deployment Validation (Local)

### Local Docker Test
- [ ] `cd docker-deploy && docker-compose build` complète sans erreur
- [ ] `docker-compose up -d` démarre tous les services
- [ ] `docker-compose ps` montre tous les services "healthy"
- [ ] Logs sans erreurs critiques:
  ```bash
  docker-compose logs max-backend | grep -i error
  docker-compose logs espocrm | grep -i error
  docker-compose logs nginx | grep -i error
  ```

### Environment Variables
- [ ] `.env.production.example` rempli et renommé `.env.production`
- [ ] Toutes les variables PLACEHOLDER remplacées par vraies valeurs
- [ ] `.env.production` ajouté à `.gitignore`
- [ ] Permissions `.env.production` = 600

---

## Phase 1: Oracle Infrastructure

### Oracle VM Setup
- [ ] VM accessible via SSH: `ssh user@ORACLE_IP`
- [ ] Docker installé: `docker --version` retourne >= 20.10
- [ ] Docker Compose installé: `docker-compose --version` retourne >= 2.0
- [ ] User dans groupe docker: `groups` contient "docker"
- [ ] Ports 80/443 ouverts (firewall):
  ```bash
  sudo ufw status
  # Ou: sudo iptables -L -n | grep -E '80|443'
  ```

### DNS Configuration
- [ ] `dig api.max.studiomacrea.cloud` pointe vers Oracle IP
- [ ] `dig crm.studiomacrea.cloud` pointe vers Oracle IP
- [ ] TTL propagé (attendre 5-10 min après changement DNS)

### Cloudflare SSL
- [ ] Domain `studiomacrea.cloud` ajouté à Cloudflare
- [ ] SSL/TLS mode: **Full (strict)** (Dashboard → SSL/TLS → Overview)
- [ ] Origin Certificate généré (15 years)
- [ ] Fichiers uploadés sur Oracle:
  ```bash
  ls -la /opt/max-infrastructure/services/nginx/ssl/
  # Doit contenir:
  # - cloudflare-origin-cert.pem (644)
  # - cloudflare-origin-key.pem (600)
  ```
- [ ] Edge Certificates:
  - Always Use HTTPS: **On**
  - Min TLS: **1.2**
  - TLS 1.3: **On**

---

## Phase 2: Deployment

### Git Repository
- [ ] Code MAX backend pushé vers Git
- [ ] Repository accessible depuis Oracle
- [ ] `.gitignore` contient:
  ```
  .env.production
  .env.local
  node_modules
  *.log
  ```

### Deployment Execution
- [ ] Code cloné sur Oracle: `/opt/max-infrastructure/`
- [ ] Ownership correcte: `ls -la /opt/max-infrastructure/`
- [ ] `.env.production` créé et rempli
- [ ] Custom EspoCRM copié:
  ```bash
  ls -la /opt/max-infrastructure/docker-deploy/services/espocrm/custom-backup/custom/
  ```
- [ ] MAX backend code copié:
  ```bash
  ls -la /opt/max-infrastructure/docker-deploy/services/max-backend/package.json
  ```
- [ ] Deployment exécuté: `./scripts/deploy.sh`
- [ ] Tous les containers démarrés: `docker-compose ps`

### Services Health
- [ ] **max-backend**: `docker inspect max-backend | grep -A 5 Health` → "healthy"
- [ ] **espocrm**: `docker inspect espocrm | grep -A 5 Health` → "healthy"
- [ ] **mariadb**: `docker inspect mariadb | grep -A 5 Health` → "healthy"
- [ ] **nginx**: `docker inspect nginx | grep -A 5 Health` → "healthy"

---

## Phase 3: Service-Level Validation

### MAX Backend
- [ ] **HTTP Health Check**:
  ```bash
  curl -i http://ORACLE_IP:3005/api/health
  # Expected: 200 OK + JSON {"ok":true,"pid":...}
  ```
- [ ] **HTTPS via Cloudflare**:
  ```bash
  curl -i https://api.max.studiomacrea.cloud/api/health
  # Expected: 200 OK + valid SSL
  ```
- [ ] **Logs clean**:
  ```bash
  docker-compose logs max-backend | tail -50
  # No ECONNREFUSED, no 500 errors
  ```

### EspoCRM
- [ ] **HTTP Health Check**:
  ```bash
  curl -i http://ORACLE_IP:8080/api/v1/App/user
  # Expected: 401 (auth required) ou 200 si API key passé
  ```
- [ ] **HTTPS via Cloudflare**:
  ```bash
  curl -i https://crm.studiomacrea.cloud/
  # Expected: 200 OK + HTML page
  ```
- [ ] **Web UI accessible**: https://crm.studiomacrea.cloud
- [ ] **Login admin fonctionne** (credentials depuis `.env.production`)
- [ ] **Custom fields visibles**:
  - Administration → Entity Manager → Lead
  - Vérifier: `industry`, `status`, `source`, etc.

### MariaDB
- [ ] **Database accessible**:
  ```bash
  docker exec mariadb mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SHOW DATABASES;"
  # Expected: espocrm database listé
  ```
- [ ] **Tables EspoCRM présentes**:
  ```bash
  docker exec mariadb mysql -u espocrm -p${ESPO_DB_PASSWORD} espocrm -e "SHOW TABLES;"
  # Expected: lead, contact, account, etc.
  ```

### Nginx
- [ ] **Config syntax valid**:
  ```bash
  docker exec nginx nginx -t
  # Expected: syntax is ok, test is successful
  ```
- [ ] **SSL certificate valid**:
  ```bash
  openssl s_client -connect api.max.studiomacrea.cloud:443 -servername api.max.studiomacrea.cloud < /dev/null 2>&1 | grep -A 2 "Verify return code"
  # Expected: Verify return code: 0 (ok)
  ```
- [ ] **Logs access**:
  ```bash
  docker-compose logs nginx | grep -E 'GET|POST'
  # Expected: requests logged
  ```

---

## Phase 4: Integration Validation

### Supabase → MAX
- [ ] **Variables env présentes**:
  ```bash
  docker exec max-backend env | grep SUPABASE
  # Expected: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
  ```
- [ ] **Connection test** (dans container):
  ```bash
  docker exec max-backend node -e "
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  supabase.from('max_logs').select('*').limit(1).then(d => console.log('✅ Supabase OK:', d.data ? d.data.length : 0)).catch(e => console.error('❌ Error:', e.message));
  "
  ```
- [ ] **RLS policies actives** (Supabase Dashboard → Authentication → Policies)

### MAX → EspoCRM
- [ ] **Variables env présentes**:
  ```bash
  docker exec max-backend env | grep ESPO
  # Expected: ESPO_BASE_URL=http://espocrm:8080/api/v1, ESPO_API_KEY=...
  ```
- [ ] **API Key configurée**:
  - EspoCRM → User Menu → Preferences → API User
  - Generate/copy key
  - Update `.env.production` → Restart MAX: `docker-compose restart max-backend`
- [ ] **Test création Lead** (via MAX API):
  ```bash
  curl -X POST https://api.max.studiomacrea.cloud/api/chat \
    -H "Content-Type: application/json" \
    -d '{
      "tenant": "macrea",
      "session": "test-e2e",
      "message": "Crée un lead: Test Validation, email test@max.com, téléphone +33612345678"
    }'
  # Expected: MAX crée le lead, retourne success
  ```
- [ ] **Lead visible dans EspoCRM**: https://crm.studiomacrea.cloud

### Green-API → MAX
- [ ] **Webhook configuré** (Green-API Dashboard):
  ```
  Webhook URL: https://api.max.studiomacrea.cloud/webhooks/greenapi
  ```
- [ ] **Types activés**: Incoming messages, Message status
- [ ] **Test webhook** (bouton Test dans Green-API):
  ```bash
  # Vérifier logs MAX
  docker-compose logs -f max-backend | grep GREENAPI
  # Expected: [GREENAPI_WEBHOOK] Message reçu
  ```

---

## Phase 5: End-to-End Flow (CRITICAL)

### E2E Test: WhatsApp → MAX → EspoCRM → Supabase → WhatsApp

**Préparation:**
- [ ] Instance Green-API active et connectée
- [ ] Téléphone test ajouté (ex: Rija +1 514 641 2055)

**Étape 1: Envoi Message WhatsApp**
- [ ] Envoyer message WhatsApp à l'instance Green-API:
  ```
  "Salut MAX, crée un lead pour Test E2E, email e2e@test.com, téléphone +33600000000"
  ```

**Étape 2: MAX Reçoit Webhook**
- [ ] **Logs MAX** montrent webhook reçu:
  ```bash
  docker-compose logs -f max-backend
  # Expected:
  # [GREENAPI_WEBHOOK] Message reçu
  # [ChatRoute] Parsing message: "Salut MAX, crée un lead..."
  # [ChatRoute] Tool calls détectés: update_leads_in_espo
  ```

**Étape 3: MAX Crée Lead dans EspoCRM**
- [ ] **Logs MAX** montrent création Lead:
  ```
  # [ESPO_CLIENT] 🔍 Request: POST http://espocrm:8080/api/v1/Lead
  # [ESPO_CLIENT] ✅ Lead créé: {id: "..."}
  ```
- [ ] **EspoCRM UI** montre nouveau lead:
  - https://crm.studiomacrea.cloud → Leads
  - Nom: "E2E"
  - Prénom: "Test"
  - Email: e2e@test.com

**Étape 4: MAX Écrit dans Supabase**
- [ ] **Logs MAX** montrent écriture Supabase:
  ```
  # [SUPABASE] Write to max_logs: {...}
  # [SUPABASE] Update tenant_memory: {...}
  ```
- [ ] **Supabase Dashboard** montre nouvelles données:
  - Table `max_logs`: nouvelle entrée (action: "lead_created")
  - Table `tenant_memory`: contexte mis à jour (tenant_id: "macrea")

**Étape 5: MAX Répond via WhatsApp**
- [ ] **Logs MAX** montrent envoi réponse:
  ```
  # [send_whatsapp_greenapi] Envoi WhatsApp direct à +33600000000
  # [GREEN-API] ✅ Success: {idMessage: "..."}
  ```
- [ ] **Utilisateur reçoit réponse** WhatsApp:
  ```
  "✅ Lead créé avec succès: Test E2E (e2e@test.com)"
  ```

**✅ VALIDATION E2E COMPLÈTE SI:**
- Tous les logs ci-dessus présents SANS erreurs
- Lead créé dans EspoCRM
- Logs dans Supabase
- Réponse WhatsApp reçue

---

## Phase 6: Performance & Monitoring

### Load Test (Optional)
- [ ] **100 requêtes API**:
  ```bash
  for i in {1..100}; do
    curl -s https://api.max.studiomacrea.cloud/api/health > /dev/null &
  done
  wait
  ```
- [ ] MAX Backend reste healthy
- [ ] Latence < 500ms (vérifier Cloudflare Analytics)

### Resource Usage
- [ ] **Docker stats**:
  ```bash
  docker stats --no-stream
  # MAX Backend: < 512MB RAM
  # EspoCRM: < 1GB RAM
  # MariaDB: < 512MB RAM
  # Nginx: < 50MB RAM
  ```

### Logs Monitoring
- [ ] **Logs accessibles**:
  ```bash
  docker-compose logs --tail=100
  ```
- [ ] **Nginx access logs** capturent requêtes:
  ```bash
  docker exec nginx tail -50 /var/log/nginx/access.log
  ```
- [ ] **Erreurs 5xx < 1%** (si traffic réel)

---

## Phase 7: Backup & Disaster Recovery

### Backup Test
- [ ] **Script backup exécuté**:
  ```bash
  ./scripts/backup.sh
  ```
- [ ] **Fichiers créés**:
  ```bash
  ls -lh backups/
  # Expected:
  # - espocrm_db_YYYYMMDD_HHMMSS.sql.gz
  # - custom_YYYYMMDD_HHMMSS.tar.gz
  # - max_data_YYYYMMDD_HHMMSS.tar.gz
  ```

### Restore Test (Optional)
- [ ] Restauration DB testée (environnement staging)
- [ ] Custom files restaurés
- [ ] MAX data restauré

---

## Phase 8: Security Audit

### SSL/TLS
- [ ] **SSL Labs Test** (A+ rating):
  ```
  https://www.ssllabs.com/ssltest/analyze.html?d=api.max.studiomacrea.cloud
  ```
- [ ] **Headers sécurité** présents:
  ```bash
  curl -I https://api.max.studiomacrea.cloud | grep -E 'Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options'
  ```

### Secrets Management
- [ ] `.env.production` non committé (vérifier Git)
- [ ] Permissions `.env.production` = 600
- [ ] API Keys > 32 chars
- [ ] Passwords > 20 chars (mixed case, numbers, symbols)

### Firewall
- [ ] **Ports exposés** (seulement 80/443):
  ```bash
  sudo netstat -tuln | grep LISTEN
  # Expected: 80, 443, 22 (SSH)
  # NOT: 3005, 8080, 3306 (internal only)
  ```

### Container Security
- [ ] **Containers run as non-root**:
  ```bash
  docker exec max-backend whoami
  # Expected: node (not root)
  ```
- [ ] **Images à jour** (pas de CVE critiques):
  ```bash
  docker scan max-backend
  ```

---

## Phase 9: Documentation Finale

- [ ] **README.md** à jour (root du repo)
- [ ] **DEPLOYMENT_GUIDE.md** accessible et clair
- [ ] **E2E_VALIDATION_CHECKLIST.md** (ce fichier) complété
- [ ] **Runbook** créé (procédures urgence)
- [ ] **Contacts** documentés (admin, support, escalation)

---

## Sign-Off

### Pre-Production
- [ ] **Toutes les checkboxes ci-dessus cochées**
- [ ] **E2E test réussi au moins 3 fois de suite**
- [ ] **0 erreurs critiques dans logs (24h monitoring)**
- [ ] **Backup automatique configuré (cron)**

### Production Ready
- [ ] **Validation technique**: _________________ (Nom + Date)
- [ ] **Validation métier**: _________________ (Nom + Date)
- [ ] **Go Live approuvé**: _________________ (Nom + Date)

---

## Rollback Plan (Si Problème)

### Rollback Immédiat
```bash
# Stop Docker
docker-compose down

# Revert code
git checkout PREVIOUS_STABLE_TAG

# Restart
docker-compose up -d
```

### Restore Database
```bash
# Unzip backup
gunzip backups/espocrm_db_YYYYMMDD_HHMMSS.sql.gz

# Import
docker exec -i mariadb mysql -u root -p${MYSQL_ROOT_PASSWORD} espocrm < backups/espocrm_db_YYYYMMDD_HHMMSS.sql
```

### Support Escalation
- **Level 1**: Check logs (`docker-compose logs`)
- **Level 2**: Restart services (`docker-compose restart`)
- **Level 3**: Full redeploy (`./scripts/deploy.sh`)
- **Level 4**: Restore backup + contact infrastructure admin
