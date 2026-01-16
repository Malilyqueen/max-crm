# 🚀 Setup Phase 1 - Guide Rapide

## Étape 1: Générer la Clé de Chiffrement

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copier le résultat** (64 caractères hexadécimaux) et l'ajouter dans [`max_backend/.env`](max_backend/.env):

```bash
# Ajoutez cette ligne dans .env
CREDENTIALS_ENCRYPTION_KEY=<votre_clé_générée>
```

**Exemple**:
```bash
CREDENTIALS_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## Étape 2: Appliquer la Migration SQL

### Option A: Via Supabase Dashboard (Recommandé)

1. Aller sur: https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz/editor
2. Ouvrir le fichier [`max_backend/migrations/008_provider_configs.sql`](max_backend/migrations/008_provider_configs.sql)
3. Copier tout le contenu
4. Coller dans le SQL Editor de Supabase
5. Cliquer sur "Run"

### Option B: Via psql CLI

```bash
psql "postgresql://postgres:Lgyj1l1xBM60XxxR@db.jcegkuyagbthpbklyawz.supabase.co:5432/postgres" -f max_backend/migrations/008_provider_configs.sql
```

**Résultat attendu**:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
COMMENT
...
```

---

## Étape 3: Redémarrer le Backend

```bash
# Arrêter le serveur actuel (Ctrl+C)

# Redémarrer
cd max_backend
npm run dev
```

**Vérifier les logs - Vous devriez voir**:
```
✅ Variables .env validées
✅ PostgreSQL client initialisé (Supabase ref: jcegkuyagbthpbklyawz)
[Encryption] ✅ Clé de chiffrement valide (32 bytes)
[Encryption] ✅ Test de chiffrement/déchiffrement réussi
✅ Système de chiffrement validé
M.A.X. server P1 listening on http://127.0.0.1:3005
```

**Si la clé manque**, vous verrez:
```
⚠️  CREDENTIALS_ENCRYPTION_KEY non configurée ou invalide
   Les fonctionnalités de configuration de providers seront désactivées
   Pour activer: générez une clé avec:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   Puis ajoutez dans .env: CREDENTIALS_ENCRYPTION_KEY=<votre_clé>
```

---

## Étape 4: Vérifier la Table SQL

Dans Supabase SQL Editor:

```sql
-- Vérifier que la table existe
SELECT * FROM tenant_provider_configs;

-- Devrait retourner 0 rows (table vide mais créée)
```

---

## Étape 5: Test API Rapide

### 5.1 Récupérer un Token JWT

**Via la page Login** ou **via curl**:

```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "votre_email", "password": "votre_password"}'
```

**Copier le `token` de la réponse**.

### 5.2 Créer un Provider Test

```bash
# Remplacez <JWT_TOKEN> par votre token
curl -X POST http://localhost:3005/api/settings/providers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant: macrea" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "mailjet",
    "provider_name": "Test Mailjet",
    "credentials": {
      "apiKey": "test_key_123",
      "apiSecret": "test_secret_456"
    },
    "is_active": false
  }'
```

**Résultat attendu**:
```json
{
  "success": true,
  "provider": {
    "id": 1,
    "tenant_id": "macrea",
    "provider_type": "mailjet",
    "provider_name": "Test Mailjet",
    "connection_status": "non_testé",
    "is_active": false,
    "created_at": "2026-01-07T..."
  }
}
```

### 5.3 Lister les Providers

```bash
curl http://localhost:3005/api/settings/providers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant: macrea"
```

**Résultat attendu**:
```json
{
  "success": true,
  "providers": [
    {
      "id": 1,
      "tenant_id": "macrea",
      "provider_type": "mailjet",
      "provider_name": "Test Mailjet",
      "connection_status": "non_testé",
      "is_active": false,
      ...
    }
  ]
}
```

### 5.4 Récupérer les Credentials (Déchiffrés)

```bash
curl http://localhost:3005/api/settings/providers/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant: macrea"
```

**Résultat attendu**:
```json
{
  "success": true,
  "provider": {
    "id": 1,
    "provider_type": "mailjet",
    "credentials": {
      "apiKey": "test_key_123",
      "apiSecret": "test_secret_456"
    },
    ...
  }
}
```

**✅ Si vous voyez les credentials déchiffrés, le système fonctionne!**

### 5.5 Tester la Connexion (va échouer avec des faux credentials)

```bash
curl -X POST http://localhost:3005/api/settings/providers/1/test \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant: macrea"
```

**Résultat attendu** (échec car credentials de test):
```json
{
  "success": false,
  "status": "failed",
  "message": "Échec de connexion",
  "error": "Mailjet: HTTP 401: ..."
}
```

**C'est normal!** Le test échoue car les credentials sont fictifs. Mais ça prouve que:
- ✅ Le déchiffrement fonctionne
- ✅ L'appel API Mailjet est fait
- ✅ Le statut est bien mis à jour en DB

---

## ✅ Checklist de Validation

- [ ] Clé de chiffrement générée et ajoutée dans `.env`
- [ ] Migration SQL appliquée sans erreur
- [ ] Backend redémarré avec logs `✅ Système de chiffrement validé`
- [ ] Table `tenant_provider_configs` visible dans Supabase
- [ ] Test API `POST /api/settings/providers` réussi (status 201)
- [ ] Test API `GET /api/settings/providers` réussi
- [ ] Test API `GET /api/settings/providers/:id` retourne credentials déchiffrés
- [ ] Test API `POST /api/settings/providers/:id/test` fonctionne (même si échec de connexion)

---

## 🔴 Problèmes Courants

### Erreur: "CREDENTIALS_ENCRYPTION_KEY manquant"
**Solution**: Générez la clé et ajoutez-la dans `.env`, puis redémarrez le serveur.

### Erreur: "relation tenant_provider_configs does not exist"
**Solution**: Appliquez la migration SQL (Étape 2).

### Erreur: "Échec du déchiffrement"
**Solution**: La clé a changé ou les données sont corrompues. Supprimez les providers existants et recréez-les.

### Erreur: 401 Unauthorized
**Solution**: Vérifiez que votre JWT token est valide et non expiré.

### Erreur: 403 Forbidden
**Solution**: Vérifiez que le provider appartient bien au tenant spécifié dans `X-Tenant`.

---

## 🎯 Prêt pour Phase 2!

Une fois tous les tests validés, vous êtes prêt pour **Phase 2: UI Settings** (jours 4-6).

**Fichiers à créer en Phase 2**:
- `max_frontend/src/pages/SettingsPage.tsx`
- `max_frontend/src/components/settings/ProviderForm.tsx`
- `max_frontend/src/components/settings/ProviderList.tsx`
- `max_frontend/src/components/settings/TestConnectionButton.tsx`
- `max_frontend/src/components/settings/WhatsAppQRCode.tsx`
- `max_frontend/src/stores/useProvidersStore.ts`
