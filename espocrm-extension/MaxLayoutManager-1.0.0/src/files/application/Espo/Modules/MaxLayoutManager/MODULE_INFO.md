# MaxLayoutManager - Module Core MAX

**Version**: 1.0.0
**Type**: Module Système Core (non pas extension utilisateur)
**Date**: 26 décembre 2025
**Propriétaire**: MACREA Studio

---

## IMPORTANT - MODULE CORE SYSTÈME

⚠️ **CE MODULE EST UN COMPOSANT SYSTÈME DE MAX**

- **NE PAS désinstaller** via Extension Manager
- **NE PAS modifier** sans coordination équipe MAX
- **Requis pour**: Gestion automatique layouts par MAX AI

---

## Versioning

**Version actuelle**: `1.0.0`

Format: `MAJOR.MINOR.PATCH`

### Changelog

#### v1.0.0 (2025-12-26)
- Initial release
- POST `/api/v1/MaxLayoutManager/addField`
- POST `/api/v1/MaxLayoutManager/applyLayout`
- POST `/api/v1/MaxLayoutManager/rebuild`
- GET `/api/v1/MaxLayoutManager/health`
- Authentication via `X-Max-Plugin-Key`
- Multi-tenant safe

---

## Installation

**Emplacement**: `application/Espo/Modules/MaxLayoutManager/`

⚠️ **CRITICAL**: Ce module DOIT être dans `application/`, pas `custom/`

**Raison**: Slim Framework ne charge Routes.php que depuis `application/`

### Procédure Deployment

```bash
# 1. Upload vers serveur
scp -r MaxLayoutManager/ root@server:/tmp/

# 2. Copier dans application/
ssh root@server "cd /opt/max-infrastructure && \
  docker cp /tmp/MaxLayoutManager espocrm:/var/www/html/application/Espo/Modules/MaxLayoutManager && \
  docker compose exec espocrm chown -R www-data:www-data application/Espo/Modules/MaxLayoutManager"

# 3. Rebuild
ssh root@server "cd /opt/max-infrastructure && \
  docker compose exec espocrm php command.php rebuild"

# 4. Vérifier
curl "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/health"
```

---

## Backup Avant Upgrade EspoCRM

⚠️ **AVANT TOUT UPGRADE ESPOCRM, SAUVEGARDER CE MODULE**

### Procédure Backup

```bash
# 1. Backup module
ssh root@server "cd /opt/max-infrastructure && \
  docker compose exec espocrm tar -czf /tmp/MaxLayoutManager-backup-$(date +%Y%m%d).tar.gz \
    application/Espo/Modules/MaxLayoutManager"

# 2. Copier vers local
scp root@server:/tmp/MaxLayoutManager-backup-*.tar.gz ./backups/

# 3. Backup config API key
ssh root@server "cd /opt/max-infrastructure && \
  docker compose exec espocrm grep maxLayoutManagerApiKey data/config.php > /tmp/maxlayout-apikey.txt"

scp root@server:/tmp/maxlayout-apikey.txt ./backups/
```

### Procédure Restore (après upgrade EspoCRM)

```bash
# 1. Restore module
scp ./backups/MaxLayoutManager-backup-*.tar.gz root@server:/tmp/
ssh root@server "cd /opt/max-infrastructure && \
  docker cp /tmp/MaxLayoutManager-backup-*.tar.gz espocrm:/tmp/ && \
  docker compose exec espocrm tar -xzf /tmp/MaxLayoutManager-backup-*.tar.gz -C /"

# 2. Restore API key dans config.php
# (Voir backups/maxlayout-apikey.txt)

# 3. Rebuild
ssh root@server "cd /opt/max-infrastructure && \
  docker compose exec espocrm php command.php rebuild"

# 4. Test
curl "https://crm.studiomacrea.cloud/api/v1/MaxLayoutManager/health"
```

---

## Configuration

### API Key

**Localisation**: `data/config.php`

```php
'maxLayoutManagerApiKey' => '55f49f7a951a2e41dfa9faa8d6019ad378e4ef88abfe9b44de4b755c07afbffb'
```

**Backend MAX**: `/opt/max-infrastructure/.env`

```bash
MAX_PLUGIN_KEY=55f49f7a951a2e41dfa9faa8d6019ad378e4ef88abfe9b44de4b755c07afbffb
```

### Vérifier Version

```bash
docker compose exec espocrm cat application/Espo/Modules/MaxLayoutManager/VERSION
# Output: 1.0.0
```

---

## Dépendances

- **EspoCRM**: >= 8.0.0
- **PHP**: >= 8.1.0
- **Slim Framework**: (inclus dans EspoCRM)

---

## Support

**Équipe**: MAX Development Team
**Contact**: MACREA Studio
**Documentation**: [RAPPORT_FINAL_LAYOUTS.md](../../../../../RAPPORT_FINAL_LAYOUTS.md)

---

## License

Propriétaire MACREA Studio - Usage interne uniquement
