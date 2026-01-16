# Déploiement Frontend MAX sur Scaleway

## Situation Actuelle

Le frontend WhatsApp Pro est compilé localement mais **pas encore déployé** sur Scaleway 51.159.170.20.

### Infrastructure Existante
- **Backend API**: max-api.studiomacrea.cloud (HTTPS via nginx)
- **EspoCRM**: crm.studiomacrea.cloud (HTTPS via nginx)
- **Frontend**: ❌ Non déployé (CORS configuré pour max.studiomacrea.cloud)

### Ports Actuels
- 80/443: nginx (reverse proxy)
- 3005: max-backend (API Node.js)
- 8080: espocrm

---

## Options de Déploiement

### Option 1: Frontend Statique via Nginx (RECOMMANDÉ)
Servir les fichiers statiques directement depuis nginx

**Avantages**:
- Simple et performant
- Pas de conteneur Node.js supplémentaire
- Cache navigateur optimisé

**Steps**:
1. Créer dossier `/opt/max-infrastructure/max-frontend/dist`
2. Transférer le build Vite
3. Ajouter config nginx pour `max.studiomacrea.cloud`
4. Redémarrer nginx

### Option 2: Conteneur Node.js avec serve
Ajouter service dans docker-compose.yml

**Avantages**:
- Isolation des services
- Logs séparés

**Inconvénients**:
- Plus de ressources (conteneur supplémentaire)
- Overhead Node.js pour fichiers statiques

---

## Déploiement Option 1 (Recommandé)

### 1. Créer Structure Répertoire

```bash
ssh root@51.159.170.20 'mkdir -p /opt/max-infrastructure/max-frontend/dist'
```

### 2. Transférer Build

```bash
cd d:\Macrea\CRM\max_frontend\dist
tar -czf ../frontend-dist.tar.gz .
scp ../frontend-dist.tar.gz root@51.159.170.20:/tmp/

ssh root@51.159.170.20 '
cd /opt/max-infrastructure/max-frontend/dist && \
tar -xzf /tmp/frontend-dist.tar.gz && \
rm /tmp/frontend-dist.tar.gz
'
```

### 3. Créer Config Nginx

Fichier: `/opt/max-infrastructure/nginx/conf.d/max-frontend.conf`

```nginx
server {
    listen 80;
    server_name max.studiomacrea.cloud;

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name max.studiomacrea.cloud;

    ssl_certificate /etc/nginx/ssl/cloudflare-origin-cert.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin-key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cloudflare IPs for real IP detection
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    root /usr/share/nginx/max-frontend;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - all routes → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Monter Volume dans docker-compose.yml

Modifier `nginx` service pour monter le frontend:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
    - ./max-frontend/dist:/usr/share/nginx/max-frontend:ro  # AJOUTER
```

### 5. Redémarrer Nginx

```bash
ssh root@51.159.170.20 'cd /opt/max-infrastructure && docker compose restart nginx'
```

### 6. Tester

```bash
curl -I https://max.studiomacrea.cloud
# Expected: HTTP 200 + HTML content

curl https://max.studiomacrea.cloud
# Expected: Frontend HTML avec <script> tags
```

---

## Vérification DNS

Avant déploiement, vérifier que `max.studiomacrea.cloud` pointe vers 51.159.170.20:

```bash
nslookup max.studiomacrea.cloud
# Expected: 51.159.170.20
```

Si pas configuré, ajouter enregistrement DNS:
- Type: A
- Nom: max
- Valeur: 51.159.170.20
- TTL: 3600

---

## Post-Déploiement

### Test Complet Flow WhatsApp Pro

1. Ouvrir https://max.studiomacrea.cloud
2. Login avec compte macrea
3. Aller dans **Settings → WhatsApp**
4. Vérifier affichage du nouveau `WhatsAppProPanel`
5. Cliquer "🔗 Connecter mon WhatsApp"
6. Vérifier QR code s'affiche
7. Scanner avec téléphone
8. Vérifier connexion détectée (polling)
9. Envoyer message test

---

## Rollback en Cas d'Erreur

```bash
# Restaurer ancien nginx conf
ssh root@51.159.170.20 '
rm /opt/max-infrastructure/nginx/conf.d/max-frontend.conf && \
docker compose restart nginx
'
```

---

## Notes

- Le build Vite est déjà compilé localement dans `d:\Macrea\CRM\max_frontend\dist` (576 kB JS principal)
- CORS déjà configuré dans max-api pour accepter `https://max.studiomacrea.cloud`
- SSL cert Cloudflare origin déjà présent sur serveur
- Pas besoin de rebuild backend - endpoints déjà déployés

---

**Status**: Frontend compilé localement ✅ | Déploiement Scaleway ⏳ EN ATTENTE
