# Homologação — Checklist QA Pastoral

Ambiente: `homolog.catechis.app`, `familia-homolog.catechis.app`, `api-homolog.catechis.app`

> Hostnames de **um nível** (`familia-homolog`, não `familia.homolog`) para o SSL gratuito da Cloudflare cobrir todos os subdomínios.

Protegido por **Cloudflare Access** (equipa only).

## Verificação automatizada

```bash
# No VPS homolog ou com URLs públicas:
./scripts/qa-homolog.sh
```

## Pré-requisitos

- [ ] Neon branch homolog com `DATABASE_URL` configurado
- [ ] Bunny zone `catechis-homolog`
- [ ] DNS apontando para VPS homolog
- [ ] Cloudflare Access nos 3 hosts
- [ ] `.env.server` conforme `deploy/.env.server.homolog.example`
- [ ] `COOKIE_DOMAIN=.catechis.app`
- [ ] `FAMILY_PORTAL_HOST=familia-homolog.catechis.app`
- [ ] `WASP_WEB_CLIENT_URL=https://homolog.catechis.app`
- [ ] `WASP_SERVER_URL=https://api-homolog.catechis.app`
- [ ] Sem `REACT_APP_*` no `.env.server` (só variáveis de build no CI)

### Migrate manual no VPS (se URLs de convite/email estiverem erradas)

Scripts ficam em `/opt/catechis/scripts/` (não `deploy/scripts/`):

```bash
cd /opt/catechis
bash scripts/migrate-homolog-hosts-vps.sh
docker compose -f docker-compose.homolog.yml up -d --force-recreate --pull never server worker
```

`--pull never` evita erro `registry: denied` ao recriar sem login GHCR manual.

## Staff

- [ ] Login staff + onboarding + workspace selector
- [ ] Criar paróquia, turma, família, catequizando
- [ ] Convidar responsável (`inviteUserToParish` role=GUARDIAN)
- [ ] Checkout Stripe test + webhook + cascata `TenantBilling`
- [ ] `STRIPE_*_PLAN_ID=price_...` no `.env.server` (ver `deploy/.env.server.homolog.example`)
- [ ] Se checkout pagou mas plano continua grátis: ver evento `invoice.paid` no Stripe (deve ser **204**, não 400)
- [ ] Reconciliar manualmente: `bash scripts/reconcile-stripe-billing.sh --resend-last-invoice seu@email.com`
- [ ] Ou definir `BILLING_RECONCILE_EMAIL=seu@email.com` no `.env.server` (deploy CI reconcilia automaticamente)
- [ ] Chat IA streaming + créditos; 2FA admin

## Portal da família

- [ ] Email de convite com link `https://familia-homolog.catechis.app/convite/{token}`
- [ ] Responsável novo: `/criar-conta?token=` → verificar email → `/entrar?token=` → aceitar → `/app`
- [ ] Responsável existente: login com token → aceitar convite
- [ ] `GuardianProfile` pré-cadastrado liga ao `userId` por email
- [ ] FamilyAppShell: Painel, Calendário, Mensagens acessíveis
- [ ] RBAC: responsável **não** acede a rotas staff/billing/admin
- [ ] Upload público `/upload-docs/:token` (sem conta)
- [ ] Upload/download autenticado via Bunny homolog
- [ ] `resendInvitation` renova token
- [ ] `/convite` (sem token) → página de inserir código

## Infra

- [ ] `GET https://api-homolog.catechis.app/health` (ou `https://homolog.catechis.app/health`) → `status: ok`, `database: ok`, `storage.healthy: true`
- [ ] Worker processa jobs (`jobs: worker` no health do worker)
- [ ] Backup diário (`deploy/scripts/backup-db.sh homolog`)

## Jobs e billing

- [ ] Jobs: `remindersJob`, `subscriptionExpirationJob`
- [ ] Pricing v2: `/pricing` + `/app/billing`
