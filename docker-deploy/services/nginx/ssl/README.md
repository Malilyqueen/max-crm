# Cloudflare Origin Certificate Setup

## Generate Certificate (Cloudflare Dashboard)

1. Login to Cloudflare Dashboard
2. Select your domain: `studiomacrea.cloud`
3. Navigate to: **SSL/TLS** → **Origin Server**
4. Click: **Create Certificate**

### Configuration:

- **Private key type**: RSA (2048)
- **Certificate validity**: 15 years (recommended)
- **Hostnames**:
  - `*.studiomacrea.cloud`
  - `studiomacrea.cloud`

### Download Files:

1. **Origin Certificate** → Save as `cloudflare-origin-cert.pem`
2. **Private Key** → Save as `cloudflare-origin-key.pem`

### Place Files:

```bash
# On Oracle server
sudo mkdir -p /opt/max-infrastructure/services/nginx/ssl
sudo chmod 700 /opt/max-infrastructure/services/nginx/ssl

# Copy certificates (replace with your actual certificates)
sudo nano /opt/max-infrastructure/services/nginx/ssl/cloudflare-origin-cert.pem
# Paste Origin Certificate (including -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----)

sudo nano /opt/max-infrastructure/services/nginx/ssl/cloudflare-origin-key.pem
# Paste Private Key (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)

# Set permissions
sudo chmod 600 /opt/max-infrastructure/services/nginx/ssl/*.pem
```

## Cloudflare SSL/TLS Settings

After certificate installation, configure Cloudflare:

1. **SSL/TLS** → **Overview**
   - Encryption mode: **Full (strict)** ✅

2. **SSL/TLS** → **Edge Certificates**
   - Always Use HTTPS: **On** ✅
   - Minimum TLS Version: **TLS 1.2** ✅
   - TLS 1.3: **On** ✅
   - Automatic HTTPS Rewrites: **On** ✅

## Verification

After deployment, test SSL:

```bash
# Test api.max.studiomacrea.cloud
curl -v https://api.max.studiomacrea.cloud/api/health

# Test crm.studiomacrea.cloud
curl -v https://crm.studiomacrea.cloud/api/v1/App/user

# Check SSL certificate
openssl s_client -connect api.max.studiomacrea.cloud:443 -servername api.max.studiomacrea.cloud
```

Expected result: Valid SSL certificate issued by Cloudflare Origin CA.
