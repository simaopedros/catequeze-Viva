'use strict';
// Gera, a partir do catálogo do banco legado (schema Wasp aplicado pelas migrations do repo):
//   sql/v2_up.sql / sql/v2_down.sql                     -> banco novo (schemas por domínio, tenant_id, RLS, sync, auditoria)
//   sql/legacy_guard_up.sql / sql/legacy_guard_down.sql -> guarda aditiva no legado (congelamento por paróquia)
// Uso: node scripts/gen-ddl.js
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');
const { TABLES, snake, q, qv2 } = require('../lib/tables');

const out = (f, s) => fs.writeFileSync(path.join(__dirname, '..', 'sql', f), s.trim() + '\n');

async function main() {
  const L = db.legacy();
  const byLegacy = new Map(TABLES.map((t) => [t.legacy, t]));
  const up = [];
  const schemas = ['identity', 'org', 'catequese', 'familia', 'audit', 'migracao'];

  up.push(`-- GERADO por scripts/gen-ddl.js. PoC DEM-20261111-01, só homologação. Reverter com v2_down.sql.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_rw') then create role app_rw nologin nobypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'etl') then create role etl nologin bypassrls; end if;
end $$;
${schemas.map((s) => `create schema ${s};`).join('\n')}
grant usage on schema ${schemas.join(', ')} to app_rw, etl;
`);

  const fks = [];
  for (const t of TABLES) {
    const { rows: cols } = await L.query(
      `select a.attname as name, a.attnotnull as notnull, t.typtype as typtype, format_type(a.atttypid, a.atttypmod) as type
         from pg_attribute a join pg_type t on t.oid = a.atttypid
        where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`, [q(t.legacy)]);
    t.columns = cols.map((c) => c.name);
    const defs = cols.map((c) => {
      const type = c.typtype === 'e' ? 'text' : c.type; // enums do Prisma viram text na PoC
      let d = `  ${q(snake(c.name))} ${type}${c.notnull ? ' not null' : ''}`;
      if (c.name === 'id' && type === 'text') d += ' default gen_random_uuid()::text';
      if (c.name === 'createdAt' || c.name === 'updatedAt') d += ' default now()';
      return d;
    });
    const names = new Set(cols.map((c) => c.name));
    if (t.tenant) defs.push('  "tenant_id" text not null');
    if (!names.has('createdAt')) defs.push('  "created_at" timestamp(3) not null default now()');
    if (!names.has('updatedAt')) defs.push('  "updated_at" timestamp(3) not null default now()');
    defs.push('  "deleted_at" timestamp(3)', '  "version" integer not null default 1');
    if (t.clientMutation) defs.push('  "client_mutation_id" uuid unique');
    defs.push(`  primary key (${t.key.map((k) => q(snake(k))).join(', ')})`);
    up.push(`create table ${qv2(t.v2)} (\n${defs.join(',\n')}\n);`);
    if (t.tenant) up.push(`create index on ${qv2(t.v2)} (tenant_id);`);

    const { rows: uniq } = await L.query(
      `select array_agg(a.attname::text order by k.ord) as cols
         from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
        where i.indrelid = $1::regclass and i.indisunique and not i.indisprimary group by i.indexrelid`, [q(t.legacy)]);
    // F3: unicidade de negócio só entre linhas vivas. Par apagado (soft-delete) e recriado com outro id
    // no legado não colide; o ETL aplica os soft-deletes antes dos upserts (lib/etl.js).
    for (const u of uniq) up.push(`create unique index on ${qv2(t.v2)} (${u.cols.map((c) => q(snake(c))).join(', ')}) where deleted_at is null;`);

    const { rows: fk } = await L.query(
      `select c.confrelid::regclass::text as ref,
              (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(n, ord) join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n) as cols,
              (select array_agg(a.attname::text order by k.ord) from unnest(c.confkey) with ordinality k(n, ord) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.n) as refcols
         from pg_constraint c where c.conrelid = $1::regclass and c.contype = 'f'`, [q(t.legacy)]);
    for (const f of fk) {
      const ref = byLegacy.get(f.ref.replace(/"/g, ''));
      if (!ref) continue; // referência a tabela fora do escopo da PoC: coluna fica, sem FK
      fks.push(`alter table ${qv2(t.v2)} add foreign key (${f.cols.map((c) => q(snake(c))).join(', ')}) references ${qv2(ref.v2)} (${f.refcols.map((c) => q(snake(c))).join(', ')}) deferrable initially deferred;`);
    }
  }
  up.push(`create table identity.session (
  "id" text primary key, "expires_at" timestamp(3) not null,
  "user_id" text not null references identity.auth (id) on delete cascade,
  "created_at" timestamp(3) not null default now()
);`);
  up.push(...fks);

  // RLS: falha fechada quando app.tenant_id não está setado (current_setting(..., true) devolve null/'').
  for (const t of TABLES.filter((x) => x.tenant)) {
    up.push(`alter table ${qv2(t.v2)} enable row level security;
alter table ${qv2(t.v2)} force row level security;
create policy tenant_isolation on ${qv2(t.v2)} to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on ${qv2(t.v2)} to app_rw;`);
  }
  up.push(`grant select, insert, update on identity.user, identity.auth, identity.auth_identity, identity.session to app_rw;
grant delete on identity.session to app_rw;

-- Auditoria append-only, só ids (sem dado pessoal).
create table audit.event (
  id bigserial primary key, tenant_id text not null, at timestamptz not null default now(),
  table_name text not null, op text not null, row_id text not null,
  actor text default current_setting('app.user_id', true)
);
create index on audit.event (tenant_id, at);
alter table audit.event enable row level security;
alter table audit.event force row level security;
create policy tenant_read on audit.event for select to app_rw using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_insert on audit.event for insert to app_rw with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert on audit.event to app_rw;
grant usage on sequence audit.event_id_seq to app_rw;
create function audit.no_change() returns trigger language plpgsql as $$
begin raise exception 'audit.event é append-only'; end $$;
create trigger audit_append_only before update or delete on audit.event for each row execute function audit.no_change();
create function audit.log_change() returns trigger language plpgsql security definer set search_path = pg_catalog, audit as $$
declare r record;
begin
  if current_setting('app.etl', true) = 'on' then return null; end if; -- a carga é auditada em migracao.etl_run
  r := coalesce(new, old);
  insert into audit.event (tenant_id, table_name, op, row_id, actor)
  values (r.tenant_id, tg_table_schema || '.' || tg_table_name, tg_op, r.id, current_setting('app.user_id', true));
  return null;
end $$;
${TABLES.filter((t) => t.audit).map((t) => `create trigger audit_log after insert or update or delete on ${qv2(t.v2)} for each row execute function audit.log_change();`).join('\n')}

-- Controle da migração.
create table migracao.tenant_home (
  parish_id text primary key, home text not null default 'legacy' check (home in ('legacy', 'v2')),
  coorte text, frozen_at timestamptz, updated_at timestamptz not null default now()
);
create table migracao.etl_run (
  id bigserial primary key, run_id uuid not null, direcao text not null, coorte text not null, tabela text not null,
  inseridos int not null, alterados int not null, apagados int not null,
  contagem_origem int, contagem_destino int, checksum_origem text, checksum_destino text,
  ms int not null, at timestamptz not null default now()
);
grant select on migracao.tenant_home to app_rw;
grant all on all tables in schema ${schemas.join(', ')} to etl;
grant all on all sequences in schema ${schemas.join(', ')} to etl;
commit;`);
  out('v2_up.sql', up.join('\n\n'));
  out('v2_down.sql', `-- Reverte v2_up.sql (só homologação).
begin;
drop schema if exists ${[...schemas].reverse().join(', ')} cascade;
drop owned by app_rw, etl;
drop role if exists app_rw;
drop role if exists etl;
commit;`);

  // Guarda do legado: recusa escrita em paróquia congelada ou já virada para v2.
  const g = [`-- GERADO por scripts/gen-ddl.js. Mudança aditiva no banco legado da PoC. Reverter com legacy_guard_down.sql.
begin;
create schema migracao;
create table migracao.tenant_guard (
  parish_id text primary key, state text not null check (state in ('frozen', 'v2')), updated_at timestamptz not null default now()
);
-- F1: quem escreve segura o lock compartilhado da paróquia até o fim da transação. O congelamento
-- (lib/cutover.js) grava 'frozen' e toma o lock exclusivo: espera as transações abertas terminarem
-- antes de o ETL ler o snapshot, e quem chega depois espera na fila e já enxerga 'frozen'.
create function migracao.guard_check(p text) returns void language plpgsql as $$
begin
  if p is null or current_setting('app.guard_bypass', true) = 'on' then return; end if;
  perform pg_advisory_xact_lock_shared(hashtext(p));
  if exists (select 1 from migracao.tenant_guard where parish_id = p) then
    raise exception 'paróquia % congelada ou migrada: escrita no legado recusada', p using errcode = 'P0423';
  end if;
end $$;

-- F5: User, Auth e AuthIdentity são globais. Ficam guardados pelas paróquias do mesmo escopo de
-- usuários que o ETL copia (LEGACY_USER_SCOPE): usuário ligado a paróquia congelada ou migrada
-- não muda perfil, senha nem identidade no legado (quem manda é a v2).
create function migracao.user_parishes(u text) returns setof text language sql stable as $$
  select "parishId" from "Membership" where "userId" = u
  union select c."parishId" from "ClassCatechist" cc join "CatechesisClass" c on c.id = cc."classId" where cc."userId" = u
  union select h."parishId" from "GuardianProfile" g join "Household" h on h.id = g."householdId" where g."userId" = u and h."parishId" is not null
  union select "parishId" from "CatechumenProfile" where "userId" = u and "parishId" is not null
  union select id from "Parish" where "ownerId" = u
  union select c."parishId" from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId"
        join "CatechesisClass" c on c.id = m."classId" where a."recordedById" = u
$$;
create function migracao.guard_user_check(u text) returns void language plpgsql as $$
declare p text;
begin
  if u is null or current_setting('app.guard_bypass', true) = 'on' then return; end if;
  for p in select x from migracao.user_parishes(u) x order by 1 loop perform migracao.guard_check(p); end loop;
end $$;`];
  const gd = ['-- Reverte legacy_guard_up.sql.', 'begin;'];
  for (const t of TABLES.filter((x) => x.tenant)) {
    const fn = `migracao.guard_${snake(t.legacy)}`;
    g.push(`create function ${fn}() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(${t.tenantOf('NEW')}); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(${t.tenantOf('OLD')}); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on ${q(t.legacy)} for each row execute function ${fn}();`);
    gd.push(`drop trigger if exists poc_tenant_guard on ${q(t.legacy)};`);
  }
  const userGuards = [
    ['User', 'guard_user', (R) => `${R}."id"`],
    ['Auth', 'guard_auth', (R) => `${R}."userId"`],
    ['AuthIdentity', 'guard_auth_identity', (R) => `(select a."userId" from "Auth" a where a.id = ${R}."authId")`],
  ];
  for (const [tbl, fn, userOf] of userGuards) {
    g.push(`create function migracao.${fn}() returns trigger language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_user_check(${userOf('OLD')}); end if;
  if tg_op = 'UPDATE' then perform migracao.guard_user_check(${userOf('NEW')}); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before update or delete on ${q(tbl)} for each row execute function migracao.${fn}();`);
    gd.push(`drop trigger if exists poc_tenant_guard on ${q(tbl)};`);
  }
  g.push('commit;');
  gd.push('drop schema if exists migracao cascade;', 'commit;');
  out('legacy_guard_up.sql', g.join('\n\n'));
  out('legacy_guard_down.sql', gd.join('\n'));
  await db.closeAll();
  console.log('ok: sql/v2_up.sql, sql/v2_down.sql, sql/legacy_guard_up.sql, sql/legacy_guard_down.sql');
}
main().catch((e) => { console.error(e); process.exit(1); });
