'use strict';
// Agrupamento de paróquias (A2-PoC, seção 1): paróquia A liga B quando o mesmo usuário tem
//   - Membership ATIVA nas duas, ou
//   - é ClassCatechist em turmas das duas, ou
//   - é responsável (GuardianProfile) de uma household cuja paróquia ou cujos filhos matriculados estão nas duas.
// (GuardianProfile.userId é único no schema do Wasp, então "households das duas" vira household + matrículas dos filhos.)
// Cada componente conexo é um grupo indivisível. A Comunidade social (Social*) não entra no grafo.
// Coortes juntam grupos da mesma diocese até 20 paróquias ou 50 mil linhas.
const db = require('./db');
const { TABLES, legacyScopedSelect } = require('./tables');

const MAX_PARISHES = 20;
const MAX_ROWS = 50000;

async function userParishLinks(client = db.legacy()) {
  const { rows } = await client.query(`
    select "userId" as u, "parishId" as p from "Membership" where status = 'ACTIVE'
    union select cc."userId", c."parishId" from "ClassCatechist" cc join "CatechesisClass" c on c.id = cc."classId"
    union select g."userId", h."parishId" from "GuardianProfile" g join "Household" h on h.id = g."householdId" where g."userId" is not null and h."parishId" is not null
    union select g."userId", c."parishId" from "GuardianProfile" g join "CatechumenProfile" k on k."householdId" = g."householdId"
          join "ClassEnrollment" e on e."catechumenProfileId" = k.id and e.status = 'ENROLLED'
          join "CatechesisClass" c on c.id = e."classId" where g."userId" is not null`);
  return rows;
}

async function groups(client = db.legacy()) {
  const { rows: parishes } = await client.query(`select id, name, "dioceseId" from "Parish" order by name`);
  const parent = new Map(parishes.map((p) => [p.id, p.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
  const byUser = new Map();
  for (const { u, p } of await userParishLinks(client)) {
    if (!parent.has(p)) continue;
    if (byUser.has(u)) union(byUser.get(u), p); else byUser.set(u, p);
  }
  const comp = new Map();
  for (const p of parishes) {
    const r = find(p.id);
    if (!comp.has(r)) comp.set(r, []);
    comp.get(r).push(p);
  }
  return [...comp.values()].map((ps) => ({ paroquias: ps.map((p) => p.id), nomes: ps.map((p) => p.name), dioceses: [...new Set(ps.map((p) => p.dioceseId))] }));
}

async function rowsPerParish(client = db.legacy()) {
  const total = new Map();
  for (const t of TABLES.filter((x) => x.tenant)) {
    const { rows } = await client.query(`select s.__tenant as p, count(*)::int as n from (${legacyScopedSelect(t).replace('where s.__tenant = any($1)', '')}) s group by 1`);
    for (const r of rows) total.set(r.p, (total.get(r.p) || 0) + r.n);
  }
  return total;
}

async function cohorts(client = db.legacy()) {
  const gs = await groups(client);
  const rows = await rowsPerParish(client);
  for (const g of gs) g.linhas = g.paroquias.reduce((s, p) => s + (rows.get(p) || 0), 0);
  const out = [];
  for (const g of gs.sort((a, b) => a.nomes[0].localeCompare(b.nomes[0]))) {
    const dio = g.dioceses.sort().join('+');
    const c = out.find((x) => x.diocese === dio && x.paroquias.length + g.paroquias.length <= MAX_PARISHES && x.linhas + g.linhas <= MAX_ROWS);
    if (c) { c.grupos.push(g); c.paroquias.push(...g.paroquias); c.linhas += g.linhas; } else out.push({ diocese: dio, grupos: [g], paroquias: [...g.paroquias], linhas: g.linhas });
  }
  return { grupos: gs, coortes: out };
}

// Usuários com membership ATIVA em paróquias de grupos diferentes (deve ser 0).
async function splitUsers(gs, client = db.legacy()) {
  const groupOf = new Map();
  gs.forEach((g, i) => g.paroquias.forEach((p) => groupOf.set(p, i)));
  const { rows } = await client.query(`select "userId" as u, array_agg(distinct "parishId") as ps from "Membership" where status = 'ACTIVE' group by 1`);
  return rows.filter((r) => new Set(r.ps.map((p) => groupOf.get(p))).size > 1).length;
}

module.exports = { groups, cohorts, splitUsers, userParishLinks };
