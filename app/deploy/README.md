# Deploy — Catequese Viva

## Estrutura

```
deploy/
├── docker-compose.yml          # produção: caddy + server + worker
├── docker-compose.homolog.yml
├── Caddyfile / Caddyfile.homolog
├── Dockerfile.server
├── .env.server.prod.example
├── .env.server.homolog.example
└── scripts/
    ├── deploy.sh
    ├── backup-db.sh
    └── seed-homolog.sh
```

## Deploy rápido

1. Copiar ficheiros para `/opt/catechis/` no VPS
2. Copiar `.wasp/build/web-app/` para `/opt/catechis/web-app/`
3. Configurar `.env.server` (ver exemplos)
4. `./scripts/deploy.sh homolog` ou `./scripts/deploy.sh prod`

## Variáveis críticas

| Variável | Server | Worker |
| -------- | ------ | ------ |
| `RUN_JOBS` | `false` | `true` |
| `DATABASE_URL` | Neon | Neon (mesmo) |
| `COOKIE_DOMAIN` | `.catechis.app` | idem |

Ver também: `docs/PROVISIONING.md`, `docs/HOMOLOG.md`, `docs/BACKUP.md`
