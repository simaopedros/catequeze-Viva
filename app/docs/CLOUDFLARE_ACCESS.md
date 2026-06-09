# Cloudflare Access — Homologação

Protege `homolog.catechis.app`, `familia-homolog.catechis.app` e `api-homolog.catechis.app` para a equipa apenas.

## Pré-requisitos

- Domínio `catechis.app` no Cloudflare (proxy laranja nos registos A de homolog)
- Zero Trust ativo (plano Free inclui até 50 utilizadores)

## Passos

1. **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Tipo: **Self-hosted**
3. Criar **três aplicações** (ou uma lista de hostnames):
   - `homolog.catechis.app`
   - `familia-homolog.catechis.app`
   - `api-homolog.catechis.app`
4. **Policy**: Allow → Include → **Emails** → adicionar emails da equipa (ex. `dev@catechis.app`)
5. Método de login: **One-time PIN** ou **Google** (GitHub)
6. **Session duration**: 24h (homolog)

## SSL origem (importante — erro 526)

Homolog usa Caddy **só HTTP na porta 80**. No Cloudflare:

**SSL/TLS → Overview → Flexible** (não use Full strict sem Origin Certificate).

Ver guia completo: [`CLOUDFLARE_SSL.md`](CLOUDFLARE_SSL.md)

## Produção

Produção (`catechis.app`, `familia.catechis.app`, `api.catechis.app`) permanece **pública** — sem Cloudflare Access. Use WAF e rate limits apenas.
