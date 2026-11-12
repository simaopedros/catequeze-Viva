'use strict';
// Controle negativo: prova que a validação acusa divergência e que o ETL corrige só o que mudou.
// Rodar depois de tests/run-all.js (bancos carregados). Grava out/controle-negativo.json.
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');
const etl = require('../lib/etl');

(async () => {
  const P = Object.fromEntries(require('../out/parishes.json').map((p) => [`P${p.n}`, p.id]));
  const grp = [P.P5];
  const out = {};
  const { rows: [a] } = await db.v2().query(`select id, status from catequese.attendance_record where tenant_id = $1 and deleted_at is null order by id limit 1`, [P.P5]);
  // 1) adultera uma presença direto na v2 (fora do ETL)
  await db.v2().query(`update catequese.attendance_record set status = case when status = 'PRESENT' then 'ABSENT' else 'PRESENT' end where id = $1`, [a.id]);
  // 2) apaga fisicamente um responsável na v2
  const { rows: [g] } = await db.v2().query(`select id from familia.guardian_profile where tenant_id = $1 order by id limit 1`, [P.P5]);
  await db.v2().query(`delete from familia.guardian_profile where id = $1`, [g.id]);
  const cmp = await etl.compare(grp);
  out.divergenciasDetectadas = cmp.filter((c) => c.diferenca !== 0 || !c.checksumIgual).map((c) => ({ tabela: c.tabela, diferenca: c.diferenca, checksumIgual: c.checksumIgual }));
  // 3) o ETL repara exatamente as 2 linhas
  const run = await etl.load('controle-negativo', grp);
  out.reparo = run.tabelas.filter((t) => t.inseridos + t.alterados + t.apagados > 0).map((t) => ({ tabela: t.tabela, inseridos: t.inseridos, alterados: t.alterados, apagados: t.apagados }));
  out.divergenciaDepois = (await etl.compare(grp)).filter((c) => c.diferenca !== 0 || !c.checksumIgual).length;
  out.resultado = out.divergenciasDetectadas.length === 2 && out.reparo.length === 2 && out.divergenciaDepois === 0 ? 'PASSA' : 'FALHA';
  fs.writeFileSync(path.join(__dirname, '..', 'out', 'controle-negativo.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  await db.closeAll();
})().catch(async (e) => { console.error(e); await db.closeAll(); process.exit(1); });
