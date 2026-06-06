# PostgreSQL Backup Strategy for Catequese Viva

## Overview

Catequese Viva stores critical pastoral data including catechumen profiles, sacrament records, documents, and consents (LGPD). A robust backup strategy is essential.

## Daily Automated Backup

### Using pg_dump (Recommended)

Add to crontab on the database server:

```bash
# Daily at 2am — full database dump
0 2 * * * /usr/local/bin/pg-backup.sh
```

### Backup Script (`/usr/local/bin/pg-backup.sh`)

```bash
#!/bin/bash
set -e

DB_NAME="catequese_viva"
BACKUP_DIR="/var/backups/catequese-viva"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Full dump with compression
pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup integrity
gunzip -t "$BACKUP_FILE" || { echo "Backup verification failed!"; exit 1; }

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup completed: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
```

### Environment Setup

Set in `.env.server` (or production environment):

```env
# Database URL (same as main app)
DATABASE_URL=postgresql://user:pass@host:5432/catequese_viva

# For PITR (Point-in-Time Recovery) — if using managed PostgreSQL:
# Use provider's automated backup (Railway, Supabase, RDS, etc.)
```

## Point-in-Time Recovery (PITR)

For production, use managed PostgreSQL services that provide PITR:

- **Railway**: Automatic daily backups with 7-day retention (included in plan)
- **Supabase**: Point-in-Time Recovery with 7-day retention (Pro plan)
- **AWS RDS**: Automated backups with up to 35-day retention
- **DigitalOcean Managed DB**: Automatic daily backups with 7-day retention

## Manual Backup

```bash
# Export full database (manual)
pg_dump catequese_viva > catequese_viva_manual_$(date +%Y%m%d).sql

# Export specific tables (for partial restore)
pg_dump catequese_viva --table=CatechumenProfile --table=Document > catechumens_backup.sql
```

## Restore Procedure

```bash
# From full backup
gunzip -c /var/backups/catequese-viva/catequese_viva_20260605_020000.sql.gz | psql catequese_viva

# From manual dump
psql catequese_viva < catequese_viva_manual_20260605.sql
```

## Backup Verification Checklist

- [ ] Daily automated backup configured and running
- [ ] Backup directory exists with correct permissions
- [ ] Backup retention policy set (30 days minimum)
- [ ] Tested restore procedure within last quarter
- [ ] Backup notification/alerting configured (email/Slack on failure)
- [ ] PITR enabled if using managed PostgreSQL
- [ ] Backup files stored in a separate location/region from the database server

## LGPD Compliance Note

Brazil's LGPD (Lei Geral de Proteção de Dados) requires:
- Data must be recoverable in case of incidents
- Backups must be encrypted at rest
- Access to backups must be restricted to authorized personnel only
- Backup deletion must be possible upon data subject request

Ensure backup files are stored with appropriate encryption and access controls.
