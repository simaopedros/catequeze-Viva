# Deploy — Catequese Viva

## Estrutura

```
deploy/
├── docker-compose.yml          # produção: caddy + server + worker
├── docker-compose.homolog.yml
├── Caddyfile / Caddyfile.homolog
├── Dockerfile.server
├── .env.server.homolog.example
└── scripts/
    ├── deploy.sh
    ├── backup-db.sh
    └── seed-homolog.sh
```

## Deploy rápido

1. Copiar ficheiros para `/opt/catechis/` no VPS
2. Copiar `.wasp/out/web-app/build/` para `/opt/catechis/web-app/`
3. Configurar `.env.server` (ver exemplos)
4. `./scripts/deploy.sh homolog` ou `./scripts/deploy.sh prod`

## Variáveis críticas

| Variável | Server | Worker |
| -------- | ------ | ------ |
| `RUN_JOBS` | `false` | `true` |
| `DATABASE_URL` | Neon | Neon (mesmo) |
| `COOKIE_DOMAIN` | `.catechis.app` | idem |

### Segredos

- Use apenas **placeholders** nos ficheiros `*.example`. O `.env.server` real deve existir **só no VPS** (ou num secret manager).
- Se credenciais reais já foram commitadas num exemplo, **rode as chaves** (OpenAI, DB, JWT, email, Stripe, storage, OAuth) e considere limpeza do histórico Git.

### Caddy e `/api/*`

Os domínios SPA (`catechis.app`, `familia.catechis.app`) **devem** ter `handle /api/*` a encaminhar para `server:3001` **antes** do fallback da SPA. Sem isto, `POST /api/chat-stream` devolve `index.html` e o Assistente Teológico falha com resposta vazia.

Após alterar o Caddyfile em produção:

```bash
docker compose -f docker-compose.yml up -d --force-recreate caddy
```

O `scripts/deploy.sh` recusa deploy se o Caddyfile ativo não contiver `handle /api/*`.

Ver também: `docs/PROVISIONING.md`, `docs/HOMOLOG.md`, `docs/BACKUP.md`
