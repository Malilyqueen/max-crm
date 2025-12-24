# 🚀 PHASE 2A - ESPOCRM INTEGRATION - EN COURS

**Date** : 6 décembre 2025
**Objectif** : Connecter le frontend aux **vrais leads EspoCRM** (fin des mocks MVP1)

---

## ✅ Travaux complétés

### 1. Routes backend EspoCRM (`/api/crm/leads`)

**Fichier** : `max_backend/routes/crm.js`

J'ai **complètement réécrit** ce fichier pour qu'il appelle **vraiment EspoCRM** via `espoClient.js`.

#### Nouveaux endpoints implémentés :

| Endpoint | Méthode | Description | Implémentation |
|----------|---------|-------------|----------------|
| `/api/crm/leads` | GET | Liste des leads avec filtres et pagination | ✅ Appel réel EspoCRM avec filtres `where` |
| `/api/crm/leads/:id` | GET | Détail d'un lead avec notes et activités | ✅ Appel `/Lead/:id` + `/Lead/:id/stream` |
| `/api/crm/leads/:id/status` | PATCH | Changer le statut d'un lead | ✅ Utilise `safeUpdateLead` + log dans stream |
| `/api/crm/leads/:id/notes` | POST | Ajouter une note à un lead | ✅ Crée une note dans `/Note` avec `parentType=Lead` |

#### Fonction de mapping

```typescript
function mapEspoLeadToFrontend(espoLead) {
  return {
    id: espoLead.id,
    firstName: espoLead.firstName || '',
    lastName: espoLead.lastName || '',
    email: espoLead.emailAddress || espoLead.email || '',
    phone: espoLead.phoneNumber || espoLead.phone || '',
    company: espoLead.accountName || espoLead.company || '',
    status: espoLead.status || 'Nouveau',
    source: espoLead.source || '',
    assignedTo: espoLead.assignedUserName || '',
    createdAt: espoLead.createdAt || new Date().toISOString(),
    updatedAt: espoLead.modifiedAt || espoLead.createdAt || new Date().toISOString(),
    notes: espoLead.description || '',
    tags: espoLead.tags || [],
    score: espoLead.score || 0
  };
}
```

#### Gestion des filtres EspoCRM

Le endpoint `/api/crm/leads` construit dynamiquement les filtres EspoCRM :
- **Status** : `{ type: 'in', attribute: 'status', value: [...] }`
- **Search** : Recherche full-text sur firstName, lastName, emailAddress, accountName
- **Score** : Filtres `greaterThanOrEquals` et `lessThanOrEquals`

### 2. Frontend - Modification du store CRM

**Fichier** : `max_frontend/src/stores/useCrmStore.ts`

J'ai modifié **toutes les URLs** pour pointer vers `/api/crm` au lieu de `/api/crm-mvp1` :

| Fonction | Ancienne URL | Nouvelle URL |
|----------|-------------|-------------|
| `loadLeads` | `/crm-mvp1/leads` | `/crm/leads` |
| `loadLeadDetail` | `/crm-mvp1/leads/:id` | `/crm/leads/:id` |
| `updateLeadStatus` | `/crm-mvp1/leads/:id/status` | `/crm/leads/:id/status` |
| `addLeadNote` | `/crm-mvp1/leads/:id/notes` | `/crm/leads/:id/notes` |

**Aucun autre changement nécessaire** dans le store grâce à la fonction `mapEspoLeadToFrontend` côté backend qui transforme les données EspoCRM vers le format attendu par le frontend.

---

## 🔧 Configuration requise

### Variables d'environnement backend

Assure-toi que ton fichier `max_backend/.env` contient :

```env
ESPO_BASE_URL=http://127.0.0.1:8081/api/v1
ESPO_USERNAME=admin
ESPO_PASSWORD=ton_mot_de_passe

# OU alternativement :
ESPO_TOKEN=ton_bearer_token
# OU
ESPO_API_KEY=ta_cle_api
```

Le client `espoClient.js` supporte 3 types d'authentification :
1. **Bearer Token** (prioritaire si défini)
2. **API Key** (si ESPO_TOKEN non défini)
3. **Basic Auth** (ESPO_USERNAME + ESPO_PASSWORD comme fallback)

---

## 🧪 Tests à effectuer

### 1. Redémarrer le backend

Problème actuel : Le port 3005 est occupé par un processus Node persistant.

**Solution** :
1. Ouvre un terminal PowerShell en Administrateur
2. Lance : `netstat -ano | findstr :3005`
3. Note le PID (ex: 19960)
4. Lance : `taskkill /PID 19960 /T /F`
5. Redémarre : `cd d:\Macrea\CRM\max_backend && npm run dev`

### 2. Vérifier que le serveur démarre

Tu devrais voir :
```
M.A.X. server P1 listening on http://127.0.0.1:3005
```

### 3. Tester la page CRM

1. Ouvre le frontend : http://localhost:5174/crm
2. **Si EspoCRM est configuré** : Tu devrais voir les **vrais leads** depuis EspoCRM
3. **Si EspoCRM n'est pas accessible** : Tu verras une erreur dans la console frontend

### 4. Vérifier les fonctionnalités

- [ ] La liste des leads s'affiche (depuis EspoCRM)
- [ ] Cliquer sur un lead ouvre le panneau de détail
- [ ] Le panneau affiche : notes, activités, statut
- [ ] Changer le statut d'un lead fonctionne
- [ ] Ajouter une note fonctionne

---

## 🐛 Logs utiles pour debug

### Backend logs

```bash
cd d:\Macrea\CRM\max_backend
npm run dev
```

Cherche dans les logs :
- `[CRM] Erreur liste leads EspoCRM:` → Problème de connexion à EspoCRM
- `[ESPO_CLIENT] ✅ Lead ... - Validation OK` → Mapping des champs fonctionne
- `Espo 401 Unauthorized` → Problème d'authentification EspoCRM
- `Espo 404 Not Found` → Lead inexistant

### Frontend logs

Ouvre la console du navigateur (F12) et cherche :
- `[CRM] Erreur chargement leads:` → Problème d'appel API
- `401 Unauthorized` → Token JWT expiré, reconnecte-toi
- `Network Error` → Backend non démarré ou port bloqué

---

## 📊 Différences clés avec MVP1

| Aspect | MVP1 (Mock) | Phase 2A (EspoCRM) |
|--------|------------|-------------------|
| Source des données | Tableau `mockLeads` dans `crmMvp1.js` | EspoCRM via `espoFetch('/Lead')` |
| Filtres | Filtrage JavaScript côté backend | Filtres natifs EspoCRM (`where` clause) |
| Notes | Tableau `mockNotes` | Stream EspoCRM (`/Lead/:id/stream`) |
| Modification statut | Mutation du mock en mémoire | `safeUpdateLead` + création Note |
| Ajout note | Push dans tableau mock | POST `/Note` avec `parentType=Lead` |

---

## 🔜 Prochaines étapes (suite Phase 2A)

### EspoCRM (déjà fait) ✅
- ✅ Routes backend `/api/crm/leads`
- ✅ Mapping EspoCRM → Frontend
- ✅ Modification statut
- ✅ Ajout de notes

### Supabase (en attente)
1. Créer un projet Supabase
2. Créer les tables :
   - `max_logs` - Logs des actions M.A.X.
   - `sessions` - Sessions utilisateur/tenant
   - `tenant_memory` - Mémoire contextuelle par tenant
   - `conversations` - Historique des conversations importantes
   - `ai_summaries` - Résumés IA des leads/actions
   - `ai_decisions` - Décisions prises par M.A.X. avec raisonnement
3. Configurer Row Level Security (RLS) pour multi-tenant
4. Créer un service `lib/supabaseClient.js`
5. Enregistrer les premiers logs (exemple : import CSV, analyse lead, etc.)

---

## 💡 Notes techniques importantes

### Champs EspoCRM utilisés

Le mapping `mapEspoLeadToFrontend` attend ces champs d'EspoCRM :
- `id`, `firstName`, `lastName`
- `emailAddress` (ou fallback `email`)
- `phoneNumber` (ou fallback `phone`)
- `accountName` (ou fallback `company`)
- `status`, `source`
- `assignedUserName`
- `createdAt`, `modifiedAt`
- `description` (notes)
- `tags` (array)
- `score` (number)

Si certains champs n'existent pas dans ton EspoCRM, ils seront remplacés par des valeurs par défaut (`''`, `[]`, `0`).

### Sécurité des mises à jour

Le backend utilise `safeUpdateLead` de `espoClient.js` qui :
1. Valide les champs avec `normalizeLeadUpdate` de `fieldValidator.js`
2. Rejette les champs non autorisés
3. Normalise automatiquement les anciens noms de champs vers les nouveaux
4. Log chaque opération

Exemple :
```javascript
// Backend
const updatedLead = await safeUpdateLead(id, { status: 'Qualifié' });
// → Log: "[ESPO_CLIENT] ✅ Lead 12345 - Validation OK - Champs: status"
```

### Gestion des erreurs

Toutes les routes ont un try/catch qui :
- Log l'erreur côté backend
- Retourne un JSON avec `{ success: false, error: '...', details: '...' }`
- Le frontend affiche l'erreur dans `useCrmStore.error`

---

## 📞 En cas de problème

1. **Port 3005 occupé** : Utilise `netstat -ano | findstr :3005` puis `taskkill /PID xxx /T /F`
2. **EspoCRM injoignable** : Vérifie que `ESPO_BASE_URL` pointe vers ton instance EspoCRM (ex: XAMPP sur port 8081)
3. **401 Unauthorized** : Vérifie `ESPO_USERNAME` et `ESPO_PASSWORD` dans `.env`
4. **Champs manquants** : Adapte la fonction `mapEspoLeadToFrontend` selon ton schéma EspoCRM

---

## ✅ Validation de Phase 2A - EspoCRM

Phase 2A sera validée quand :
- [ ] Le frontend charge les **vrais leads** depuis EspoCRM (plus de mocks)
- [ ] La liste CRM affiche les leads avec firstName, lastName, email, company, status
- [ ] Le panneau de détail affiche les notes et activités depuis le Stream EspoCRM
- [ ] On peut **modifier le statut** d'un lead et ça se reflète dans EspoCRM
- [ ] On peut **ajouter une note** et elle apparaît dans le Stream EspoCRM

Une fois validé, on passera à **Supabase** pour la mémoire IA.

---

**Dernière mise à jour** : 6 décembre 2025 - 13h42
