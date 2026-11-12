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
| `node tests/run-all.js` | T1..T7 + Comunidade social, grava `out/report.json` |
| `node tests/t7-ciclo1.js` | Só o T7 (regressão do A6: F1 a F5), depois de um `run-all.js`; grava `out/report-t7.json` |
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
  A API conecta por `V2_APP_DATABASE_URL`, um login que só é membro de `app_rw` (nunca superusuário). Sem essa variável, a PoC local
  cai em `SET ROLE app_rw` sobre `V2_DATABASE_URL`, o que vale só aqui.
- A API seta `app.tenant_id` e `app.user_id` por transação (`set_config(..., true)`), a partir do cabeçalho `X-Paroquia-Id`,
  e só depois de conferir membership ATIVA naquela paróquia.
- `migracao.tenant_home(parish_id, home legacy|v2, coorte, frozen_at)`: a API só atende paróquia com `home = 'v2'`; escrita exige `frozen_at` nulo.
- No legado, `migracao.tenant_guard(parish_id, state frozen|v2)` + triggers recusam escrita (SQLSTATE `P0423`) da paróquia congelada ou virada.
  O export reverso passa com `app.guard_bypass = on`, só dentro da transação do rollback.
- Congelamento sem perda (F1): toda escrita no legado toma `pg_advisory_xact_lock_shared(hashtext(parish_id))` no trigger, e toda escrita da API
  na v2 toma o mesmo lock antes de ler `tenant_home`. O congelamento (virada no legado, rollback na v2) grava o estado e toma
  `pg_advisory_xact_lock` exclusivo de cada paróquia na mesma transação: espera as transações abertas terminarem antes de o ETL abrir o snapshot.
  Vale para quem escreve em READ COMMITTED (padrão do Prisma).
- `User`, `Auth` e `AuthIdentity` no legado (F5): recusam UPDATE e DELETE (`P0423`) quando o usuário está no escopo de alguma paróquia congelada
  ou virada (mesmo escopo de usuários que o ETL copia: membership de qualquer status, catequista, responsável, catequizando, dono, quem registrou
  presença). Nesse período quem manda nesses dados é a v2; INSERT de usuário novo segue livre.
- Unicidade (F3): na v2 os índices únicos de negócio são parciais `where deleted_at is null`. O ETL aplica o soft-delete antes do upsert, e o
  reverso apaga no legado antes de inserir. Par (encontro, catequizando) apagado e recriado com outro id passa nos dois sentidos.
- Sync: `created_at`, `updated_at`, `deleted_at` (soft-delete do ETL), `version` em toda tabela; `attendance_record.client_mutation_id uuid unique`.
- Auditoria: `audit.event` append-only (só ids), trigger em attendance_record, membership e catechumen_profile. A carga do ETL não gera evento
  (fica em `migracao.etl_run`).

## Endpoints /v1 (contrato da PoC)

Erros: `400` entrada inválida, `401` sem sessão, `403` sem vínculo com a paróquia, `404` recurso não visível (inclui id de outra paróquia),
`423` paróquia ainda no sistema atual ou em migração, `429` muitas tentativas de login. Corpo de erro: `{ "erro": "codigo" }`.

- `POST /v1/auth/login` `{ "email", "password" }` -> `200 { "userId" }` + `Set-Cookie`.
  `isolated`: `__Host-cv2_session=<sid>.<hmac>.<exp>; Path=/; HttpOnly; Secure; SameSite=Lax`.
  `shared`: `cv2_session=...; Domain=.catechis.app; ...` (também chega em familia.catechis.app). Senha errada e e-mail inexistente: `401 credenciais_invalidas`,
  com o mesmo custo (e-mail inexistente verifica um hash argon2id falso com os parâmetros do Wasp). Depois de `LOGIN_MAX_FAILS` falhas (padrão 10)
  em `LOGIN_WINDOW_MIN` minutos (padrão 15) para o mesmo e-mail e IP: `429 muitas_tentativas`. Contador em memória, só na PoC.
- `GET /v1/me` -> `{ "userId" }`
- `GET /v1/turmas` (cabeçalho `X-Paroquia-Id`) -> `{ "items": [{ "id", "nome", "status" }], "total" }`
- `GET /v1/turmas/{id}` -> `{ "id", "nome", "status" }`
- `GET /v1/encontros/{id}/presencas` -> `{ "items": [{ "catequizandoId", "status" }], "total" }`
- `POST /v1/presencas/lote` `{ "encontroId", "itens": [{ "catequizandoId", "status": "PRESENT|ABSENT|LATE|JUSTIFIED", "clientMutationId": uuid }] }`
  (1 a 500 itens) -> `200 { "aplicados", "duplicados", "erros": [{ "item", "erro" }] }`. Reenvio do mesmo `clientMutationId` conta como duplicado
  e não grava de novo. Catequizando fora da turma vira erro do item.
  Papel (F2): coordenação (`PARISH_COORDINATOR`, `PARISH_PRIEST`, `PARISH_SECRETARY`, `COMMUNITY_COORDINATOR`, `DIOCESE_ADMIN`, `SUPER_ADMIN`)
  grava em qualquer turma da paróquia; `LEAD_CATECHIST` e `ASSISTANT_CATECHIST` só nas turmas em que estão em `class_catechist`.
  Qualquer outro papel (inclusive `GUARDIAN`): `403 papel_sem_permissao_para_registrar_presenca`.

Worker de teste: `GET /noop`, `POST /argon2/verify { hash, password }`, `GET /v1/me` (valida o HMAC do cookie com `crypto.subtle.verify`,
em tempo constante, sem consultar banco; por isso a sessão não é revogável no Worker, ponto para a versão de produção).

Grupos: além de membership ativa, catequista e responsável, `Parish.ownerId` e `AttendanceRecord.recordedById` também ligam paróquias.

## Notas

- Sessões do Wasp não são copiadas: na virada, a pessoa faz um login (mesma senha ou Google).
- O Workers proíbe compilar WASM em runtime; por isso o Worker usa `@phi-ag/argon2` com import estático do `.wasm` (hash-wasm falha lá).
- Neste computador o workerd não sobe sem CAs do sistema; o Worker roda em `podman run ... node:22-bookworm npx wrangler dev ...`.
- A CPU do argon2 foi medida localmente. O limite real do plano grátis só se confirma com Worker publicado, e isso é deploy (precisa de ok do Simão).
