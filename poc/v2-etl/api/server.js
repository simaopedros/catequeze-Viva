'use strict';
// API /v1 da PoC (Node, sem framework). Conecta na v2 com o papel app_rw (RLS vale).
//   POST /v1/auth/login                 {email, password} -> cookie de sessão (modo shared ou isolated)
//   GET  /v1/me
//   GET  /v1/turmas                     header X-Paroquia-Id
//   GET  /v1/turmas/:id                 header X-Paroquia-Id
//   GET  /v1/encontros/:id/presencas    header X-Paroquia-Id
//   POST /v1/presencas/lote             header X-Paroquia-Id, {encontroId, itens: [{catequizandoId, status, clientMutationId}]}
// Respostas de erro: 400 entrada inválida, 401 sem sessão, 403 sem vínculo com a paróquia,
// 404 recurso não visível (inclui id de outra paróquia), 423 paróquia não está na v2 ou está congelada.
const http = require('http');
const crypto = require('crypto');
const { verify, hash } = require('@node-rs/argon2');
const db = require('../lib/db');

const STATUS = new Set(['PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED']);
// F2: quem grava presença. Coordenação grava em qualquer turma da paróquia; catequista só nas turmas
// em que está em ClassCatechist. GUARDIAN, CATECHUMEN e os demais papéis não gravam (403).
const COORDINATION = new Set(['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'PARISH_PRIEST', 'PARISH_SECRETARY', 'COMMUNITY_COORDINATOR']);
const CATECHIST = new Set(['LEAD_CATECHIST', 'ASSISTANT_CATECHIST']);
// F4: e-mail inexistente verifica um hash falso com os mesmos parâmetros do Wasp (tempo igual), e
// falhas seguidas por e-mail+IP bloqueiam com 429 (padrão 10 em 15 min; ajustável por ambiente).
const WASP_ARGON2 = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };
let dummyHash = null;
const getDummyHash = () => (dummyHash ||= hash(crypto.randomBytes(16).toString('hex'), WASP_ARGON2));
const LOGIN_MAX_FAILS = Number(process.env.LOGIN_MAX_FAILS || 10);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MIN || 15) * 60000;
const loginFails = new Map(); // chave: hash de e-mail+IP (sem e-mail em claro na memória)
const failKey = (email, req) => crypto.createHash('sha256').update(`${email.toLowerCase()}|${req.socket.remoteAddress}`).digest('base64url');
function failsFor(k) {
  const f = loginFails.get(k);
  if (f && Date.now() - f.first > LOGIN_WINDOW_MS) { loginFails.delete(k); return null; }
  return f;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_DAYS = 30;

class HttpError extends Error { constructor(status, code) { super(code); this.status = status; } }

function signingKey() {
  const k = process.env.SESSION_SIGNING_KEY;
  if (!k) throw new Error('SESSION_SIGNING_KEY ausente');
  return k;
}
const sign = (payload) => crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');

function cookieFor(mode, value, maxAge) {
  // shared: compartilha com *.catechis.app (como o Wasp hoje). isolated: só o host da 2.0 (__Host-).
  return mode === 'shared'
    ? `cv2_session=${value}; Domain=.catechis.app; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
    : `__Host-cv2_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readSessionCookie(header) {
  const m = /(?:^|;\s*)(?:__Host-)?cv2_session=([^;]+)/.exec(header || '');
  if (!m) return null;
  const [sid, sig, exp] = m[1].split('.');
  if (!sid || !sig || !exp) return null;
  const expected = sign(`${sid}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return sid;
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 1e6) throw new HttpError(413, 'corpo_grande_demais'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new HttpError(400, 'json_invalido'); }
}

async function login(req, res, mode) {
  const { email, password } = await body(req);
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) throw new HttpError(400, 'email_e_senha_obrigatorios');
  const fk = failKey(email, req);
  const prev = failsFor(fk);
  if (prev && prev.n >= LOGIN_MAX_FAILS) throw new HttpError(429, 'muitas_tentativas'); // igual para e-mail existente ou não
  const c = await db.v2App().connect();
  try {
    const { rows } = await c.query(
      `select ai.provider_data, a.id as auth_id, a.user_id from identity.auth_identity ai join identity.auth a on a.id = ai.auth_id
        where ai.provider_name = 'email' and ai.provider_user_id = lower($1) and ai.deleted_at is null and a.deleted_at is null`, [email]);
    let hashed = null;
    if (rows[0]) { try { hashed = JSON.parse(rows[0].provider_data).hashedPassword; } catch { hashed = null; } }
    const real = typeof hashed === 'string';
    const ok = (await verify(real ? hashed : await getDummyHash(), password).catch(() => false)) && real;
    if (!ok) {
      const f = failsFor(fk) || { n: 0, first: Date.now() };
      f.n++; loginFails.set(fk, f);
      throw new HttpError(401, 'credenciais_invalidas'); // mesma resposta e mesmo custo para e-mail inexistente e senha errada
    }
    loginFails.delete(fk);
    const sid = crypto.randomBytes(24).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
    await c.query(`insert into identity.session (id, expires_at, user_id) values ($1, to_timestamp($2) at time zone 'UTC', $3)`, [sid, exp, rows[0].auth_id]);
    res.setHeader('Set-Cookie', cookieFor(mode, `${sid}.${sign(`${sid}.${exp}`)}.${exp}`, SESSION_DAYS * 86400));
    return { userId: rows[0].user_id };
  } finally { c.release(); }
}

async function currentUser(req) {
  const sid = readSessionCookie(req.headers.cookie);
  if (!sid) throw new HttpError(401, 'nao_autenticado');
  const { rows } = await db.v2App().query(
    `select a.user_id from identity.session s join identity.auth a on a.id = s.user_id where s.id = $1 and s.expires_at > now() at time zone 'UTC'`, [sid]);
  if (!rows[0]) throw new HttpError(401, 'nao_autenticado');
  return rows[0].user_id;
}

// Abre transação com app.tenant_id e app.user_id, confere home da paróquia e vínculo ativo.
async function withTenant(req, userId, { write }, fn) {
  const tenant = req.headers['x-paroquia-id'];
  if (typeof tenant !== 'string' || !UUID.test(tenant)) throw new HttpError(400, 'x_paroquia_id_invalido');
  const c = await db.v2App().connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)`, [tenant, userId]);
    // F1: escrita segura o lock compartilhado da paróquia até o commit; o congelamento do rollback
    // (lib/cutover.js freezeV2) toma o exclusivo e espera esta transação antes de ler o snapshot.
    if (write) await c.query(`select pg_advisory_xact_lock_shared(hashtext($1))`, [tenant]);
    const { rows: home } = await c.query(`select home, frozen_at from migracao.tenant_home where parish_id = $1`, [tenant]);
    const { rows: m } = await c.query(`select role from org.membership where user_id = $1 and status = 'ACTIVE' and deleted_at is null`, [userId]);
    if (!m[0]) throw new HttpError(403, 'sem_vinculo_com_a_paroquia'); // RLS já limita ao tenant: sem linha = sem vínculo
    if (!home[0] || home[0].home !== 'v2') throw new HttpError(423, 'paroquia_ainda_no_sistema_atual');
    if (write && home[0].frozen_at) throw new HttpError(423, 'paroquia_em_migracao');
    const r = await fn(c, tenant, new Set(m.map((x) => x.role)));
    await c.query('commit');
    return r;
  } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
}

async function presencasLote(c, tenant, userId, roles, input) {
  const { encontroId, itens } = input || {};
  if (typeof encontroId !== 'string' || !UUID.test(encontroId) || !Array.isArray(itens) || itens.length === 0 || itens.length > 500) throw new HttpError(400, 'lote_invalido');
  const { rows: mt } = await c.query(`select id, class_id from catequese.meeting where id = $1 and deleted_at is null`, [encontroId]);
  if (!mt[0]) throw new HttpError(404, 'encontro_nao_encontrado');
  if (![...roles].some((r) => COORDINATION.has(r))) {
    const { rows: cc } = await c.query(`select 1 from catequese.class_catechist where class_id = $1 and user_id = $2 and deleted_at is null`, [mt[0].class_id, userId]);
    if (!cc[0] || ![...roles].some((r) => CATECHIST.has(r))) throw new HttpError(403, 'papel_sem_permissao_para_registrar_presenca');
  }
  const { rows: enr } = await c.query(`select catechumen_profile_id as k from catequese.class_enrollment where class_id = $1 and status = 'ENROLLED' and deleted_at is null`, [mt[0].class_id]);
  const enrolled = new Set(enr.map((e) => e.k));
  let aplicados = 0, duplicados = 0;
  const erros = [];
  for (const [i, it] of itens.entries()) {
    if (!it || !UUID.test(it.catequizandoId || '') || !UUID.test(it.clientMutationId || '') || !STATUS.has(it.status)) { erros.push({ item: i, erro: 'item_invalido' }); continue; }
    if (!enrolled.has(it.catequizandoId)) { erros.push({ item: i, erro: 'catequizando_fora_da_turma' }); continue; }
    await c.query('savepoint item');
    try {
      const { rows } = await c.query(
        `insert into catequese.attendance_record as a (meeting_id, catechumen_profile_id, status, recorded_by_id, tenant_id, client_mutation_id)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (meeting_id, catechumen_profile_id) where deleted_at is null do update
           set status = excluded.status, recorded_by_id = excluded.recorded_by_id, client_mutation_id = excluded.client_mutation_id,
               updated_at = now(), version = a.version + 1
         where a.client_mutation_id is distinct from excluded.client_mutation_id
         returning id`, [encontroId, it.catequizandoId, it.status, userId, tenant, it.clientMutationId]);
      if (rows.length) aplicados++; else duplicados++;
      await c.query('release savepoint item');
    } catch (e) {
      await c.query('rollback to savepoint item');
      if (e.code === '23505') erros.push({ item: i, erro: 'client_mutation_id_ja_usado' }); else throw e;
    }
  }
  return { aplicados, duplicados, erros };
}

function createServer({ cookieMode = process.env.COOKIE_MODE || 'isolated' } = {}) {
  getDummyHash();
  return http.createServer(async (req, res) => {
    const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      const p = url.pathname;
      if (req.method === 'POST' && p === '/v1/auth/login') return send(200, await login(req, res, cookieMode));
      const userId = await currentUser(req);
      if (req.method === 'GET' && p === '/v1/me') return send(200, { userId });
      if (req.method === 'GET' && p === '/v1/turmas') {
        return send(200, await withTenant(req, userId, { write: false }, async (c) => {
          const { rows } = await c.query(`select id, name as nome, status from catequese.catechesis_class where deleted_at is null order by name`);
          return { items: rows, total: rows.length };
        }));
      }
      let m = p.match(/^\/v1\/turmas\/([^/]+)$/);
      if (req.method === 'GET' && m) {
        if (!UUID.test(m[1])) throw new HttpError(404, 'turma_nao_encontrada');
        return send(200, await withTenant(req, userId, { write: false }, async (c) => {
          const { rows } = await c.query(`select id, name as nome, status from catequese.catechesis_class where id = $1 and deleted_at is null`, [m[1]]);
          if (!rows[0]) throw new HttpError(404, 'turma_nao_encontrada');
          return rows[0];
        }));
      }
      m = p.match(/^\/v1\/encontros\/([^/]+)\/presencas$/);
      if (req.method === 'GET' && m) {
        if (!UUID.test(m[1])) throw new HttpError(404, 'encontro_nao_encontrado');
        return send(200, await withTenant(req, userId, { write: false }, async (c) => {
          const { rows: mt } = await c.query(`select id from catequese.meeting where id = $1 and deleted_at is null`, [m[1]]);
          if (!mt[0]) throw new HttpError(404, 'encontro_nao_encontrado');
          const { rows } = await c.query(`select catechumen_profile_id as "catequizandoId", status from catequese.attendance_record where meeting_id = $1 and deleted_at is null`, [m[1]]);
          return { items: rows, total: rows.length };
        }));
      }
      if (req.method === 'POST' && p === '/v1/presencas/lote') {
        const input = await body(req);
        return send(200, await withTenant(req, userId, { write: true }, (c, tenant, roles) => presencasLote(c, tenant, userId, roles, input)));
      }
      throw new HttpError(404, 'rota_nao_encontrada');
    } catch (e) {
      if (e instanceof HttpError) return send(e.status, { erro: e.message });
      console.error('erro interno', e.code || '', e.message); // sem dados pessoais no log
      return send(500, { erro: 'erro_interno' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8788);
  createServer().listen(port, '127.0.0.1', () => console.log(`API /v1 da PoC em http://127.0.0.1:${port} (cookie ${process.env.COOKIE_MODE || 'isolated'})`));
}
module.exports = { createServer };
