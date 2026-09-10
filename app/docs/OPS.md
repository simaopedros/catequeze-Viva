# Operação — Catequese Viva

Guia operacional para o ambiente de produção e homologação.
Última atualização: 11/06/2026 — pós-deploy `v0.1.0`.

---

## Arquitetura

```
                  Cloudflare DNS (proxy)
                           │
                    ┌──────┴──────┐
                    │   Caddy:443  │
                    │  /srv/web-app│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       catechis.app  familia.app  api.catechis.app
       (SPA React)   (SPA React)  (reverse_proxy server:3001)
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                          server:3001         worker:3001
                          (RUN_JOBS=false)    (RUN_JOBS=true)
                              │                   │
                              └───────┬───────────┘
                                      │
                                 Neon PostgreSQL
                                 Bunny Storage
```

### Containers

```
docker compose ps
NAME                 SERVICE   PORTS
catechis-caddy-1     caddy     0.0.0.0:80→80, 0.0.0.0:443→443
catechis-server-1    server    3001 (expose)
catechis-worker-1    worker    3001 (expose)
```

| Container | Função | RUN_JOBS |
|-----------|--------|:---:|
| `caddy` | Reverse proxy, TLS LetsEncrypt, serve SPA | — |
| `server` | API Wasp, autenticação, queries/actions | `false` |
| `worker` | Jobs pg-boss (cron, emails, billing reset) | `true` |

---

## CI (sem minutos hosted da GitHub)

Os workflows usam `runs-on: self-hosted` na VPS de **homolog**. Não consomem
a quota de 2.000 min de `ubuntu-latest`. Sem runner online, os jobs ficam em
fila (não falham por billing).

### Instalar o runner (uma vez, só na VPS de homolog)

Não instalar em produção: o runner vê secrets de deploy e o disco da app.

1. Confirme disco (`df -h /`). Precisa de vários GB livres — o homolog já
   encheu o disco noutros deploys.
2. Abra [New self-hosted runner](https://github.com/simaopedros/catequeze-Viva/settings/actions/runners/new)
   (Linux x64). Copie o token `XXXX` (vale ~1 h).
3. Na VPS de homolog, no clone do repo (ou copie só o script):

   ```bash
   sudo GITHUB_RUNNER_TOKEN=XXXX ./app/deploy/scripts/install-github-runner.sh
   ```

4. Em Settings → Actions → Runners o nome `catequese-homolog` deve ficar Idle.
5. No PR, **Re-run failed jobs** (ou um push novo). Os checks passam a
   correr na VPS, a $0.

Fora da GitHub, na pasta `app/`: `npm run ci` (i18n + unit + UI).

Para voltar aos runners da GitHub (quando a quota/billing permitir): variável
de repositório `CI_RUNS_ON=ubuntu-latest`.

## Pipeline de deploy

```
[dev] ──git push main──▶ CI (i18n + unit tests + compile)
                              │
                              ▼ (automático)
                     Deploy Homolog
                     build → GHCR → VPS homolog → migrate → E2E
                              │
                              ▼ (validar QA em homolog.catechis.app)
                     git tag vX.Y.Z
                              │
                              ▼ (manual, só dispara com tag v*)
                     Deploy Produção
                     promote imagem → backup DB → VPS prod → migrate → health
```

### Homolog

- **Trigger:** push em `main`
- **Workflow:** `.github/workflows/deploy-homolog.yml`
- **URLs:** `homolog.catechis.app`, `familia-homolog.catechis.app`, `api-homolog.catechis.app`
- **Checklist QA:** [`HOMOLOG.md`](HOMOLOG.md)

### Produção

- **Trigger:** tag `v*` (ex: `v0.1.0`)
- **Workflow:** `.github/workflows/deploy-production.yml`
- **URLs:** `catechis.app`, `familia.catechis.app`, `api.catechis.app`
- **Gate:** `ENABLE_PROD_DEPLOY=true` (variável GitHub)
- **Nota:** a mesma imagem Docker testada em homolog é promovida para produção (**não recompila**)

---

## Rollback

### Encontrar a tag anterior

```bash
# No VPS (tags em cache local):
ssh root@13.140.171.132
docker images ghcr.io/simaopedros/catequeze-viva --format '{{.Tag}}' | grep '^prod-'

# No GitHub (todas as tags disponíveis):
gh api repos/simaopedros/catequeze-Viva/packages/container/catequeze-viva/versions --jq '.[].metadata.container.tags[]' | grep '^prod-'
```

### Executar rollback

```bash
ssh root@13.140.171.132
cd /opt/catechis
./scripts/rollback.sh prod-060ee02bbc28f431fa90c6df67ac606a6cfe2b4d
```

### O que o script faz

1. **Backup pré-rollback** → `pg_dump` → Bunny (`backups/db/prod/pre-rollback/YYYY-MM-DD-HHMM.sql.gz`)
2. **Para containers** → `docker compose down`
3. **Sobe imagem anterior** → `IMAGE=ghcr.io/.../catequeze-viva:prod-<sha> docker compose up -d`
4. **Migrações** → `prisma migrate deploy`
5. **Health check** → `curl /health` — se falhar, **restaura automaticamente** para `prod-latest`

### Rollback com restauro de BD

Se o deploy alterou o schema da BD e precisas reverter as migrações:

```bash
# 1. Restaurar backup pré-deploy (a pipeline guarda antes de cada deploy):
cd /opt/catechis
set -a && source .env.server && set +a
BACKUP="backups/db/prod/YYYY-MM-DD.sql.gz"  # ajustar data

curl -sf "https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${BACKUP}" \
  -H "AccessKey: ${BUNNY_STORAGE_API_KEY}" \
  -o /tmp/restore.sql.gz

gunzip -c /tmp/restore.sql.gz | psql "$DATABASE_URL"

# 2. Rollback da aplicação:
./scripts/rollback.sh prod-<sha-anterior>
```

| Cenário | Ação | Risco |
|---------|------|:---:|
| Bug no código, BD igual | `./scripts/rollback.sh` | Baixo |
| Bug + schema novo | Restaurar BD + rollback | Médio |
| Deploy falhou (health check) | `docker compose up -d` com tag anterior | Baixo |

---

## Backups

### Backup automático

```
Cron: 0 3 * * * (03:00 UTC = 00:00 BRT)
Script: scripts/backup-db.sh prod
Destino: Bunny Storage → backups/db/prod/YYYY-MM-DD.sql.gz
Logs: /var/log/catechis-backup.log
```

### Backup manual

```bash
ssh root@13.140.171.132
cd /opt/catechis
set -a && source .env.server && set +a
bash scripts/backup-db.sh prod
```

### Restore

```bash
# Descarregar do Bunny:
curl -sf "https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/backups/db/prod/2026-06-11.sql.gz" \
  -H "AccessKey: ${BUNNY_STORAGE_API_KEY}" \
  -o backup.sql.gz

# Restaurar para BD (⚠️ destrutivo — substitui dados):
gunzip -c backup.sql.gz | psql "$DATABASE_URL"
```

### Retenção

- Bunny: 30 dias (apagar manualmente ou configurar lifecycle policy)
- Neon PITR: 7–30 dias (conforme plano)
- Backup pré-deploy: guardado por cada deploy de produção

---

## Monitoramento

### Health check

```
GET https://api.catechis.app/health   # liveness barato (sem DB)
GET https://api.catechis.app/readyz   # readiness profunda (DB + storage)
```

```json
{
  "status": "ok",
  "timestamp": "2026-06-11T14:28:50.425Z",
  "uptime": 405.55,
  "database": "ok",
  "storage": { "backend": "bunny", "healthy": true },
  "jobs": "api-only",
  "ai": "ok"
}
```

### Uptime monitoring

Monitor externo (UptimeRobot/Better Stack) em `https://api.catechis.app/health` para não acordar o Neon à toa. Use `https://api.catechis.app/readyz` apenas para deploy/diagnóstico.
Alertar quando HTTP ≠ 200 ou `status` ≠ `ok`.

### Sentry

| Projeto | DSN | Ambiente |
|---------|-----|----------|
| `catechis-prod` | `SENTRY_DSN` no `.env.server` prod | Server: `@sentry/node`, Cliente: `@sentry/react` |
| `catechis-homolog` | `SENTRY_DSN` no `.env.server` homolog | Server: `@sentry/node` |

### Logs Docker

```bash
# Produção (a partir do VPS):
docker compose -f docker-compose.yml logs -f --tail=100 server
docker compose -f docker-compose.yml logs -f --tail=100 worker

# Homolog:
docker compose -f docker-compose.homolog.yml logs -f --tail=100 server worker
```

---

## Manutenção

### Atualizar `.env.server`

```bash
ssh root@13.140.171.132
cd /opt/catechis
vim .env.server  # editar variáveis
docker compose -f docker-compose.yml up -d --force-recreate server worker
```

### Rodar migrações manualmente

```bash
ssh root@13.140.171.132
cd /opt/catechis
docker compose -f docker-compose.yml run --rm --entrypoint "npx" server \
  prisma migrate deploy --schema=../db/schema.prisma
```

### Reiniciar containers

```bash
ssh root@13.140.171.132
cd /opt/catechis
docker compose -f docker-compose.yml up -d --force-recreate
```

### Verificar status dos containers

```bash
ssh root@13.140.171.132
docker compose -f docker-compose.yml ps
docker stats --no-stream
```

### Simulacro de migração VPS (~30 min)

1. Provisionar novo VPS Contabo
2. `./scripts/setup-prod-vps.sh` (ou copiar `/opt/catechis`)
3. Mesmo `.env.server` (Neon e Bunny não mudam)
4. Deploy com a mesma imagem GHCR
5. Atualizar DNS Cloudflare (TTL 300s)
6. Verificar `/health` + checklist produção
7. Desligar VPS antigo

---

## Infraestrutura

| Serviço | Produção | Homolog |
|---------|----------|---------|
| **VPS** | Contabo `13.140.171.132` | Contabo (Homolog) |
| **Database** | Neon `catechis-prod` (PITR) | Neon `catechis-homolog` |
| **Storage** | Bunny `catechis-prod` | Bunny `catechis-homolog` |
| **Email** | Resend `noreply@catechis.app` | Resend `noreply@catechis.app` (test) |
| **Stripe** | `sk_live_*` | `sk_test_*` |
| **Domains** | `catechis.app`, `familia`, `api` | `homolog`, `familia-homolog`, `api-homolog` |
| **SSL** | LetsEncrypt (Caddy auto) | `tls internal` + Cloudflare Full |
| **Access** | (sem Access) | Cloudflare Access (PIN) |

---

## Segurança

- **SSH:** apenas por chave (`~/.ssh/catechis-prod-key`), password desativado
- **Firewall:** UFW — permite 22, 80, 443; todo o resto bloqueado
- **Hardening:** `scripts/harden-ssh.sh` já executado
- **Rotação de credenciais:** ver [`SECURITY.md`](SECURITY.md)

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [`PROVISIONING.md`](PROVISIONING.md) | Guia de provisionamento inicial |
| [`HOMOLOG.md`](HOMOLOG.md) | Checklist QA homolog |
| [`BACKUP.md`](BACKUP.md) | Estratégia de backups |
| [`SECURITY.md`](SECURITY.md) | Rotação de credenciais + hardening |
| [`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md) | Cloudflare Access homolog |
| [`CLOUDFLARE_SSL.md`](CLOUDFLARE_SSL.md) | Configuração SSL Cloudflare |
| [`plans/pendencias_go-live.md`](plans/pendencias_go-live.md) | Plano go-live completo |

