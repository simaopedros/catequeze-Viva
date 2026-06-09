# Operação contínua

## Uptime monitoring

Configure um monitor externo (UptimeRobot, Better Stack, etc.) em:

- `https://api.catechis.app/health` (produção)
- `https://api.homolog.catechis.app/health` (homolog)

Alertar quando HTTP ≠ 200 ou `status` ≠ `ok`.

## Sentry

- Projeto `catechis-homolog` → `SENTRY_DSN` no `.env.server` homolog
- Projeto `catechis-prod` → `SENTRY_DSN` no `.env.server` prod

## Logs Docker

```bash
docker compose -f docker-compose.homolog.yml logs -f --tail=100 server worker
```

## Simulacro migração VPS (~30 min)

1. Provisionar novo VPS Contabo
2. `./scripts/setup-prod-vps.sh` (ou copiar `/opt/catechis`)
3. Mesmo `.env.server` (Neon e Bunny não mudam)
4. Deploy mesma imagem GHCR
5. Atualizar DNS Cloudflare (TTL 300s)
6. `./scripts/qa-homolog.sh` ou checklist produção
7. Desligar VPS antigo

## Segurança

Ver [`SECURITY.md`](SECURITY.md) e `scripts/harden-ssh.sh`.
