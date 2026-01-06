# 🌍 Extension MaCréa CORE Universal

Extension de base **non-bridée** pour CRM adaptatif multi-secteurs.

## 🎯 Philosophie : ZERO Bridage

**RÈGLE ABSOLUE** : M.A.X. ne doit JAMAIS être bridé par des listes prédéfinies.

Le CRM MaCréa s'adapte automatiquement à TOUS les secteurs :
- Cosmétique, Assurance, Logistique, E-commerce, Coaching, Finance, Artisanat, etc.

## 📦 Installation

```bash
cd max_backend/extensions/macrea-core-universal
node install.js
```

Le script d'installation :
1. ✅ Copie les entityDefs dans EspoCRM
2. ✅ Exécute `rebuild`
3. ✅ Nettoie le cache

## 🔧 Entités créées

### 1. **Lead** (13 champs CORE enrichis)
- `source` (Varchar) - Origine du lead LIBRE
- `tagsIA` (Array) - Tags générés LIBREMENT par M.A.X.
- `notesIA` (Text) - Synthèse intelligente
- `secteurInfere` (Varchar) - Secteur déduit LIBREMENT (NO ENUM!)
- `typeClient` (Varchar) - Type client LIBRE
- `niveauMaturite` (Varchar) - Maturité commerciale LIBRE
- `canalPrefere` (Varchar) - Canal préféré LIBRE
- `objectifsClient` (Text) - Objectifs du client
- `servicesSouhaites` (Text) - Services demandés
- `prochaineAction` (Text) - Prochaine action recommandée
- `prochaineRelance` (Date) - Date de prochaine relance
- `statutNurturing` (Enum) - Statut générique (Nouveau, À qualifier, Engagé, Inactif, Converti)
- `scoreIA` (Int 0-100) - Score de priorité

### 2. **MissionMAX** (nouvelle entité)
Enregistre toutes les actions effectuées par M.A.X. pour traçabilité.

Champs :
- `name`, `typeAction`, `description`, `resultat`
- `leadId`, `accountId` (relations)
- `dateExecution`, `statutExecution`
- `tokensUtilises`, `dureeExecution`

### 3. **DiagnosticIA** (nouvelle entité)
Diagnostics complets générés par M.A.X. (SWOT-style).

Champs :
- `name`, `leadId`, `accountId`
- `syntheseIA`, `forcesDetectees`, `opportunites`, `risques`, `recommandations`
- `scoreConfiance`, `dateGeneration`
- `validePar`, `dateValidation`

## 🛠️ Tools disponibles

### 1. `enrich_lead_universal`
Enrichit un lead avec les champs CORE universels.

**Exemple d'utilisation par M.A.X.** :
```
Utilisateur : "Enrichis le lead contact@assurancevie-expert.fr"

M.A.X. appelle :
{
  "leadId": "abc123",
  "source": "Google Ads - Assurance vie",
  "tagsIA": ["#assurance-vie", "#PER", "#prospect-finance"],
  "secteurInfere": "Assurance vie / Finance",
  "scoreIA": 75
}
```

### 2. `create_mission_max`
Enregistre une mission effectuée par M.A.X.

**Exemple** :
```
{
  "name": "Enrichissement IA - Lead Assurance Vie",
  "typeAction": "enrichissement",
  "resultat": "Secteur: Assurance vie, Score: 75, Tags: 3 générés",
  "leadId": "abc123",
  "statutExecution": "Réussi"
}
```

### 3. `generate_diagnostic_ia`
Génère un diagnostic complet d'un lead.

**Exemple** :
```
{
  "leadId": "abc123",
  "syntheseIA": "Prospect assurance vie, 35-45 ans, cherche optimisation fiscale...",
  "forcesDetectees": "Budget confirmé, besoin clair",
  "opportunites": "Cross-sell assurance décès",
  "risques": "Comparaison concurrents",
  "recommandations": "Envoyer comparatif PER vs Assurance Repos sous 24h"
}
```

## 🌟 Exemples par secteur

### Assurance Vie
- **secteurInfere** : "Assurance vie / Finance"
- **tagsIA** : ["#assurance-vie", "#PER", "#prospect-finance", "#lead-chaud"]
- **scoreIA** : 75

### E-commerce Bijoux
- **secteurInfere** : "E-commerce / Bijoux artisanaux"
- **tagsIA** : ["#etsy", "#bijoux", "#fait-main", "#automation-whatsapp"]
- **scoreIA** : 60

### Logistique Diaspora
- **secteurInfere** : "Logistique diaspora / Groupage"
- **tagsIA** : ["#groupage", "#madagascar-france", "#transport"]
- **scoreIA** : 55

## ✅ Règles ABSOLUES

1. **JAMAIS de liste fermée** - M.A.X. invente librement selon le contexte
2. **TOUJOURS contextualiser** - Adapte le vocabulaire au secteur du lead
3. **TOUJOURS utiliser les tools** - Ne jamais halluciner, toujours appeler les outils
4. **TOUJOURS tracker les actions** - Appelle `create_mission_max` après chaque enrichissement
5. **TOUJOURS afficher les résultats réels** - Montre les IDs, tags, scores générés

## 📚 Documentation complète

Voir [prompts.txt](./prompts.txt) pour les prompts détaillés de M.A.X. avec exemples complets par secteur.

---

**Tu es maintenant M.A.X. CORE Universel - Adaptatif à tous les secteurs !** 🌍
