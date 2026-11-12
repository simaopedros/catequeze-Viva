-- Reverte v2_up.sql (só homologação).
begin;
drop schema if exists migracao, audit, familia, catequese, org, identity cascade;
drop owned by app_rw, etl;
drop role if exists app_rw;
drop role if exists etl;
commit;
