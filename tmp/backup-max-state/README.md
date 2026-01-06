# Backup M.A.X. Post-Normalisation

**Date:** 2025-11-28
**Version:** 1.0
**État:** Production - Après normalisation complète

---

## Contenu du Backup

### 1. Metadata EspoCRM
- `Lead_metadata.json` - Définition complète de l'entité Lead avec tous les champs custom

### 2. Layouts EspoCRM
- `Lead_layouts/` - Layouts Detail, List, DetailSmall pour l'entité Lead
  - Contient le panel "Tâches M.A.X." avec tous les champs IA

### 3. Custom Files Complets
- `espocrm_custom/` - Copie complète du dossier custom d'EspoCRM
  - Tous les fichiers custom, classes, metadata, layouts

### 4. Système de Normalisation M.A.X.
- `fieldValidator.js` - Validation et normalisation des champs
- `selfHealing.js` - Système de self-healing automatique
- `schema_state.json` - État du schéma au moment du backup

### 5. Outils de Maintenance
- `tools/` - Scripts de maintenance (audit, fix layouts, tests)

### 6. Documentation
- `ESPOCRM_FIELD_MAPPING.md` - Mapping officiel des champs (source de vérité)
- `MAX_NORMALIZATION_GUIDE.md` - Guide complet de normalisation
- `STABILISATION_MAX_COMPLETE.md` - Rapport complet de stabilisation

### 7. Rapport d'Audit
- `audit_report.txt` - État complet des 37 leads au moment du backup

---

## État du Système au Backup

### Champs M.A.X. Actifs
- `tagsIA` - Tags IA (array)
- `secteurInfere` - Secteur inféré (text)
- `scoreIA` - Score de qualification (int 0-100)
- `servicesSouhaites` - Services identifiés (text)
- `notesIA` - Notes M.A.X. (text)

### Champs Dépréciés (Auto-migrés)
- `secteur` → `secteurInfere`
- `maxTags` → `tagsIA`

### Statistiques
- Total leads: 37
- Leads avec champs M.A.X.: 37 (100%)
- Layouts: Detail et List mis à jour
- Système de validation: Actif
- Self-healing: Actif

---

## Restauration

Pour restaurer cet état:

1. Copier `espocrm_custom/` vers `D:\Macrea\xampp\htdocs\espocrm\custom`
2. Copier `fieldValidator.js` et `selfHealing.js` vers `max_backend/lib/`
3. Copier `tools/` vers `max_backend/tools/`
4. Exécuter dans EspoCRM:
   ```bash
   php command.php clear-cache
   php command.php rebuild
   ```

---

## Notes Importantes

- ✅ Normalisation complète effectuée
- ✅ Self-healing system actif
- ✅ Validation automatique des champs
- ✅ Layouts Detail et List à jour
- ✅ Documentation complète

**Ce backup représente un état stable et propre de M.A.X. après normalisation.**
