'use strict';
// ETL idempotente legado -> v2 por grupo de paróquias, e export reverso v2 -> legado (rollback).
const crypto = require('crypto');
const db = require('./db');
const { TABLES, snake, q, qv2, legacyScopedSelect, v2ScopeWhere } = require('./tables');
const { ms, now } = require('./util');

const BATCH = 5000;
const SYNC_ONLY = new Set(['tenant_id', 'deleted_at', 'version', 'client_mutation_id']);

let colsCache = null; // promessa: chamadas concorrentes esperam o mesmo carregamento
function columns() {
  colsCache ||= (async () => {
    const m = new Map();
    for (const t of TABLES) {
      const { rows } = await db.legacy().query(
        `select attname::text as name from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped order by attnum`, [q(t.legacy)]);
      const legacyCols = rows.map((r) => r.name);
      m.set(t.legacy, { legacyCols, v2Cols: legacyCols.map(snake), hasUpdatedAt: legacyCols.includes('updatedAt') });
    }
    return m;
  })();
  return colsCache;
}

const SEP = 'chr(31)';
const keyExpr = (cols, alias = '') => cols.map((c) => `${alias}${q(c)}`).join(` || ${SEP} || `);
const rowExpr = (cols, alias) => `concat_ws('|', ${cols.map((c) => `coalesce(${alias}.${q(c)}::text, '\\N')`).join(', ')})`;

// Contagem + md5 das colunas comparáveis (todas as colunas do legado), ordenado pela chave.
async function checksumLegacy(t, parishIds, client = db.legacy()) {
  const { legacyCols } = (await columns()).get(t.legacy);
  const { rows } = await client.query(
    `select count(*)::int as n, md5(coalesce(string_agg(${rowExpr(legacyCols, 's')}, E'\\n' order by (${keyExpr(t.key, 's.')}) collate "C"), '')) as md5
       from (${legacyScopedSelect(t)}) s`, [parishIds]);
  return rows[0];
}
async function checksumV2(t, parishIds, client = db.v2()) {
  const { v2Cols } = (await columns()).get(t.legacy);
  const v2Key = t.key.map(snake);
  const { rows } = await client.query(
    `select count(*)::int as n, md5(coalesce(string_agg(${rowExpr(v2Cols, 's')}, E'\\n' order by (${keyExpr(v2Key, 's.')}) collate "C"), '')) as md5
       from ${qv2(t.v2)} s where ${v2ScopeWhere(t)} and s.deleted_at is null`, [parishIds]);
  return rows[0];
}

async function compare(parishIds) {
  const out = [];
  for (const t of TABLES) {
    const [a, b] = await Promise.all([checksumLegacy(t, parishIds), checksumV2(t, parishIds)]);
    out.push({ tabela: t.v2, contagemLegado: a.n, contagemV2: b.n, diferenca: b.n - a.n, checksumLegado: a.md5, checksumV2: b.md5, checksumIgual: a.md5 === b.md5 });
  }
  return out;
}

function upsertSql(table, cols, keyCols, { bumpUpdatedAt, sync }) {
  const qc = cols.map(q).join(', ');
  const nonKey = cols.filter((c) => !keyCols.includes(c));
  const set = nonKey.map((c) => `${q(c)} = excluded.${q(c)}`);
  const cmpOld = nonKey.map((c) => `t.${q(c)}`);
  const cmpNew = nonKey.map((c) => `excluded.${q(c)}`);
  if (sync) {
    set.push('"deleted_at" = null', '"version" = t."version" + 1');
    if (bumpUpdatedAt) set.push('"updated_at" = now()');
    cmpOld.push('t."deleted_at"');
    cmpNew.push('null::timestamp');
  }
  return `insert into ${table} as t (${qc}) select ${qc} from jsonb_populate_recordset(null::${table}, $1::jsonb)
    on conflict (${keyCols.map(q).join(', ')}) do update set ${set.join(', ')}
    where (${cmpOld.join(', ')}) is distinct from (${cmpNew.join(', ')})
    returning (xmax = 0) as inserted`;
}

async function upsertAll(client, sql, rows) {
  let ins = 0, upd = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { rows: r } = await client.query(sql, [JSON.stringify(rows.slice(i, i + BATCH))]);
    for (const x of r) x.inserted ? ins++ : upd++;
  }
  return { ins, upd };
}

async function ensureTenantHome(v2c, coorte, parishIds) {
  await v2c.query(`insert into migracao.tenant_home (parish_id, coorte) select unnest($1::text[]), $2
                   on conflict (parish_id) do update set coorte = excluded.coorte`, [parishIds, coorte]);
}

// legado -> v2. Uma transação por grupo na v2; leitura em snapshot único no legado.
async function load(coorte, parishIds) {
  const cols = await columns();
  const runId = crypto.randomUUID();
  const t0 = now();
  const lc = await db.legacy().connect();
  const vc = await db.v2().connect();
  const stats = [];
  try {
    await lc.query('begin isolation level repeatable read read only');
    await vc.query('begin');
    await vc.query(`set local role etl`);
    await vc.query(`set local app.etl = 'on'`);
    await ensureTenantHome(vc, coorte, parishIds);
    for (const t of TABLES) {
      const tt = now();
      const { legacyCols, v2Cols, hasUpdatedAt } = cols.get(t.legacy);
      const { rows } = await lc.query(legacyScopedSelect(t), [parishIds]);
      const mapped = rows.map((r) => {
        const o = {};
        legacyCols.forEach((c, i) => { o[v2Cols[i]] = r[c]; });
        if (t.tenant) o.tenant_id = r.__tenant;
        return o;
      });
      if (t.tenant && mapped.some((m) => !m.tenant_id)) throw new Error(`${t.v2}: tenant_id nulo derivado`);
      const v2Key = t.key.map(snake);
      const insCols = t.tenant ? [...v2Cols, 'tenant_id'] : v2Cols;
      // Linhas vivas na v2 que sumiram da origem viram soft-delete. Nas tabelas de paróquia isso vem
      // ANTES do upsert (F3): par apagado e recriado com outro id no legado libera o índice único
      // parcial (where deleted_at is null) antes de a linha nova entrar.
      const keys = mapped.map((m) => v2Key.map((k) => m[k]).join('\u001f'));
      let del = 0;
      if (t.tenant) {
        const r = await vc.query(`update ${qv2(t.v2)} set deleted_at = now(), version = version + 1
          where ${v2ScopeWhere(t)} and deleted_at is null and not ((${keyExpr(v2Key)}) = any($2::text[]))`, [parishIds, keys]);
        del = r.rowCount;
      }
      const { ins, upd } = mapped.length ? await upsertAll(vc, upsertSql(qv2(t.v2), insCols, v2Key, { bumpUpdatedAt: !hasUpdatedAt, sync: true }), mapped) : { ins: 0, upd: 0 };
      if (!t.tenant) {
        // Globais (identity, diocese): só some da v2 o que não existe mais em lugar nenhum no legado.
        const { rows: live } = await vc.query(`select (${keyExpr(v2Key)}) as k from ${qv2(t.v2)} where ${v2ScopeWhere(t)} and deleted_at is null`, [parishIds]);
        const liveKeys = live.map((x) => x.k);
        if (liveKeys.length) {
          const { rows: still } = await lc.query(`select (${keyExpr(t.key)}) as k from ${q(t.legacy)} where (${keyExpr(t.key)}) = any($1::text[])`, [liveKeys]);
          const gone = liveKeys.filter((k) => !new Set(still.map((x) => x.k)).has(k));
          if (gone.length) del = (await vc.query(`update ${qv2(t.v2)} set deleted_at = now(), version = version + 1 where (${keyExpr(v2Key)}) = any($1::text[]) and deleted_at is null`, [gone])).rowCount;
        }
      }
      stats.push({ tabela: t.v2, lidas: rows.length, inseridos: ins, alterados: upd, apagados: del, ms: ms(tt) });
    }
    await vc.query('commit');
    await lc.query('commit');
  } catch (e) {
    await vc.query('rollback').catch(() => {});
    await lc.query('rollback').catch(() => {});
    throw e;
  } finally { lc.release(); vc.release(); }

  // Validação e registro em migracao.etl_run.
  const cmp = await compare(parishIds);
  for (const s of stats) {
    const c = cmp.find((x) => x.tabela === s.tabela);
    Object.assign(s, { contagemOrigem: c.contagemLegado, contagemDestino: c.contagemV2, checksumIgual: c.checksumIgual });
    await db.v2().query(`insert into migracao.etl_run (run_id, direcao, coorte, tabela, inseridos, alterados, apagados, contagem_origem, contagem_destino, checksum_origem, checksum_destino, ms)
      values ($1, 'legacy->v2', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [runId, coorte, s.tabela, s.inseridos, s.alterados, s.apagados, c.contagemLegado, c.contagemV2, c.checksumLegado, c.checksumV2, s.ms]);
  }
  return { runId, coorte, ms: ms(t0), tabelas: stats };
}

// v2 -> legado (rollback): devolve ao legado tudo o que mudou na v2 durante a virada.
async function reverse(coorte, parishIds) {
  const cols = await columns();
  const runId = crypto.randomUUID();
  const t0 = now();
  const lc = await db.legacy().connect();
  const vc = await db.v2().connect();
  const stats = [];
  try {
    await vc.query('begin isolation level repeatable read read only');
    await lc.query('begin');
    await lc.query(`set local app.guard_bypass = 'on'`);
    await lc.query('set constraints all deferred');
    const liveKeysByTable = new Map();
    const liveRowsByTable = new Map();
    for (const t of TABLES) {
      const tt = now();
      const { legacyCols, v2Cols } = cols.get(t.legacy);
      const { rows } = await vc.query(`select * from ${qv2(t.v2)} where ${v2ScopeWhere(t)} and deleted_at is null`, [parishIds]);
      const mapped = rows.map((r) => {
        const o = {};
        legacyCols.forEach((c, i) => { o[c] = r[v2Cols[i]]; });
        return o;
      });
      liveRowsByTable.set(t.legacy, mapped);
      liveKeysByTable.set(t.legacy, mapped.map((m) => t.key.map((k) => m[k]).join('\u001f')));
      stats.push({ tabela: t.v2, lidas: rows.length, inseridos: 0, alterados: 0, apagados: 0, ms: ms(tt) });
    }
    // Exclusões primeiro, dos filhos para os pais (F3: par recriado com outro id na v2 não colide
    // com o índice único do legado); depois os upserts, dos pais para os filhos.
    for (const t of [...TABLES].reverse()) {
      const s = stats.find((x) => x.tabela === t.v2);
      const keys = liveKeysByTable.get(t.legacy);
      if (t.tenant) {
        const r = await lc.query(`delete from ${q(t.legacy)} where (${keyExpr(t.key)}) in (select (${keyExpr(t.key, 's.')}) from (${legacyScopedSelect(t)}) s)
          and not ((${keyExpr(t.key)}) = any($2::text[]))`, [parishIds, keys]);
        s.apagados = r.rowCount;
      } else {
        // Globais: só apaga no legado o que foi apagado (soft-delete) na v2.
        const v2Key = t.key.map(snake);
        const { rows: dead } = await vc.query(`select (${keyExpr(v2Key)}) as k from ${qv2(t.v2)} where deleted_at is not null`);
        if (dead.length) s.apagados = (await lc.query(`delete from ${q(t.legacy)} where (${keyExpr(t.key)}) = any($1::text[])`, [dead.map((d) => d.k)])).rowCount;
      }
    }
    for (const t of TABLES) {
      const mapped = liveRowsByTable.get(t.legacy);
      if (!mapped.length) continue;
      const s = stats.find((x) => x.tabela === t.v2);
      const { ins, upd } = await upsertAll(lc, upsertSql(q(t.legacy), cols.get(t.legacy).legacyCols, t.key, { sync: false }), mapped);
      s.inseridos = ins; s.alterados = upd;
    }
    await lc.query('commit');
    await vc.query('commit');
  } catch (e) {
    await lc.query('rollback').catch(() => {});
    await vc.query('rollback').catch(() => {});
    throw e;
  } finally { lc.release(); vc.release(); }

  const cmp = await compare(parishIds);
  for (const s of stats) {
    const c = cmp.find((x) => x.tabela === s.tabela);
    Object.assign(s, { contagemOrigem: c.contagemV2, contagemDestino: c.contagemLegado, checksumIgual: c.checksumIgual });
    await db.v2().query(`insert into migracao.etl_run (run_id, direcao, coorte, tabela, inseridos, alterados, apagados, contagem_origem, contagem_destino, checksum_origem, checksum_destino, ms)
      values ($1, 'v2->legacy', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [runId, coorte, s.tabela, s.inseridos, s.alterados, s.apagados, c.contagemV2, c.contagemLegado, c.checksumV2, c.checksumLegado, s.ms]);
  }
  return { runId, coorte, ms: ms(t0), tabelas: stats };
}

module.exports = { load, reverse, compare, checksumLegacy, checksumV2, columns };
