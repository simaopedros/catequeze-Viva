-- GERADO por scripts/gen-ddl.js. PoC DEM-20261111-01, só homologação. Reverter com v2_down.sql.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_rw') then create role app_rw nologin nobypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'etl') then create role etl nologin bypassrls; end if;
end $$;
create schema identity;
create schema org;
create schema catequese;
create schema familia;
create schema audit;
create schema migracao;
grant usage on schema identity, org, catequese, familia, audit, migracao to app_rw, etl;


create table "org"."diocese" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "country" text not null,
  "locale" text not null,
  "timezone" text not null,
  "state" text,
  "wikidata_id" text,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create unique index on "org"."diocese" ("wikidata_id");

create table "identity"."user" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "email" text,
  "username" text,
  "is_admin" boolean not null,
  "payment_processor_user_id" text,
  "subscription_status" text,
  "subscription_plan" text,
  "date_paid" timestamp(3) without time zone,
  "credits" integer not null,
  "avatar_url" text,
  "first_name" text,
  "last_name" text,
  "locale" text not null,
  "phone" text,
  "timezone" text not null,
  "pricing_version" integer,
  "stripe_subscription_id" text,
  "social_banned_at" timestamp(3) without time zone,
  "social_ban_reason" text,
  "lifecycle_emails_opt_out_at" timestamp(3) without time zone,
  "suspended_at" timestamp(3) without time zone,
  "suspended_reason" text,
  "trial_ends_at" timestamp(3) without time zone,
  "email_verified_at" timestamp(3) without time zone,
  "onboarding_completed_at" timestamp(3) without time zone,
  "terms_acceptance_required" boolean not null,
  "billing_provider" text,
  "hotmart_subscriber_code" text,
  "access_ends_at" timestamp(3) without time zone,
  "updated_at" timestamp(3) not null default now(),
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create unique index on "identity"."user" ("email");

create unique index on "identity"."user" ("username");

create unique index on "identity"."user" ("payment_processor_user_id");

create unique index on "identity"."user" ("hotmart_subscriber_code");

create table "identity"."auth" (
  "id" text not null default gen_random_uuid()::text,
  "user_id" text,
  "created_at" timestamp(3) not null default now(),
  "updated_at" timestamp(3) not null default now(),
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create unique index on "identity"."auth" ("user_id");

create table "identity"."auth_identity" (
  "provider_name" text not null,
  "provider_user_id" text not null,
  "provider_data" text not null,
  "auth_id" text not null,
  "created_at" timestamp(3) not null default now(),
  "updated_at" timestamp(3) not null default now(),
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("provider_name", "provider_user_id")
);

create table "org"."parish" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "city" text,
  "state" text,
  "country" text not null,
  "locale" text not null,
  "timezone" text not null,
  "active" boolean not null,
  "diocese_id" text,
  "owner_id" text,
  "address" text,
  "latitude" double precision,
  "longitude" double precision,
  "osm_id" text,
  "wikidata_id" text,
  "type" text not null,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "org"."parish" (tenant_id);

create unique index on "org"."parish" ("osm_id");

create table "org"."community" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "location" text,
  "active" boolean not null,
  "parish_id" text not null,
  "city" text,
  "complement" text,
  "coordinator_name" text,
  "coordinator_phone" text,
  "description" text,
  "email" text,
  "neighborhood" text,
  "number" text,
  "phone" text,
  "state" text,
  "street" text,
  "type" text,
  "zip_code" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "org"."community" (tenant_id);

create table "org"."membership" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "user_id" text not null,
  "parish_id" text not null,
  "community_id" text,
  "role" text not null,
  "status" text not null,
  "invite_token" text,
  "invite_token_expires_at" timestamp(3) without time zone,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "org"."membership" (tenant_id);

create unique index on "org"."membership" ("invite_token");

create table "catequese"."catechetical_year" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "start_date" timestamp(3) without time zone not null,
  "end_date" timestamp(3) without time zone not null,
  "active" boolean not null,
  "parish_id" text not null,
  "source_itinerary_id" text,
  "owner_type" text not null,
  "inheritance_policy" text not null,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."catechetical_year" (tenant_id);

create table "catequese"."stage" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "description" text,
  "order" integer not null,
  "year_id" text not null,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."stage" (tenant_id);

create table "catequese"."catechesis_class" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text not null,
  "status" text not null,
  "max_capacity" integer not null,
  "day_of_week" text,
  "start_time" text,
  "end_time" text,
  "location" text,
  "parish_id" text not null,
  "year_id" text,
  "stage_id" text,
  "sacrament_id" text,
  "community_id" text,
  "document_stage_kind" text,
  "room_id" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."catechesis_class" (tenant_id);

create table "catequese"."class_catechist" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "class_id" text not null,
  "user_id" text not null,
  "role" text not null,
  "tenant_id" text not null,
  "updated_at" timestamp(3) not null default now(),
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."class_catechist" (tenant_id);

create unique index on "catequese"."class_catechist" ("class_id", "user_id");

create table "catequese"."household" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "name" text,
  "address" text,
  "phone" text,
  "parish_id" text,
  "community_id" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."household" (tenant_id);

create table "familia"."guardian_profile" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "user_id" text,
  "household_id" text,
  "phone" text,
  "relationship" text,
  "first_name" text,
  "last_name" text,
  "email" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "familia"."guardian_profile" (tenant_id);

create unique index on "familia"."guardian_profile" ("user_id");

create table "familia"."catechumen_profile" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "first_name" text not null,
  "last_name" text not null,
  "birth_date" timestamp(3) without time zone,
  "photo_url" text,
  "household_id" text,
  "user_id" text,
  "parish_id" text,
  "upload_token" text,
  "upload_token_expires" timestamp(3) without time zone,
  "email" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "familia"."catechumen_profile" (tenant_id);

create unique index on "familia"."catechumen_profile" ("upload_token");

create table "catequese"."class_enrollment" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "class_id" text not null,
  "catechumen_profile_id" text,
  "status" text not null,
  "ended_at" timestamp(3) without time zone,
  "exit_reason" text,
  "notes" text,
  "origin" text,
  "started_at" timestamp(3) without time zone,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."class_enrollment" (tenant_id);

create unique index on "catequese"."class_enrollment" ("class_id", "catechumen_profile_id");

create table "catequese"."meeting" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "title" text,
  "theme" text,
  "date" timestamp(3) without time zone not null,
  "status" text not null,
  "notes" text,
  "class_id" text not null,
  "content_id" text,
  "details" text,
  "kind" text not null,
  "sequence_number" integer,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  primary key ("id")
);

create index on "catequese"."meeting" (tenant_id);

create table "catequese"."attendance_record" (
  "id" text not null default gen_random_uuid()::text,
  "created_at" timestamp(3) without time zone not null default now(),
  "updated_at" timestamp(3) without time zone not null default now(),
  "meeting_id" text not null,
  "catechumen_profile_id" text not null,
  "status" text not null,
  "note" text,
  "recorded_by_id" text,
  "tenant_id" text not null,
  "deleted_at" timestamp(3),
  "version" integer not null default 1,
  "client_mutation_id" uuid unique,
  primary key ("id")
);

create index on "catequese"."attendance_record" (tenant_id);

create unique index on "catequese"."attendance_record" ("meeting_id", "catechumen_profile_id");

create table identity.session (
  "id" text primary key, "expires_at" timestamp(3) not null,
  "user_id" text not null references identity.auth (id) on delete cascade,
  "created_at" timestamp(3) not null default now()
);

alter table "identity"."auth" add foreign key ("user_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "identity"."auth_identity" add foreign key ("auth_id") references "identity"."auth" ("id") deferrable initially deferred;

alter table "org"."parish" add foreign key ("diocese_id") references "org"."diocese" ("id") deferrable initially deferred;

alter table "org"."parish" add foreign key ("owner_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "org"."community" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "org"."membership" add foreign key ("user_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "org"."membership" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "org"."membership" add foreign key ("community_id") references "org"."community" ("id") deferrable initially deferred;

alter table "catequese"."catechetical_year" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "catequese"."stage" add foreign key ("year_id") references "catequese"."catechetical_year" ("id") deferrable initially deferred;

alter table "catequese"."catechesis_class" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "catequese"."catechesis_class" add foreign key ("year_id") references "catequese"."catechetical_year" ("id") deferrable initially deferred;

alter table "catequese"."catechesis_class" add foreign key ("stage_id") references "catequese"."stage" ("id") deferrable initially deferred;

alter table "catequese"."catechesis_class" add foreign key ("community_id") references "org"."community" ("id") deferrable initially deferred;

alter table "catequese"."class_catechist" add foreign key ("class_id") references "catequese"."catechesis_class" ("id") deferrable initially deferred;

alter table "catequese"."class_catechist" add foreign key ("user_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "catequese"."household" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "catequese"."household" add foreign key ("community_id") references "org"."community" ("id") deferrable initially deferred;

alter table "familia"."guardian_profile" add foreign key ("household_id") references "catequese"."household" ("id") deferrable initially deferred;

alter table "familia"."guardian_profile" add foreign key ("user_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "familia"."catechumen_profile" add foreign key ("household_id") references "catequese"."household" ("id") deferrable initially deferred;

alter table "familia"."catechumen_profile" add foreign key ("user_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "familia"."catechumen_profile" add foreign key ("parish_id") references "org"."parish" ("id") deferrable initially deferred;

alter table "catequese"."class_enrollment" add foreign key ("class_id") references "catequese"."catechesis_class" ("id") deferrable initially deferred;

alter table "catequese"."class_enrollment" add foreign key ("catechumen_profile_id") references "familia"."catechumen_profile" ("id") deferrable initially deferred;

alter table "catequese"."meeting" add foreign key ("class_id") references "catequese"."catechesis_class" ("id") deferrable initially deferred;

alter table "catequese"."attendance_record" add foreign key ("meeting_id") references "catequese"."meeting" ("id") deferrable initially deferred;

alter table "catequese"."attendance_record" add foreign key ("catechumen_profile_id") references "familia"."catechumen_profile" ("id") deferrable initially deferred;

alter table "catequese"."attendance_record" add foreign key ("recorded_by_id") references "identity"."user" ("id") deferrable initially deferred;

alter table "org"."parish" enable row level security;
alter table "org"."parish" force row level security;
create policy tenant_isolation on "org"."parish" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "org"."parish" to app_rw;

alter table "org"."community" enable row level security;
alter table "org"."community" force row level security;
create policy tenant_isolation on "org"."community" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "org"."community" to app_rw;

alter table "org"."membership" enable row level security;
alter table "org"."membership" force row level security;
create policy tenant_isolation on "org"."membership" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "org"."membership" to app_rw;

alter table "catequese"."catechetical_year" enable row level security;
alter table "catequese"."catechetical_year" force row level security;
create policy tenant_isolation on "catequese"."catechetical_year" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."catechetical_year" to app_rw;

alter table "catequese"."stage" enable row level security;
alter table "catequese"."stage" force row level security;
create policy tenant_isolation on "catequese"."stage" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."stage" to app_rw;

alter table "catequese"."catechesis_class" enable row level security;
alter table "catequese"."catechesis_class" force row level security;
create policy tenant_isolation on "catequese"."catechesis_class" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."catechesis_class" to app_rw;

alter table "catequese"."class_catechist" enable row level security;
alter table "catequese"."class_catechist" force row level security;
create policy tenant_isolation on "catequese"."class_catechist" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."class_catechist" to app_rw;

alter table "catequese"."household" enable row level security;
alter table "catequese"."household" force row level security;
create policy tenant_isolation on "catequese"."household" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."household" to app_rw;

alter table "familia"."guardian_profile" enable row level security;
alter table "familia"."guardian_profile" force row level security;
create policy tenant_isolation on "familia"."guardian_profile" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "familia"."guardian_profile" to app_rw;

alter table "familia"."catechumen_profile" enable row level security;
alter table "familia"."catechumen_profile" force row level security;
create policy tenant_isolation on "familia"."catechumen_profile" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "familia"."catechumen_profile" to app_rw;

alter table "catequese"."class_enrollment" enable row level security;
alter table "catequese"."class_enrollment" force row level security;
create policy tenant_isolation on "catequese"."class_enrollment" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."class_enrollment" to app_rw;

alter table "catequese"."meeting" enable row level security;
alter table "catequese"."meeting" force row level security;
create policy tenant_isolation on "catequese"."meeting" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."meeting" to app_rw;

alter table "catequese"."attendance_record" enable row level security;
alter table "catequese"."attendance_record" force row level security;
create policy tenant_isolation on "catequese"."attendance_record" to app_rw
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));
grant select, insert, update, delete on "catequese"."attendance_record" to app_rw;

grant select, insert, update on identity.user, identity.auth, identity.auth_identity, identity.session to app_rw;
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
create trigger audit_log after insert or update or delete on "org"."membership" for each row execute function audit.log_change();
create trigger audit_log after insert or update or delete on "familia"."catechumen_profile" for each row execute function audit.log_change();
create trigger audit_log after insert or update or delete on "catequese"."attendance_record" for each row execute function audit.log_change();

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
grant all on all tables in schema identity, org, catequese, familia, audit, migracao to etl;
grant all on all sequences in schema identity, org, catequese, familia, audit, migracao to etl;
commit;
