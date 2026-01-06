# 📊 Système de Reporting d'Enrichissement

## 🎯 Objectif

Créer un système de reporting visuel pour que les utilisateurs de M.A.X. puissent :
- ✅ Voir l'historique des enrichissements
- ✅ Consulter les statistiques globales
- ✅ Afficher les détails de chaque enrichissement
- ✅ Suivre l'évolution dans le temps

---

## 🏗️ Architecture

### 1. **Enregistrement Automatique**

Chaque enrichissement est automatiquement enregistré dans :
- **Fichier** : `reports/enrichments.json`
- **Format** : JSON structuré
- **Limite** : 100 derniers rapports conservés

**Données sauvegardées** :
```json
{
  "id": "enrich_1731776400_abc123xyz",
  "timestamp": "2025-11-16T18:00:00.000Z",
  "analyzed": 20,
  "enriched": 16,
  "skipped": 4,
  "updated": 16,
  "details": [
    {
      "leadId": "67b...",
      "name": "Amina Diallo",
      "email": "contact@cosmetics-paris.com",
      "secteur": "Cosmétique",
      "tags": ["Cosmétique", "E-commerce", "B2C"],
      "services": ["Branding", "Social Media", "E-commerce"],
      "description": "Lead du secteur cosmétique...",
      "confiance": "haute",
      "status": "enriched"
    },
    ...
  ]
}
```

---

### 2. **API de Consultation**

#### Fonction : `getEnrichmentReports(limit)`
**Récupère** les N derniers rapports d'enrichissement

**Utilisation** :
```javascript
const reports = await getEnrichmentReports(20); // 20 derniers rapports
```

#### Fonction : `getEnrichmentReport(reportId)`
**Récupère** un rapport spécifique par son ID

**Utilisation** :
```javascript
const report = await getEnrichmentReport('enrich_1731776400_abc123xyz');
```

#### Fonction : `getEnrichmentStats()`
**Calcule** les statistiques globales

**Retourne** :
```json
{
  "totalReports": 25,
  "totalLeadsAnalyzed": 450,
  "totalLeadsEnriched": 380,
  "totalLeadsSkipped": 70,
  "successRate": 84.44,
  "sectorsDetected": {
    "Cosmétique": 120,
    "Tech": 85,
    "Marketing": 75,
    ...
  },
  "last7Days": [
    {
      "date": "2025-11-16",
      "analyzed": 20,
      "enriched": 16,
      "skipped": 4
    },
    ...
  ]
}
```

---

### 3. **Formatage pour Affichage**

#### Fonction : `formatReportForDisplay(report)`
**Formate** un rapport en Markdown pour affichage dans M.A.X.

**Exemple de sortie** :
```markdown
# 📊 Rapport d'Enrichissement

**Date** : 16/11/2025 18:00:00
**ID** : `enrich_1731776400_abc123xyz`

## 📈 Résumé

- **Leads analysés** : 20
- **Leads enrichis** : 16 ✅
- **Leads ignorés** : 4 ⏭️
- **Taux de succès** : 80.0%

## ✅ Leads Enrichis (16)

| Lead | Email | Secteur | Tags | Confiance |
|------|-------|---------|------|-----------|
| Amina Diallo | contact@cosmetics-paris.com | Cosmétique | Cosmétique, E-commerce, B2C | haute |
| Jean Dupont | hello@tech-solutions.fr | Tech | Tech, Software, B2B | moyenne |
...
```

#### Fonction : `formatGlobalStats()`
**Formate** les statistiques globales en Markdown

---

## 🎨 Intégration dans M.A.X.

### Prochaines Étapes (À implémenter)

#### 1. **Créer des Outils M.A.X.**

Ajouter dans `lib/maxTools.js` :

```javascript
{
  type: 'function',
  function: {
    name: 'get_enrichment_reports',
    description: 'Affiche l\'historique des enrichissements effectués. Utile pour répondre à "Montre-moi les derniers enrichissements" ou "Historique des rapports".',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre de rapports à afficher (défaut: 10)',
          default: 10
        }
      }
    }
  }
},
{
  type: 'function',
  function: {
    name: 'get_enrichment_report',
    description: 'Affiche un rapport d\'enrichissement spécifique par son ID. Utilise quand l\'utilisateur demande "Affiche le rapport XXXXX".',
    parameters: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'ID du rapport (format: enrich_XXXXXXXXX_XXXXXX)',
          required: true
        }
      },
      required: ['reportId']
    }
  }
},
{
  type: 'function',
  function: {
    name: 'get_enrichment_stats',
    description: 'Affiche les statistiques globales d\'enrichissement. Utilise pour "Statistiques d\'enrichissement", "Performance globale", "Combien de leads enrichis au total".',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
}
```

#### 2. **Créer les Handlers**

Ajouter dans `routes/chat.js` :

```javascript
case 'get_enrichment_reports': {
  const { limit = 10 } = args;
  const { getEnrichmentReports } = await import('../lib/enrichmentReporter.js');

  const reports = await getEnrichmentReports(limit);

  if (reports.length === 0) {
    return {
      success: true,
      message: 'Aucun rapport d\'enrichissement trouvé. Effectuez d\'abord un enrichissement pour générer un rapport.'
    };
  }

  let message = `📊 **Derniers Rapports d\'Enrichissement** (${reports.length})\n\n`;

  reports.forEach((report, index) => {
    const date = new Date(report.timestamp).toLocaleString('fr-FR');
    const successRate = report.analyzed > 0
      ? ((report.enriched / report.analyzed) * 100).toFixed(1)
      : 0;

    message += `${index + 1}. **${date}**\n`;
    message += `   - ID: \`${report.id}\`\n`;
    message += `   - Analysés: ${report.analyzed} | Enrichis: ${report.enriched} | Ignorés: ${report.skipped}\n`;
    message += `   - Taux: ${successRate}%\n\n`;
  });

  message += `💡 Utilisez "Affiche le rapport [ID]" pour voir les détails complets`;

  return {
    success: true,
    reports,
    message
  };
}

case 'get_enrichment_report': {
  const { reportId } = args;
  const { getEnrichmentReport, formatReportForDisplay } = await import('../lib/enrichmentReporter.js');

  const report = await getEnrichmentReport(reportId);

  if (!report) {
    return {
      success: false,
      error: `Rapport ${reportId} non trouvé`
    };
  }

  const formatted = formatReportForDisplay(report);

  return {
    success: true,
    report,
    message: formatted
  };
}

case 'get_enrichment_stats': {
  const { formatGlobalStats } = await import('../lib/enrichmentReporter.js');

  const formatted = await formatGlobalStats();

  return {
    success: true,
    message: formatted
  };
}
```

#### 3. **Mettre à Jour le Prompt Système**

Ajouter dans `prompts/max_system_prompt_v2.txt` :

```
# 📊 RAPPORTS D'ENRICHISSEMENT

## Outils disponibles pour consulter les rapports :

1. **get_enrichment_reports** : Liste les derniers enrichissements
   - Exemples de requêtes : "Montre-moi les derniers enrichissements", "Historique", "Rapports"

2. **get_enrichment_report** : Affiche un rapport spécifique
   - Exemples : "Affiche le rapport enrich_XXX", "Détails du rapport [ID]"

3. **get_enrichment_stats** : Statistiques globales
   - Exemples : "Statistiques d'enrichissement", "Performance globale", "Combien de leads enrichis ?"

## Workflow :

- Après chaque enrichissement, M.A.X. donne l'ID du rapport
- L'utilisateur peut consulter ce rapport plus tard
- Les statistiques globales montrent la performance dans le temps
```

---

## 📱 Interface Utilisateur (Future)

### Dashboard Web (À créer)

**Localisation** : `max_backend/public/dashboard.html` ou intégration dans l'interface EspoCRM

**Sections** :
1. **Vue d'ensemble**
   - Total leads enrichis
   - Taux de succès global
   - Graphique d'évolution

2. **Derniers Enrichissements**
   - Liste des 10 derniers rapports
   - Clic pour voir les détails

3. **Statistiques**
   - Top secteurs détectés
   - Performance par jour
   - Répartition des tags

4. **Détails d'un Rapport**
   - Liste complète des leads enrichis
   - Tableau avec avant/après
   - Export CSV/PDF

---

## 🔄 Workflow Utilisateur

### Scénario 1 : Enrichissement et Consultation

1. **Utilisateur** : "Enrichis tous les leads à partir de leur email"
2. **M.A.X.** : Effectue l'enrichissement
3. **M.A.X.** : Affiche résumé + ID rapport (`enrich_1731776400_abc123xyz`)
4. **Utilisateur** : "Affiche le rapport complet"
5. **M.A.X.** : Appelle `get_enrichment_report` avec l'ID du dernier rapport
6. **M.A.X.** : Affiche tableau détaillé avec tous les leads

### Scénario 2 : Consultation Historique

1. **Utilisateur** : "Montre-moi les derniers enrichissements"
2. **M.A.X.** : Appelle `get_enrichment_reports(10)`
3. **M.A.X.** : Affiche liste des 10 derniers rapports
4. **Utilisateur** : "Affiche le rapport enrich_1731776400_abc123xyz"
5. **M.A.X.** : Appelle `get_enrichment_report(reportId)`
6. **M.A.X.** : Affiche détails complets

### Scénario 3 : Statistiques

1. **Utilisateur** : "Combien de leads enrichis au total ?"
2. **M.A.X.** : Appelle `get_enrichment_stats()`
3. **M.A.X.** : Affiche statistiques globales avec graphiques textuels

---

## 📊 Exemples de Rapports

### Rapport Simple

```
📊 Rapport d'Enrichissement

Date : 16/11/2025 18:00:00
ID : enrich_1731776400_abc123xyz

📈 Résumé
- Leads analysés : 20
- Leads enrichis : 16 ✅
- Leads ignorés : 4 ⏭️
- Taux de succès : 80.0%
```

### Statistiques Globales

```
📊 Statistiques Globales d'Enrichissement

📈 Vue d'ensemble
- Total rapports : 25
- Total leads analysés : 450
- Total leads enrichis : 380 ✅
- Total leads ignorés : 70 ⏭️
- Taux de succès global : 84.44%

🏢 Top Secteurs Détectés
1. Cosmétique : 120 leads
2. Tech : 85 leads
3. Marketing : 75 leads
4. Finance : 40 leads
5. Coaching : 35 leads
```

---

## 🚀 État Actuel

### ✅ Implémenté

- [x] Module `enrichmentReporter.js` créé
- [x] Enregistrement automatique des rapports
- [x] Fonction `saveEnrichmentReport()`
- [x] Fonction `getEnrichmentReports()`
- [x] Fonction `getEnrichmentReport()`
- [x] Fonction `getEnrichmentStats()`
- [x] Fonction `formatReportForDisplay()`
- [x] Fonction `formatGlobalStats()`
- [x] Intégration dans `routes/chat.js` (sauvegarde auto)

### ⏳ À Implémenter

- [ ] Outils M.A.X. dans `maxTools.js`
- [ ] Handlers dans `routes/chat.js`
- [ ] Instructions dans `max_system_prompt_v2.txt`
- [ ] Dashboard web (optionnel)
- [ ] Export PDF/CSV (optionnel)

---

## 🔄 Prochaine Étape

**Redémarrer le serveur** pour activer l'enregistrement automatique :

```powershell
.\RESTART_SERVER.ps1
```

Puis effectuer un enrichissement pour générer le premier rapport !

---

**Version** : 1.0.0
**Date** : 16 novembre 2025
**Statut** : ✅ **Backend prêt, frontend à implémenter**
