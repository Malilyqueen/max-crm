#!/bin/bash
# ========================================
# MAX Infrastructure - Backup Script
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================" echo "💾 MAX Infrastructure Backup"
echo "========================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup MariaDB (EspoCRM database)
echo ""
echo "📦 Backing up MariaDB database..."
docker exec mariadb mysqldump -u root -p${MYSQL_ROOT_PASSWORD} espocrm \
    > "$BACKUP_DIR/espocrm_db_$TIMESTAMP.sql"

# Compress database backup
gzip "$BACKUP_DIR/espocrm_db_$TIMESTAMP.sql"
echo "✅ Database backup: espocrm_db_$TIMESTAMP.sql.gz"

# Backup EspoCRM custom files
echo ""
echo "📦 Backing up EspoCRM custom files..."
docker exec espocrm tar czf /tmp/custom_$TIMESTAMP.tar.gz /var/www/html/custom
docker cp espocrm:/tmp/custom_$TIMESTAMP.tar.gz "$BACKUP_DIR/"
docker exec espocrm rm /tmp/custom_$TIMESTAMP.tar.gz
echo "✅ Custom files backup: custom_$TIMESTAMP.tar.gz"

# Backup MAX conversations and logs
echo ""
echo "📦 Backing up MAX data..."
docker run --rm \
    -v max-conversations:/conversations \
    -v max-logs:/logs \
    -v "$BACKUP_DIR:/backup" \
    alpine tar czf "/backup/max_data_$TIMESTAMP.tar.gz" /conversations /logs
echo "✅ MAX data backup: max_data_$TIMESTAMP.tar.gz"

# Clean old backups (keep last 7 days)
echo ""
echo "🧹 Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

# List backups
echo ""
echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"

echo ""
echo "========================================" echo "✅ Backup Complete"
echo "========================================"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
