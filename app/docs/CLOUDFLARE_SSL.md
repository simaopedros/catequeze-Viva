# Cloudflare SSL — Homologação

## Erro 526 (Invalid SSL certificate)

Aparece quando o Cloudflare está em **Full (strict)** e a origem (Caddy) apresenta certificado autoassinado (`tls internal`) ou nenhum certificado válido na porta 443.

### Solução rápida (recomendada para homolog)

1. Cloudflare → **catechis.app** → **SSL/TLS** → **Overview**
2. Modo de encriptação: **Flexible**
   - Visitante → Cloudflare: HTTPS
   - Cloudflare → VPS: HTTP na porta **80**
3. O Caddy homolog (`Caddyfile.homolog`) está configurado só para HTTP (`auto_https off`).

Aguarde 1–2 minutos e recarregue `https://homolog.catechis.app`.

### Alternativa: Full (strict) com Origin Certificate

1. Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames: `homolog.catechis.app`, `*.homolog.catechis.app`
3. Guardar no VPS:
   ```bash
   mkdir -p /opt/catechis/certs
   # colar certificado em certs/cloudflare-origin.pem
   # colar chave em certs/cloudflare-origin-key.pem
   chmod 600 /opt/catechis/certs/*
   ```
4. Usar `Caddyfile.homolog.strict` (se existir) ou adicionar `tls` manualmente
5. SSL mode: **Full (strict)**

### Modos resumidos

| Modo Cloudflare | Origem Caddy homolog | Resultado |
|-----------------|----------------------|-----------|
| **Flexible** | HTTP :80 | OK (recomendado) |
| **Full** | HTTPS autoassinado | OK com `tls internal` |
| **Full (strict)** | HTTPS com Origin Cert | OK |
| **Full (strict)** | `tls internal` | **Erro 526** |
