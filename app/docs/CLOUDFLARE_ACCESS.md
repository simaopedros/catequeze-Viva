# Cloudflare Access — Homologação

Protege `homolog.catechis.app`, `familia.homolog.catechis.app` e `api.homolog.catechis.app` para a equipa apenas.

## Pré-requisitos

- Domínio `catechis.app` no Cloudflare (proxy laranja nos registos A de homolog)
- Zero Trust ativo (plano Free inclui até 50 utilizadores)

## Passos

1. **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Tipo: **Self-hosted**
3. Criar **três aplicações** (ou uma com wildcard `*.homolog.catechis.app` se o plano permitir):
   - `homolog.catechis.app`
   - `familia.homolog.catechis.app`
   - `api.homolog.catechis.app`
4. **Policy**: Allow → Include → **Emails** → adicionar emails da equipa (ex. `dev@catechis.app`)
5. Método de login: **One-time PIN** ou **Google** (GitHub)
6. **Session duration**: 24h (homolog)

## SSL origem (importante para API)

Se `curl https://api.homolog.catechis.app/health` falhar com erro TLS:

| Modo Cloudflare | Quando usar |
|-----------------|-------------|
| **Full** | Caddy só HTTP na origem (porta 80) — recomendado para início |
| **Full (strict)** | Exige certificado válido na origem (Caddy ACME ou Cloudflare Origin Certificate) |

Com proxy laranja, o Caddy no VPS pode servir HTTP na porta 80; o Cloudflare termina TLS para o utilizador.

## Produção

Produção (`catechis.app`, `familia.catechis.app`, `api.catechis.app`) permanece **pública** — sem Cloudflare Access. Use WAF e rate limits apenas.
