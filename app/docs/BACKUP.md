# Backups PostgreSQL (Neon → Bunny)

## Estratégia

1. **PITR Neon** — recovery point-in-time nativo (produção)
2. **pg_dump diário** — redundância em Bunny Storage (`backups/db/{env}/{date}.sql.gz`)

## Script

```bash
# Instalar cron no VPS (homolog ou prod):
sudo /opt/catechis/scripts/install-backup-cron.sh homolog
sudo /opt/catechis/scripts/install-backup-cron.sh prod
```

Logs: `/var/log/catechis-backup.log`

## Restore (teste trimestral)

```bash
gunzip -c backup.sql.gz | psql "$DATABASE_URL"
```

## Retenção

- Bunny: 30 dias (lifecycle policy manual ou script de limpeza)
- Neon PITR: conforme plano (7–30 dias)

## Alertas

Monitorar exit code do cron + alerta se `/health` reportar `database: error`.
