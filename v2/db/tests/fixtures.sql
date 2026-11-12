-- Dados FICTÍCIOS de dois tenants (paróquias) para a suíte de RLS. Roda como dono do banco. Sem dado real.
-- As FKs são deferrable initially deferred: a ordem das linhas não importa dentro da transação.
begin;
-- Banco de TESTE: recomeça do zero para a suíte poder rodar de novo (nunca rode isto em outro banco).
truncate identity."user", org.diocese, org.parish, audit.event, migracao.tenant_home, migracao.etl_run restart identity cascade;
insert into identity."user" (id, email, first_name, last_name, is_admin, credits, locale, timezone, terms_acceptance_required, payment_processor_user_id)
values ('u-a', 'catequista.a@exemplo.invalid', 'Ana', 'Fictícia', false, 0, 'pt-BR', 'America/Sao_Paulo', false, 'cus_FICTICIO_A'),
       ('u-b', 'catequista.b@exemplo.invalid', 'Beto', 'Fictício', false, 0, 'pt-BR', 'America/Sao_Paulo', false, 'cus_FICTICIO_B');
insert into identity.auth (id, user_id) values ('auth-a', 'u-a'), ('auth-b', 'u-b');
insert into identity.session (id, user_id, expires_at) values ('sess-a', 'auth-a', now() + interval '1 day'), ('sess-b', 'auth-b', now() + interval '1 day');
insert into org.diocese (id, name, country, locale, timezone) values ('d-1', 'Diocese Fictícia', 'BR', 'pt-BR', 'America/Sao_Paulo');

-- tenant tA e tB (tenant_id da paróquia = id da paróquia)
insert into org.parish (id, name, country, locale, timezone, active, type, tenant_id, diocese_id) values
  ('tA', 'Paróquia Fictícia A', 'BR', 'pt-BR', 'America/Sao_Paulo', true, 'PARISH', 'tA', 'd-1'),
  ('tB', 'Paróquia Fictícia B', 'BR', 'pt-BR', 'America/Sao_Paulo', true, 'PARISH', 'tB', 'd-1');
insert into org.membership (id, user_id, parish_id, role, status, tenant_id) values
  ('m-a', 'u-a', 'tA', 'CATECHIST', 'ACTIVE', 'tA'), ('m-b', 'u-b', 'tB', 'CATECHIST', 'ACTIVE', 'tB');
insert into catequese.catechetical_year (id, name, start_date, end_date, active, parish_id, owner_type, inheritance_policy, tenant_id) values
  ('y-a', '2026', '2026-02-01', '2026-12-01', true, 'tA', 'PARISH', 'NONE', 'tA'),
  ('y-b', '2026', '2026-02-01', '2026-12-01', true, 'tB', 'PARISH', 'NONE', 'tB');
insert into catequese.stage (id, name, "order", year_id, tenant_id) values ('s-a', 'Etapa A', 1, 'y-a', 'tA'), ('s-b', 'Etapa B', 1, 'y-b', 'tB');
insert into catequese.catechesis_class (id, name, status, max_capacity, parish_id, tenant_id, year_id, stage_id) values
  ('c-a', 'Turma A', 'ACTIVE', 30, 'tA', 'tA', 'y-a', 's-a'), ('c-b', 'Turma B', 'ACTIVE', 30, 'tB', 'tB', 'y-b', 's-b');
insert into familia.catechumen_profile (id, first_name, last_name, tenant_id, parish_id) values
  ('k-a', 'Criança', 'A Fictícia', 'tA', 'tA'), ('k-b', 'Criança', 'B Fictícia', 'tB', 'tB');
insert into catequese.meeting (id, date, status, class_id, kind, tenant_id) values
  ('e-a', '2026-11-08', 'DONE', 'c-a', 'REGULAR', 'tA'), ('e-b', '2026-11-08', 'DONE', 'c-b', 'REGULAR', 'tB');
insert into catequese.attendance_record (id, meeting_id, catechumen_profile_id, status, tenant_id) values
  ('r-a', 'e-a', 'k-a', 'PRESENT', 'tA'), ('r-b', 'e-b', 'k-b', 'PRESENT', 'tB');
insert into migracao.tenant_home (parish_id, home) values ('tA', 'legacy'), ('tB', 'v2');
insert into migracao.etl_run (run_id, direcao, coorte, tabela, inseridos, alterados, apagados, ms)
values (gen_random_uuid(), 'up', 'g1', 'org.parish', 2, 0, 0, 1);
commit;
