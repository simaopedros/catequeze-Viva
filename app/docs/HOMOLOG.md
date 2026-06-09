# Homologação — Checklist QA Pastoral

Ambiente: `homolog.catechis.app`, `familia.homolog.catechis.app`, `api.homolog.catechis.app`

Protegido por **Cloudflare Access** (equipa only).

## Pré-requisitos

- [ ] Neon branch homolog com `DATABASE_URL` configurado
- [ ] Bunny zone `catechis-homolog`
- [ ] DNS apontando para VPS homolog
- [ ] Cloudflare Access nos 3 hosts
- [ ] `.env.server` conforme `deploy/.env.server.homolog.example`
- [ ] `COOKIE_DOMAIN=.homolog.catechis.app`
- [ ] `FAMILY_PORTAL_HOST=familia.homolog.catechis.app`

## Staff

- [ ] Login staff + onboarding + workspace selector
- [ ] Criar paróquia, turma, família, catequizando
- [ ] Convidar responsável (`inviteUserToParish` role=GUARDIAN)
- [ ] Checkout Stripe test + webhook + cascata `TenantBilling`
- [ ] Chat IA streaming + créditos; 2FA admin

## Portal da família

- [ ] Email de convite com link `https://familia.homolog.catechis.app/convite/{token}`
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

- [ ] `GET https://api.homolog.catechis.app/health` → `status: ok`, `database: ok`, `storage.healthy: true`
- [ ] Worker processa jobs (`jobs: worker` no health do worker)
- [ ] Backup diário (`deploy/scripts/backup-db.sh homolog`)

## Jobs e billing

- [ ] Jobs: `remindersJob`, `subscriptionExpirationJob`
- [ ] Pricing v2: `/pricing` + `/app/billing`
