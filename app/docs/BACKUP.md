# Backups PostgreSQL (Neon → Bunny)

## Estratégia

1. **PITR Neon** — recovery point-in-time nativo (produção)
2. **pg_dump diário** — redundância em Bunny Storage (`backups/db/{env}/{date}.sql.gz`)

## Script

```bash
# Cron diário (03:30 UTC) no VPS worker:
0 3 * * * /opt/catechis/scripts/backup-db.sh prod >> /var/log/catechis-backup.log 2>&1
```

## Restore (teste trimestral)

```bash
gunzip -c backup.sql.gz | psql "$DATABASE_URL"
```

## Retenção

- Bunny: 30 dias (lifecycle policy manual ou script de limpeza)
- Neon PITR: conforme plano (7–30 dias)

## Alertas

Monitorar exit code do cron + alerta se `/health` reportar `database: error`.
