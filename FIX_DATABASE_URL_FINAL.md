# FIX FINAL - DATABASE_URL Session Pooler

## Connexion string correcte trouvée dans Supabase Dashboard:

```
postgresql://postgres.jcegkuyagbthpbklyawz:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**IMPORTANT**: Région correcte = `aws-1-eu-west-1` (PAS `aws-0-eu-central-1`)

---

## Étapes à copier/coller dans le terminal SSH

### 1. Connexion SSH

```bash
ssh root@135.125.235.103
```

### 2. Backup du .env actuel

```bash
cd /opt/max-infrastructure
cp .env .env.backup_avant_fix_final_$(date +%Y%m%d_%H%M%S)
```

### 3. Vérifier le .env actuel

```bash
cat .env | grep DATABASE_URL
```

Tu devrais voir:
```
DATABASE_URL=postgresql://postgres.jcegkuyagbthpbklyawz:Lgyj1l1xBM60XxxR@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### 4. Remplacer DATABASE_URL par la bonne région

```bash
sed -i 's|aws-0-eu-central-1.pooler.supabase.com|aws-1-eu-west-1.pooler.supabase.com|g' .env
```

### 5. Vérifier que la modification est correcte

```bash
cat .env | grep DATABASE_URL
```

Tu dois maintenant voir:
```
DATABASE_URL=postgresql://postgres.jcegkuyagbthpbklyawz:Lgyj1l1xBM60XxxR@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

### 6. Recréer le container pour charger la nouvelle variable

```bash
cd /opt/max-infrastructure
docker compose down
docker compose up -d
```

### 7. Vérifier les logs

```bash
docker compose logs -f max-backend
```

**Attends de voir ces lignes**:
```
🔧 Mode IPv4 forcé activé - Résolution DNS IPv4...
✅ DNS résolu: aws-1-eu-west-1.pooler.supabase.com → 3.xx.xx.xx (IPv4)
[Encryption] ✅ Clé de chiffrement globale valide (32 bytes)
[Encryption] ✅ Test de chiffrement/déchiffrement réussi (per-tenant)
```

**Appuie sur Ctrl+C pour sortir des logs**

### 8. Test de connexion PostgreSQL

```bash
docker exec max-backend node -e "const {Pool}=require('pg'); new Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}).query('SELECT 1').then(r=>console.log('✅ Connection OK:',r.rows)).catch(e=>console.error('❌ Error:',e.message))"
```

**Résultat attendu**:
```
✅ Connection OK: [ { '?column?': 1 } ]
```

### 9. Vérifier qu'il n'y a plus d'erreur ENETUNREACH

```bash
docker compose logs max-backend | grep ENETUNREACH
```

**Résultat attendu**: **Aucune ligne** (commande ne retourne rien)

---

## Test final dans le navigateur

1. Va sur **https://crm.studiomacrea.cloud/settings**
2. Rafraîchis la page (Ctrl+F5)
3. Configure un provider Twilio SMS:
   - **Account SID**: AC***
   - **Auth Token**: ***
   - **From Number**: +33***
4. Clique "Sauvegarder"

**Résultat attendu**: ✅ **Provider SMS saved successfully!**

---

## Si ça marche

Tu devrais voir dans les logs backend:
```
[Settings] POST /api/settings/providers - Provider créé: sms_twilio (tenant: macrea)
[Encryption] ✅ Credentials chiffrées pour tenant: macrea
```

**Et dans le navigateur**: Message de succès vert "Provider SMS saved successfully!"

---

## Si ça échoue encore

Vérifie:
1. Le mot de passe dans DATABASE_URL est bien `Lgyj1l1xBM60XxxR`
2. La région est bien `aws-1-eu-west-1`
3. Le container a bien été recréé avec `docker compose down/up`
4. Pas d'erreur "Tenant or user not found" dans les logs

---

## Rollback si besoin

Si ça casse tout, restaure le backup:

```bash
cd /opt/max-infrastructure
cp .env.backup_avant_fix_final_YYYYMMDD_HHMMSS .env
docker compose down
docker compose up -d
```

(Remplace `YYYYMMDD_HHMMSS` par le timestamp du backup)