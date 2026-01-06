# Stratégie de Synchronisation des Workflows n8n

## 🎯 Contexte

Nous avons créé un script `sync-n8n-db.js` qui permet de synchroniser les workflows n8n directement dans la base SQLite sans passer par l'interface UI.

## ⚠️ Risques Identifiés

### 1. Fragilité du Script SQLite Direct

Le script `sync-n8n-db.js` manipule directement la base de données SQLite de n8n. **Risques**:

- **Mise à jour n8n**: Le schéma de la base peut changer entre versions
- **Changement de chemin DB**: Si n8n change de configuration ou de volume Docker
- **Permissions**: Problèmes d'accès concurrent (n8n running + script)
- **Multi-instances**: Si plusieurs instances n8n tournent (clustering)
- **Corruption**: Écriture dans la DB pendant qu'n8n tourne = risque de corruption

### 2. Validation de la Structure du Payload

Le workflow utilise `{{ $json.data.messageSuggestion }}`. **Points de vigilance**:

- Vérifier que `services/n8n.js` envoie bien `data: payload` (ligne 40) ✅
- Vérifier que `routes/chat.js` envoie bien `messageSuggestion` dans le payload (ligne 2777) ✅
- **Structure finale reçue par n8n**:
  ```json
  {
    "tenant": "macrea",
    "actor": "MAX",
    "data": {
      "leadId": "xxx",
      "messageSuggestion": "Bonjour...",
      "leadPhone": "+33xxx",
      ...
    }
  }
  ```

## ✅ Recommandations

### Environnements

| Environnement | Méthode Recommandée | Justification |
|---------------|---------------------|---------------|
| **Dev/Local** | `sync-n8n-db.js` ✅ | Rapide, pas besoin d'API key, pratique pour itération |
| **Staging** | `import-n8n-workflows.js` (API) | Plus safe, teste le process de prod |
| **Production** | API n8n officielle + UI | Robuste, versionné, tracé, pas de risque de corruption |

### Script `sync-n8n-db.js` - Bonnes Pratiques

**Avant utilisation**:
```bash
# 1. TOUJOURS arrêter n8n avant de modifier la DB SQLite
npx kill-port 5678

# 2. Backup de la DB (recommandé)
copy "d:\Macrea\CRM\n8n_local\.n8n\database.sqlite" "d:\Macrea\CRM\n8n_local\.n8n\database.sqlite.backup"

# 3. Exécuter le script
node scripts/sync-n8n-db.js

# 4. Redémarrer n8n
npx n8n
```

**Checklist de Validation**:
- [ ] n8n est arrêté (`npx kill-port 5678`)
- [ ] Backup DB créé
- [ ] Workflow JSON validé (pas d'erreur JSON)
- [ ] Script exécuté sans erreur
- [ ] n8n redémarré
- [ ] Workflow visible dans UI n8n
- [ ] Workflow activé (green toggle)
- [ ] Test d'exécution manuel dans n8n

### Script `import-n8n-workflows.js` - Configuration API

**Setup (une seule fois)**:

1. **Créer une API Key dans n8n**:
   - Ouvrir http://localhost:5678
   - Settings → API → Create API Key
   - Copier la clé

2. **Configurer dans .env**:
   ```bash
   N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxx
   N8N_BASE_URL=http://127.0.0.1:5678
   ```

3. **Utiliser le script**:
   ```bash
   node scripts/import-n8n-workflows.js
   ```

**Avantages**:
- ✅ Pas besoin d'arrêter n8n
- ✅ Versionning automatique par n8n
- ✅ Pas de risque de corruption DB
- ✅ Fonctionne même avec n8n en cluster
- ✅ Logs d'audit dans n8n

## 🔍 Debug & Monitoring

### Vérifier que le Workflow Utilise le Bon Message

**Option 1: Logs Backend**
```bash
# Dans routes/chat.js, ajouter après ligne 2770:
console.log('[DEBUG] Payload envoyé à n8n:', JSON.stringify(payload, null, 2));
```

**Option 2: Debug Node dans n8n**

Ajouter un nœud "Edit Fields" après le Webhook:
```json
{
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "name": "DEBUG_fullPayload",
          "value": "={{ JSON.stringify($json) }}",
          "type": "string"
        },
        {
          "name": "DEBUG_messageSuggestion",
          "value": "={{ $json.data.messageSuggestion }}",
          "type": "string"
        }
      ]
    }
  },
  "name": "Debug Payload",
  "type": "n8n-nodes-base.set"
}
```

**Option 3: n8n Execution Logs**

Dans l'UI n8n:
1. Executions → Cliquer sur une exécution
2. Voir le JSON de chaque nœud
3. Vérifier que `data.messageSuggestion` contient le bon message

### Tester le Workflow Manuellement

**Test via Postman/curl**:
```bash
curl -X POST http://127.0.0.1:5678/webhook/wf-relance-j3-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "macrea",
    "actor": "MAX",
    "data": {
      "leadId": "test123",
      "leadName": "Test User",
      "leadPhone": "+33612345678",
      "messageSuggestion": "Ceci est un message de test depuis curl"
    }
  }'
```

**Résultat attendu**: WhatsApp reçu avec "Ceci est un message de test depuis curl"

## 📝 Changelog du Workflow

### Version actuelle
- **Date**: 2025-12-12
- **Changement**: Utilise `{{ $json.data.messageSuggestion }}` au lieu de texte hardcodé
- **Fichier**: `n8n_workflows/wf-relance-j3-whatsapp.json`
- **Nœud modifié**: "Envoyer WhatsApp" (ligne 35)

### Historique
| Date | Changement | Auteur |
|------|------------|--------|
| 2025-12-12 | Migration vers messageSuggestion dynamique | Claude + User |
| 2025-11-28 | Création workflow initial | User |

## 🚀 Roadmap

### Court terme
- [ ] Créer API key n8n pour staging
- [ ] Tester `import-n8n-workflows.js` avec API
- [ ] Documenter process de prod

### Moyen terme
- [ ] CI/CD: Auto-deploy workflows depuis Git
- [ ] Monitoring: Alertes si workflow fail
- [ ] Tests automatisés des workflows

### Long terme
- [ ] Infrastructure as Code (Terraform pour n8n)
- [ ] Multi-tenancy: workflows par tenant
- [ ] A/B testing des templates messages
