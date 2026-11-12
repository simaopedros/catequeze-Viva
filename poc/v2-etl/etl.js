'use strict';
// Linha de comando da PoC. Paróquias por apelido (P1..P6, do gerador) ou por id.
//   node etl.js grupos                         grupos e coortes calculados pelo grafo
//   node etl.js carga    P1,P2 [--coorte nome] ETL legado -> v2 (idempotente)
//   node etl.js validar  P1,P2                 contagem e checksum por tabela
//   node etl.js virada   P1,P2 [--coorte nome] congelar, delta, verificar, trocar tenant_home para v2, liberar
//   node etl.js rollback P1,P2 [--coorte nome] export reverso v2 -> legado e tenant_home volta para legacy
//   node etl.js estado                         tenant_home e guarda do legado
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const etl = require('./lib/etl');
const cohorts = require('./lib/cohorts');
const cutover = require('./lib/cutover');

function parishes(arg) {
  if (!arg) throw new Error('informe as paróquias, ex.: P1,P2');
  const f = path.join(__dirname, 'out', 'parishes.json');
  const alias = fs.existsSync(f) ? Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).map((p) => [`P${p.n}`, p.id])) : {};
  return arg.split(',').map((x) => alias[x.trim()] || x.trim());
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  const i = process.argv.indexOf('--coorte');
  const coorte = i > 0 ? process.argv[i + 1] : `manual-${arg}`;
  let out;
  switch (cmd) {
    case 'grupos': out = await cohorts.cohorts(); break;
    case 'carga': out = await etl.load(coorte, parishes(arg)); break;
    case 'validar': out = await etl.compare(parishes(arg)); break;
    case 'virada': out = await cutover.cutover(coorte, parishes(arg)); break;
    case 'rollback': out = await cutover.rollback(coorte, parishes(arg)); break;
    case 'estado':
      out = { tenantHome: (await db.v2().query('select * from migracao.tenant_home order by parish_id')).rows,
        guardaLegado: (await db.legacy().query('select * from migracao.tenant_guard order by parish_id')).rows };
      break;
    default: console.error('uso: node etl.js grupos|carga|validar|virada|rollback|estado [P1,P2] [--coorte nome]'); process.exitCode = 2;
  }
  if (out) console.log(JSON.stringify(out, null, 1));
  await db.closeAll();
})().catch(async (e) => { console.error(e.message); await db.closeAll(); process.exit(1); });
