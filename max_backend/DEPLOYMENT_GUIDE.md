# 🚀 Guide de Déploiement M.A.X. avec Docker

## 📋 Vue d'ensemble

M.A.X. est conçu pour être **flexible et adaptable** à chaque client. Ce guide explique comment déployer M.A.X. avec une configuration automatique des champs de base, tout en permettant au client de personnaliser son CRM.

---

## 🎯 Philosophie : Flexibilité Maximale

### Champs de Base (Auto-initialisés)
M.A.X. crée automatiquement les champs essentiels :
- ✅ `secteur` (varchar) - Secteur d'activité
- ✅ `maxTags` (multiEnum avec `allowCustomOptions: true`) - Tags flexibles

### Champs Custom (Créés par le Client)
Le client peut ajouter **n'importe quels champs** via EspoCRM :
- ✅ M.A.X. les détecte automatiquement
- ✅ M.A.X. peut les lire et les modifier
- ✅ Aucune reconfiguration nécessaire

---

## 📦 Déploiement Docker

### 1. Structure du Dockerfile

```dockerfile
FROM node:18-alpine

# Installer PHP pour EspoCRM
RUN apk add --no-cache php php-cli php-json php-curl

# Copier les fichiers M.A.X.
WORKDIR /app
COPY max_backend/ /app/

# Installer les dépendances
RUN npm install

# Copier le script d'initialisation
COPY max_backend/scripts/init_espocrm_fields.js /app/scripts/

# Variables d'environnement
ENV NODE_ENV=production
ENV ESPOCRM_PATH=/var/www/html/espocrm
ENV PHP_PATH=/usr/bin/php

# Commande de démarrage
CMD ["sh", "-c", "node scripts/init_espocrm_fields.js && npm start"]
```

### 2. Script d'Initialisation

Le script `scripts/init_espocrm_fields.js` :
1. ✅ Vérifie si les champs existent déjà
2. ✅ Crée `secteur` et `maxTags` s'ils n'existent pas
3. ✅ Configure `allowCustomOptions: true` sur `maxTags`
4. ✅ Clear cache + rebuild EspoCRM
5. ✅ Démarre M.A.X.

**Exécution manuelle** (si nécessaire) :
```bash
cd max_backend
node scripts/init_espocrm_fields.js
```

---

## 🔧 Configuration des Champs

### Champ : `secteur`
```javascript
{
  type: 'varchar',
  maxLength: 100,
  isCustom: true,
  required: false
}
```

**Usage** : M.A.X. détecte automatiquement le secteur d'activité à partir des emails/descriptions.

### Champ : `maxTags` (affiché comme "Tags")
```javascript
{
  type: 'multiEnum',
  isCustom: true,
  allowCustomOptions: true,  // ⭐ CLÉ !
  options: [
    'E-commerce', 'B2B', 'B2C', 'Tech', 'Finance',
    'Education', 'Santé', 'Logistique', 'Transport',
    'Restaurant', 'Mode', 'Cosmétique', 'Construction',
    'Immobilier', 'Tourisme', 'Marketing', 'Consulting',
    'Événementiel', 'Sport', 'Autre'
  ]
}
```

**Particularité** : `allowCustomOptions: true` permet à M.A.X. d'utiliser **n'importe quel tag**, pas seulement ceux de la liste.

---

## 🎨 Personnalisation par le Client

### Le Client Peut :

1. **Créer des champs custom** via EspoCRM Admin
   - Exemple : `priorite_client`, `score_qualite`, `budget_estime`

2. **M.A.X. les découvre automatiquement**
   - Tool : `list_available_fields({entity: "Lead"})`
   - Retourne TOUS les champs disponibles

3. **Utiliser ces champs** avec M.A.X.
   ```
   Utilisateur: "Mets le champ priorite_client à 'Haute' pour les leads Tech"

   M.A.X.:
   1. list_available_fields({entity: "Lead"})
   2. Vérifie que "priorite_client" existe
   3. update_lead_fields({
        leads: [{secteur: "Tech"}],
        fields: {priorite_client: "Haute"}
      })
   ```

---

## 🔍 Outils M.A.X. pour la Flexibilité

### `list_available_fields`
Découvre tous les champs disponibles :

**Entrée** :
```json
{
  "entity": "Lead"
}
```

**Sortie** :
```json
{
  "success": true,
  "totalFields": 87,
  "standardFields": [
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string"},
    ...
  ],
  "customFields": [
    {"name": "secteur", "type": "string"},
    {"name": "maxTags", "type": "array"},
    {"name": "priorite_client", "type": "string"}
  ],
  "relationFields": [...]
}
```

### `update_lead_fields`
Modifie n'importe quel champ :

```json
{
  "leads": [{"id": "123"}],
  "fields": {
    "secteur": "Tech",
    "maxTags": ["B2B", "SaaS"],
    "priorite_client": "Haute",
    "budget_estime": "50000"
  }
}
```

---

## 📊 Workflow Complet

### Déploiement Initial

```
1. docker build -t max-crm .
2. docker run max-crm
   ↓
3. Script init_espocrm_fields.js s'exécute
   ↓
4. Champs de base créés (secteur, maxTags)
   ↓
5. M.A.X. démarre
   ↓
6. ✅ Prêt à l'emploi !
```

### Personnalisation Client

```
1. Client se connecte à EspoCRM Admin
   ↓
2. Crée un champ custom "priorite_client" (enum: Basse, Moyenne, Haute)
   ↓
3. Refresh EspoCRM
   ↓
4. Demande à M.A.X. : "liste les champs disponibles"
   ↓
5. M.A.X. découvre "priorite_client"
   ↓
6. Client peut demander : "mets priorite_client à Haute pour les leads B2B"
   ↓
7. ✅ M.A.X. utilise le nouveau champ automatiquement !
```

---

## 🐛 Troubleshooting

### Les champs ne sont pas créés

**Vérifier** :
```bash
# Dans le conteneur
node scripts/init_espocrm_fields.js
```

**Logs attendus** :
```
🚀 INITIALISATION M.A.X. - Configuration des champs de base
📋 Création des champs essentiels M.A.X.:
   ➕ Création du champ "secteur"...
   ✅ Champ "secteur" configuré
   ➕ Création du champ "maxTags"...
   ✅ Champ "maxTags" configuré
✅ INITIALISATION TERMINÉE
```

### M.A.X. ne voit pas les champs custom

**Vérifier que le client a :**
1. Clear cache EspoCRM après création du champ
2. Rebuild EspoCRM
3. Refresh son navigateur

**Tester** :
```
Demander à M.A.X. : "liste les champs disponibles sur Lead"
```

---

## ✅ Checklist de Déploiement

- [ ] Docker configuré avec script d'initialisation
- [ ] Variables d'environnement définies (`ESPO_BASE_URL`, `ESPO_USERNAME`, `ESPO_PASSWORD`)
- [ ] Script `init_espocrm_fields.js` testé manuellement
- [ ] Champs `secteur` et `maxTags` créés avec succès
- [ ] `allowCustomOptions: true` activé sur `maxTags`
- [ ] Tool `list_available_fields` testé
- [ ] Prompt `max_custom_fields_awareness.txt` chargé
- [ ] Test avec un champ custom créé manuellement

---

## 📚 Documentation Supplémentaire

- **Prompts** : `prompts/max_custom_fields_awareness.txt`
- **Tools** : `lib/maxTools.js` (ligne 301+)
- **Implémentation** : `routes/chat.js` (case 'list_available_fields')
- **Initialisation** : `scripts/init_espocrm_fields.js`

---

## 🎯 Résumé

✅ **M.A.X. est flexible** : Il s'adapte automatiquement aux champs custom du client
✅ **Initialisation automatique** : Les champs de base sont créés au démarrage
✅ **Pas de limite** : Le client peut créer autant de champs qu'il veut
✅ **Découverte dynamique** : M.A.X. détecte et utilise les nouveaux champs

**M.A.X. = Maximum de Flexibilité pour chaque Client** 🚀
