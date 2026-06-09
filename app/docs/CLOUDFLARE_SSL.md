# Cloudflare SSL — Homologação

## Subdomínios de homolog (um nível)

O Universal SSL gratuito cobre `*.catechis.app` (um nível). Por isso homolog usa:

| Função | Hostname |
|--------|----------|
| Staff | `homolog.catechis.app` |
| Família | `familia-homolog.catechis.app` |
| API | `api-homolog.catechis.app` |

Não use `familia.homolog.catechis.app` (dois níveis) — a Cloudflare não emite certificado de borda e o browser falha no TLS handshake.

## Erro 521 (Web server is down)

O Cloudflare não consegue conectar na origem. Causa comum em homolog:

- SSL no Cloudflare em **Full** ou **Full (strict)** → tenta HTTPS na porta **443**
- Caddy estava só em HTTP (`auto_https off` + blocos `http://`) → nada escuta em **443** → **521**

**Correção:** `Caddyfile.homolog` usa blocos normais com `tls internal` (portas 80 e 443).

## Erro 526 (Invalid SSL certificate)

Aparece com **Full (strict)** e certificado autoassinado (`tls internal`) na origem.

### Configuração recomendada para homolog

1. Cloudflare → **catechis.app** → **SSL/TLS** → **Overview**
2. Modo: **Full** (não Strict)
   - Visitante → Cloudflare: HTTPS
   - Cloudflare → VPS: HTTPS na **443** com cert autoassinado (aceito em Full)
3. Aguarde 1–2 minutos e recarregue `https://homolog.catechis.app`

**Flexible** também funciona (Cloudflare → HTTP :80), mas **Full** é o padrão em muitas contas e evita 521 se alguém mudar o modo.

### Alternativa: Full (strict) com Origin Certificate

1. Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames: `homolog.catechis.app`, `familia-homolog.catechis.app`, `api-homolog.catechis.app`
3. Guardar no VPS:
   ```bash
   mkdir -p /opt/catechis/certs
   # colar certificado em certs/cloudflare-origin.pem
   # colar chave em certs/cloudflare-origin-key.pem
   chmod 600 /opt/catechis/certs/*
   ```
4. Trocar `tls internal` por `tls /certs/cloudflare-origin.pem /certs/cloudflare-origin-key.pem` no Caddyfile
5. SSL mode: **Full (strict)**

### Modos resumidos

| Modo Cloudflare | Origem Caddy homolog (`tls internal`) | Resultado |
|-----------------|---------------------------------------|-----------|
| **Flexible** | HTTP :80 | OK |
| **Full** | HTTPS :443 autoassinado | OK (recomendado) |
| **Full (strict)** | HTTPS com Origin Cert | OK |
| **Full (strict)** | `tls internal` | **Erro 526** |
| **Full** | só HTTP :80 (sem :443) | **Erro 521** |
