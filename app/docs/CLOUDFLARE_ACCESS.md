# Cloudflare Access — Homologação

Protege `homolog.catechis.app`, `familia-homolog.catechis.app` e `api-homolog.catechis.app` para a equipa apenas.

Produção (`catechis.app`, `familia.catechis.app`, `api.catechis.app`) permanece **pública** — sem Access.

## Pré-requisitos

- Domínio `catechis.app` no Cloudflare (proxy laranja nos registos A de homolog)
- **Zero Trust activado** na conta (plano Free, até 50 utilizadores — $0)
- SSL homolog em modo **Full** (não Strict) — ver [`CLOUDFLARE_SSL.md`](CLOUDFLARE_SSL.md)

## Onde encontrar Access (UI 2025/2026)

**Não** está em: Websites → `catechis.app` → SSL, nem em Security → WAF.

### Activar Zero Trust (primeira vez)

1. Abra [dash.cloudflare.com](https://dash.cloudflare.com/) (conta onde está `catechis.app`)
2. Menu lateral esquerdo → **Zero Trust** (ícone escudo)
   - Se não aparecer: [one.dash.cloudflare.com](https://one.dash.cloudflare.com/) ou barra superior → **Zero Trust**
3. Primeira visita: escolha **Team name** (ex. `catechis`) e plano **Free** ($0)

### Caminho até Applications

```
Zero Trust  →  Access controls  →  Applications  →  Create new application
```

Em português pode aparecer como: **Zero Trust** → **Controles de acesso** → **Aplicações** → **Criar nova aplicação**.

URL directa (após login): [Applications no Zero Trust](https://one.dash.cloudflare.com/access/applications)

## Passo 1 — Uma aplicação, três hostnames

Recomendado: **uma** aplicação Access com os três hostnames (sessão única para staff, família e API).

**Não precisa de Cloudflare Tunnel** — o tráfego já passa pelo proxy laranja para o VPS.

1. **Create new application** (Criar nova aplicação)
2. Tipo: **Self-hosted and private** (Autoalojada e privada) — **não** escolha SaaS
3. Clique **Add public hostname** (Adicionar hostname público)
4. **Application name:** `Catechis Homolog`
5. **Session duration:** 24 hours
6. Adicionar **dois hostnames** no Access (recomendado — evita CORS com a SPA):

| Subdomain | Domain | Path |
|-----------|--------|------|
| `homolog` | `catechis.app` | `*` |
| `familia-homolog` | `catechis.app` | `*` |

**Não inclua `api-homolog`** na app Access: o browser chama a API via same-origin (`homolog.catechis.app/auth/...`, proxy Caddy). O host `api-homolog` fica **público** só para webhook Stripe e health externo.

Alternativa (3 hostnames): só funciona se o deploy usar same-origin API — ver `setupApiUrlProxy.ts` (patch fetch + XHR).

Para lista com 3 hostnames (legado):

| Subdomain | Domain | Path |
|-----------|--------|------|
| `homolog` | `catechis.app` | `*` |
| `familia-homolog` | `catechis.app` | `*` |
| `api-homolog` | `catechis.app` | `*` |

7. **Access policies** (na mesma página ou passo seguinte): ver Passo 2 abaixo
8. **Identity providers:** ativar **One-time PIN** (One-time PIN / PIN único)
   - Se não vir PIN: Zero Trust → **Settings** → **Authentication** → **Login methods** → activar **One-time PIN**
9. **Create** / **Save** (não é obrigatório configurar Tunnel)

## Passo 2 — Políticas (ordem importa)

Criar políticas **nesta ordem** (a primeira correspondência ganha):

### Política 1 — Bypass webhook Stripe (obrigatório)

Sem isto, o Stripe não consegue autenticar e o billing quebra.

| Campo | Valor |
|-------|-------|
| **Action** | Bypass |
| **Rule name** | `Stripe payments-webhook` |
| **Include** | Path → `/payments-webhook` |

Aplica-se ao hostname `api-homolog.catechis.app` (e também aos portais se alguém apontar webhook para eles).

### Política 2 — Equipa

| Campo | Valor |
|-------|-------|
| **Action** | Allow |
| **Rule name** | `Team emails` |
| **Include** | Emails → lista da equipa (ex. `simaopedros@gmail.com`, `dev@catechis.app`) |

Método de login na app: **One-time PIN** enviado ao email permitido.

## Passo 3 — Service Token (CI + scripts)

O GitHub Actions e `qa-homolog.sh` (fora do VPS) precisam de um token para passar pelo Access.

1. Zero Trust → **Access controls** → **Service credentials** → **Service Tokens** → **Create**
   - Caminho antigo: Access → Service Auth → Service Tokens
2. Nome: `github-actions-homolog`
3. Na aplicação **Catechis Homolog**, adicionar política:

| Campo | Valor |
|-------|-------|
| **Action** | Service Auth |
| **Rule name** | `CI service token` |
| **Include** | Service Token → `github-actions-homolog` |

4. Copiar **Client ID** e **Client Secret** (secret só aparece uma vez)

### GitHub Secrets

Repositório → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Valor |
|--------|-------|
| `CF_ACCESS_CLIENT_ID` | Client ID do service token |
| `CF_ACCESS_CLIENT_SECRET` | Client Secret do service token |

O workflow [`deploy-homolog.yml`](../../.github/workflows/deploy-homolog.yml) e os testes Playwright usam estes headers automaticamente quando os secrets existem.

### VPS (opcional)

Se correr `qa-homolog.sh` **fora** do VPS com Access ativo:

```bash
export CF_ACCESS_CLIENT_ID=...
export CF_ACCESS_CLIENT_SECRET=...
bash scripts/qa-homolog.sh
```

No próprio VPS, o script usa health **in-container** (não passa pelo Access).

## Passo 4 — Validar

1. Browser anónimo → `https://homolog.catechis.app` → deve pedir login Access (PIN)
2. Após PIN no email da equipa → app carrega
3. `https://familia-homolog.catechis.app` → mesmo login (mesma sessão)
4. Webhook Stripe (sem headers Access):

```bash
curl -sS -o /dev/null -w "%{http_code}" -X POST \
  https://api-homolog.catechis.app/payments-webhook \
  -H "Content-Type: application/json" -d '{}'
```

Deve devolver **400** (assinatura inválida), **não** 302 para login Access.

5. Com service token:

```bash
curl -fsS -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  https://api-homolog.catechis.app/health
```

Deve devolver JSON com `"status":"ok"`.

6. Push em `main` → CI deploy → step **E2E smoke (homolog)** verde (requer secrets `CF_ACCESS_*`).

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| Não acho "Access" / "Applications" | Ainda na zona DNS ou WAF | Usar menu **Zero Trust** (não Websites) |
| Só vejo "Tunnels" / "Gateway" | UI nova agrupa produtos | **Access controls** → **Applications** |
| Pede Cloudflare Tunnel | Escolheu fluxo errado | Use **Self-hosted and private** + **Add public hostname** (sem tunnel) |
| Domínio não aparece no dropdown | `catechis.app` noutra conta CF | Confirmar conta; zona activa com proxy |
| CORS após login (`api-homolog` + Access) | SPA chama API noutro host; XHR redireciona para login CF | Remover `api-homolog` do Access **ou** redeploy com `setupApiUrlProxy` (XHR) |
| Webhook Stripe 302 / HTML login | Falta bypass `/payments-webhook` | Política 1 acima (só se `api-homolog` estiver no Access) |
| CI E2E falha após Access | Sem service token no Actions | Secrets `CF_ACCESS_*` |
| 526 SSL | Full strict + `tls internal` | SSL → **Full** — ver CLOUDFLARE_SSL.md |
| Login PIN não chega | Email não está na policy Allow | Adicionar email na política 2 |

## Referências

- [`HOMOLOG.md`](HOMOLOG.md) — checklist QA (pré-requisito Access)
- [`PROVISIONING.md`](PROVISIONING.md) — DNS e Stripe webhook URL
