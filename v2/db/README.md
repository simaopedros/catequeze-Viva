# v2/db

Migrations SQL do v2 (DEM-20261111-01, T2). Só Postgres 16, sem dado real: os testes usam dados fictícios.

## Arquivos
- `migrations/0001_schema.sql`: schemas por domínio (`identity`, `org`, `catequese`, `familia`, `audit`, `migracao`), `tenant_id` em toda tabela de tenant, RLS forçado com a policy `tenant_isolation`. Derivado do DDL da PoC (`poc/v2-etl`, PR #245).
- `migrations/0002_roles_rls_sync_audit.sql`: papéis, RLS forçado nas tabelas globais, colunas de sync, auditoria em toda tabela de tenant.
- `down/`: reversão de cada migration. `migrate.sh up|down [N]` aplica em ordem, cada arquivo numa transação, com registro em `migracao.schema_migrations`.
- `tests/rls.sh` + `tests/fixtures.sql`: suíte de RLS e papéis (roda no `v2-ci.yml`, Postgres 16 de serviço).

## Convenção de tenant
`tenant_id` = id da paróquia. A API abre uma transação por requisição como `v2_api`, faz `set local role app_rw` e define `app.tenant_id`, `app.user_id` e `app.session_id` com `set_config(..., true)`. Sem `app.tenant_id`, nenhuma linha de tenant aparece (falha fechada).

## Papéis (R3)
| Papel | Tipo | Uso |
|---|---|---|
| `app_rw` | grupo, nologin | API: RLS por tenant, sem acesso a `identity.auth`, `auth_identity`, `etl_run`, colunas de billing |
| `v2_api` | login, sem senha na migration | membro de `app_rw`; a senha vem do cofre no deploy |
| `app_auth` | grupo, nologin | serviço de login (T4): só tabelas de identidade, nenhum dado de tenant |
| `v2_auth` | login, sem senha na migration | membro de `app_auth` |
| `etl` | nologin, BYPASSRLS | único com BYPASSRLS; a T3 define o papel de login dele. Nunca é a API |

Nenhum papel de login é superuser nem BYPASSRLS; o teste confere. A migration roda com o dono do banco, nunca com `v2_api`.

## Sync (offline, A3)
Em toda tabela de tenant: `id` criado no cliente (uuid em texto, o default do servidor só cobre o resto), `device_id`, `client_created_at`, `client_mutation_id` (único por tenant, reenvio recusado), `server_seq` (cursor monotônico para pull incremental, atualizado por trigger), `version` e `updated_at` mantidos por trigger (o ETL preserva os do legado com `app.etl = 'on'`), `deleted_at` como tombstone.

## Auditoria
`audit.event` é append-only (trigger recusa update e delete até para o dono), só ids, sem dado pessoal. O trigger `audit_log` agora cobre toda tabela de tenant.

## Reversão
`./migrate.sh down 2` volta ao banco vazio. Os papéis do cluster só caem se nenhum outro banco os usar. Nunca rodar em produção sem ok do Simão.

## Rodar local
```
V2_DATABASE_URL=postgres://dono@localhost:5432/v2_teste ./migrate.sh up
V2_DATABASE_URL=postgres://dono@localhost:5432/v2_teste ./tests/rls.sh   # o banco de teste é truncado
```
Requer `psql` e um banco de teste dedicado.
