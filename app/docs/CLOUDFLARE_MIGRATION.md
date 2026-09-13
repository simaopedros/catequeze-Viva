# Migrar Catequese Viva para Cloudflare

Guia operacional. A aplicação **já usa Cloudflare no edge** (DNS, SSL, Access em homolog). Este documento explica o que isso significa, o que **não cabe** em Workers, e como avançar em fases sem reescrever o Wasp.

## 0. O que esta stack realmente é

Catequese Viva **não** é uma SPA serverless. É Wasp 0.22:

| Peça | Onde corre hoje | Cabe em Workers “puros”? |
|------|-----------------|---------------------------|
| SPA React (Vite) | Caddy serve `/srv/web-app` | Sim — Static Assets / Pages |
| API Express + Prisma | Docker `server:3001` | **Não** — precisa de Node longo |
| Jobs pg-boss (`RUN_JOBS`) | Mesmo image, processo separado ou flag | **Não** — precisa de processo sempre acordado |
| Postgres | Neon | Continua Neon (Hyperdrive só ajuda Workers) |
| Media | Bunny Storage / Stream | Fica Bunny **ou** migra depois para R2 |
| Email | Resend | Sem mudança |
| Pagamentos | Stripe | Sem mudança (URL do webhook importa) |

**Não** migrar Prisma/Express para D1, KV ou Workers Hono nesta fase. Isso é um rewrite, não um deploy.

Caminho realista:

1. **Fase A** — Cloudflare como CDN/WAF/Access (já feito em grande parte).
2. **Fase B** — Cloudflare Tunnel no VPS (sair de portas 80/443 públicas).
3. **Fase C** — API + jobs em [Cloudflare Containers](https://developers.cloudflare.com/containers/get-started/) + SPA em Workers Static Assets (sair do VPS).

Faz **A → B** primeiro. Só depois **C**.

---

## 1. Conta, zona e DNS (já deve existir)

1. Conta em [dash.cloudflare.com](https://dash.cloudflare.com/) dona de `catechis.app`.
2. Zona activa, nameservers Cloudflare.
3. SSL/TLS → Overview:
   - Homolog com Caddy `tls internal`: modo **Full** (não Strict). Ver [`CLOUDFLARE_SSL.md`](CLOUDFLARE_SSL.md).
   - Produção com Origin Certificate: **Full (strict)**.
4. Proxy **laranja** (proxied) nos A/CNAME da app. Cinzento só para SSH / mail se precisares de IP directo.

Registos actuais ([`PROVISIONING.md`](PROVISIONING.md)):

| Tipo | Nome | Destino | Proxy |
|------|------|---------|-------|
| A | `@` | IP VPS prod | Sim |
| A | `familia` | IP VPS prod | Sim |
| A | `api` | IP VPS prod | Sim |
| A | `homolog` | IP VPS homolog | Sim |
| A | `familia-homolog` | IP VPS homolog | Sim |
| A | `api-homolog` | IP VPS homolog | Sim |

Universal SSL cobre **um** nível de wildcard (`*.catechis.app`). Por isso homolog é `familia-homolog.catechis.app`, **não** `familia.homolog.catechis.app`.

### Regras de cache (obrigatório)

Caching da SPA **não** pode apanhar API, auth ou SSE.

Dashboard → Caching → Cache Rules (ou Configuration Rules):

| Quando | Acção |
|--------|--------|
| Path começa com `/api`, `/auth`, `/operations`, `/c/`, `/payments-webhook`, `/health`, `/readyz` | **Bypass cache** |
| Path `*.html` ou `/` | Bypass ou cache curto + `index.html` sempre revalidado |
| `/assets/*`, JS/CSS hashed | Cache longo (immutable) |

Desactivar **Rocket Loader** e **Email Obfuscation** nos hostnames da app (partem o React e os webhooks).

SSE (`/api/chat-stream`, streams colaborativos): a origem já faz `flush_interval -1` no Caddy. No Cloudflare, Bypass cache + sem buffering. Se o Assistente Teológico “trava”, é quase sempre HTML da SPA ou proxy a bufferizar.

---

## 2. Fase A — completar o edge (sem mexer no código)

### 2.1 Origin Certificate (produção)

1. SSL/TLS → Origin Server → **Create Certificate**.
2. Hostnames: `catechis.app`, `www.catechis.app`, `familia.catechis.app`, `api.catechis.app` (e homolog se fores a Strict).
3. Guardar no VPS:

```bash
sudo mkdir -p /opt/catechis/certs
# cloudflare-origin.pem + cloudflare-origin-key.pem
sudo chmod 600 /opt/catechis/certs/*
```

4. Caddy: `tls /certs/cloudflare-origin.pem /certs/cloudflare-origin-key.pem`.
5. SSL mode **Full (strict)**.

### 2.2 Access (homolog já documentado)

Segue [`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md).

- Staff + família homolog atrás de PIN.
- **Não** proteger `/payments-webhook` (Stripe).
- Service Token no GitHub: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.

Produção pública no dia 1. Access em prod é opcional (equipa / preview).

### 2.3 WAF mínimo

Security → WAF:

- Managed ruleset default.
- Skip / exception para `/payments-webhook` e `/api/social/bunny-webhook` se o WAF bloquear webhooks.
- Rate limit em `/auth/*` se quiseres (cuidado com login Google).

---

## 3. Fase B — Cloudflare Tunnel (recomendado antes de Containers)

O VPS deixa de expor 80/443. O `cloudflared` liga-se à Cloudflare; o firewall só precisa de SSH.

1. Zero Trust → Networks → Tunnels → Create.
2. Nome: `catechis-prod` (outro para homolog).
3. Instalar o conector (Docker no mesmo compose):

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
    depends_on:
      - caddy
```

4. Public hostnames do tunnel (HTTP para `http://caddy:80` **ou** HTTPS para Caddy:443 com Origin Cert):

| Hostname público | Serviço interno |
|------------------|-----------------|
| `catechis.app` | `http://caddy:80` |
| `familia.catechis.app` | `http://caddy:80` |
| `api.catechis.app` | `http://caddy:80` |

5. DNS: CNAME `@` / `familia` / `api` → `<tunnel-id>.cfargotunnel.com` (proxied).
6. UFW: fechar 80 e 443 depois de confirmar o tunnel. Manter 22.

O Caddy **continua** a fazer o split SPA vs API (`handle /api/*` **antes** do `try_files`). O Tunnel não substitui essa lógica.

Token do tunnel: só no VPS / secret manager. **Não** commitar.

---

## 4. Fase C — Containers + Static Assets (sair do VPS)

Isto substitui Docker Compose no Contabo. Ainda **não** reescreve a API.

### Arquitectura alvo

```
Browser
  → catechis.app / familia.catechis.app
       Worker (Static Assets + proxy)
            ├─ GET estáticos / SPA fallback → assets
            └─ /api /auth /operations /c /health /readyz /payments-webhook
                 → Container "server" (Node :3001, RUN_JOBS=false)
  → api.catechis.app
       mesmo Worker → Container "server"

Jobs (emails, cron, billing)
  → Container "worker" (mesmo Dockerfile, RUN_JOBS=true)
       sem sleepAfter curto — tem de ficar acordado
```

Postgres continua **Neon**. Media continua **Bunny** até haver um projecto R2 à parte.

### 4.1 O que o Worker de borda tem de replicar do Caddy

O Caddy actual (`app/deploy/Caddyfile`) encaminha para `:3001`:

- `/auth/*`
- `/operations/*`
- `/api/*` (incluindo SSE — **não bufferizar**)
- `/c/*` (Open Graph da Comunidade)
- `/comunidade/sitemap.xml`
- `/blog/sitemap.xml`
- `/blog/*` para crawlers (User-Agent de bots)
- `/health`, `/readyz`
- `/payments-webhook`
- resto → `index.html` (SPA)

Body até **12 MB** (uploads). Configurar no Worker / Container.

Cookies: `COOKIE_DOMAIN=.catechis.app` para staff + família. Same-origin via proxy (`catechis.app/api/...`) é o caminho que já evita CORS com Access.

### 4.2 Containers — limites importantes

- Usa o **mesmo** `app/deploy/Dockerfile.server` (Node 22, `EXPOSE 3001`).
- `defaultPort = 3001`.
- Jobs: **não** uses `sleepAfter: "10s"`. O pg-boss precisa de processo vivo. Instância sempre on, ou um segundo container só de jobs.
- Prisma `connection_limit` baixo (2–5) — Neon pooler + poucas instâncias.
- Secrets: `wrangler secret put` (ou Secrets Store) e injectar no `envVars` do Container. `image_vars` são **build-args** (tipo `REACT_APP_*` no `docker build`), não runtime.

Docs: [Get started](https://developers.cloudflare.com/containers/get-started/), [Env vars and secrets](https://developers.cloudflare.com/containers/examples/env-vars-and-secrets/), [Deploy](https://developers.cloudflare.com/containers/deploy/).

### 4.3 Build da SPA (variáveis **de compile**)

O cliente Vite **embebe** `REACT_APP_*` no JS. Mudar host/portal exige **rebuild**, não só secret no Container.

No Dockerfile já existem:

```
ARG REACT_APP_API_URL
ARG REACT_APP_FAMILY_PORTAL_HOST
ARG REACT_APP_STAFF_PORTAL_HOST
ARG REACT_APP_META_PIXEL_ID
```

Produção:

```
REACT_APP_API_URL=https://api.catechis.app
REACT_APP_FAMILY_PORTAL_HOST=familia.catechis.app
REACT_APP_STAFF_PORTAL_HOST=catechis.app
```

Homolog:

```
REACT_APP_API_URL=https://api-homolog.catechis.app
REACT_APP_FAMILY_PORTAL_HOST=familia-homolog.catechis.app
REACT_APP_STAFF_PORTAL_HOST=homolog.catechis.app
```

Preferência: same-origin (`REACT_APP_API_URL` vazio / relativo) se o Worker proxyar `/api` e `/auth` no hostname da SPA — é o que o Caddy já faz.

Opcionais de cliente (também bake-time):

| Variável | Uso |
|----------|------|
| `REACT_APP_SENTRY_DSN` | Sentry browser |
| `REACT_APP_VAPID_PUBLIC_KEY` | Web Push |
| `REACT_APP_GTM_ID` | GTM |
| `REACT_APP_META_PIXEL_ID` | Pixel (mesmo ID que `META_PIXEL_ID` no server) |
| `REACT_APP_GOOGLE_ANALYTICS_ID` | GA |

### 4.4 Hyperdrive

Só é útil se a **API** passar a correr **dentro de Workers**. Com Containers Node + Prisma, liga **directo ao Neon** (`sslmode=require`). Não uses Hyperdrive como `DATABASE_URL` do Prisma neste modelo.

---

## 5. Variáveis — mapa completo

Valores reais **só** no VPS, Wrangler secrets, ou GitHub Secrets. Os `*.example` do repo são placeholders.

### 5.1 Obrigatórias no boot do server (Wasp)

| Variável | Homolog | Produção | Notas |
|----------|---------|----------|-------|
| `DATABASE_URL` | Neon homolog + `sslmode=require` | Neon prod + pool | Ex.: `?connection_limit=5&pool_timeout=20&sslmode=require` |
| `JWT_SECRET` | `openssl rand -base64 64` | **outro** valor | Nunca partilhar homolog ↔ prod |
| `WASP_WEB_CLIENT_URL` | `https://homolog.catechis.app` | `https://catechis.app` | |
| `WASP_SERVER_URL` | `https://api-homolog.catechis.app` | `https://api.catechis.app` | |
| `COOKIE_DOMAIN` | `.catechis.app` | `.catechis.app` | JWT homolog ≠ prod mesmo com o mesmo domain |
| `FAMILY_PORTAL_HOST` | `familia-homolog.catechis.app` | `familia.catechis.app` | Sem `https://` |
| `STAFF_PORTAL_HOST` | `homolog.catechis.app` | `catechis.app` | |
| `MAINTENANCE_SECRET` | ≥32 chars | outro | Endpoint de manutenção |
| `STRIPE_API_KEY` | `sk_test_...` | `sk_live_...` | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` test | live | Endpoint: `{WASP_SERVER_URL}/payments-webhook` |
| `STRIPE_SINGLE_PLAN_ID` | `price_...` BRL | live | + annual / unlimited / AI packs |
| `GOOGLE_CLIENT_ID` | OAuth client | mesmo ou separado | Redirects abaixo |
| `GOOGLE_CLIENT_SECRET` | | | |
| `ADMIN_EMAILS` | emails da equipa | emails admin | CSV |

Placeholders que o boot ainda **exige** (podem ser dummy em homolog):

```
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_STORE_ID
LEMONSQUEEZY_WEBHOOK_SECRET
POLAR_ORGANIZATION_ACCESS_TOKEN
POLAR_WEBHOOK_SECRET
POLAR_SANDBOX_MODE
PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID
PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID
PAYMENTS_CREDITS_10_PLAN_ID
```

SMTP (auth Wasp) + Resend (resto):

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_...          # igual à API key Resend
RESEND_API_KEY=re_...
EMAIL_FROM_TRANSACTIONAL=noreply@catechis.app
EMAIL_FROM_LIFECYCLE=updates@catechis.app
EMAIL_FROM_PASTORAL=comunicados@catechis.app
EMAIL_FROM_MARKETING=hello@catechis.app
```

Jobs:

| Variável | Server HTTP | Worker de jobs |
|----------|-------------|----------------|
| `RUN_JOBS` | `false` | `true` |
| `NODE_ENV` | `production` | `production` |
| `PG_BOSS_NEW_OPTIONS` | opcional | JSON pg-boss se precisares de tunar |

Se só existir **um** container, `RUN_JOBS=true` nesse único processo (cron e HTTP no mesmo Node).

### 5.2 Fortemente recomendadas

| Variável | Função |
|----------|--------|
| `PRICING_CATALOG_SOURCE` | `db` (admin `/admin/planos`) ou `static` (rollback) |
| `BUNNY_STORAGE_ZONE` / `BUNNY_STORAGE_API_KEY` / `BUNNY_STORAGE_HOSTNAME` | uploads |
| `BUNNY_CDN_HOSTNAME` | CDN público da Comunidade |
| `BUNNY_STREAM_*` | vídeos TUS; webhook `https://<app>/api/social/bunny-webhook?token=` |
| `OPENAI_API_KEY` (ou DeepSeek / OpenRouter) | Assistente / AI |
| `AI_PROVIDER` | `openai` \| `deepseek` \| `openrouter` |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | erros server |
| `TOTP_ENCRYPTION_KEY` | 2FA (obrigatório em produção se usares TOTP) |
| `LIFECYCLE_EMAIL_SECRET` | unsubscribe; cai em `JWT_SECRET` se vazio |

### 5.3 Opcionais

`META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_GRAPH_VERSION`, `META_TEST_EVENT_CODE`, `RESEND_WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `EMAIL_FROM_NAME`, `EMAIL_DEFAULT_LOCALE`, `SENTRY_TRACES_SAMPLE_RATE`, `SESSION_TIMEOUT_HOURS`, `BILLING_RECONCILE_EMAIL`, `AWS_S3_*` (legado).

### 5.4 Expo (não é Cloudflare, mas aponta para a API)

`mobile/.env` (local, **não** commitar):

```
EXPO_PUBLIC_API_URL=https://api.catechis.app
```

Homolog: `https://api-homolog.catechis.app`. Túnel de dev: `https://….trycloudflare.com` (já permitido em `app/vite.config.ts`).

EAS / builds: a mesma `EXPO_PUBLIC_API_URL` no perfil de produção.

### 5.5 Cloudflare / CI (não vão para o processo Wasp)

| Variável | Onde | Uso |
|----------|-------|-----|
| `CF_ACCESS_CLIENT_ID` | GitHub Actions + Playwright | Service Token Access |
| `CF_ACCESS_CLIENT_SECRET` | idem | |
| `CLOUDFLARE_ACCOUNT_ID` | CI Wrangler | Deploy Workers/Containers |
| `CLOUDFLARE_API_TOKEN` | CI | Token com Workers + Containers + DNS |
| `TUNNEL_TOKEN` | VPS compose | Fase B |
| `HOMOLOG_SSH_*` / `PROD_SSH_*` | GitHub | Deploy VPS actual (até sair o SSH) |
| `HOMOLOG_DATABASE_URL` / `PROD_DATABASE_URL` | GitHub | migrate no CI |

### 5.6 Wrangler — como meter secrets no Container

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put STRIPE_API_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# … uma put por secret
```

Variáveis **não secretas** (`WASP_WEB_CLIENT_URL`, hosts, `PRICING_CATALOG_SOURCE`) podem ir em `[vars]` no `wrangler.toml`. Secrets **nunca** no git.

Mapeamento no código do Container (conceito):

```ts
export class WaspServer extends Container {
  defaultPort = 3001
  // Jobs: não adormecer. HTTP puro pode ter sleepAfter alto.
  envVars = {
    NODE_ENV: 'production',
    RUN_JOBS: 'false',
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    WASP_WEB_CLIENT_URL: env.WASP_WEB_CLIENT_URL,
    WASP_SERVER_URL: env.WASP_SERVER_URL,
    COOKIE_DOMAIN: env.COOKIE_DOMAIN,
    FAMILY_PORTAL_HOST: env.FAMILY_PORTAL_HOST,
    STAFF_PORTAL_HOST: env.STAFF_PORTAL_HOST,
    // … resto das secrets do env do Worker
  }
}
```

---

## 6. Integrações a actualizar quando o hostname muda

Não chegam as env vars: os **painéis externos** têm URLs fixas.

### Stripe

- Homolog: `https://api-homolog.catechis.app/payments-webhook`
- Prod: `https://api.catechis.app/payments-webhook`
- Se a API passar a same-origin: podes usar `https://catechis.app/payments-webhook` **só** se o Worker/Caddy proxyar esse path. Access: Bypass neste path.

### Google OAuth

Redirect URIs (já em [`PROVISIONING.md`](PROVISIONING.md)):

```
https://catechis.app/auth/google/callback
https://familia.catechis.app/auth/google/callback
https://homolog.catechis.app/auth/google/callback
https://familia-homolog.catechis.app/auth/google/callback
```

Authorized JavaScript origins: os mesmos hosts sem path.

### Resend

SPF/DKIM no DNS da zona Cloudflare (`catechis.app`). Webhook Resend (se usares): URL pública da API + `RESEND_WEBHOOK_SECRET`.

### Bunny Stream

Webhook: `https://<WASP_WEB_CLIENT_URL ou api>/api/social/bunny-webhook?token=<BUNNY_STREAM_WEBHOOK_TOKEN>`.

### Sentry

`SENTRY_ENVIRONMENT=homolog` vs `production`. DSN server ≠ DSN browser (`REACT_APP_SENTRY_DSN`).

---

## 7. Ordem de execução sugerida

1. Confirmar DNS + SSL Full + cache bypass da API (Fase A).
2. Origin Cert + Full Strict em prod.
3. Checklist Access homolog ([`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md)): PIN, Stripe 400 (não 302), `CF_ACCESS_*` no Actions.
4. Tunnel homolog (`TUNNEL_TOKEN`), DNS CNAME, fechar 80/443 no UFW. Testar login staff, família, Stripe test, SSE do chat.
5. Tunnel produção da mesma forma.
6. **Só então** prova de Containers em **homolog**:
   - Wrangler project + Dockerfile actual
   - Secrets da tabela 5.1
   - Custom domains nos 3 hostnames homolog
   - Smoke: `/readyz`, login email, Google, checkout test, upload Comunidade, Expo `EXPO_PUBLIC_API_URL`
7. Cutover prod: DNS para o Worker/Container, rollback = apontar CNAME outra vez para o tunnel/VPS.

---

## 8. O que **não** fazer

- Subir o server Wasp como Worker TypeScript sem Express/Prisma.
- Trocar Neon por D1 nesta app.
- Meter Hyperdrive no `DATABASE_URL` do Container Prisma sem testar o driver.
- Pôr Access em `api*.catechis.app` sem Bypass de `/payments-webhook` e webhooks Bunny/Resend.
- Usar `familia.homolog.catechis.app` (wildcard SSL de um nível).
- Commits de `.env.server`, `TUNNEL_TOKEN`, `mobile/.env`.
- `sleepAfter` curto no container de jobs.

---

## 9. Referências

| Doc | Quando |
|------|--------|
| [`PROVISIONING.md`](PROVISIONING.md) | Neon, Bunny, VPS, DNS, Stripe, OAuth |
| [`CLOUDFLARE_SSL.md`](CLOUDFLARE_SSL.md) | Full vs Strict, erro 521/526 |
| [`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md) | Access homolog + service token |
| [`HOMOLOG.md`](HOMOLOG.md) | QA |
| [`OPS.md`](OPS.md) | Compose, CI, operação |
| [`deploy/README.md`](../deploy/README.md) | Caddy `/api/*`, `RUN_JOBS` |
| [Cloudflare Containers](https://developers.cloudflare.com/containers/get-started/) | Fase C |
| [Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | Fase B |
