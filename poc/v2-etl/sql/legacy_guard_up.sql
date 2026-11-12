-- GERADO por scripts/gen-ddl.js. Mudança aditiva no banco legado da PoC. Reverter com legacy_guard_down.sql.
begin;
create schema migracao;
create table migracao.tenant_guard (
  parish_id text primary key, state text not null check (state in ('frozen', 'v2')), updated_at timestamptz not null default now()
);
create function migracao.guard_check(p text) returns void language plpgsql as $$
begin
  if p is null or current_setting('app.guard_bypass', true) = 'on' then return; end if;
  if exists (select 1 from migracao.tenant_guard where parish_id = p) then
    raise exception 'paróquia % congelada ou migrada: escrita no legado recusada', p using errcode = 'P0423';
  end if;
end $$;

create function migracao.guard_parish() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(NEW."id"); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(OLD."id"); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Parish" for each row execute function migracao.guard_parish();

create function migracao.guard_community() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(NEW."parishId"); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(OLD."parishId"); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Community" for each row execute function migracao.guard_community();

create function migracao.guard_membership() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(NEW."parishId"); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(OLD."parishId"); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Membership" for each row execute function migracao.guard_membership();

create function migracao.guard_catechetical_year() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(NEW."parishId"); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(OLD."parishId"); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "CatecheticalYear" for each row execute function migracao.guard_catechetical_year();

create function migracao.guard_stage() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select y."parishId" from "CatecheticalYear" y where y.id = NEW."yearId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select y."parishId" from "CatecheticalYear" y where y.id = OLD."yearId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Stage" for each row execute function migracao.guard_stage();

create function migracao.guard_catechesis_class() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(NEW."parishId"); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(OLD."parishId"); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "CatechesisClass" for each row execute function migracao.guard_catechesis_class();

create function migracao.guard_class_catechist() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = NEW."classId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = OLD."classId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "ClassCatechist" for each row execute function migracao.guard_class_catechist();

create function migracao.guard_household() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(coalesce(NEW."parishId", (select co."parishId" from "Community" co where co.id = NEW."communityId"))); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(coalesce(OLD."parishId", (select co."parishId" from "Community" co where co.id = OLD."communityId"))); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Household" for each row execute function migracao.guard_household();

create function migracao.guard_guardian_profile() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select h."parishId" from "Household" h where h.id = NEW."householdId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select h."parishId" from "Household" h where h.id = OLD."householdId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "GuardianProfile" for each row execute function migracao.guard_guardian_profile();

create function migracao.guard_catechumen_profile() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check(coalesce(NEW."parishId", (select h."parishId" from "Household" h where h.id = NEW."householdId"))); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check(coalesce(OLD."parishId", (select h."parishId" from "Household" h where h.id = OLD."householdId"))); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "CatechumenProfile" for each row execute function migracao.guard_catechumen_profile();

create function migracao.guard_class_enrollment() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = NEW."classId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = OLD."classId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "ClassEnrollment" for each row execute function migracao.guard_class_enrollment();

create function migracao.guard_meeting() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = NEW."classId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select c."parishId" from "CatechesisClass" c where c.id = OLD."classId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "Meeting" for each row execute function migracao.guard_meeting();

create function migracao.guard_attendance_record() returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform migracao.guard_check((select c."parishId" from "Meeting" m join "CatechesisClass" c on c.id = m."classId" where m.id = NEW."meetingId")); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform migracao.guard_check((select c."parishId" from "Meeting" m join "CatechesisClass" c on c.id = m."classId" where m.id = OLD."meetingId")); end if;
  return coalesce(new, old);
end $$;
create trigger poc_tenant_guard before insert or update or delete on "AttendanceRecord" for each row execute function migracao.guard_attendance_record();

commit;
