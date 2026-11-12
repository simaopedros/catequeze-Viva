#!/usr/bin/env bash
# Aplica as migrations de v2/db em ordem, cada uma em transação única, registrando em migracao.schema_migrations.
# Uso: V2_DATABASE_URL=postgres://... ./migrate.sh up|down [N]   (down desfaz as N últimas, padrão 1)
# Roda com o papel dono do banco (nunca com v2_api/app_rw). Produção: só com ok do Simão.
set -euo pipefail
cd "$(dirname "$0")"
: "${V2_DATABASE_URL:?defina V2_DATABASE_URL}"
psqlx() { psql "$V2_DATABASE_URL" -v ON_ERROR_STOP=1 -qAt "$@"; }

psqlx -c "create schema if not exists migracao; create table if not exists migracao.schema_migrations (id text primary key, applied_at timestamptz not null default now());"

case "${1:-}" in
  up)
    for f in migrations/*.sql; do
      id=$(basename "$f" .sql)
      if [ "$(psqlx -c "select 1 from migracao.schema_migrations where id = '$id'")" = "1" ]; then continue; fi
      echo "aplicando $id"
      psqlx -1 -f "$f" -c "insert into migracao.schema_migrations (id) values ('$id')"
    done
    ;;
  down)
    n="${2:-1}"
    for id in $(psqlx -c "select id from migracao.schema_migrations order by id desc limit $n"); do
      echo "revertendo $id"
      if [ "$id" = "0001_schema" ]; then
        # 0001 apaga o schema migracao junto: o registro some com ele.
        psqlx -1 -f "down/$id.sql"
      else
        psqlx -1 -f "down/$id.sql" -c "delete from migracao.schema_migrations where id = '$id'"
      fi
    done
    ;;
  *) echo "uso: $0 up|down [N]" >&2; exit 2 ;;
esac
