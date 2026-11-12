'use strict';
// Imprime um resumo curto de out/report.json (para o relatório A4).
const r = require('../out/report.json');
const t = r.testes;
const s = {
  T1: { r: t.T1.resultado, volume: t.T1.volume.ok, emails: `${t.T1.emailsFicticios.emExampleInvalid}/${t.T1.emailsFicticios.total}`, cpf: t.T1.varredura.cpfsValidos, tel: t.T1.varredura.telefonesValidos, linhasVarridas: t.T1.varredura.linhasVarridas, fks: t.T1.fks, determinismo: t.T1.determinismo.checksumIgualNas2Execucoes },
  T2: { r: t.T2.resultado, carga1Ms: t.T2.carga1.ms, coortes: t.T2.carga1.coortes, tabelasDif0: t.T2.carga1.tabelas.filter((x) => x.diferenca === 0 && x.checksumIgual).length, totalTabelas: t.T2.carga1.tabelas.length, tenantNulo: t.T2.tenantIdNulo, carga2: t.T2.carga2, delta: t.T2.delta },
  T3: { r: t.T3.resultado, grupos: t.T3.grupos, coortes: t.T3.coortes.map((c) => c.paroquias.join(',') + ' ' + c.linhas), divididos: t.T3.usuariosDivididosEntreGrupos, intactas: t.T3.tabelasP3aP6Intactas },
  T4: { r: t.T4.resultado, tabelas: t.T4.matriz.tabelas, vazamentos: t.T4.matriz.tabelasComVazamento, catalogo: t.T4.catalogoSemRlsForcado.length, idor: t.T4.idor.bloqueados, gravadas: t.T4.idor.presencasGravadasPelosCasos, latencia: t.T4.latencia },
  T5: { r: t.T5.resultado, isolated: t.T5.cookies.isolated, shared: t.T5.cookies.shared, worker: t.T5.workerArgon2, cpu: t.T5.cpuArgon2 },
  T6: t.T6.ensaios.map((e) => ({ ok: e.ok, viradaMs: e.virada.totalMs, passos: e.virada.passos.map((p) => `${p.passo}=${p.ms}`).join(' '), legadoCong: e.escritasNoLegadoDuranteCongelamento, legadoV2: e.escritasNoLegadoDepoisDaVirada, api423: e.apiDuranteCongelamento, fila: e.filaOffline, rollbackMs: e.rollback.totalMs, rbPassos: e.rollback.passos.map((p) => `${p.passo}=${p.ms}`).join(' '), noLegado: e.presencasDaV2NoLegado, dif: e.diferencaPosRollback.length })),
  Social: t.Social,
  periodo: `${r.inicio} -> ${r.fim}`,
};
console.log(JSON.stringify(s, null, 1));
