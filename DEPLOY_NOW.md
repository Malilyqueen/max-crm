# 🚀 DÉPLOIEMENT MAINTENANT - Commandes Exactes

## ⚡ MÉTHODE RAPIDE (5 minutes)

### Étape 1: Transférer l'archive (sur ton PC Windows)

Ouvre PowerShell ou CMD et exécute:

```bash
scp d:/Macrea/CRM/phase1_deployment.tar.gz root@135.125.235.103:/opt/max-infrastructure/
```

**Si demande de mot de passe**: Entre le mot de passe SSH du serveur

---

### Étape 2: Connexion SSH au serveur

```bash
ssh root@135.125.235.103
```

---

### Étape 3: Extraction et préparation (sur le serveur)

```bash
cd /opt/max-infrastructure
tar -xzf phase1_deployment.tar.gz
ls -la max_backend/server.js  # Vérifier que le fichier est bien là
```

---

### Étape 4: Ajouter FORCE_IPV4 au .env

```bash
echo "FORCE_IPV4=true" >> .env
cat .env | grep FORCE_IPV4  # Vérifier que c'est ajouté
```

---

### Étape 5: Modifier docker-compose.yml

```bash
nano docker-compose.yml
```

**Trouve la section `max-backend.environment` et ajoute cette ligne:**

```yaml
      - FORCE_IPV4=${FORCE_IPV4}
```

**Ça devrait ressembler à:**
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
      - FORCE_IPV4=${FORCE_IPV4}    # ← AJOUTE CETTE LIGNE
```

**Sauvegarder**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Étape 6: Déploiement automatique

```bash
chmod +x DEPLOY_COMPLETE_PHASE1.sh
./DEPLOY_COMPLETE_PHASE1.sh
```

**OU si tu préfères manuel:**

```bash
docker compose build max-backend
docker compose up -d max-backend
docker compose logs -f max-backend
```

---

### Étape 7: Vérifier les logs

Cherche ces lignes (appuie sur `Ctrl+C` pour sortir):

```
✅ DNS résolu: db.jcegkuyagbthpbklyawz.supabase.co → 3.xx.xx.xx (IPv4)
[Encryption] ✅ Clé de chiffrement globale valide (32 bytes)
[Encryption] ✅ Test de chiffrement/déchiffrement réussi (per-tenant)
🚀 Serveur démarré sur le port 3005
```

**Vérifier absence d'erreur ENETUNREACH:**
```bash
docker compose logs max-backend | grep ENETUNREACH
```
Résultat attendu: **Aucune ligne** (pas d'erreur)

---

## ✅ Test Final

1. Va sur https://crm.studiomacrea.cloud/settings
2. Rafraîchis la page (Ctrl+F5)
3. Configure Twilio SMS:
   - Nom: `test production`
   - Account SID: `AC78ebc7238576304ae00fbe4df3a07f5e`
   - Auth Token: ton token
   - Numéro: `+33939037770`
4. Clique "Sauvegarder"
5. **✅ Attendu**: Message de succès (PAS d'erreur ENETUNREACH!)

---

## 🆘 Si problème

### Le fichier phase1_deployment.tar.gz n'existe pas

Crée-le sur ton PC:
```bash
cd d:/Macrea/CRM
tar -czf phase1_deployment.tar.gz max_backend/lib/encryption.js max_backend/routes/settings.js max_backend/routes/settings-test.js max_backend/server.js DEPLOY_COMPLETE_PHASE1.sh READY_TO_DEPLOY.md PER_TENANT_ENCRYPTION_COMPLETE.md IPv4_FIX_DEPLOYMENT.md
```

### Erreur SSH "Host key verification failed"

```bash
ssh-keyscan -H 135.125.235.103 >> ~/.ssh/known_hosts
```

Puis réessaye le `scp`.

### Le backend ne démarre pas

Regarde les logs:
```bash
docker compose logs max-backend | tail -50
```

Et envoie-moi la sortie.

---

## 📋 CHECKLIST

- [ ] Archive transférée sur le serveur
- [ ] Archive extraite
- [ ] `FORCE_IPV4=true` ajoutée à `.env`
- [ ] `FORCE_IPV4` ajoutée à `docker-compose.yml`
- [ ] Backend rebuild et redémarré
- [ ] Logs montrent "DNS résolu" et "per-tenant"
- [ ] Aucune erreur ENETUNREACH dans les logs
- [ ] Test SMS réussi sur https://crm.studiomacrea.cloud/settings

---

**🎯 Lance la première commande et dis-moi si ça fonctionne!**