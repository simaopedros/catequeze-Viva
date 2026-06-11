# Homologação — Checklist QA Pastoral

Ambiente: `homolog.catechis.app`, `familia-homolog.catechis.app`, `api-homolog.catechis.app`

> Hostnames de **um nível** (`familia-homolog`, não `familia.homolog`) para o SSL gratuito da Cloudflare cobrir todos os subdomínios.

Protegido por **Cloudflare Access** (equipa only — plano Free até 50 users). Guia: [`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md).

**Nota:** `api-homolog.catechis.app` fica **fora** do Access (webhook Stripe + evita CORS). Staff e família usam same-origin API via Caddy.

## Verificação automatizada

```bash
# Smoke básico:
./scripts/qa-homolog.sh

# QA pastoral extendido (inclui smoke):
./scripts/qa-pastoral-homolog.sh

# Com Cloudflare Access (CI ou máquina local):
export CF_ACCESS_CLIENT_ID=...
export CF_ACCESS_CLIENT_SECRET=...
./scripts/qa-pastoral-homolog.sh

# Playwright (requer CF_ACCESS_*):
cd e2e-tests && npm ci && npx playwright test tests/homologPastoral.spec.ts
```

## Pré-requisitos

- [x] Neon branch homolog com `DATABASE_URL` configurado
- [x] Bunny zone `catechis-homolog`
- [x] DNS apontando para VPS homolog
- [x] Cloudflare Access em `homolog` + `familia-homolog` (api-homolog público)
- [x] `.env.server` conforme `deploy/.env.server.homolog.example`
- [x] `COOKIE_DOMAIN=.catechis.app`
- [x] `FAMILY_PORTAL_HOST=familia-homolog.catechis.app`
- [x] `WASP_WEB_CLIENT_URL=https://homolog.catechis.app`
- [x] `WASP_SERVER_URL=https://api-homolog.catechis.app`
- [x] Sem `REACT_APP_*` no `.env.server` (só variáveis de build no CI)
- [x] Resend: domínio `catechis.app` verificado; `SMTP_PASSWORD` + emails `noreply@catechis.app`
- [x] Google OAuth: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; redirect `api-homolog`

### Migrate manual no VPS (se URLs de convite/email estiverem erradas)

Scripts ficam em `/opt/catechis/scripts/` (não `deploy/scripts/`):

```bash
cd /opt/catechis
bash scripts/migrate-homolog-hosts-vps.sh
docker compose -f docker-compose.homolog.yml up -d --force-recreate --pull never server worker
```

## Staff

- [x] Login staff + onboarding + workspace selector — validado `simaopedros@gmail.com` (11/06)
- [x] Criar paróquia, turma, família, catequizando — validado em homolog (11/06)
- [x] Convidar responsável (`inviteUserToParish` role=GUARDIAN) — email + link OK
- [x] Checkout Stripe test + webhook + plano Pro — validado sessão billing
- [x] `STRIPE_*_PLAN_ID=price_...` no `.env.server`
- [x] Webhook `invoice_payment.paid` → HTTP 204 (ou 400 sem assinatura no teste curl)
- [x] `BILLING_RECONCILE_EMAIL` no deploy CI
- [x] Chat IA streaming + créditos pós-Pro
- [x] 2FA admin — `TwoFactorGate` + operações `getTwoFactorStatus` / `verifyTwoFactorLogin` (activar em Conta → testar logout/login)
- [x] Upload/download docs Bunny — staff `DocumentsPage` + multipart Bunny homolog

## Portal da família

- [x] Email de convite com link `https://familia-homolog.catechis.app/convite/{token}`
- [x] Responsável novo: `/criar-conta?token=` → verificar email → `/entrar?token=` → aceitar → `/app`
- [x] Responsável existente: login com token → aceitar convite
- [x] `GuardianProfile` pré-cadastrado liga ao `userId` por email (`linkProfile` em `memberOperations.ts`)
- [x] FamilyAppShell: Painel, Calendário, Mensagens acessíveis
- [x] RBAC: GUARDIAN em `homolog` redireciona para `familia-homolog` (`AppShell.tsx`)
- [x] Upload público `/upload-docs/:token` (sem conta)
- [x] Upload/download autenticado via Bunny homolog
- [x] `resendInvitation` renova token — testes unitários + reenvio manual OK
- [x] `/convite` (sem token) → página de inserir código

## Infra

- [x] `GET /health` → `status: ok`, `database: ok`, `storage.healthy: true`
- [x] Worker processa jobs (`jobs: worker` no health do worker)
- [x] Backup diário (`scripts/backup-db.sh homolog` cron 03:00 UTC)
- [x] `qa-homolog.sh` 4/4 + `qa-pastoral-homolog.sh`

## Jobs e billing

- [x] Jobs registados: `sendInviteEmailJob`, `remindersJob` (`0 7 * * *`), `subscriptionExpirationJob` (`0 4 * * *`)
- [x] `sendInviteEmailJob` — email convite disparado com sucesso
- [ ] Observar log de execução cron `remindersJob` / `subscriptionExpirationJob` (aguardar dados + horário UTC)
- [x] Pricing v2: `/pricing` + `/app/billing`

---

## Registo QA (11/06/2026)

| Bloco | Método | Resultado |
|-------|--------|-----------|
| Infra 100% | VPS + scripts | Resend, OAuth, jobs, qa-homolog |
| C1 Access | Manual | PIN staff + família; api-homolog fora |
| Billing | Manual | Pro ativo, créditos IA |
| Convites | Manual + job | Email `noreply@catechis.app`, link familia-homolog |
| OAuth | Manual | Google signup/login |
| RBAC | Código + manual | `AppShell` redirect GUARDIAN |
| Bunny | Manual | Upload staff/família |
| 2FA | Código | `TwoFactorGate` em staff + família |
| Jobs cron | pg-boss | Registados; observação execução pendente |

**Commits QA:** `4b910aa` … `c12ee42` (email worker, Resend from, members guard, XHR proxy, Google auth).

**Pendente opcional:** service token `CF_ACCESS_*` no GitHub para E2E CI com Access; observar logs worker após cron 04:00/07:00 UTC.
