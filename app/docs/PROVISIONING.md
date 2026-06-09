# Provisionamento de infraestrutura — Catequese Viva

Guia para provisionar Neon, Contabo, Bunny.net e Cloudflare conforme o plano de produção v2.

## 1. Neon PostgreSQL

### Produção
1. Criar projeto `catechis-prod` em [neon.tech](https://neon.tech)
2. Copiar `DATABASE_URL` (connection string com `sslmode=require`)
3. Ativar PITR (Point-in-Time Recovery) no plano Launch

### Homologação
1. Criar branch `homolog` no mesmo projeto **ou** projeto separado `catechis-homolog`
2. Copiar `DATABASE_URL` para o VPS de homolog

## 2. Bunny.net Storage

| Ambiente | Storage Zone     | Uso                          |
| -------- | ---------------- | ---------------------------- |
| Homolog  | `catechis-homolog` | Documentos + backups de teste |
| Produção | `catechis-prod`    | Documentos + backups DB      |

1. Criar Storage Zone **privada** (sem CDN público para documentos LGPD)
2. Copiar API Key e hostname regional (ex. `ny.storage.bunnycdn.com`)
3. Configurar em `.env.server`:
   ```env
   BUNNY_STORAGE_ZONE=catechis-prod
   BUNNY_STORAGE_API_KEY=...
   BUNNY_STORAGE_HOSTNAME=ny.storage.bunnycdn.com
   ```

## 3. Contabo VPS

| Ambiente | Spec recomendada | IP |
| -------- | ---------------- | -- |
| Homolog  | Cloud VPS S (4 vCPU, 8 GB) | anotar IP |
| Produção | Cloud VPS M (4 vCPU, 16 GB) | anotar IP |

Em cada VPS:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin ufw
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

Copiar `app/deploy/` para `/opt/catechis/` e configurar `.env.server`.

## 4. Cloudflare DNS

Domínio: `catechis.app` (wildcard `*.catechis.app`)

| Tipo | Nome              | Conteúdo       | Proxy |
| ---- | ----------------- | -------------- | ----- |
| A    | `@` (catechis.app) | IP VPS prod    | Sim   |
| A    | `familia`         | IP VPS prod    | Sim   |
| A    | `api`             | IP VPS prod    | Sim   |
| A    | `homolog`         | IP VPS homolog | Sim   |
| A    | `familia-homolog` | IP VPS homolog | Sim   |
| A    | `api-homolog`     | IP VPS homolog | Sim   |

SSL: **Full (Strict)**

## 5. Cloudflare Access (homolog — dia 1)

Criar Application em Zero Trust → Access → Applications para:
- `homolog.catechis.app`
- `familia-homolog.catechis.app`
- `api-homolog.catechis.app`

Política: emails da equipa ou one-time PIN. Produção permanece pública.

## 6. Resend + Stripe

- **Resend:** verificar domínio `catechis.app` (SPF/DKIM)
- **Stripe homolog:** chaves `sk_test_*`, webhook → `https://api-homolog.catechis.app/payments-webhook`
- **Stripe prod:** chaves `sk_live_*`, webhook → `https://api.catechis.app/payments-webhook`

## 7. Google OAuth (se habilitado)

Redirect URIs:
```
https://catechis.app/auth/google/callback
https://familia.catechis.app/auth/google/callback
https://homolog.catechis.app/auth/google/callback
https://familia-homolog.catechis.app/auth/google/callback
```

## 8. Sentry

Criar projetos separados `catechis-homolog` e `catechis-prod`. Configurar `SENTRY_DSN` em cada `.env.server`.

## 9. GitHub — secrets e variáveis

### Homolog (já em uso)

| Secret | Descrição |
|--------|-----------|
| `HOMOLOG_SSH_HOST` | IP VPS homolog |
| `HOMOLOG_SSH_USER` | `root` |
| `HOMOLOG_SSH_KEY` | Chave privada SSH |
| `HOMOLOG_DATABASE_URL` | Neon homolog (pooler) |

### Produção (antes do go-live)

| Secret | Descrição |
|--------|-----------|
| `PROD_SSH_HOST` | IP VPS produção |
| `PROD_SSH_USER` | `root` |
| `PROD_SSH_KEY` | Chave privada SSH |
| `PROD_DATABASE_URL` | Neon prod (pooler) |

| Variável repositório | Valor |
|---------------------|-------|
| `ENABLE_PROD_DEPLOY` | `true` (após secrets configurados) |

## 10. Primeiro deploy

**Homolog:** push em `main` → workflow `Deploy Homolog` automático.

**Produção:**
```bash
# No VPS prod (uma vez):
./scripts/setup-prod-vps.sh
# Copiar deploy/, preencher .env.server, depois:
git tag v0.1.0 && git push origin v0.1.0
# ou: Actions → Deploy Production → Run workflow
```

Ver `app/deploy/scripts/deploy.sh`, `app/docs/HOMOLOG.md`, `app/docs/CLOUDFLARE_ACCESS.md`.
