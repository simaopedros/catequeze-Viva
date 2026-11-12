'use strict';
// Executa T1..T6 da A2-PoC DEM-20261111-01 contra os bancos locais e grava out/report.json.
// Pré-requisitos: sql/v2_up.sql aplicado na v2, sql/legacy_guard_up.sql no legado, Worker local em WORKER_URL.
// Uso: node tests/run-all.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CookieJar } = require('tough-cookie');
const { verify: nativeVerify } = require('@node-rs/argon2');
const db = require('../lib/db');
const etl = require('../lib/etl');
const cohorts = require('../lib/cohorts');
const cutover = require('../lib/cutover');
const { TABLES, q, qv2, v2ScopeWhere, legacyScopedSelect } = require('../lib/tables');
const { generate, writeLegacy, POC_TABLES } = require('../gen');
const { createServer } = require('../api/server');
const { ms, now, p95, median } = require('../lib/util');

const SEED = 20261111;
const WORKER = process.env.WORKER_URL || 'http://127.0.0.1:8787';
const OUT = path.join(__dirname, '..', 'out');
const report = { inicio: new Date().toISOString(), ambiente: 'Postgres 16 local em contêiner (legacy e v2) + workerd local via wrangler dev', testes: {} };
const pass = (cond) => (cond ? 'PASSA' : 'FALHA');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function resetV2() {
  const all = [...TABLES.map((t) => qv2(t.v2)), 'identity.session', 'audit.event', 'migracao.tenant_home', 'migracao.etl_run'];
  await db.v2().query(`truncate ${all.join(', ')} cascade`);
}

async function legacyChecksumAll() {
  const out = {};
  for (const t of POC_TABLES) {
    const key = t === 'AuthIdentity' ? `t."providerName" || t."providerUserId"` : 't.id';
    const { rows } = await db.legacy().query(`select count(*)::int as n, md5(coalesce(string_agg(t::text, E'\\n' order by ${key} collate "C"), '')) as md5 from ${q(t)} t`);
    out[t] = rows[0];
  }
  return out;
}

// ---------- T1 ----------
const VALID_DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
function validCpf(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
async function t1() {
  log('T1: gerador 2x com a mesma seed');
  const g1 = await generate(SEED); await writeLegacy(g1); const c1 = await legacyChecksumAll();
  const g2 = await generate(SEED); await writeLegacy(g2); const c2 = await legacyChecksumAll();
  const sameChecksum = POC_TABLES.every((t) => c1[t].md5 === c2[t].md5 && c1[t].n === c2[t].n);
  fs.writeFileSync(path.join(OUT, 'fixtures-login.json'), JSON.stringify(g2.logins, null, 1));
  fs.writeFileSync(path.join(OUT, 'parishes.json'), JSON.stringify(g2.parishes));

  const { rows: emails } = await db.legacy().query(`
    select email as e from "User" where email is not null union all select email from "GuardianProfile" where email is not null
    union all select email from "Community" where email is not null union all select email from "CatechumenProfile" where email is not null
    union all select "providerUserId" from "AuthIdentity" where "providerName" = 'email'`);
  const fakeEmails = emails.filter((r) => r.e.endsWith('@example.invalid')).length;

  // Varredura de CPF e telefone válidos em todas as colunas de texto (exceto ids, hashes e tokens).
  let cpfs = 0, phones = 0, scanned = 0;
  for (const t of POC_TABLES) {
    const { rows: cols } = await db.legacy().query(`select column_name as c from information_schema.columns where table_schema = 'public' and table_name = $1 and data_type = 'text'
      and column_name <> 'id' and column_name !~ 'Id$' and column_name not in ('providerData', 'uploadToken', 'inviteToken')`, [t]);
    if (!cols.length) continue;
    const { rows } = await db.legacy().query(`select concat_ws(' ', ${cols.map((c) => q(c.c)).join(', ')}) as s from ${q(t)}`);
    for (const r of rows) {
      scanned++;
      for (const m of r.s.matchAll(/(?<![\w-])(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?![\w-])/g)) if (validCpf(m[1].replace(/\D/g, ''))) cpfs++;
      for (const m of r.s.matchAll(/(?:\+?55\s?)?\((\d{2})\)\s?9?\d{4}[-\s]?\d{4}|(?<![\w-])(\d{2})\s?9\d{4}-?\d{4}(?![\w-])/g)) if (VALID_DDD.has(m[1] || m[2])) phones++;
    }
  }
  // FKs: constraints ativas + consulta de órfãos para cada FK entre tabelas da PoC.
  const { rows: fks } = await db.legacy().query(`
    select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent,
           (select array_agg(a.attname::text order by k.o) from unnest(c.conkey) with ordinality k(n, o) join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n) as cols,
           (select array_agg(a.attname::text order by k.o) from unnest(c.confkey) with ordinality k(n, o) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.n) as pcols
      from pg_constraint c where c.contype = 'f' and c.conrelid::regclass::text = any($1) and c.confrelid::regclass::text = any($1)`, [POC_TABLES.map(q)]);
  let orphans = 0;
  for (const f of fks) {
    const { rows } = await db.legacy().query(`select count(*)::int as n from ${f.child} c where ${f.cols.map((x) => `c.${q(x)} is not null`).join(' and ')}
      and not exists (select 1 from ${f.parent} p where ${f.cols.map((x, i) => `p.${q(f.pcols[i])} = c.${q(x)}`).join(' and ')})`);
    orphans += rows[0].n;
  }
  const counts = Object.fromEntries(POC_TABLES.map((t) => [t, c2[t].n]));
  const target = { Diocese: 2, Parish: 6, User: 300, CatechesisClass: 60, CatechumenProfile: 1200, Household: 900, Meeting: 2400, AttendanceRecord: 30000 };
  const volumeOk = Object.entries(target).every(([k, v]) => counts[k] === v);
  const r = {
    volume: { esperado: target, obtido: counts, ok: volumeOk },
    emailsFicticios: { total: emails.length, emExampleInvalid: fakeEmails, pct: +(100 * fakeEmails / emails.length).toFixed(2) },
    varredura: { linhasVarridas: scanned, cpfsValidos: cpfs, telefonesValidos: phones },
    fks: { constraintsVerificadas: fks.length, orfaos: orphans },
    determinismo: { checksumIgualNas2Execucoes: sameChecksum, checksumAttendance: c2.AttendanceRecord.md5 },
    contasLoginArgon2: g2.logins.length,
  };
  r.resultado = pass(volumeOk && fakeEmails === emails.length && cpfs === 0 && phones === 0 && orphans === 0 && sameChecksum);
  report.testes.T1 = r;
  return g2;
}

// ---------- snapshot físico (inclui xmin: qualquer escrita muda o hash) ----------
async function physicalSnapshot(parishIds) {
  const out = {};
  for (const t of TABLES) {
    const k = t.key.map((x) => `s.${q(x)}::text`).join(` || '|' || `);
    const { rows: a } = await db.legacy().query(`select md5(coalesce(string_agg(s::text, E'\\n' order by ${k} collate "C"), '')) as h from (${legacyScopedSelect(t)}) s`, [parishIds]);
    const kv = t.key.map((x) => `s.${q(require('../lib/tables').snake(x))}::text`).join(` || '|' || `);
    const { rows: b } = await db.v2().query(`select md5(coalesce(string_agg(s.xmin::text || ':' || s::text, E'\\n' order by ${kv} collate "C"), '')) as h, count(*)::int as n
      from ${qv2(t.v2)} s where ${v2ScopeWhere(t).replace(/\bid in/, 's.id in')}`, [parishIds]);
    out[t.v2] = { legado: a[0].h, v2: b[0].h, n: b[0].n };
  }
  return out;
}

// ---------- T2 + T3 ----------
async function t2t3(P) {
  log('T3a: agrupamento');
  const { grupos, coortes } = await cohorts.cohorts();
  const name = Object.fromEntries(Object.entries(P).map(([k, v]) => [v, k]));
  const gruposNomes = grupos.map((g) => g.paroquias.map((p) => name[p]).sort().join(',')).sort();
  const expected = ['P1,P2', 'P3,P4', 'P5', 'P6'];
  const split = await cohorts.splitUsers(grupos);

  log('T2: 1ª carga por coorte');
  await resetV2();
  const t0 = now();
  const carga1 = [];
  for (const [i, c] of coortes.entries()) carga1.push(await etl.load(`coorte-${i + 1}`, c.paroquias));
  const carga1Ms = ms(t0);
  const all = Object.values(P);
  const cmp1 = await etl.compare(all);
  const nullTenant = [];
  for (const t of TABLES.filter((x) => x.tenant)) {
    const { rows } = await db.v2().query(`select count(*)::int as n from ${qv2(t.v2)} where tenant_id is null`);
    nullTenant.push(rows[0].n);
  }

  log('T2: 2ª carga sem mudança');
  const carga2 = [];
  for (const [i, c] of coortes.entries()) carga2.push(await etl.load(`coorte-${i + 1}`, c.paroquias));
  const sum = (runs, f) => runs.reduce((s, r) => s + r.tabelas.reduce((a, x) => a + x[f], 0), 0);

  log('T2/T3: delta em P1 (50 alteradas, 10 apagadas) e migração só do grupo {P1,P2}');
  const others = [P.P3, P.P4, P.P5, P.P6];
  const before = await physicalSnapshot(others);
  const lc = await db.legacy().connect();
  try {
    await lc.query('begin');
    const att = TABLES.find((t) => t.legacy === 'AttendanceRecord');
    const { rows: ids } = await lc.query(`select s.id from (${legacyScopedSelect(att)}) s order by s.id limit 60`, [[P.P1]]);
    const upd = ids.slice(0, 50).map((r) => r.id);
    const del = ids.slice(50).map((r) => r.id);
    await lc.query(`update "AttendanceRecord" set status = case when status = 'PRESENT' then 'ABSENT'::"AttendanceStatus" else 'PRESENT'::"AttendanceStatus" end, "updatedAt" = "updatedAt" + interval '1 minute' where id = any($1)`, [upd]);
    await lc.query(`delete from "AttendanceRecord" where id = any($1)`, [del]);
    await lc.query('commit');
  } finally { lc.release(); }
  const td = now();
  const delta = await etl.load('grupo-P1P2', [P.P1, P.P2]);
  const deltaMs = ms(td);
  const after = await physicalSnapshot(others);
  const cmpDelta = await etl.compare([P.P1, P.P2]);
  const deltaAtt = delta.tabelas.find((x) => x.tabela === 'catequese.attendance_record');
  const deltaRest = delta.tabelas.filter((x) => x.tabela !== 'catequese.attendance_record').reduce((s, x) => s + x.inseridos + x.alterados + x.apagados, 0);
  const untouched = Object.keys(before).filter((k) => before[k].legado === after[k].legado && before[k].v2 === after[k].v2).length;

  const r2 = {
    carga1: { ms: carga1Ms, coortes: carga1.map((c) => ({ coorte: c.coorte, ms: c.ms, inseridos: c.tabelas.reduce((a, x) => a + x.inseridos, 0) })),
      tabelas: cmp1.map((c) => ({ tabela: c.tabela, legado: c.contagemLegado, v2: c.contagemV2, diferenca: c.diferenca, checksumIgual: c.checksumIgual })) },
    tenantIdNulo: nullTenant.reduce((a, b) => a + b, 0),
    carga2: { inseridos: sum(carga2, 'inseridos'), alterados: sum(carga2, 'alterados'), apagados: sum(carga2, 'apagados'), ms: carga2.reduce((a, c) => a + c.ms, 0) },
    delta: { ms: deltaMs, attendance: { inseridos: deltaAtt.inseridos, alterados: deltaAtt.alterados, apagados: deltaAtt.apagados }, demaisTabelas: deltaRest,
      diferencaPosDelta: cmpDelta.filter((c) => c.diferenca !== 0 || !c.checksumIgual).map((c) => c.tabela) },
  };
  r2.resultado = pass(cmp1.every((c) => c.diferenca === 0 && c.checksumIgual) && r2.tenantIdNulo === 0
    && r2.carga2.inseridos + r2.carga2.alterados + r2.carga2.apagados === 0
    && deltaAtt.alterados === 50 && deltaAtt.apagados === 10 && deltaAtt.inseridos === 0 && deltaRest === 0 && r2.delta.diferencaPosDelta.length === 0
    && carga1Ms <= 600000 && deltaMs <= 120000);
  report.testes.T2 = r2;

  const r3 = { grupos: gruposNomes, esperado: expected, coortes: coortes.map((c) => ({ diocese: c.diocese, paroquias: c.paroquias.map((p) => name[p]).sort(), linhas: c.linhas })),
    usuariosDivididosEntreGrupos: split, tabelasP3aP6Intactas: `${untouched}/${Object.keys(before).length}`,
    linhasP3aP6NaV2: Object.values(after).reduce((a, x) => a + x.n, 0) };
  r3.resultado = pass(JSON.stringify(gruposNomes) === JSON.stringify(expected) && split === 0 && untouched === Object.keys(before).length);
  report.testes.T3 = r3;
}

// ---------- HTTP helpers ----------
function listen(server) { return new Promise((res) => server.listen(0, '127.0.0.1', () => res(`http://127.0.0.1:${server.address().port}`))); }
async function api(base, method, p, { cookie, tenant, json } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (tenant) headers['x-paroquia-id'] = tenant;
  const r = await fetch(base + p, { method, headers, body: json ? JSON.stringify(json) : undefined });
  return { status: r.status, body: await r.json().catch(() => null), setCookie: r.headers.get('set-cookie') };
}
async function loginCookie(base, f) {
  const r = await api(base, 'POST', '/v1/auth/login', { json: { email: f.email, password: f.password } });
  if (r.status !== 200) throw new Error(`login falhou ${r.status}`);
  const jar = new CookieJar();
  await jar.setCookie(r.setCookie, 'https://app.catechis.app/v1/auth/login');
  return { jar, cookie: await jar.getCookieString('https://app.catechis.app/') };
}

// ---------- T4 ----------
async function t4(P, logins) {
  log('T4: RLS e IDOR');
  const tenantTables = TABLES.filter((t) => t.tenant);
  const A = P.P5, B = P.P6;
  const matrix = [];
  const c = await db.v2App().connect();
  try {
    for (const t of tenantTables) {
      const { rows: sample } = await db.v2().query(`select to_jsonb(s) as j from ${qv2(t.v2)} s where tenant_id = $1 limit 1`, [B]);
      const row = { ...sample[0].j, id: crypto.randomUUID() };
      if (t.clientMutation) row.client_mutation_id = null;
      const res = { tabela: t.v2 };
      await c.query('begin');
      await c.query(`select set_config('app.tenant_id', $1, true)`, [A]);
      res.selectOutroTenant = (await c.query(`select count(*)::int as n from ${qv2(t.v2)} where tenant_id = $1`, [B])).rows[0].n;
      res.selectProprio = (await c.query(`select count(*)::int as n from ${qv2(t.v2)}`)).rows[0].n;
      res.updateOutroTenant = (await c.query(`update ${qv2(t.v2)} set version = version where tenant_id = $1`, [B])).rowCount;
      res.deleteOutroTenant = (await c.query(`delete from ${qv2(t.v2)} where tenant_id = $1`, [B])).rowCount;
      await c.query('savepoint s');
      try {
        const cols = Object.keys(row).map(q).join(', ');
        await c.query(`insert into ${qv2(t.v2)} (${cols}) select ${cols} from jsonb_populate_record(null::${qv2(t.v2)}, $1)`, [row]);
        res.insertOutroTenant = 'ACEITO';
      } catch (e) { res.insertOutroTenant = e.code === '42501' ? 'RECUSADO' : `ERRO ${e.code}`; await c.query('rollback to savepoint s'); }
      await c.query('savepoint s2');
      try {
        const r = await c.query(`update ${qv2(t.v2)} set tenant_id = $1 where ctid = (select ctid from ${qv2(t.v2)} limit 1)`, [B]);
        res.moverParaOutroTenant = r.rowCount ? 'ACEITO' : 'SEM_LINHA';
      } catch (e) { res.moverParaOutroTenant = e.code === '42501' ? 'RECUSADO' : `ERRO ${e.code}`; await c.query('rollback to savepoint s2'); }
      await c.query('rollback');
      await c.query('begin');
      res.semTenantSetado = (await c.query(`select count(*)::int as n from ${qv2(t.v2)}`)).rows[0].n;
      await c.query('rollback');
      matrix.push(res);
    }
  } finally { c.release(); }
  const leaks = matrix.filter((m) => m.selectOutroTenant || m.updateOutroTenant || m.deleteOutroTenant || m.insertOutroTenant !== 'RECUSADO' || m.moverParaOutroTenant !== 'RECUSADO' || m.semTenantSetado).length;
  const { rows: cat } = await db.v2().query(`select n.nspname || '.' || c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
     join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' where c.relkind = 'r' and (not c.relrowsecurity or not c.relforcerowsecurity)`);

  // IDOR via API (home v2 para P5 e P6 só durante o teste).
  await db.v2().query(`update migracao.tenant_home set home = 'v2' where parish_id = any($1)`, [[A, B]]);
  const server = createServer({ cookieMode: 'isolated' });
  const base = await listen(server);
  const userA = logins.find((l) => l.parish === 5);
  const { cookie } = await loginCookie(base, userA);
  const { rows: [clsB] } = await db.v2().query(`select id from catequese.catechesis_class where tenant_id = $1 limit 1`, [B]);
  const { rows: [mtB] } = await db.v2().query(`select id from catequese.meeting where tenant_id = $1 limit 1`, [B]);
  const { rows: [mtA] } = await db.v2().query(`select id, class_id from catequese.meeting where tenant_id = $1 limit 1`, [A]);
  const { rows: [kidB] } = await db.v2().query(`select id from familia.catechumen_profile where tenant_id = $1 limit 1`, [B]);
  const lote = (encontroId, catequizandoId) => ({ encontroId, itens: [{ catequizandoId, status: 'PRESENT', clientMutationId: crypto.randomUUID() }] });
  const attBefore = (await db.v2().query(`select count(*)::int as n from catequese.attendance_record`)).rows[0].n;
  const cases = [
    ['GET turma de P6 com cabeçalho P5', await api(base, 'GET', `/v1/turmas/${clsB.id}`, { cookie, tenant: A })],
    ['GET lista de turmas com cabeçalho P6', await api(base, 'GET', '/v1/turmas', { cookie, tenant: B })],
    ['GET turma de P6 com cabeçalho P6', await api(base, 'GET', `/v1/turmas/${clsB.id}`, { cookie, tenant: B })],
    ['GET presenças de encontro de P6 com cabeçalho P5', await api(base, 'GET', `/v1/encontros/${mtB.id}/presencas`, { cookie, tenant: A })],
    ['POST lote em encontro de P6 com cabeçalho P5', await api(base, 'POST', '/v1/presencas/lote', { cookie, tenant: A, json: lote(mtB.id, kidB.id) })],
    ['POST lote em encontro de P6 com cabeçalho P6', await api(base, 'POST', '/v1/presencas/lote', { cookie, tenant: B, json: lote(mtB.id, kidB.id) })],
  ];
  const mixed = await api(base, 'POST', '/v1/presencas/lote', { cookie, tenant: A, json: lote(mtA.id, kidB.id) });
  const attAfter = (await db.v2().query(`select count(*)::int as n from catequese.attendance_record`)).rows[0].n;
  const own = await api(base, 'GET', '/v1/turmas', { cookie, tenant: A });
  const blocked = cases.filter(([, r]) => r.status === 403 || r.status === 404).length;

  // p95 com e sem RLS (mesma consulta, 200 rodadas intercaladas).
  const Q = `select m.class_id, count(*) from catequese.attendance_record a join catequese.meeting m on m.id = a.meeting_id where a.tenant_id = $1 and a.deleted_at is null group by 1`;
  const withRls = [], without = [];
  const ca = await db.v2App().connect();
  const cb = await db.v2().connect();
  await cb.query('set role etl');
  try {
    for (let i = 0; i < 220; i++) {
      let t = now();
      await ca.query('begin'); await ca.query(`select set_config('app.tenant_id', $1, true)`, [A]); await ca.query(Q, [A]); await ca.query('commit');
      if (i >= 20) withRls.push(Number(now() - t) / 1e6);
      t = now();
      await cb.query('begin'); await cb.query(`select set_config('app.tenant_id', $1, true)`, [A]); await cb.query(Q, [A]); await cb.query('commit');
      if (i >= 20) without.push(Number(now() - t) / 1e6);
    }
  } finally { await cb.query('reset role'); ca.release(); cb.release(); server.close(); }
  await db.v2().query(`update migracao.tenant_home set home = 'legacy' where parish_id = any($1)`, [[A, B]]);

  const r = {
    matriz: { tabelas: matrix.length, operacoesPorTabela: 'SELECT, INSERT, UPDATE, DELETE, mover tenant_id, sem app.tenant_id', tabelasComVazamento: leaks, detalhe: matrix },
    catalogoSemRlsForcado: cat.map((x) => x.t),
    idor: { casos: cases.map(([n, r]) => ({ caso: n, status: r.status, erro: r.body && r.body.erro })), bloqueados: `${blocked}/${cases.length}`,
      catequizandoDeOutraParoquiaNoLote: mixed.body, presencasGravadasPelosCasos: attAfter - attBefore, controleListaPropria: { status: own.status, total: own.body && own.body.total } },
    latencia: { p95ComRlsMs: +p95(withRls).toFixed(2), p95SemRlsMs: +p95(without).toFixed(2), razao: +(p95(withRls) / p95(without)).toFixed(2), amostras: withRls.length },
  };
  r.resultado = pass(leaks === 0 && cat.length === 0 && blocked === cases.length && attAfter === attBefore && own.status === 200 && r.latencia.razao <= 1.2);
  report.testes.T4 = r;
}

// ---------- T5 ----------
async function t5(P, logins) {
  log('T5: login com hash do Wasp, cookies e CPU do argon2');
  for (const m of [P.P1, P.P2, P.P3, P.P4, P.P5, P.P6]) await db.v2().query(`update migracao.tenant_home set home = 'legacy' where parish_id = $1`, [m]);
  const res = {};
  for (const mode of ['isolated', 'shared']) {
    const server = createServer({ cookieMode: mode });
    const base = await listen(server);
    const lat = [];
    let okRight = 0, okWrong = 0, workerApp = 0, workerFamilia = 0, attrsOk = 0;
    for (const f of logins) {
      let t = now();
      const r = await api(base, 'POST', '/v1/auth/login', { json: { email: f.email, password: f.password } });
      lat.push(Number(now() - t) / 1e6);
      if (r.status === 200 && r.setCookie) okRight++;
      const w = await api(base, 'POST', '/v1/auth/login', { json: { email: f.email, password: f.password + '-errada' } });
      if (w.status === 401 && !w.setCookie) okWrong++;
      if (mode === 'isolated' ? /^__Host-cv2_session=.*; Path=\/; HttpOnly; Secure; SameSite=Lax/.test(r.setCookie) && !/Domain=/i.test(r.setCookie)
        : /^cv2_session=.*; Domain=\.catechis\.app; Path=\/; HttpOnly; Secure/.test(r.setCookie)) attrsOk++;
      const jar = new CookieJar();
      await jar.setCookie(r.setCookie, 'https://app.catechis.app/v1/auth/login');
      for (const [host, inc] of [['app.catechis.app', () => workerApp++], ['familia.catechis.app', () => workerFamilia++]]) {
        const cookie = await jar.getCookieString(`https://${host}/`);
        const wr = await fetch(`${WORKER}/v1/me`, { headers: cookie ? { cookie } : {} });
        if (wr.status === 200) inc();
      }
    }
    const { cookie } = await loginCookie(base, logins[0]);
    const tampered = cookie.replace(/=([^.]+)\./, '=AAAA$1.');
    const tw = await fetch(`${WORKER}/v1/me`, { headers: { cookie: tampered } });
    const ta = await api(base, 'GET', '/v1/me', { cookie: tampered });
    server.close();
    res[mode] = { senhaCerta: `${okRight}/${logins.length}`, senhaErrada: `${okWrong}/${logins.length}`, atributosDoCookie: `${attrsOk}/${logins.length}`,
      workerAceitaEmApp: `${workerApp}/${logins.length}`, workerRecebeEmFamilia: `${workerFamilia}/${logins.length}`,
      cookieAdulterado: { worker: tw.status, api: ta.status }, latenciaLoginP95Ms: +p95(lat).toFixed(1), latenciaLoginMedianaMs: +median(lat).toFixed(1) };
    res[mode].ok = okRight === logins.length && okWrong === logins.length && attrsOk === logins.length && workerApp === logins.length
      && (mode === 'shared' ? workerFamilia === logins.length : workerFamilia === 0) && tw.status === 401 && ta.status === 401 && p95(lat) <= 800;
  }

  // Worker: verificação do hash do Wasp em WASM (50 certas, 50 erradas) e 200 amostras de tempo.
  const hashes = [];
  for (const f of logins) {
    const { rows } = await db.v2().query(`select provider_data from identity.auth_identity where provider_user_id = $1`, [f.email]);
    hashes.push({ hash: JSON.parse(rows[0].provider_data).hashedPassword, password: f.password });
  }
  const wv = async (hash, password) => (await (await fetch(`${WORKER}/argon2/verify`, { method: 'POST', body: JSON.stringify({ hash, password }) })).json()).ok;
  let wRight = 0, wWrong = 0;
  for (const h of hashes) { if (await wv(h.hash, h.password)) wRight++; if (!(await wv(h.hash, h.password + 'x'))) wWrong++; }
  const noop = [], wall = [];
  for (let i = 0; i < 220; i++) {
    let t = now(); await fetch(`${WORKER}/noop`).then((r) => r.text()); if (i >= 20) noop.push(Number(now() - t) / 1e6);
    const h = hashes[i % hashes.length];
    t = now(); await wv(h.hash, h.password); if (i >= 20) wall.push(Number(now() - t) / 1e6);
  }
  // Mesma build WASM no Node, medindo CPU de verdade (process.cpuUsage), e o argon2 nativo para referência.
  const { default: initialize } = await import('@phi-ag/argon2/node');
  const a2 = await initialize();
  const cpuWasm = [], cpuNative = [];
  for (let i = 0; i < 220; i++) {
    const h = hashes[i % hashes.length];
    let c0 = process.cpuUsage(); a2.verify(h.hash, h.password); let c1 = process.cpuUsage(c0);
    if (i >= 20) cpuWasm.push((c1.user + c1.system) / 1000);
    c0 = process.cpuUsage(); await nativeVerify(h.hash, h.password); c1 = process.cpuUsage(c0);
    if (i >= 20) cpuNative.push((c1.user + c1.system) / 1000);
  }
  const cpuP95 = p95(wall) - median(noop);
  const faixa = cpuP95 <= 10 ? 'até 10 ms: cabe no Workers grátis' : cpuP95 <= 50 ? 'de 10 a 50 ms: plano pago de US$ 5/mês ou login em Node' : 'acima de 50 ms: login fica no Node e o Worker só valida a sessão';
  const r = {
    cookies: res,
    workerArgon2: { senhaCerta: `${wRight}/${hashes.length}`, senhaErrada: `${wWrong}/${hashes.length}`, biblioteca: '@phi-ag/argon2 0.6.2 (WASM SIMD, import estático)' },
    cpuArgon2: { amostras: wall.length, workerdLocalTempoP95Ms: +p95(wall).toFixed(1), workerdLocalMedianaMs: +median(wall).toFixed(1), noopMedianaMs: +median(noop).toFixed(2),
      estimativaCpuP95Ms: +cpuP95.toFixed(1), mesmaBuildWasmNoNodeCpuP95Ms: +p95(cpuWasm).toFixed(1), mesmaBuildWasmNoNodeCpuMedianaMs: +median(cpuWasm).toFixed(1),
      argon2NativoNodeCpuP95Ms: +p95(cpuNative).toFixed(1), faixa, observacao: 'medido localmente; o limite real de CPU só se confirma com Worker publicado (deploy precisa de ok do Simão)' },
  };
  r.resultado = pass(res.isolated.ok && res.shared.ok && wRight === hashes.length && wWrong === hashes.length);
  report.testes.T5 = r;
}

// ---------- T6 ----------
async function freePairs(parishIds, n, used) {
  const { rows } = await db.legacy().query(`
    select m.id as meeting, e."catechumenProfileId" as kid, c."parishId" as parish from "Meeting" m join "CatechesisClass" c on c.id = m."classId"
      join "ClassEnrollment" e on e."classId" = c.id and e.status = 'ENROLLED'
     where c."parishId" = any($1) and not exists (select 1 from "AttendanceRecord" a where a."meetingId" = m.id and a."catechumenProfileId" = e."catechumenProfileId")
     order by md5(m.id || e."catechumenProfileId")`, [parishIds]);
  const out = [];
  const per = new Map();
  for (const r of rows) {
    const k = `${r.meeting}|${r.kid}`;
    if (used.has(k)) continue;
    if ((per.get(r.parish) || 0) >= n / parishIds.length) continue;
    per.set(r.parish, (per.get(r.parish) || 0) + 1);
    used.add(k); out.push(r);
    if (out.length === n) break;
  }
  return out;
}
async function legacyWriteAttempts(parishIds) {
  const tries = [
    [`update "AttendanceRecord" set note = 'x' where id = (select a.id from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId" join "CatechesisClass" c on c.id = m."classId" where c."parishId" = $1 limit 1)`],
    [`delete from "AttendanceRecord" where id = (select a.id from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId" join "CatechesisClass" c on c.id = m."classId" where c."parishId" = $1 limit 1)`],
    [`update "Meeting" set notes = 'x' where id = (select m.id from "Meeting" m join "CatechesisClass" c on c.id = m."classId" where c."parishId" = $1 limit 1)`],
    [`update "CatechesisClass" set name = name || ' x' where id = (select id from "CatechesisClass" where "parishId" = $1 limit 1)`],
    [`update "CatechumenProfile" set "lastName" = 'x' where id = (select id from "CatechumenProfile" where "parishId" = $1 limit 1)`],
    [`update "Household" set address = 'x' where id = (select id from "Household" where "parishId" = $1 limit 1)`],
    [`update "GuardianProfile" set phone = 'x' where id = (select g.id from "GuardianProfile" g join "Household" h on h.id = g."householdId" where h."parishId" = $1 limit 1)`],
    [`update "Membership" set role = role where id = (select id from "Membership" where "parishId" = $1 limit 1)`],
    [`insert into "Community" (id, "updatedAt", name, active, "parishId") values (gen_random_uuid()::text, now(), 'Nova', true, $1)`],
    [`insert into "AttendanceRecord" (id, "updatedAt", "meetingId", "catechumenProfileId", status) select gen_random_uuid()::text, now(), m.id, e."catechumenProfileId", 'PRESENT'
       from "Meeting" m join "CatechesisClass" c on c.id = m."classId" join "ClassEnrollment" e on e."classId" = c.id
      where c."parishId" = $1 and not exists (select 1 from "AttendanceRecord" a where a."meetingId" = m.id and a."catechumenProfileId" = e."catechumenProfileId") limit 1`],
  ];
  let refused = 0, total = 0;
  for (const p of parishIds) for (const [sql] of tries) {
    total++;
    try { await db.legacy().query(sql, [p]); } catch (e) { if (e.code === 'P0423') refused++; else throw e; }
  }
  return { total, recusadas: refused };
}

async function t6(P, logins) {
  const grp = [P.P1, P.P2];
  const server = createServer({ cookieMode: 'isolated' });
  const base = await listen(server);
  const catechist = logins.find((l) => l.parish === 1); // líder em P1, também ativo em P2 (cenário do grupo)
  const { cookie } = await loginCookie(base, catechist);
  const used = new Set();
  const ensaios = [];
  for (const n of [1, 2]) {
    log(`T6: ensaio ${n}`);
    const pairs = await freePairs(grp, 200, used);
    const queue = pairs.map((p) => ({ tenant: p.parish, encontroId: p.meeting, item: { catequizandoId: p.kid, status: 'PRESENT', clientMutationId: crypto.randomUUID() } }));
    let durante = null, apiDuranteCongelamento = null;
    const virada = await cutover.cutover(`grupo-P1P2-ensaio-${n}`, grp, {
      duranteCongelamento: async () => {
        durante = await legacyWriteAttempts(grp);
        apiDuranteCongelamento = (await api(base, 'POST', '/v1/presencas/lote', { cookie, tenant: queue[0].tenant, json: { encontroId: queue[0].encontroId, itens: [queue[0].item] } })).status;
      },
    });
    const depois = await legacyWriteAttempts(grp);
    // Fila offline enviada depois da liberação, e reenviada inteira (retentativa do app).
    const send = async () => {
      let aplicados = 0, duplicados = 0, erros = 0;
      const groups = new Map();
      for (const q2 of queue) { const k = `${q2.tenant}|${q2.encontroId}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q2); }
      for (const [, items] of groups) {
        const r = await api(base, 'POST', '/v1/presencas/lote', { cookie, tenant: items[0].tenant, json: { encontroId: items[0].encontroId, itens: items.map((x) => x.item) } });
        if (r.status !== 200) { erros += items.length; continue; }
        aplicados += r.body.aplicados; duplicados += r.body.duplicados; erros += r.body.erros.length;
      }
      return { aplicados, duplicados, erros };
    };
    const envio1 = await send();
    const envio2 = await send();
    const cmids = queue.map((x) => x.item.clientMutationId);
    const naV2 = (await db.v2().query(`select count(*)::int as n from catequese.attendance_record where client_mutation_id = any($1::uuid[]) and deleted_at is null`, [cmids])).rows[0].n;
    const rb = await cutover.rollback(`grupo-P1P2-ensaio-${n}`, grp);
    const keys = queue.map((x) => `${x.encontroId}|${x.item.catequizandoId}`);
    const noLegado = (await db.legacy().query(`select count(*)::int as n from "AttendanceRecord" where "meetingId" || '|' || "catechumenProfileId" = any($1) and status = 'PRESENT'`, [keys])).rows[0].n;
    const cmp = await etl.compare(grp);
    let legadoLiberado = false;
    try { await db.legacy().query(`update "CatechesisClass" set "updatedAt" = "updatedAt" + interval '1 second' where id = (select id from "CatechesisClass" where "parishId" = $1 limit 1)`, [P.P1]); legadoLiberado = true; } catch { /* guard ainda ativo */ }
    const e = {
      virada: { totalMs: virada.totalMs, passos: virada.passos, deltaAttendance: virada.delta.tabelas.find((x) => x.tabela === 'catequese.attendance_record') },
      escritasNoLegadoDuranteCongelamento: durante, escritasNoLegadoDepoisDaVirada: depois, apiDuranteCongelamento,
      filaOffline: { enviadas: queue.length, envio1, reenvio: envio2, aplicadasNaV2: naV2 },
      rollback: { totalMs: rb.totalMs, passos: rb.passos, reversoAttendance: rb.reverso.tabelas.find((x) => x.tabela === 'catequese.attendance_record') },
      presencasDaV2NoLegado: noLegado, diferencaPosRollback: cmp.filter((c) => c.diferenca !== 0 || !c.checksumIgual).map((c) => c.tabela), legadoLiberadoAposRollback: legadoLiberado,
    };
    e.ok = virada.totalMs <= 900000 && durante.recusadas === durante.total && depois.recusadas === depois.total && apiDuranteCongelamento === 423
      && envio1.aplicados === 200 && envio1.erros === 0 && envio2.aplicados === 0 && envio2.duplicados === 200 && naV2 === 200
      && rb.totalMs <= 900000 && noLegado === 200 && e.diferencaPosRollback.length === 0 && legadoLiberado;
    ensaios.push(e);
  }
  server.close();
  report.testes.T6 = { ensaios, resultado: pass(ensaios.every((x) => x.ok)) };
}

// ---------- Comunidade social ----------
async function social() {
  const { rows: posts } = await db.legacy().query(`select "authorId" from "SocialPost"`);
  const ids = posts.map((p) => p.authorId);
  const { rows } = await db.v2().query(`select count(*)::int as n from unnest($1::text[]) a(id) where exists (select 1 from identity.user u where u.id = a.id and u.deleted_at is null)`, [ids]);
  report.testes.Social = { posts: ids.length, autoresResolvidosNaV2: rows[0].n, resultado: pass(rows[0].n === ids.length) };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await db.legacy().query('truncate migracao.tenant_guard');
  const g = await t1();
  const P = Object.fromEntries(g.parishes.map((p) => [`P${p.n}`, p.id]));
  await t2t3(P);
  await t4(P, g.logins);
  await t5(P, g.logins);
  await t6(P, g.logins);
  await social();
  report.fim = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  log('resumo:', Object.entries(report.testes).map(([k, v]) => `${k}=${v.resultado}`).join(' '));
  await db.closeAll();
}
main().catch(async (e) => { console.error(e); fs.writeFileSync(path.join(OUT, 'report-parcial.json'), JSON.stringify(report, null, 1)); await db.closeAll(); process.exit(1); });
