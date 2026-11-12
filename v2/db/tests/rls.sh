#!/usr/bin/env bash
# Suíte de RLS e papéis do v2 (CA2, R3). Precisa das migrations aplicadas e de um banco VAZIO de dados.
# Uso: V2_DATABASE_URL=postgres://dono@host/db ./tests/rls.sh
# O dono do banco carrega os dados fictícios; os testes rodam como v2_api (membro de app_rw) e v2_auth.
set -uo pipefail
cd "$(dirname "$0")"
: "${V2_DATABASE_URL:?defina V2_DATABASE_URL}"
ADMIN="$V2_DATABASE_URL"
API_URL=$(printf '%s' "$ADMIN" | sed -E 's#//[^@]*@#//v2_api:ci_only_api@#')
AUTH_URL=$(printf '%s' "$ADMIN" | sed -E 's#//[^@]*@#//v2_auth:ci_only_auth@#')
FAIL=0; N=0

ok()   { N=$((N+1)); echo "ok   $*"; }
fail() { N=$((N+1)); FAIL=$((FAIL+1)); echo "FAIL $*"; }
expect() { # descrição, esperado, obtido
  if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (esperado '$2', obtido '$3')"; fi
}
adm() { psql "$ADMIN" -v ON_ERROR_STOP=1 -qAt "$@"; }
# api TENANT USER SESSION SQL: uma transação como v2_api -> app_rw com o contexto da requisição (termina em rollback).
# Imprime a última linha de saída; se houve erro, imprime o texto inteiro do erro.
lastline() { local o; o=$(cat); if printf '%s' "$o" | grep -q 'ERROR:'; then printf '%s' "$o" | tr '\n' ' '; else printf '%s' "$o" | tail -n1; fi; }
api() {
  psql "$API_URL" -v ON_ERROR_STOP=1 -qAt -f <(printf "begin;\nset local role app_rw;\nselect set_config('app.tenant_id','%s',true), set_config('app.user_id','%s',true), set_config('app.session_id','%s',true) \\\\gset\n%s\nrollback;\n" "$1" "$2" "$3" "$4") 2>&1 | lastline
}
auth() { psql "$AUTH_URL" -v ON_ERROR_STOP=1 -qAt -c "set role app_auth" -c "$1" 2>&1 | lastline; }

TENANT_TABLES=$(adm -c "select table_schema||'.'||table_name from information_schema.columns where column_name='tenant_id' and table_schema in ('org','catequese','familia','audit') order by 1")

echo "== preparação"
adm -c "alter role v2_api password 'ci_only_api'; alter role v2_auth password 'ci_only_auth'" >/dev/null
adm -f fixtures.sql || { echo "falha ao carregar fixtures"; exit 1; }

echo "== T1 RLS forçado em toda tabela"
Q="select string_agg(n.nspname||'.'||c.relname, ',') from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
      and not (c.relrowsecurity and c.relforcerowsecurity)"
expect "toda tabela tem RLS enabled+forced" "" "$(adm -c "$Q")"
adm -c "create table public.rls_canary (id int)" >/dev/null
CANARY=$(adm -c "$Q")
adm -c "drop table public.rls_canary" >/dev/null
expect "a verificação pega tabela sem RLS (canário)" "public.rls_canary" "$CANARY"
expect "toda tabela de tenant tem policy" "" "$(adm -c "select string_agg(t,',') from (select table_schema||'.'||table_name t from information_schema.columns where column_name='tenant_id' and table_schema in ('org','catequese','familia','audit')) x where not exists (select 1 from pg_policies p where p.schemaname||'.'||p.tablename = x.t)")"

echo "== T2 papéis (R3)"
expect "v2_api, v2_auth, app_rw, app_auth sem superuser nem BYPASSRLS" "0" "$(adm -c "select count(*) from pg_roles where rolname in ('v2_api','v2_auth','app_rw','app_auth') and (rolsuper or rolbypassrls)")"
expect "v2_api é membro de app_rw" "t" "$(adm -c "select pg_has_role('v2_api','app_rw','member')")"
expect "v2_api não é membro de etl" "f" "$(adm -c "select pg_has_role('v2_api','etl','member')")"
expect "app_rw não é dono de nada" "0" "$(adm -c "select count(*) from pg_class c where pg_get_userbyid(c.relowner)='app_rw'")"

echo "== T3 tenant A não lê B"
for t in $TENANT_TABLES; do
  expect "$t: tenant A vê 0 linhas de outro tenant" "0" "$(api tA u-a sess-a "select count(*) from $t where tenant_id <> 'tA';")"
  expect "$t: sem tenant no contexto vê 0 linhas" "0" "$(api '' u-a sess-a "select count(*) from $t;")"
done
expect "A enxerga as próprias linhas (catechumen)" "1" "$(api tA u-a sess-a "select count(*) from familia.catechumen_profile;")"
expect "IDOR por id: perfil de B vem vazio" "0" "$(api tA u-a sess-a "select count(*) from familia.catechumen_profile where id='k-b';")"
expect "IDOR: presença de B vem vazia" "0" "$(api tA u-a sess-a "select count(*) from catequese.attendance_record where id='r-b';")"
expect "UPDATE em linha de B afeta 0" "0" "$(api tA u-a sess-a "with u as (update familia.catechumen_profile set first_name='x' where id='k-b' returning 1) select count(*) from u;")"
expect "DELETE em linha de B afeta 0" "0" "$(api tA u-a sess-a "with d as (delete from catequese.attendance_record where id='r-b' returning 1) select count(*) from d;")"
OUT=$(api tA u-a sess-a "insert into catequese.attendance_record (meeting_id, catechumen_profile_id, status, tenant_id) values ('e-b','k-b','PRESENT','tB');")
case "$OUT" in *"row-level security"*) ok "INSERT com tenant_id de B é recusado";; *) fail "INSERT cross-tenant: $OUT";; esac
expect "tenant_home só do próprio tenant" "tA" "$(api tA u-a sess-a "select string_agg(parish_id,',') from migracao.tenant_home;")"
expect "diocese (referência) legível" "1" "$(api tA u-a sess-a "select count(*) from org.diocese;")"
OUT=$(api tA u-a sess-a "insert into org.diocese (name,country,locale,timezone) values ('x','BR','pt-BR','UTC');")
case "$OUT" in *"permission denied"*) ok "app_rw não escreve em diocese";; *) fail "diocese escrita: $OUT";; esac

echo "== T4 identidade"
expect "API vê o próprio usuário e não o de B" "u-a" "$(api tA u-a sess-a "select string_agg(id,',') from identity.\"user\";")"
OUT=$(api tA u-a sess-a "select payment_processor_user_id from identity.\"user\";")
case "$OUT" in *"permission denied"*) ok "API não lê coluna de billing";; *) fail "billing legível: $OUT";; esac
OUT=$(api tA u-a sess-a "select * from identity.auth;")
case "$OUT" in *"permission denied"*) ok "API não lê identity.auth";; *) fail "auth legível: $OUT";; esac
OUT=$(api tA u-a sess-a "select * from identity.auth_identity;")
case "$OUT" in *"permission denied"*) ok "API não lê identity.auth_identity (hash)";; *) fail "auth_identity legível: $OUT";; esac
expect "API valida só a própria sessão" "sess-a" "$(api tA u-a sess-a "select string_agg(id,',') from identity.session;")"
OUT=$(api tA u-a sess-a "select count(*) from migracao.etl_run;")
case "$OUT" in *"permission denied"*) ok "API não lê etl_run";; *) fail "etl_run legível: $OUT";; esac
expect "serviço de login lê todas as identidades" "2" "$(auth "select count(*) from identity.\"user\";")"
OUT=$(auth "select count(*) from familia.catechumen_profile;")
case "$OUT" in *"permission denied"*) ok "serviço de login não lê dado de tenant";; *) fail "login lê tenant: $OUT";; esac

echo "== T5 sync e auditoria"
NEWM="insert into catequese.meeting (id, date, status, class_id, kind, tenant_id, device_id, client_mutation_id) values ('11111111-1111-4111-8111-111111111111','2026-11-15','OPEN','c-a','REGULAR','tA','dev-1','22222222-2222-4222-8222-222222222222')"
expect "id criado no cliente é aceito e preservado" "11111111-1111-4111-8111-111111111111" "$(api tA u-a sess-a "$NEWM returning id;")"
expect "server_seq cresce no update" "t" "$(api tA u-a sess-a "$NEWM; update catequese.meeting set status='DONE' where id='e-a'; select (select server_seq from catequese.meeting where id='e-a') > (select server_seq from catequese.meeting where id='11111111-1111-4111-8111-111111111111');")"
expect "version incrementa no update" "2" "$(api tA u-a sess-a "update catequese.meeting set status='OPEN' where id='e-a' returning version;")"
OUT=$(api tA u-a sess-a "$NEWM; insert into catequese.meeting (date,status,class_id,kind,tenant_id,client_mutation_id) values ('2026-11-16','OPEN','c-a','REGULAR','tA','22222222-2222-4222-8222-222222222222');")
case "$OUT" in *"duplicate key"*) ok "reenvio com o mesmo client_mutation_id é recusado (idempotência)";; *) fail "client_mutation_id duplicado: $OUT";; esac
expect "auditoria registrou o update (só ids)" "1" "$(api tA u-a sess-a "update catequese.attendance_record set status='ABSENT' where id='r-a'; select count(*) from audit.event where row_id='r-a' and op='UPDATE' and actor='u-a';")"
expect "auditoria de B invisível para A" "0" "$(api tA u-a sess-a "select count(*) from audit.event where tenant_id='tB';")"
OUT=$(api tA u-a sess-a "update audit.event set op='X';")
case "$OUT" in *"permission denied"*) ok "app_rw não altera auditoria";; *) fail "audit update: $OUT";; esac
OUT=$(adm -c "update audit.event set op='X'" 2>&1)
case "$OUT" in *"append-only"*) ok "auditoria é append-only até para o dono";; *) fail "audit append-only: $OUT";; esac

echo
echo "$((N-FAIL))/$N verificações ok"
[ "$FAIL" -eq 0 ]
