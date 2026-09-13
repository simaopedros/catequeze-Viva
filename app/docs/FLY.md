# API no Fly.io

A SPA React **fica no VPS** (Caddy). Só o server Wasp (Express + Prisma + jobs) vai para a Fly. Postgres continua no **Neon**. Não uses `wasp deploy fly launch`: isso cria client + Postgres na Fly, que não queremos.

Wasp escuta em `PORT` (default 3001) via `server.listen(port)`. Os `fly.toml` fixam `PORT=3001` e `internal_port = 3001`.

## Arquitectura

```
Browser → homolog.catechis.app (Cloudflare → Caddy SPA)
                │
                ├─ /assets, / → ficheiros Vite no VPS
                └─ /api /auth /operations /c /health /payments-webhook
                     → reverse_proxy → catechis-api-homolog.fly.dev
                                          │
                                          └─ Neon + Bunny + Stripe + Resend

Expo / Stripe → https://api-homolog.catechis.app → Fly (DNS)
```

O cliente já reescreve `api-homolog.catechis.app` para same-origin (`setupApiUrlProxy.ts`). Por isso o Caddy **tem** de continuar a proxyar `/api/*` mesmo com a API na Fly.

## Pré-requisitos

1. Conta [Fly.io](https://fly.io/) com cartão (apps extra exigem billing).
2. CLI: `curl -L https://fly.io/install.sh | sh` e `fly auth login`.
3. `fly orgs list` — se houver várias, passa `--org <slug>` nos comandos `apps create`.
4. O mesmo `DATABASE_URL` Neon de homolog (pooler, `sslmode=require`).

## Homolog — uma vez

```bash
# Na pasta app/
fly apps create catechis-api-homolog --org <slug>   # só uma vez
./deploy/scripts/fly-secrets.sh homolog /caminho/secreto/.env.server
fly deploy --config fly.homolog.toml --remote-only
fly certs add api-homolog.catechis.app --app catechis-api-homolog
```

`fly-secrets.sh` importa o `.env.server` do VPS **sem** imprimir valores. Não copies esse ficheiro para o git.

Secrets obrigatórios (além do que já está em `[env]` no toml):

| Secret | Notas |
|--------|--------|
| `DATABASE_URL` | Neon homolog, `connection_limit` baixo (2–5) |
| `JWT_SECRET` | O **mesmo** do VPS homolog (senão as sessões caem no cutover) |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | `sk_test_` / `whsec_` |
| `STRIPE_SINGLE_PLAN_ID` e restantes `price_` | |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | |
| `MAINTENANCE_SECRET` | ≥32 chars |
| `SMTP_PASSWORD` / `RESEND_API_KEY` | |
| `OPENAI_API_KEY` (ou DeepSeek/OpenRouter) | Assistente |
| `BUNNY_*` | uploads / Stream |
| `ADMIN_EMAILS` | |
| `SENTRY_DSN` | opcional |

### DNS Cloudflare

1. `fly certs add api-homolog.catechis.app` mostra A/AAAA ou CNAME.
2. No Cloudflare, `api-homolog` → CNAME `catechis-api-homolog.fly.dev`.
3. Para o certificado Fly (ACME): proxy **cinzento** até o cert ficar `Issued`, depois podes voltar a laranja (Full). Se o ACME falhar com laranja, deixa cinzento: a Fly termina TLS.
4. `homolog` e `familia-homolog` **continuam** no VPS (SPA).

### Caddy no VPS

Quando `/health` na Fly responder `{"status":"ok"}`:

```bash
# no VPS /opt/catechis
cp Caddyfile.homolog.fly Caddyfile.homolog
docker compose -f docker-compose.homolog.yml up -d --force-recreate caddy
docker compose -f docker-compose.homolog.yml stop server
```

O `Caddyfile.homolog.fly` proxya same-origin para `https://catechis-api-homolog.fly.dev` (SSE com `flush_interval -1`).

Rollback: restaura `Caddyfile.homolog` original, `docker compose start server`, DNS `api-homolog` outra vez para o IP do VPS.

## Produção (depois de homolog estável)

```bash
fly apps create catechis-api --org <slug>
./deploy/scripts/fly-secrets.sh prod /caminho/secreto/.env.server.prod
fly deploy --config fly.toml --remote-only
fly certs add api.catechis.app --app catechis-api
```

JWT e Stripe **live** são outro conjunto. Caddy prod: mesmo padrão (proxy `/api` para `catechis-api.fly.dev`). Não cortes o VPS no mesmo dia do primeiro deploy.

## CI

Workflow [`.github/workflows/deploy-fly-homolog.yml`](../../.github/workflows/deploy-fly-homolog.yml): `workflow_dispatch` (não corre em cada push).

GitHub → Settings → Secrets:

| Secret | Valor |
|--------|--------|
| `FLY_API_TOKEN` | `fly tokens create deploy` (só a app homolog se possível) |

Variável opcional: `ENABLE_FLY_HOMOLOG_DEPLOY=true` para permitir o job. Sem ela o workflow só avisa.

## Smoke

```bash
curl -fsS https://catechis-api-homolog.fly.dev/health
curl -fsS https://api-homolog.catechis.app/health          # após DNS
curl -fsS https://homolog.catechis.app/readyz              # via Caddy
```

Webhook Stripe homolog: continua `https://api-homolog.catechis.app/payments-webhook`. Access: Bypass neste path.

Expo: `EXPO_PUBLIC_API_URL=https://api-homolog.catechis.app`.

SSE do Assistente: POST same-origin `https://homolog.catechis.app/api/chat-stream` (não o HTML da SPA).

## O que não fazer

- `wasp deploy fly launch` / `create-db` (cria Postgres Fly).
- `auto_stop_machines` on — jobs e o primeiro request ficam frios.
- Mudar `JWT_SECRET` no cutover.
- Meter `.env.server` no repositório.
- Apontar `homolog.catechis.app` para a Fly (isso é a SPA).

## Referências

- [Wasp + Fly](https://wasp.sh/docs/deployment/deployment-methods/wasp-deploy/fly) — usamos só o Docker nosso, não o CLI `wasp deploy fly`.
- [`deploy/README.md`](../deploy/README.md)
- [`HOMOLOG.md`](HOMOLOG.md)
