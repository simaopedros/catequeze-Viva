-- Reverte 0002. Só homologação/CI: remove sync, auditoria por trigger, RLS das tabelas globais e os papéis de login.
do $$
declare t record;
begin
  for t in select c.table_schema as s, c.table_name as n from information_schema.columns c
            where c.column_name = 'server_seq' and c.table_schema in ('org', 'catequese', 'familia')
  loop
    execute format('drop trigger if exists sync_touch on %I.%I', t.s, t.n);
    execute format('drop trigger if exists audit_log on %I.%I', t.s, t.n);
    execute format('alter table %I.%I drop column device_id, drop column client_created_at, drop column server_seq', t.s, t.n);
  end loop;
end $$;
-- client_mutation_id e seus índices ficam (attendance_record já os tinha na 0001; nas demais são inertes).
drop schema sync cascade;

drop policy if exists diocese_read on org.diocese;
drop policy if exists diocese_auth on org.diocese;
alter table org.diocese no force row level security;
alter table org.diocese disable row level security;
drop policy if exists auth_all on identity."user";
drop policy if exists auth_all on identity.auth;
drop policy if exists auth_all on identity.auth_identity;
drop policy if exists auth_all on identity.session;
drop policy if exists self_or_same_tenant on identity."user";
drop policy if exists self_update on identity."user";
drop policy if exists own_session on identity.session;
alter table identity."user" no force row level security;
alter table identity."user" disable row level security;
alter table identity.auth no force row level security;
alter table identity.auth disable row level security;
alter table identity.auth_identity no force row level security;
alter table identity.auth_identity disable row level security;
alter table identity.session no force row level security;
alter table identity.session disable row level security;
alter table identity.session drop column revoked_at;
drop policy if exists own_tenant on migracao.tenant_home;
alter table migracao.tenant_home no force row level security;
alter table migracao.tenant_home disable row level security;
alter table migracao.etl_run no force row level security;
alter table migracao.etl_run disable row level security;
alter table migracao.schema_migrations no force row level security;
alter table migracao.schema_migrations disable row level security;

drop owned by v2_api, v2_auth, app_auth;
do $$ declare r text; begin
  foreach r in array array['v2_api', 'v2_auth', 'app_auth'] loop
    begin execute format('drop role if exists %I', r);
    exception when dependent_objects_still_exist then raise notice 'papel % mantido: usado por outro banco do cluster', r; end;
  end loop;
end $$;
