-- Reverte legacy_guard_up.sql.
begin;
drop trigger if exists poc_tenant_guard on "Parish";
drop trigger if exists poc_tenant_guard on "Community";
drop trigger if exists poc_tenant_guard on "Membership";
drop trigger if exists poc_tenant_guard on "CatecheticalYear";
drop trigger if exists poc_tenant_guard on "Stage";
drop trigger if exists poc_tenant_guard on "CatechesisClass";
drop trigger if exists poc_tenant_guard on "ClassCatechist";
drop trigger if exists poc_tenant_guard on "Household";
drop trigger if exists poc_tenant_guard on "GuardianProfile";
drop trigger if exists poc_tenant_guard on "CatechumenProfile";
drop trigger if exists poc_tenant_guard on "ClassEnrollment";
drop trigger if exists poc_tenant_guard on "Meeting";
drop trigger if exists poc_tenant_guard on "AttendanceRecord";
drop schema if exists migracao cascade;
commit;
