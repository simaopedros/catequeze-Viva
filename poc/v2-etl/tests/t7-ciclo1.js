'use strict';
// T7: regressão das falhas do A6 (ciclo 1 do QA). Roda depois do T6, com o grupo {P1,P2} de volta no legado.
//   F1 virada e rollback com transações abertas (3 no legado, 1 na v2) não perdem escrita
//   F2 GUARDIAN e catequista de outra turma recebem 403 ao gravar presença; catequista da turma grava
//   F3 par apagado e recriado com outro id passa no ETL e no reverso, diferença 0
//   F4 tempo do login igual para e-mail inexistente e senha errada; 11ª falha seguida dá 429
//   F5 User, Auth e AuthIdentity recusam escrita no legado com a paróquia congelada
const crypto = require('crypto');
const db = require('../lib/db');
const etl = require('../lib/etl');
const cutover = require('../lib/cutover');
const { createServer } = require('../api/server');
const { median } = require('../lib/util');

const sleep = (n) => new Promise((r) => setTimeout(r, n));
const ok = (cmp) => cmp.filter((c) => c.diferenca !== 0 || !c.checksumIgual).map((c) => c.tabela);

async function f1f2(grp, logins, h) {
  // 3 transações abertas no legado, uma por presença, antes da virada.
  const { rows: recs } = await db.legacy().query(`select a.id from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId"
    join "CatechesisClass" c on c.id = m."classId" where c."parishId" = any($1) and a.status <> 'LATE' order by a.id limit 3`, [grp]);
  const open = [];
  for (const r of recs) {
    const c = await db.legacy().connect();
    await c.query('begin');
    await c.query(`update "AttendanceRecord" set status = 'LATE', note = 'f1-ciclo1' where id = $1`, [r.id]);
    open.push(c);
  }
  let viradaTerminou = false;
  const vp = cutover.cutover('t7-f1', grp).then((x) => { viradaTerminou = true; return x; });
  await sleep(800);
  const esperouAsTransacoes = !viradaTerminou;
  for (const c of open) { await c.query('commit'); c.release(); }
  const virada = await vp;
  const { rows: v2rows } = await db.v2().query(`select count(*)::int as n from catequese.attendance_record where id = any($1) and status = 'LATE' and note = 'f1-ciclo1' and deleted_at is null`, [recs.map((r) => r.id)]);
  const legado = { abertas: open.length, viradaEsperou: esperouAsTransacoes, chegaramNaV2: v2rows[0].n };

  // F2 com o grupo na v2.
  const server = createServer({ cookieMode: 'isolated' });
  const base = await h.listen(server);
  const { rows: roles } = await db.legacy().query(`select "userId" as u, "parishId" as p, role from "Membership" where "userId" = any($1) and "parishId" = any($2) and status = 'ACTIVE'`,
    [logins.map((l) => l.userId), grp]);
  const guardianRole = roles.find((r) => r.role === 'GUARDIAN');
  const guardian = logins.find((l) => l.userId === guardianRole.u);
  const catechist = logins.find((l) => l.parish === 1);
  const { rows: [own] } = await db.v2().query(`select m.id as meeting, e.catechumen_profile_id as kid, m.tenant_id from catequese.meeting m
    join catequese.class_enrollment e on e.class_id = m.class_id and e.status = 'ENROLLED' and e.deleted_at is null
    join catequese.class_catechist cc on cc.class_id = m.class_id and cc.user_id = $1 and cc.deleted_at is null
    where m.tenant_id = any($2) and m.deleted_at is null limit 1`, [catechist.userId, grp]);
  const { rows: [other] } = await db.v2().query(`select m.id as meeting, e.catechumen_profile_id as kid, m.tenant_id from catequese.meeting m
    join catequese.class_enrollment e on e.class_id = m.class_id and e.status = 'ENROLLED' and e.deleted_at is null
    where m.tenant_id = $2 and m.deleted_at is null
      and not exists (select 1 from catequese.class_catechist cc where cc.class_id = m.class_id and cc.user_id = $1) limit 1`, [catechist.userId, guardianRole.p]);
  const lote = (x) => ({ encontroId: x.meeting, itens: [{ catequizandoId: x.kid, status: 'PRESENT', clientMutationId: crypto.randomUUID() }] });
  const gCookie = (await h.loginCookie(base, guardian)).cookie;
  const cCookie = (await h.loginCookie(base, catechist)).cookie;
  const papeis = {
    responsavel: (await h.api(base, 'POST', '/v1/presencas/lote', { cookie: gCookie, tenant: guardianRole.p, json: lote(other) })).status,
    catequistaOutraTurma: (await h.api(base, 'POST', '/v1/presencas/lote', { cookie: cCookie, tenant: other.tenant_id, json: lote(other) })).status,
    catequistaDaTurma: (await h.api(base, 'POST', '/v1/presencas/lote', { cookie: cCookie, tenant: own.tenant_id, json: lote(own) })).status,
  };
  server.close();

  // 1 transação aberta na v2 (como a API: lock compartilhado + frozen_at nulo) antes do rollback.
  const { rows: [vrec] } = await db.v2().query(`select id, tenant_id from catequese.attendance_record where tenant_id = any($1) and deleted_at is null and status <> 'JUSTIFIED'
    and not (id = any($2)) order by id limit 1`, [grp, recs.map((r) => r.id)]);
  const vc = await db.v2App().connect();
  await vc.query('begin');
  await vc.query(`select set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)`, [vrec.tenant_id, catechist.userId]);
  await vc.query(`select pg_advisory_xact_lock_shared(hashtext($1))`, [vrec.tenant_id]);
  const { rows: [home] } = await vc.query(`select frozen_at from migracao.tenant_home where parish_id = $1`, [vrec.tenant_id]);
  await vc.query(`update catequese.attendance_record set status = 'JUSTIFIED', version = version + 1, updated_at = now() where id = $1`, [vrec.id]);
  let rbTerminou = false;
  const rp = cutover.rollback('t7-f1', grp).then((x) => { rbTerminou = true; return x; });
  await sleep(800);
  const rbEsperou = !rbTerminou;
  await vc.query('commit'); vc.release();
  const rb = await rp;
  const { rows: back } = await db.legacy().query(`select status from "AttendanceRecord" where id = $1`, [vrec.id]);
  const { rows: legBack } = await db.legacy().query(`select count(*)::int as n from "AttendanceRecord" where id = any($1) and status = 'LATE' and note = 'f1-ciclo1'`, [recs.map((r) => r.id)]);
  const v2 = { frozenAtAntes: home.frozen_at, rollbackEsperou: rbEsperou, chegouNoLegado: back[0] && back[0].status === 'JUSTIFIED', escritasDoLegadoMantidas: legBack[0].n };
  const f1 = { legado, v2, virada: { totalMs: virada.totalMs, diferenca: virada.verificacao.divergentes }, rollback: { totalMs: rb.totalMs, diferenca: rb.verificacao.divergentes } };
  f1.resultado = legado.viradaEsperou && legado.chegaramNaV2 === 3 && v2.frozenAtAntes === null && v2.rollbackEsperou && v2.chegouNoLegado && v2.escritasDoLegadoMantidas === 3
    && f1.virada.diferenca.length === 0 && f1.rollback.diferenca.length === 0;
  const f2 = { ...papeis, resultado: papeis.responsavel === 403 && papeis.catequistaOutraTurma === 403 && papeis.catequistaDaTurma === 200 };
  return { f1, f2 };
}

async function f3(grp) {
  const { rows: idx } = await db.v2().query(`select indexdef from pg_indexes where schemaname = 'catequese' and tablename = 'attendance_record' and indexdef like '%UNIQUE%meeting_id%'`);
  // Legado: apaga e recria o par com outro id.
  const { rows: [a] } = await db.legacy().query(`select a.* from "AttendanceRecord" a join "Meeting" m on m.id = a."meetingId" join "CatechesisClass" c on c.id = m."classId"
    where c."parishId" = any($1) order by a.id limit 1`, [grp]);
  const novo = crypto.randomUUID();
  await db.legacy().query(`delete from "AttendanceRecord" where id = $1`, [a.id]);
  await db.legacy().query(`insert into "AttendanceRecord" (id, "updatedAt", "meetingId", "catechumenProfileId", status) values ($1, now(), $2, $3, $4)`, [novo, a.meetingId, a.catechumenProfileId, a.status]);
  let cargaErro = null;
  try { await etl.load('t7-f3', grp); } catch (e) { cargaErro = e.code || e.message; }
  const { rows: v2s } = await db.v2().query(`select id, deleted_at is null as vivo from catequese.attendance_record where id = any($1)`, [[a.id, novo]]);
  const carga = { erro: cargaErro, antigoApagado: v2s.some((r) => r.id === a.id && !r.vivo), novoVivo: v2s.some((r) => r.id === novo && r.vivo), diferenca: ok(await etl.compare(grp)) };

  // v2: soft-delete e recriação do par; o reverso tem de apagar antes de inserir no legado.
  const { rows: [b] } = await db.v2().query(`select * from catequese.attendance_record where tenant_id = any($1) and deleted_at is null order by id desc limit 1`, [grp]);
  const novoV2 = crypto.randomUUID();
  await db.v2().query(`update catequese.attendance_record set deleted_at = now(), version = version + 1 where id = $1`, [b.id]);
  await db.v2().query(`insert into catequese.attendance_record (id, meeting_id, catechumen_profile_id, status, tenant_id, updated_at) values ($1, $2, $3, $4, $5, now())`,
    [novoV2, b.meeting_id, b.catechumen_profile_id, b.status, b.tenant_id]);
  let revErro = null;
  try { await etl.reverse('t7-f3', grp); } catch (e) { revErro = e.code || e.message; }
  const { rows: ls } = await db.legacy().query(`select id from "AttendanceRecord" where id = any($1)`, [[b.id, novoV2]]);
  const reverso = { erro: revErro, legadoSoComONovo: ls.length === 1 && ls[0].id === novoV2, diferenca: ok(await etl.compare(grp)) };
  const r = { regra: 'índice único parcial where deleted_at is null na v2; soft-delete antes do upsert no ETL e exclusões antes dos upserts no reverso', indice: idx.map((x) => x.indexdef), carga, reverso };
  r.resultado = idx.length === 1 && /WHERE \(deleted_at IS NULL\)/.test(idx[0].indexdef) && !cargaErro && carga.antigoApagado && carga.novoVivo && carga.diferenca.length === 0
    && !revErro && reverso.legadoSoComONovo && reverso.diferenca.length === 0;
  return r;
}

async function f4(logins, h) {
  const server = createServer({ cookieMode: 'isolated' });
  const base = await h.listen(server);
  const timed = async (json) => { const t = process.hrtime.bigint(); const r = await h.api(base, 'POST', '/v1/auth/login', { json }); return { s: r.status, ms: Number(process.hrtime.bigint() - t) / 1e6 }; };
  const inexist = [], errada = [];
  const st = new Set();
  for (let i = 0; i < 40; i++) { // alternado; e-mails e contas diferentes para não cair no limite
    const a = await timed({ email: `naoexiste-${i}-${crypto.randomUUID()}@exemplo.invalid`, password: 'qualquer-coisa' });
    const b = await timed({ email: logins[i % logins.length].email, password: 'senha-errada-t7' });
    inexist.push(a.ms); errada.push(b.ms); st.add(a.s); st.add(b.s);
  }
  const limite = [];
  const email = `limite-${crypto.randomUUID()}@exemplo.invalid`;
  for (let i = 0; i < 11; i++) limite.push((await h.api(base, 'POST', '/v1/auth/login', { json: { email, password: 'x' } })).status);
  server.close();
  const r = { medianaInexistenteMs: +median(inexist).toFixed(1), medianaSenhaErradaMs: +median(errada).toFixed(1), razao: +(median(inexist) / median(errada)).toFixed(2), status: [...st], limite };
  r.resultado = r.razao >= 0.8 && r.razao <= 1.25 && r.status.length === 1 && r.status[0] === 401 && limite.slice(0, 10).every((s) => s === 401) && limite[10] === 429;
  return r;
}

async function f5(grp, logins) {
  await cutover.freezeLegacy(grp);
  const inGroup = logins.find((l) => l.parish === 1).userId;
  const outside = logins.find((l) => l.parish === 5).userId;
  const tries = [
    [`update "User" set id = id where id = $1`],
    [`update "Auth" set id = id where "userId" = $1`],
    [`update "AuthIdentity" set "authId" = "authId" where "authId" in (select id from "Auth" where "userId" = $1)`],
  ];
  const attempt = async (u) => {
    let recusadas = 0;
    for (const [sql] of tries) { try { await db.legacy().query(sql, [u]); } catch (e) { if (e.code === 'P0423') recusadas++; else throw e; } }
    return recusadas;
  };
  const r = { recusadasNoGrupo: `${await attempt(inGroup)}/3`, recusadasForaDoGrupo: `${await attempt(outside)}/3` };
  await db.legacy().query(`delete from migracao.tenant_guard where parish_id = any($1)`, [grp]);
  r.resultado = r.recusadasNoGrupo === '3/3' && r.recusadasForaDoGrupo === '0/3';
  return r;
}

async function t7(P, logins, h) {
  const grp = [P.P1, P.P2];
  const out = {};
  Object.assign(out, await f1f2(grp, logins, h));
  out.F3 = await f3(grp);
  out.F4 = await f4(logins, h);
  out.F5 = await f5(grp, logins);
  out.F1 = out.f1; out.F2 = out.f2; delete out.f1; delete out.f2;
  for (const k of ['F1', 'F2', 'F3', 'F4', 'F5']) out[k].resultado = out[k].resultado ? 'PASSA' : 'FALHA';
  out.resultado = ['F1', 'F2', 'F3', 'F4', 'F5'].every((k) => out[k].resultado === 'PASSA') ? 'PASSA' : 'FALHA';
  return out;
}

module.exports = { t7 };

// Sozinho (depois de um run-all.js, com o grupo {P1,P2} de volta no legado): node tests/t7-ciclo1.js
if (require.main === module) {
  (async () => {
    const { CookieJar } = require('tough-cookie');
    const logins = require('../out/fixtures-login.json');
    const parishOf = async (n) => (await db.legacy().query(`select "parishId" as p from "Membership" where "userId" = any($1) group by 1 order by count(*) desc limit 1`,
      [logins.filter((l) => l.parish === n).map((l) => l.userId)])).rows[0].p;
    const P = { P1: await parishOf(1), P2: await parishOf(2) };
    const listen = (s) => new Promise((res) => s.listen(0, '127.0.0.1', () => res(`http://127.0.0.1:${s.address().port}`)));
    const api = async (base, method, p, { cookie, tenant, json } = {}) => {
      const headers = { 'content-type': 'application/json' };
      if (cookie) headers.cookie = cookie;
      if (tenant) headers['x-paroquia-id'] = tenant;
      const r = await fetch(base + p, { method, headers, body: json ? JSON.stringify(json) : undefined });
      return { status: r.status, body: await r.json().catch(() => null), setCookie: r.headers.get('set-cookie') };
    };
    const loginCookie = async (base, f) => {
      const r = await api(base, 'POST', '/v1/auth/login', { json: { email: f.email, password: f.password } });
      if (r.status !== 200) throw new Error(`login falhou ${r.status}`);
      const jar = new CookieJar();
      await jar.setCookie(r.setCookie, 'https://app.catechis.app/v1/auth/login');
      return { cookie: await jar.getCookieString('https://app.catechis.app/') };
    };
    const r = await t7(P, logins, { listen, api, loginCookie });
    require('fs').writeFileSync(require('path').join(__dirname, '..', 'out', 'report-t7.json'), JSON.stringify(r, null, 1));
    console.log('T7', r.resultado, ['F1', 'F2', 'F3', 'F4', 'F5'].map((k) => `${k}=${r[k].resultado}`).join(' '));
    await db.closeAll();
  })().catch(async (e) => { console.error(e); await db.closeAll(); process.exit(1); });
}
