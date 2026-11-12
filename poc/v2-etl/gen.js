'use strict';
// Gerador de dados FICTÍCIOS no banco legado (schema Wasp) para a PoC DEM-20261111-01.
// Uso: node gen.js [--seed 20261111]
// Apaga e recria só as tabelas da PoC no banco legado local. Nunca apontar para produção.
//
// Cenários planejados (A2-PoC, T1):
//   - catequista com membership ATIVA e turma em P1 e P2 (P1 e P2 caem no mesmo grupo)
//   - responsável com filhos matriculados em P3 e P4 (P3 e P4 caem no mesmo grupo)
//   - armadilha: usuário de P5 com membership INATIVA em P6 (não pode unir os grupos)
//   - P5 e P6 isoladas
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hash } = require('@node-rs/argon2');
const db = require('./lib/db');
const { rng, uuidFor, ts, insertRows } = require('./lib/util');

// Mesmos parâmetros do hashPassword do Wasp (wasp/auth/password, confirmados no parecer T2).
const WASP_ARGON2 = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vitória', 'Yuri'];
const SOBRENOMES = ['Teste', 'Exemplo', 'Ficticio', 'Modelo', 'Amostra', 'Simulado', 'Demo', 'Ensaio'];
const LOGIN_ACCOUNTS = 50;

const SEED_ARG = process.argv.indexOf('--seed');
const SEED = SEED_ARG > 0 ? Number(process.argv[SEED_ARG + 1]) : 20261111;

const POC_TABLES = ['AttendanceRecord', 'Meeting', 'ClassEnrollment', 'ClassCatechist', 'CatechumenProfile', 'GuardianProfile',
  'Household', 'CatechesisClass', 'Stage', 'CatecheticalYear', 'Membership', 'Community', 'SocialPost', 'Session',
  'AuthIdentity', 'Auth', 'Parish', 'User', 'Diocese'];

async function generate(seed = SEED) {
  const R = rng(seed);
  const id = (label) => uuidFor(seed, label);
  const T0 = '2026-01-15 10:00:00';
  const fakePhone = (n) => `(00) 90000-${String(n).padStart(4, '0')}`; // DDD 00 não existe: nunca é telefone real
  const person = () => ({ firstName: R.pick(NOMES), lastName: R.pick(SOBRENOMES) });

  const data = {};
  data.Diocese = [1, 2].map((d) => ({ id: id(`diocese:${d}`), createdAt: ts(T0), updatedAt: ts(T0), name: `Diocese Fictícia ${d}`,
    country: 'BR', locale: 'pt-BR', timezone: 'America/Sao_Paulo', state: 'SP' }));
  const parishes = [1, 2, 3, 4, 5, 6].map((p) => ({ n: p, id: id(`parish:${p}`), dioceseId: data.Diocese[p <= 4 ? 0 : 1].id }));

  // Usuários: 50 por paróquia. Índice local 0 = coordenador, 1..20 = catequistas, 21..49 = responsáveis.
  data.User = []; data.Auth = []; data.AuthIdentity = [];
  const usersByParish = {};
  const logins = [];
  const placeholderHash = await hash('conta-sem-login-' + seed, { ...WASP_ARGON2, salt: crypto.createHash('sha256').update(`salt:${seed}:x`).digest().subarray(0, 16) });
  for (const p of parishes) {
    usersByParish[p.n] = [];
    for (let i = 0; i < 50; i++) {
      const g = (p.n - 1) * 50 + i;
      const u = { id: id(`user:${g}`), createdAt: ts(T0, g), email: `usuario${String(g).padStart(3, '0')}@example.invalid`, isAdmin: false,
        credits: 0, locale: 'pt-BR', timezone: 'America/Sao_Paulo', termsAcceptanceRequired: false, phone: fakePhone(g), ...person() };
      if (g % 30 === 0) Object.assign(u, { paymentProcessorUserId: `cus_poc_${g}`, stripeSubscriptionId: `sub_poc_${g}`, subscriptionStatus: 'active', subscriptionPlan: 'catequista', billingProvider: 'STRIPE' });
      if (g % 30 === 15) Object.assign(u, { hotmartSubscriberCode: `HM-POC-${g}`, subscriptionStatus: 'active', billingProvider: 'HOTMART', accessEndsAt: ts('2027-01-15 00:00:00') });
      data.User.push(u);
      usersByParish[p.n].push(u);
      const authId = id(`auth:${g}`);
      data.Auth.push({ id: authId, userId: u.id });
      let hashed = placeholderHash;
      if (g % 6 === 1 && logins.length < LOGIN_ACCOUNTS) { // 50 contas com senha conhecida (fictícia) para o T5
        const password = `senha-ficticia-${seed}-${g}`;
        hashed = await hash(password, { ...WASP_ARGON2, salt: crypto.createHash('sha256').update(`salt:${seed}:${g}`).digest().subarray(0, 16) });
        logins.push({ email: u.email, password, userId: u.id, parish: p.n });
      }
      data.AuthIdentity.push({ providerName: 'email', providerUserId: u.email, authId,
        providerData: JSON.stringify({ hashedPassword: hashed, isEmailVerified: true, emailVerificationSentAt: null, passwordResetSentAt: null }) });
    }
  }
  data.Parish = parishes.map((p) => ({ id: p.id, createdAt: ts(T0, p.n), updatedAt: ts(T0, p.n), name: `Paróquia Fictícia P${p.n}`, city: 'Cidade Exemplo',
    state: 'SP', country: 'BR', locale: 'pt-BR', timezone: 'America/Sao_Paulo', active: true, dioceseId: p.dioceseId, ownerId: usersByParish[p.n][0].id, type: 'PARISH' }));

  data.Community = []; data.Membership = []; data.CatecheticalYear = []; data.Stage = []; data.CatechesisClass = [];
  data.ClassCatechist = []; data.Household = []; data.GuardianProfile = []; data.CatechumenProfile = []; data.ClassEnrollment = [];
  data.Meeting = []; data.AttendanceRecord = [];
  const classesByParish = {};
  const catechumensByClass = {};
  for (const p of parishes) {
    const U = usersByParish[p.n];
    const comms = [1, 2].map((c) => ({ id: id(`community:${p.n}:${c}`), createdAt: ts(T0), updatedAt: ts(T0), name: `Comunidade ${c} de P${p.n}`, active: true, parishId: p.id, phone: fakePhone(900 + p.n * 10 + c), email: `comunidade${p.n}${c}@example.invalid` }));
    data.Community.push(...comms);
    U.forEach((u, i) => data.Membership.push({ id: id(`membership:${u.id}:${p.n}`), createdAt: ts(T0, i), updatedAt: ts(T0, i), userId: u.id, parishId: p.id,
      role: i === 0 ? 'PARISH_COORDINATOR' : i <= 10 ? 'LEAD_CATECHIST' : i <= 20 ? 'ASSISTANT_CATECHIST' : 'GUARDIAN', status: 'ACTIVE' }));
    const year = { id: id(`year:${p.n}`), createdAt: ts(T0), updatedAt: ts(T0), name: 'Ano catequético 2026', startDate: ts('2026-02-01 00:00:00'), endDate: ts('2026-11-30 00:00:00'),
      active: true, parishId: p.id, ownerType: 'PARISH', inheritancePolicy: 'LOCAL' };
    data.CatecheticalYear.push(year);
    const stages = [1, 2].map((s) => ({ id: id(`stage:${p.n}:${s}`), createdAt: ts(T0), updatedAt: ts(T0), name: `Etapa ${s}`, order: s, yearId: year.id }));
    data.Stage.push(...stages);
    classesByParish[p.n] = [];
    for (let c = 0; c < 10; c++) {
      const cls = { id: id(`class:${p.n}:${c}`), createdAt: ts(T0, c), updatedAt: ts(T0, c), name: `Turma ${c + 1} de P${p.n}`, status: 'ACTIVE', maxCapacity: 25,
        dayOfWeek: 'SATURDAY', startTime: '09:00', endTime: '10:30', parishId: p.id, yearId: year.id, stageId: stages[c % 2].id, communityId: comms[c % 2].id };
      data.CatechesisClass.push(cls);
      classesByParish[p.n].push(cls);
      Object.defineProperty(cls, 'lead', { value: U[1 + c], enumerable: false });
      data.ClassCatechist.push({ id: id(`cc:${cls.id}:lead`), createdAt: ts(T0), classId: cls.id, userId: U[1 + c].id, role: 'LEAD' });
      data.ClassCatechist.push({ id: id(`cc:${cls.id}:asst`), createdAt: ts(T0), classId: cls.id, userId: U[11 + c].id, role: 'ASSISTANT' });
    }
    // 150 households e 200 catequizandos por paróquia (20 por turma).
    const households = [];
    for (let h = 0; h < 150; h++) {
      const hh = { id: id(`household:${p.n}:${h}`), createdAt: ts(T0, h), updatedAt: ts(T0, h), name: `Família Exemplo ${p.n}-${h}`, address: 'Rua Fictícia, s/n', phone: fakePhone(1000 + p.n * 150 + h), parishId: p.id, communityId: comms[h % 2].id };
      households.push(hh);
      data.Household.push(hh);
      const guardianUser = h < 29 ? U[21 + h] : null;
      data.GuardianProfile.push({ id: id(`guardian:${p.n}:${h}`), createdAt: ts(T0, h), updatedAt: ts(T0, h), userId: guardianUser ? guardianUser.id : null, householdId: hh.id,
        phone: fakePhone(3000 + p.n * 150 + h), relationship: R.pick(['MAE', 'PAI', 'AVO', 'TUTOR']), email: guardianUser ? guardianUser.email : `responsavel${p.n}${h}@example.invalid`, ...person() });
    }
    for (let k = 0; k < 200; k++) {
      const cls = classesByParish[p.n][k % 10];
      const hh = households[k < 150 ? k : k - 150];
      const kid = { id: id(`catechumen:${p.n}:${k}`), createdAt: ts(T0, k), updatedAt: ts(T0, k), birthDate: ts(`20${String(12 + R.int(6)).padStart(2, '0')}-0${1 + R.int(9)}-1${R.int(9)} 00:00:00`),
        householdId: hh.id, parishId: p.id, ...person() };
      data.CatechumenProfile.push(kid);
      (catechumensByClass[cls.id] ||= []).push(kid);
      data.ClassEnrollment.push({ id: id(`enroll:${kid.id}`), createdAt: ts(T0, k), updatedAt: ts(T0, k), classId: cls.id, catechumenProfileId: kid.id, status: 'ENROLLED', startedAt: ts('2026-02-01 00:00:00') });
    }
  }

  // Cenário P1-P2: catequista de P1 (líder da turma 1) também ativo e catequista em P2.
  const crossCatechist = usersByParish[1][1];
  data.Membership.push({ id: id('membership:cross:p2'), createdAt: ts(T0), updatedAt: ts(T0), userId: crossCatechist.id, parishId: parishes[1].id, role: 'ASSISTANT_CATECHIST', status: 'ACTIVE' });
  data.ClassCatechist.push({ id: id('cc:cross:p2'), createdAt: ts(T0), classId: classesByParish[2][9].id, userId: crossCatechist.id, role: 'ASSISTANT' });
  // Cenário P3-P4: o filho 0 de P4 passa a morar na household 0 de P3 (responsável com usuário em P3).
  const kidP4 = data.CatechumenProfile.find((k) => k.id === id('catechumen:4:0'));
  kidP4.householdId = id('household:3:0');
  // Armadilha: usuário de P5 com membership INATIVA em P6.
  data.Membership.push({ id: id('membership:inactive:p6'), createdAt: ts(T0), updatedAt: ts(T0), userId: usersByParish[5][30].id, parishId: parishes[5].id, role: 'GUARDIAN', status: 'INACTIVE' });

  // 40 encontros por turma (2.400) e 500 presenças por turma (30.000): 12 ou 13 dos 20 por encontro.
  const STATUS = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'ABSENT', 'LATE', 'JUSTIFIED'];
  for (const p of parishes) for (const cls of classesByParish[p.n]) {
    const kids = catechumensByClass[cls.id];
    for (let m = 0; m < 40; m++) {
      const meeting = { id: id(`meeting:${cls.id}:${m}`), createdAt: ts(T0, m), updatedAt: ts(T0, m), title: `Encontro ${m + 1}`, date: ts('2026-02-07 09:00:00', m * 7 * 1440),
        status: m < 36 ? 'COMPLETED' : 'NOT_STARTED', classId: cls.id, kind: 'REGULAR', sequenceNumber: m + 1 };
      data.Meeting.push(meeting);
      const take = m % 2 === 0 ? 12 : 13;
      const start = (m * 7) % 20;
      for (let j = 0; j < take; j++) {
        const kid = kids[(start + j) % 20];
        data.AttendanceRecord.push({ id: id(`att:${meeting.id}:${kid.id}`), createdAt: meeting.date, updatedAt: meeting.date, meetingId: meeting.id, catechumenProfileId: kid.id,
          status: R.pick(STATUS), recordedById: cls.lead.id });
      }
    }
  }

  // 100 posts da Comunidade social (global), autores espalhados entre as paróquias.
  data.SocialPost = [];
  for (let s = 0; s < 100; s++) {
    const author = data.User[(s * 37) % data.User.length];
    data.SocialPost.push({ id: id(`post:${s}`), createdAt: ts(T0, s), updatedAt: ts(T0, s), slug: `post-ficticio-${s}`, authorId: author.id, parishId: s % 3 === 0 ? null : parishes[s % 6].id,
      kind: 'TEXT', status: 'PUBLISHED', body: `Texto fictício ${s}`, locale: 'pt-BR', publishedAt: ts(T0, s), reactionCount: 0, commentCount: 0, shareCount: 0, viewCount: 0 });
  }
  return { data, logins, parishes };
}

async function writeLegacy({ data }) {
  const c = await db.legacy().connect();
  try {
    await c.query('begin');
    await c.query(`truncate ${POC_TABLES.map((t) => `"${t}"`).join(', ')} cascade`);
    await c.query('truncate migracao.tenant_guard');
    for (const t of [...POC_TABLES].reverse()) if (data[t] && data[t].length) await insertRows(c, `"${t}"`, data[t]);
    await c.query('commit');
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}

async function main() {
  const g = await generate(SEED);
  await writeLegacy(g);
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fixtures-login.json'), JSON.stringify(g.logins, null, 1)); // só senhas fictícias de teste, fora do git
  fs.writeFileSync(path.join(outDir, 'parishes.json'), JSON.stringify(g.parishes));
  const counts = Object.fromEntries(Object.entries(g.data).map(([k, v]) => [k, v.length]));
  console.log(JSON.stringify({ seed: SEED, counts, contasLogin: g.logins.length }));
  await db.closeAll();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { generate, writeLegacy, POC_TABLES };
