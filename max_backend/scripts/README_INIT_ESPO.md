# Script d'initialisation EspoCRM pour M.A.X.

## Objectif

Ce script initialise automatiquement un EspoCRM vide avec des données de test pour le secteur **Transport/Logistique**, permettant à M.A.X. de démontrer ses capacités d'analyse IA et de propositions stratégiques.

## Prérequis

### 1. EspoCRM installé et démarré

```bash
# EspoCRM doit être accessible sur :
http://127.0.0.1:8081
```

### 2. Credentials ADMIN dans le .env

Le script nécessite une **authentification ADMIN** (pas une simple clé API) pour pouvoir créer des champs personnalisés et des tags.

Ajoutez ces lignes dans votre fichier `.env` :

```env
ESPO_BASE_URL=http://127.0.0.1:8081
ESPO_USERNAME=admin
ESPO_PASSWORD=votre_mot_de_passe_admin
```

**Important :** Les clés API utilisateur standard (`ESPO_API_KEY`) ne permettent **PAS** de créer des champs custom. Seul le compte ADMIN a ces droits.

### 3. Node.js et dépendances

```bash
cd d:/Macrea/CRM/max_backend
npm install
```

## Utilisation

### Lancement du script

```bash
cd d:/Macrea/CRM/max_backend
node scripts/init-espo-transport.js
```

### Ce que fait le script

Le script effectue les actions suivantes :

#### 1. **Vérification de la connexion**
- Teste la connexion à EspoCRM en mode ADMIN
- Vérifie que les credentials sont valides

#### 2. **Création des champs personnalisés** (Manuel requis)
Le script **liste** les champs à créer manuellement dans EspoCRM Admin :

- `typeMarchandise` (enum) : Palette, Colis, Vrac, Conteneur, Frigorifique, Dangereuse
- `volumeEstime` (varchar) : Volume estimé de la marchandise
- `trajetFrequent` (varchar) : Trajet habituel du client
- `urgence` (enum) : Express 24h, Standard, Flexible
- `maxScore` (int 0-100) : Score calculé par M.A.X.

**Pourquoi manuel ?** L'API Metadata d'EspoCRM est complexe et nécessite une configuration avancée. Pour un test rapide, il est plus simple de les créer via l'interface Admin.

#### 3. **Création des tags**
Tags créés automatiquement :

- 🔵 `client-récurrent` (#00E5FF)
- 🟠 `devis-en-attente` (#FFA500)
- 🔴 `priority-haute` (#FF4444)
- 🟣 `transport-international` (#A855F7)
- 🟢 `volume-important` (#4CAF50)
- 🔴 `express-24h` (#FF6B6B)

#### 4. **Import des leads de test**
6-10 leads secteur transport avec des profils variés :

| Nom | Entreprise | Profil |
|-----|-----------|--------|
| Ali Hassan | Logistic Pro SARL | Demande devis urgent Paris-Lyon |
| Sophie Marceau | Trans-Europe | Client récurrent international |
| Mohamed Ben Salah | Express Delivery | Besoin express 24h |
| Isabelle Dubois | Cargo France | Volume important (20 tonnes) |
| Jean-Pierre Martin | Fret Express | Partenaire existant |
| Fatima El Amrani | Logistics Med | Marchandise dangereuse ADR |

#### 5. **Analyse IA des leads**
M.A.X. analyse chaque lead et :

- **Calcule un score** (0-100) basé sur l'urgence, le volume, l'engagement
- **Suggère des tags** automatiques selon le contexte
- **Propose des actions** : "Réponse dans les 2h", "Générer devis automatique", etc.
- **Identifie les hot leads** (score > 60)

#### 6. **Génération de stratégies marketing**
M.A.X. propose 3 stratégies globales :

1. **Relancer 4 devis en attente** - Workflow J+2, impact +15% conversion
2. **Programme fidélité clients récurrents** - Offre 3+ envois/mois, impact +25% rétention
3. **Fast-track Express 24h** - Ligne directe urgences, impact +30% satisfaction

## Résultat attendu

```
╔══════════════════════════════════════════════════════════╗
║              ✅ INITIALISATION TERMINÉE !               ║
╚══════════════════════════════════════════════════════════╝

🚀 EspoCRM est maintenant prêt avec :
   • 6+ leads secteur Transport/Logistique
   • 6 tags personnalisés
   • Analyse IA avec stratégies recommandées

🌐 Ouvrir le frontend: http://localhost:5173
📊 Consulter l'onglet CRM pour voir les leads
```

## Fichiers générés

Le script crée automatiquement :

```
d:/Macrea/CRM/max_backend/data/analyze-result-transport.json
```

Ce fichier contient l'analyse complète au format JSON :

```json
{
  "totalLeads": 6,
  "hotLeads": [...],
  "strategies": [...],
  "tags": [...]
}
```

## Alternative : Import CSV manuel

Si vous préférez importer les leads manuellement :

1. Utilisez le fichier : `leads_transport_test.csv`
2. Dans EspoCRM : Administration > Import > Lead
3. Mapper les colonnes CSV avec les champs EspoCRM
4. Lancer l'import

## Troubleshooting

### Erreur "401 Unauthorized"

**Cause :** Les credentials ADMIN sont incorrects.

**Solution :**
```env
# Vérifiez le .env
ESPO_USERNAME=admin
ESPO_PASSWORD=<mot_de_passe_correct>
```

### Erreur "Connection refused"

**Cause :** EspoCRM n'est pas démarré.

**Solution :**
```bash
# Démarrez EspoCRM
cd /chemin/vers/espocrm
php -S 127.0.0.1:8081
```

### Tags déjà existants (409 Conflict)

**Cause :** Vous avez déjà exécuté le script.

**Solution :** C'est normal ! Le script détecte les doublons et continue.

### "L'API Metadata n'est pas implémentée"

**Cause :** La création automatique de champs custom est complexe.

**Solution :** Créez les champs manuellement :
1. EspoCRM Admin > Entity Manager
2. Cliquez sur "Lead"
3. Onglet "Fields" > "Add Field"
4. Créez chaque champ selon la liste ci-dessus

## Prochaines étapes

Une fois l'initialisation terminée :

1. **Ouvrir le frontend M.A.X.** : http://localhost:5173
2. **Aller dans l'onglet "CRM"** pour voir les leads importés
3. **Tester les suggestions M.A.X.** en cliquant sur un lead
4. **Activer les workflows d'automatisation** dans l'onglet "Automatisation"

## Support

Si le script ne fonctionne pas :

1. Vérifiez les logs dans la console
2. Testez manuellement la connexion EspoCRM
3. Consultez la documentation EspoCRM sur l'API REST

---

**Auteur :** M.A.X. - MaCréa Studio
**Version :** 1.0.0
**Date :** Novembre 2025
