# DÉPLOIEMENT GREEN-API SETTINGS INTEGRATION - MODE SAFE

**Date**: 12 janvier 2026
**Serveur**: Scaleway (51.159.170.20)
**Fichiers**: sendWhatsapp.js, whatsappHelper.js

---

## ÉTAPE 1: BACKUP

```bash
ssh root@51.159.170.20

cd /opt/max-infrastructure/max_backend
mkdir -p backups/greenapi_settings_$(date +%Y%m%d_%H%M%S)
cp actions/sendWhatsapp.js backups/greenapi_settings_$(date +%Y%m%d_%H%M%S)/
cp lib/whatsappHelper.js backups/greenapi_settings_$(date +%Y%m%d_%H%M%S)/
echo "✅ Backup créé"
```

---

## ÉTAPE 2: TRANSFERT FICHIERS (depuis Windows PowerShell local)

```powershell
# Transférer sendWhatsapp.js
scp "d:\Macrea\CRM\max_backend\actions\sendWhatsapp.js" root@51.159.170.20:/opt/max-infrastructure/max_backend/actions/sendWhatsapp.js

# Transférer whatsappHelper.js
scp "d:\Macrea\CRM\max_backend\lib\whatsappHelper.js" root@51.159.170.20:/opt/max-infrastructure/max_backend/lib/whatsappHelper.js
```

---

## ÉTAPE 3: VÉRIFIER FICHIERS TRANSFÉRÉS

```bash
ssh root@51.159.170.20

# Vérifier taille et date
ls -lh /opt/max-infrastructure/max_backend/actions/sendWhatsapp.js
ls -lh /opt/max-infrastructure/max_backend/lib/whatsappHelper.js

# Vérifier contenu (premières lignes)
head -20 /opt/max-infrastructure/max_backend/actions/sendWhatsapp.js | grep "Priorité"
```

**Attendu**: Doit voir le commentaire "Priorité: 1. Credentials depuis Settings API"

---

## ÉTAPE 4: REBUILD CONTAINER (sans downtime)

```bash
cd /opt/max-infrastructure

# Rebuild max-backend
docker compose build max-backend

# Redémarrer progressivement
docker compose up -d max-backend
```

---

## ÉTAPE 5: VÉRIFIER LOGS DÉMARRAGE

```bash
docker compose logs -f max-backend
```

**Chercher ces lignes** (Ctrl+C pour sortir):
- ✅ `M.A.X. server P1 listening on http://127.0.0.1:3005`
- ✅ `[Encryption] ✅ Clé de chiffrement globale valide`
- ✅ Aucune erreur import/module

---

## ÉTAPE 6: TEST CONNEXION POSTGRESQL

```bash
docker exec max-backend node -e "const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});pool.query('SELECT 1').then(()=>{console.log('✅ DB OK');pool.end()}).catch(e=>{console.error('❌',e.message);pool.end()})"
```

**Attendu**: `✅ DB OK`

---

## ÉTAPE 7: TEST ENDPOINT SETTINGS PROVIDERS

```bash
# Test liste providers (doit retourner le provider twilio_sms créé avant)
docker exec max-backend curl -s -H "X-Tenant: macrea" -H "Authorization: Bearer test" http://localhost:3005/api/settings/providers
```

**Attendu**: JSON avec le provider Twilio SMS existant

---

## ÉTAPE 8: TEST CRÉATION PROVIDER GREENAPI (OPTIONNEL)

```bash
docker exec max-backend curl -s -X POST \
  -H "X-Tenant: macrea" \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "greenapi_whatsapp",
    "provider_name": "WhatsApp Test",
    "credentials": {
      "instanceId": "7105440259",
      "token": "test_token_123"
    },
    "is_active": false
  }' \
  http://localhost:3005/api/settings/providers
```

**Attendu**:
```json
{
  "success": true,
  "provider": {
    "id": 2,
    "provider_type": "greenapi_whatsapp",
    ...
  }
}
```

---

## ÉTAPE 9: VÉRIFIER EN BASE

```bash
docker exec max-backend node -e "const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});pool.query(\"SELECT id, provider_type, provider_name, connection_status FROM tenant_provider_configs WHERE tenant_id='macrea'\").then(r=>{console.log(r.rows);pool.end()}).catch(e=>{console.error(e.message);pool.end()})"
```

**Attendu**: Liste avec `twilio_sms` et potentiellement `greenapi_whatsapp`

---

## ROLLBACK (si problème)

```bash
cd /opt/max-infrastructure/max_backend

# Restaurer backup
BACKUP_DIR=$(ls -td backups/greenapi_settings_* | head -1)
cp $BACKUP_DIR/sendWhatsapp.js actions/
cp $BACKUP_DIR/whatsappHelper.js lib/

# Rebuild et restart
cd /opt/max-infrastructure
docker compose build max-backend
docker compose up -d max-backend
docker compose logs -f max-backend
```

---

## VÉRIFICATION FINALE

✅ Container démarre sans erreur
✅ PostgreSQL accessible
✅ Settings API répond
✅ Pas d'erreur import/module
✅ Logs propres

**Si tout est OK**: ✅ Déploiement réussi !
**Si problème**: Rollback immédiat

---

## TEST FRONTEND (après déploiement backend OK)

1. Ouvre https://crm.studiomacrea.cloud/settings
2. Va dans l'onglet WhatsApp
3. Vérifie que le panel WhatsApp s'affiche
4. (Optionnel) Configure un provider Green-API

---

**Note**: Le frontend n'a PAS besoin d'être rebuild car les composants Settings existaient déjà.