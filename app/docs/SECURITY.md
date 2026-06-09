# Segurança pós-provisionamento

## Rotação de credenciais

Se senhas ou API keys foram partilhadas em chat ou tickets:

1. **VPS root** — painel Contabo → alterar senha; depois `scripts/harden-ssh.sh`
2. **Neon** — Console → Reset password → atualizar `DATABASE_URL` em `.env.server` → `docker compose up -d --force-recreate server worker`
3. **Bunny** — Regenerar Storage API Key → atualizar `BUNNY_STORAGE_API_KEY`
4. **Resend** — Revogar e criar nova API key → `SMTP_PASSWORD`
5. **JWT_SECRET** — Gerar novo (`openssl rand -base64 64`) — **invalida sessões** existentes

## SSH

```bash
# No VPS, após confirmar que a chave SSH funciona:
sudo /opt/catechis/scripts/harden-ssh.sh
```

## Firewall

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## GitHub Secrets (nunca commitar)

| Secret | Ambiente |
|--------|----------|
| `HOMOLOG_SSH_*`, `HOMOLOG_DATABASE_URL` | Homolog |
| `PROD_SSH_*`, `PROD_DATABASE_URL` | Produção |

Templates: `app/deploy/.env.server.homolog.example`, `.env.server.prod.example`
