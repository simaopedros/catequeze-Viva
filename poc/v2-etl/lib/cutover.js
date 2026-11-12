'use strict';
// Virada e rollback de um grupo de paróquias, cronometrados por passo.
//   virada:   congelar (legado recusa escrita; v2 recusa escrita) -> delta (ETL) -> verificar (diferença 0) -> trocar tenant_home para v2 -> liberar
//   rollback: congelar v2 -> export reverso v2 -> legado -> verificar -> tenant_home volta para legacy -> liberar o legado
const db = require('./db');
const etl = require('./etl');
const { ms, now } = require('./util');

async function step(log, name, fn) {
  const t = now();
  const r = await fn();
  log.push({ passo: name, ms: ms(t) });
  return r;
}

function zeroDiff(cmp) {
  const bad = cmp.filter((c) => c.diferenca !== 0 || !c.checksumIgual);
  return { ok: bad.length === 0, divergentes: bad.map((b) => b.tabela) };
}

async function freezeLegacy(parishIds) {
  await db.legacy().query(`insert into migracao.tenant_guard (parish_id, state) select unnest($1::text[]), 'frozen'
                           on conflict (parish_id) do update set state = 'frozen', updated_at = now()`, [parishIds]);
}

async function cutover(coorte, parishIds, hooks = {}) {
  const log = [];
  const t0 = now();
  await step(log, 'congelar', async () => {
    await freezeLegacy(parishIds);
    await db.v2().query(`insert into migracao.tenant_home (parish_id, coorte, frozen_at) select unnest($1::text[]), $2, now()
                         on conflict (parish_id) do update set frozen_at = now(), coorte = excluded.coorte, updated_at = now()`, [parishIds, coorte]);
  });
  if (hooks.duranteCongelamento) await hooks.duranteCongelamento();
  const delta = await step(log, 'delta', () => etl.load(coorte, parishIds));
  const check = await step(log, 'verificar', async () => zeroDiff(await etl.compare(parishIds)));
  if (!check.ok) throw new Error(`virada abortada: divergência em ${check.divergentes.join(', ')} (grupo segue congelado, rode o rollback)`);
  await step(log, 'trocar_flag', async () => {
    await db.v2().query(`update migracao.tenant_home set home = 'v2', updated_at = now() where parish_id = any($1)`, [parishIds]);
    await db.legacy().query(`update migracao.tenant_guard set state = 'v2', updated_at = now() where parish_id = any($1)`, [parishIds]);
  });
  await step(log, 'liberar', () => db.v2().query(`update migracao.tenant_home set frozen_at = null, updated_at = now() where parish_id = any($1)`, [parishIds]));
  return { coorte, passos: log, totalMs: ms(t0), delta, verificacao: check };
}

async function rollback(coorte, parishIds) {
  const log = [];
  const t0 = now();
  await step(log, 'congelar_v2', () => db.v2().query(`update migracao.tenant_home set frozen_at = now(), updated_at = now() where parish_id = any($1)`, [parishIds]));
  const rev = await step(log, 'export_reverso', () => etl.reverse(coorte, parishIds));
  const check = await step(log, 'verificar', async () => zeroDiff(await etl.compare(parishIds)));
  if (!check.ok) throw new Error(`rollback com divergência em ${check.divergentes.join(', ')} (grupo segue congelado nos dois lados)`);
  await step(log, 'trocar_flag', () => db.v2().query(`update migracao.tenant_home set home = 'legacy', frozen_at = null, updated_at = now() where parish_id = any($1)`, [parishIds]));
  await step(log, 'liberar_legado', () => db.legacy().query(`delete from migracao.tenant_guard where parish_id = any($1)`, [parishIds]));
  return { coorte, passos: log, totalMs: ms(t0), reverso: rev, verificacao: check };
}

module.exports = { cutover, rollback, freezeLegacy };
