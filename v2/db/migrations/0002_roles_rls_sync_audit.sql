-- v2/db 0002: papéis (R3), RLS forçado nas tabelas globais, colunas de sync e auditoria em toda tabela de tenant.
-- Reversão: down/0002_roles_rls_sync_audit.sql.

-- ---------------------------------------------------------------------------
-- Papéis. Login e API entram SOMENTE como membros de grupos sem superuser nem BYPASSRLS (R3).
--   app_rw   grupo da API (Worker): RLS por tenant.
--   app_auth grupo do serviço de login (T4): lê/escreve identidade, não lê dado de tenant.
--   v2_api, v2_auth: papéis de login, sem senha aqui. A senha é definida no deploy a partir do cofre
--   (ALTER ROLE ... PASSWORD), nunca em migration. Sem senha, o papel não consegue autenticar.
--   etl: nologin, único com BYPASSRLS (T3 decide o papel de login do ETL; nunca é a API).
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_auth') then create role app_auth nologin nosuperuser nobypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'v2_api') then create role v2_api login nosuperuser nobypassrls nocreatedb nocreaterole noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'v2_auth') then create role v2_auth login nosuperuser nobypassrls nocreatedb nocreaterole noinherit; end if;
end $$;
-- noinherit + SET ROLE explícito evita herança acidental; o pool da API faz "set role app_rw" por transação.
grant app_rw to v2_api;
grant app_auth to v2_auth;
alter role app_rw nosuperuser nobypassrls;
grant usage on schema identity, org, catequese, familia, audit, migracao to app_auth;
revoke all on all tables in schema public from public;

-- ---------------------------------------------------------------------------
-- Sync: ids criados no cliente (uuid em texto, sem depender do default do servidor), idempotência por
-- client_mutation_id, cursor monotônico server_seq para o pull incremental e tombstones (deleted_at).
-- ---------------------------------------------------------------------------
create schema sync;
create sequence sync.seq;
grant usage on schema sync to app_rw, etl;
grant usage on sequence sync.seq to app_rw, etl;

create function sync.touch() returns trigger language plpgsql as $$
begin
  new.server_seq := nextval('sync.seq');
  -- a carga do ETL preserva updated_at e version do legado
  if coalesce(current_setting('app.etl', true), '') <> 'on' then
    new.updated_at := now();
    if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Em toda tabela com tenant_id: colunas de sync, trigger de sync e trigger de auditoria.
-- ---------------------------------------------------------------------------
do $$
declare t record; had_cmid boolean;
begin
  for t in
    select c.table_schema as s, c.table_name as n from information_schema.columns c
     where c.column_name = 'tenant_id' and c.table_schema in ('org', 'catequese', 'familia')
  loop
    select exists (select 1 from information_schema.columns where table_schema = t.s and table_name = t.n and column_name = 'client_mutation_id') into had_cmid;
    execute format('alter table %I.%I add column device_id text, add column client_created_at timestamptz, add column server_seq bigint not null default nextval(''sync.seq'')', t.s, t.n);
    if not had_cmid then
      execute format('alter table %I.%I add column client_mutation_id uuid', t.s, t.n);
      execute format('create unique index on %I.%I (tenant_id, client_mutation_id) where client_mutation_id is not null', t.s, t.n);
    end if;
    execute format('create index on %I.%I (tenant_id, server_seq)', t.s, t.n);
    execute format('create trigger sync_touch before insert or update on %I.%I for each row execute function sync.touch()', t.s, t.n);
    execute format('create trigger audit_log after insert or update or delete on %I.%I for each row execute function audit.log_change()', t.s, t.n);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS forçado nas tabelas sem tenant_id (identidade, referência e controle da migração).
-- ---------------------------------------------------------------------------
alter table identity.session add column revoked_at timestamptz; -- R5: sessão revogável (T4 detalha)
create index on identity.session (user_id);

alter table org.diocese enable row level security;
alter table org.diocese force row level security;
create policy diocese_read on org.diocese for select to app_rw using (true);
grant select on org.diocese to app_rw;
create policy diocese_auth on org.diocese for all to app_auth using (true) with check (true);

alter table identity."user" enable row level security;
alter table identity."user" force row level security;
alter table identity.auth enable row level security;
alter table identity.auth force row level security;
alter table identity.auth_identity enable row level security;
alter table identity.auth_identity force row level security;
alter table identity.session enable row level security;
alter table identity.session force row level security;

-- Serviço de login: todas as linhas de identidade (e só identidade).
create policy auth_all on identity."user" for all to app_auth using (true) with check (true);
create policy auth_all on identity.auth for all to app_auth using (true) with check (true);
create policy auth_all on identity.auth_identity for all to app_auth using (true) with check (true);
create policy auth_all on identity.session for all to app_auth using (true) with check (true);
grant select, insert, update on identity."user", identity.auth, identity.auth_identity to app_auth;
grant select, insert, update, delete on identity.session to app_auth;

-- API: só o próprio usuário e quem tem vínculo (membership) no tenant corrente; só colunas não sensíveis
-- (sem hash, billing, Stripe/Hotmart). A subconsulta em org.membership já passa pela RLS de tenant.
create policy self_or_same_tenant on identity."user" for select to app_rw
  using (id = current_setting('app.user_id', true)
         or exists (select 1 from org.membership m where m.user_id = "user".id and m.deleted_at is null));
create policy self_update on identity."user" for update to app_rw
  using (id = current_setting('app.user_id', true)) with check (id = current_setting('app.user_id', true));
grant select (id, email, first_name, last_name, avatar_url, locale, timezone, phone, suspended_at, deleted_at, created_at) on identity."user" to app_rw;
grant update (first_name, last_name, avatar_url, locale, timezone, phone, onboarding_completed_at) on identity."user" to app_rw;

-- API valida a sessão pelo id informado no início da transação (app.session_id); nenhuma outra linha é visível.
create policy own_session on identity.session for select to app_rw using (id = current_setting('app.session_id', true));
grant select (id, user_id, expires_at, revoked_at) on identity.session to app_rw;

-- tenant_home: a API só enxerga a linha do próprio tenant. etl_run e schema_migrations: sem acesso para app_rw.
alter table migracao.tenant_home enable row level security;
alter table migracao.tenant_home force row level security;
create policy own_tenant on migracao.tenant_home for select to app_rw using (parish_id = current_setting('app.tenant_id', true));
grant select on migracao.tenant_home to app_rw;
alter table migracao.etl_run enable row level security;
alter table migracao.etl_run force row level security;
create table if not exists migracao.schema_migrations (id text primary key, applied_at timestamptz not null default now());
alter table migracao.schema_migrations enable row level security;
alter table migracao.schema_migrations force row level security;

-- Novas tabelas e sequências para o papel do ETL.
grant all on all tables in schema sync, identity, org, catequese, familia, audit, migracao to etl;
grant all on all sequences in schema sync, identity, org, catequese, familia, audit, migracao to etl;
