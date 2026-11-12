# PoC DEM-20261111-01: banco novo (v2) + importação por grupos de paróquias

Só homologação, só dados fictícios. Nada aqui aponta para produção, Stripe, DNS ou deploy.
Especificação: A2-PoC (artefato 01a1cd89-41c4-739c-a10a-7efbe984441d).

## Subir o ambiente local

1. Postgres 16 local com dois bancos, `legacy` e `v2`, e as migrações do repositório (`app/migrations/*/migration.sql`) aplicadas nos dois.
2. `npm ci`
3. `node scripts/setup-env.js` cria `.env.local` (fora do git) com `LEGACY_DATABASE_URL`, `V2_DATABASE_URL` e `SESSION_SIGNING_KEY` de teste,
   e `out/setrole.sql` para criar o papel `pocapp` no container. Aplique e apague o arquivo.
4. `node scripts/gen-ddl.js` gera `sql/` a partir do catálogo do legado. Aplique:
   - `sql/v2_up.sql` no banco `v2` (volta: `sql/v2_down.sql`)
   - `sql/legacy_guard_up.sql` no banco `legacy` (volta: `sql/legacy_guard_down.sql`)
5. Worker de teste (workerd local): `npx wrangler dev --config worker/wrangler.toml --port 8787`.
   Se o computador não tiver CAs do sistema, rode dentro de um container Node (ver "Notas").

## Comandos

| Comando | O que faz |
|---|---|
| `node gen.js [--seed 20261111]` | Recria os dados fictícios no legado (2 dioceses, 6 paróquias, 300 usuários, 30.000 presenças, 50 contas com argon2id do Wasp) |
| `node etl.js grupos` | Grupos (componentes conexos) e coortes |
| `node etl.js carga P1,P2 --coorte nome` | ETL legado -> v2, idempotente, registra em `migracao.etl_run` |
| `node etl.js validar P1,P2` | Contagem e checksum md5 por tabela, legado x v2 |
| `node etl.js virada P1,P2 --coorte nome` | Congelar, delta, verificar, `tenant_home` = v2, liberar |
| `node etl.js rollback P1,P2 --coorte nome` | Export reverso v2 -> legado, verificar, `tenant_home` = legacy, liberar o legado |
| `node etl.js estado` | `migracao.tenant_home` (v2) e `migracao.tenant_guard` (legado) |
| `node api/server.js` | API /v1 em 127.0.0.1:8788 (`COOKIE_MODE=isolated` padrão, ou `shared`) |
| `node tests/run-all.js` | T1..T6 + Comunidade social, grava `out/report.json` |
| `node tests/controle-negativo.js` | Prova que a validação acusa divergência e que o ETL repara só o que mudou |

`P1..P6` são apelidos lidos de `out/parishes.json` (gerado pelo `gen.js`); também aceita ids.

## Convenção de tenant

- Tenant = paróquia (`Parish.id`, uuid em texto). Toda tabela de paróquia na v2 tem `tenant_id text not null`, derivado no ETL:
  `parish.id`; `parishId` direto (community, membership, catechetical_year, catechesis_class); via ano (stage); via turma
  (class_catechist, class_enrollment, meeting); via encontro (attendance_record); via household (guardian_profile);
  `parishId` ou household (catechumen_profile, household usa a comunidade se `parishId` for nulo).
- RLS `ENABLE` + `FORCE` com a policy `tenant_id = current_setting('app.tenant_id', true)`, `USING` e `WITH CHECK`.
  Sem `app.tenant_id` setado, nenhuma linha volta (falha fechada).
- Papéis: `app_rw` (sem BYPASSRLS, usado pela API), `etl` (BYPASSRLS, só o import). `identity.*` e `org.diocese` são globais, sem RLS.
- A API seta `app.tenant_id` e `app.user_id` por transação (`set_config(..., true)`), a partir do cabeçalho `X-Paroquia-Id`,
  e só depois de conferir membership ATIVA naquela paróquia.
- `migracao.tenant_home(parish_id, home legacy|v2, coorte, frozen_at)`: a API só atende paróquia com `home = 'v2'`; escrita exige `frozen_at` nulo.
- No legado, `migracao.tenant_guard(parish_id, state frozen|v2)` + triggers recusam escrita (SQLSTATE `P0423`) da paróquia congelada ou virada.
  O export reverso passa com `app.guard_bypass = on`, só dentro da transação do rollback.
- Sync: `created_at`, `updated_at`, `deleted_at` (soft-delete do ETL), `version` em toda tabela; `attendance_record.client_mutation_id uuid unique`.
- Auditoria: `audit.event` append-only (só ids), trigger em attendance_record, membership e catechumen_profile. A carga do ETL não gera evento
  (fica em `migracao.etl_run`).

## Endpoints /v1 (contrato da PoC)

Erros: `400` entrada inválida, `401` sem sessão, `403` sem vínculo com a paróquia, `404` recurso não visível (inclui id de outra paróquia),
`423` paróquia ainda no sistema atual ou em migração. Corpo de erro: `{ "erro": "codigo" }`.

- `POST /v1/auth/login` `{ "email", "password" }` -> `200 { "userId" }` + `Set-Cookie`.
  `isolated`: `__Host-cv2_session=<sid>.<hmac>.<exp>; Path=/; HttpOnly; Secure; SameSite=Lax`.
  `shared`: `cv2_session=...; Domain=.catechis.app; ...` (também chega em familia.catechis.app). Senha errada e e-mail inexistente: `401 credenciais_invalidas`.
- `GET /v1/me` -> `{ "userId" }`
- `GET /v1/turmas` (cabeçalho `X-Paroquia-Id`) -> `{ "items": [{ "id", "nome", "status" }], "total" }`
- `GET /v1/turmas/{id}` -> `{ "id", "nome", "status" }`
- `GET /v1/encontros/{id}/presencas` -> `{ "items": [{ "catequizandoId", "status" }], "total" }`
- `POST /v1/presencas/lote` `{ "encontroId", "itens": [{ "catequizandoId", "status": "PRESENT|ABSENT|LATE|JUSTIFIED", "clientMutationId": uuid }] }`
  (1 a 500 itens) -> `200 { "aplicados", "duplicados", "erros": [{ "item", "erro" }] }`. Reenvio do mesmo `clientMutationId` conta como duplicado
  e não grava de novo. Catequizando fora da turma vira erro do item.

Worker de teste: `GET /noop`, `POST /argon2/verify { hash, password }`, `GET /v1/me` (valida o HMAC do cookie, sem consultar banco).

## Notas

- Sessões do Wasp não são copiadas: na virada, a pessoa faz um login (mesma senha ou Google).
- O Workers proíbe compilar WASM em runtime; por isso o Worker usa `@phi-ag/argon2` com import estático do `.wasm` (hash-wasm falha lá).
- Neste computador o workerd não sobe sem CAs do sistema; o Worker roda em `podman run ... node:22-bookworm npx wrangler dev ...`.
- A CPU do argon2 foi medida localmente. O limite real do plano grátis só se confirma com Worker publicado, e isso é deploy (precisa de ok do Simão).
