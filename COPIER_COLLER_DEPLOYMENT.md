# DÉPLOIEMENT PAR COPIER/COLLER

Si tu n'as pas accès SSH direct, voici comment déployer via un accès terminal web (comme Contabo Web Console, ou PuTTY avec mot de passe):

## Méthode: Copier/Coller via Terminal Web

### 1. Accès au serveur
- Va sur https://my.contabo.com (ou ton panneau d'hébergement)
- Clique sur "Terminal" ou "Console"
- Ou utilise PuTTY avec ton mot de passe root

### 2. Backup des fichiers actuels

```bash
cd /opt/max-infrastructure
mkdir -p backups/before_phase1
cp max_backend/server.js backups/before_phase1/
cp max_backend/lib/encryption.js backups/before_phase1/
cp max_backend/routes/settings.js backups/before_phase1/
cp max_backend/routes/settings-test.js backups/before_phase1/
```

### 3. Éditer server.js

```bash
nano /opt/max-infrastructure/max_backend/server.js
```

**Trouve la section vers la ligne 120** (cherche `const connectionString =`)

**REMPLACE** cette section:
```javascript
const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.${supabaseRef}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
```

**PAR** ce nouveau code:
```javascript
const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.${supabaseRef}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

// Configuration Pool avec IPv4 forcé pour Supabase
import dns from 'dns';
import { promisify } from 'util';
const resolve4 = promisify(dns.resolve4);

const poolConfig = {
  connectionString,
  ssl: { rejectUnauthorized: false }
};

// Force IPv4 pour éviter ENETUNREACH IPv6 sur serveurs sans IPv6
if (process.env.FORCE_IPV4 === 'true') {
  console.log('🔧 Mode IPv4 forcé activé - Résolution DNS IPv4...');

  // Extraire host, user, password, database du connectionString
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    const [, user, password, host, port, database] = match;

    try {
      // Résoudre l'hostname en IPv4 uniquement
      const ipv4Addresses = await resolve4(host);
      const ipv4 = ipv4Addresses[0];

      console.log(`✅ DNS résolu: ${host} → ${ipv4} (IPv4)`);

      poolConfig.user = user;
      poolConfig.password = password;
      poolConfig.host = ipv4; // Utiliser l'IP IPv4 directement
      poolConfig.port = parseInt(port);
      poolConfig.database = database;
      delete poolConfig.connectionString;
      poolConfig.connectionTimeoutMillis = 10000;
    } catch (dnsError) {
      console.error(`❌ Erreur résolution DNS IPv4 pour ${host}:`, dnsError.message);
      console.log('⚠️ Fallback sur connectionString standard');
    }
  }
}

const pool = new Pool(poolConfig);
```

**Sauvegarder**: Ctrl+O, Enter, Ctrl+X

---

### 4. Ajouter FORCE_IPV4 au .env

```bash
cd /opt/max-infrastructure
echo "FORCE_IPV4=true" >> .env
cat .env | grep FORCE_IPV4  # Vérifier
```

---

### 5. Éditer docker-compose.yml

```bash
nano docker-compose.yml
```

**Trouve** la section `max-backend:` puis `environment:`, et **ajoute** cette ligne:

```yaml
      - FORCE_IPV4=${FORCE_IPV4}
```

Exemple complet:
```yaml
  max-backend:
    environment:
      - NODE_ENV=production
      - PORT=3005
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - CREDENTIALS_ENCRYPTION_KEY=${CREDENTIALS_ENCRYPTION_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - FORCE_IPV4=${FORCE_IPV4}    # ← AJOUTER CETTE LIGNE
```

**Sauvegarder**: Ctrl+O, Enter, Ctrl+X

---

### 6. Rebuild et Redémarrer

```bash
cd /opt/max-infrastructure
docker compose build max-backend
docker compose up -d max-backend
```

---

### 7. Vérifier les logs

```bash
docker compose logs -f max-backend
```

**Cherche ces lignes** (appuie sur Ctrl+C pour sortir):
```
🔧 Mode IPv4 forcé activé - Résolution DNS IPv4...
✅ DNS résolu: db.jcegkuyagbthpbklyawz.supabase.co → 3.xx.xx.xx (IPv4)
[Encryption] ✅ Clé de chiffrement globale valide (32 bytes)
[Encryption] ✅ Test de chiffrement/déchiffrement réussi (per-tenant)
```

**Vérifier absence d'erreur ENETUNREACH:**
```bash
docker compose logs max-backend | grep ENETUNREACH
```
Résultat attendu: **aucune ligne**

---

### 8. Test Final

1. Va sur https://crm.studiomacrea.cloud/settings
2. Rafraîchis la page (Ctrl+F5)
3. Configure Twilio SMS
4. Clique "Sauvegarder"
5. **✅ Attendu**: Pas d'erreur ENETUNREACH!

---

## Alternative: Utiliser WinSCP ou FileZilla

Si tu as WinSCP ou FileZilla:

1. Télécharge les 4 fichiers depuis le serveur:
   - `/opt/max-infrastructure/max_backend/server.js`
   - `/opt/max-infrastructure/max_backend/lib/encryption.js`
   - `/opt/max-infrastructure/max_backend/routes/settings.js`
   - `/opt/max-infrastructure/max_backend/routes/settings-test.js`

2. Remplace-les par ceux de `d:\Macrea\CRM\`

3. Upload les nouveaux fichiers

4. SSH et lance:
   ```bash
   cd /opt/max-infrastructure
   echo "FORCE_IPV4=true" >> .env
   nano docker-compose.yml  # Ajouter FORCE_IPV4
   docker compose build max-backend
   docker compose up -d max-backend
   ```

---

## Besoin d'aide?

Si tu bloques sur une étape, dis-moi où et je te guiderai!