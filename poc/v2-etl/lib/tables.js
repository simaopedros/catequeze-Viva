'use strict';
// Mapa das tabelas da PoC: legado (Wasp, public."PascalCase") -> v2 (schema por domínio, snake_case).
// Ordem = ordem de carga (pais antes de filhos). O rollback percorre ao contrário para apagar.
//
// tenantOf(R): expressão SQL que devolve a paróquia (tenant) da linha R no legado.
// R é o alias da linha ("t" no extract, "NEW"/"OLD" no trigger de guarda).

const TABLES = [
  { legacy: 'Diocese', v2: 'org.diocese', scope: 'diocese' },
  { legacy: 'User', v2: 'identity.user', scope: 'user' },
  { legacy: 'Auth', v2: 'identity.auth', scope: 'auth' },
  { legacy: 'AuthIdentity', v2: 'identity.auth_identity', scope: 'auth_identity', key: ['providerName', 'providerUserId'] },
  { legacy: 'Parish', v2: 'org.parish', tenantOf: (R) => `${R}."id"` },
  { legacy: 'Community', v2: 'org.community', tenantOf: (R) => `${R}."parishId"` },
  { legacy: 'Membership', v2: 'org.membership', tenantOf: (R) => `${R}."parishId"`, audit: true },
  { legacy: 'CatecheticalYear', v2: 'catequese.catechetical_year', tenantOf: (R) => `${R}."parishId"` },
  { legacy: 'Stage', v2: 'catequese.stage', tenantOf: (R) => `(select y."parishId" from "CatecheticalYear" y where y.id = ${R}."yearId")` },
  { legacy: 'CatechesisClass', v2: 'catequese.catechesis_class', tenantOf: (R) => `${R}."parishId"` },
  { legacy: 'ClassCatechist', v2: 'catequese.class_catechist', tenantOf: (R) => `(select c."parishId" from "CatechesisClass" c where c.id = ${R}."classId")` },
  { legacy: 'Household', v2: 'catequese.household', tenantOf: (R) => `coalesce(${R}."parishId", (select co."parishId" from "Community" co where co.id = ${R}."communityId"))` },
  { legacy: 'GuardianProfile', v2: 'familia.guardian_profile', tenantOf: (R) => `(select h."parishId" from "Household" h where h.id = ${R}."householdId")` },
  { legacy: 'CatechumenProfile', v2: 'familia.catechumen_profile', tenantOf: (R) => `coalesce(${R}."parishId", (select h."parishId" from "Household" h where h.id = ${R}."householdId"))`, audit: true },
  { legacy: 'ClassEnrollment', v2: 'catequese.class_enrollment', tenantOf: (R) => `(select c."parishId" from "CatechesisClass" c where c.id = ${R}."classId")` },
  { legacy: 'Meeting', v2: 'catequese.meeting', tenantOf: (R) => `(select c."parishId" from "CatechesisClass" c where c.id = ${R}."classId")` },
  { legacy: 'AttendanceRecord', v2: 'catequese.attendance_record', audit: true, clientMutation: true,
    tenantOf: (R) => `(select c."parishId" from "Meeting" m join "CatechesisClass" c on c.id = m."classId" where m.id = ${R}."meetingId")` },
];
// identity.session existe na v2, mas sessões não são copiadas (decisão do parecer T3): login novo na virada.

for (const t of TABLES) {
  t.key ||= ['id'];
  t.tenant = typeof t.tenantOf === 'function';
}

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const q = (s) => `"${s}"`;
const qv2 = (name) => name.split('.').map(q).join('.');

// Usuários ligados às paróquias $1 (text[]) no legado.
const LEGACY_USER_SCOPE = `
  select "userId" as id from "Membership" where "parishId" = any($1)
  union select cc."userId" from "ClassCatechist" cc join "CatechesisClass" c on c.id = cc."classId" where c."parishId" = any($1)
  union select g."userId" from "GuardianProfile" g join "Household" h on h.id = g."householdId" where h."parishId" = any($1) and g."userId" is not null
  union select "userId" from "CatechumenProfile" where "parishId" = any($1) and "userId" is not null
  union select "ownerId" from "Parish" where id = any($1) and "ownerId" is not null
  union select a."recordedById" from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId"
        join "CatechesisClass" c on c.id = m."classId" where c."parishId" = any($1) and a."recordedById" is not null`;

// Mesmo escopo, lido na v2 (só linhas vivas).
const V2_USER_SCOPE = `
  select user_id as id from org.membership where tenant_id = any($1) and deleted_at is null
  union select user_id from catequese.class_catechist where tenant_id = any($1) and deleted_at is null
  union select user_id from familia.guardian_profile where tenant_id = any($1) and deleted_at is null and user_id is not null
  union select user_id from familia.catechumen_profile where tenant_id = any($1) and deleted_at is null and user_id is not null
  union select owner_id from org.parish where id = any($1) and deleted_at is null and owner_id is not null
  union select recorded_by_id from catequese.attendance_record where tenant_id = any($1) and deleted_at is null and recorded_by_id is not null`;

// SELECT do legado com a coluna __tenant (tabelas de paróquia) ou filtro de escopo (globais).
function legacyScopedSelect(t) {
  const T = q(t.legacy);
  if (t.tenant) return `select * from (select t.*, ${t.tenantOf('t')} as __tenant from ${T} t) s where s.__tenant = any($1)`;
  switch (t.scope) {
    case 'diocese': return `select t.* from ${T} t where t.id in (select "dioceseId" from "Parish" where id = any($1))`;
    case 'user': return `select t.* from ${T} t where t.id in (${LEGACY_USER_SCOPE})`;
    case 'auth': return `select t.* from ${T} t where t."userId" in (${LEGACY_USER_SCOPE})`;
    case 'auth_identity': return `select t.* from ${T} t join "Auth" a on a.id = t."authId" where a."userId" in (${LEGACY_USER_SCOPE})`;
  }
  throw new Error(`escopo desconhecido ${t.legacy}`);
}

// Filtro das linhas da v2 que pertencem ao escopo das paróquias $1.
function v2ScopeWhere(t) {
  if (t.tenant) return `tenant_id = any($1)`;
  switch (t.scope) {
    case 'diocese': return `id in (select diocese_id from org.parish where id = any($1))`;
    case 'user': return `id in (${V2_USER_SCOPE})`;
    case 'auth': return `user_id in (${V2_USER_SCOPE})`;
    case 'auth_identity': return `auth_id in (select id from identity.auth where user_id in (${V2_USER_SCOPE}))`;
  }
  throw new Error(`escopo desconhecido ${t.legacy}`);
}

module.exports = { TABLES, snake, q, qv2, legacyScopedSelect, v2ScopeWhere, LEGACY_USER_SCOPE, V2_USER_SCOPE };
