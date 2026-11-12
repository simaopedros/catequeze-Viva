'use strict';
// Teste rápido: o Worker local verifica um hash argon2id gerado com os parâmetros do Wasp.
const db = require('../lib/db');
const logins = require('../out/fixtures-login.json');
const WORKER = process.env.WORKER_URL || 'http://127.0.0.1:8787';
(async () => {
  const f = logins[0];
  const { rows } = await db.legacy().query(`select "providerData" from "AuthIdentity" where "providerUserId" = $1`, [f.email]);
  const hash = JSON.parse(rows[0].providerData).hashedPassword;
  console.log('prefixo do hash:', hash.split('$').slice(0, 4).join('$'));
  for (const password of [f.password, 'senha-errada']) {
    const t = Date.now();
    const r = await fetch(`${WORKER}/argon2/verify`, { method: 'POST', body: JSON.stringify({ hash, password }) });
    console.log(r.status, await r.text(), `${Date.now() - t} ms`);
  }
  await db.closeAll();
})().catch((e) => { console.error(e); process.exit(1); });
