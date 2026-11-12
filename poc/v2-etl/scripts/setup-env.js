'use strict';
// Cria .env.local (fora do git) para o Postgres local da PoC, com senha aleatória de teste,
// e out/setrole.sql para criar o papel no container. Apague out/setrole.sql depois de aplicar.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) { console.log('.env.local já existe'); process.exit(0); }
const pw = crypto.randomBytes(18).toString('base64url');
const port = process.env.POC_PG_PORT || '55432';
const env = [
  `LEGACY_DATABASE_URL=postgres://pocapp:${pw}@127.0.0.1:${port}/legacy`,
  `V2_DATABASE_URL=postgres://pocapp:${pw}@127.0.0.1:${port}/v2`,
  `SESSION_SIGNING_KEY=${crypto.randomBytes(32).toString('base64url')}`,
  '',
].join('\n');
fs.writeFileSync(envFile, env, { mode: 0o600 });
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out', 'setrole.sql'), `create role pocapp login superuser password '${pw}';\n`, { mode: 0o600 });
fs.writeFileSync(path.join(root, 'worker', '.dev.vars'), `SESSION_SIGNING_KEY=${env.match(/SESSION_SIGNING_KEY=(.*)/)[1]}\n`, { mode: 0o600 });
console.log('ok: .env.local, worker/.dev.vars e out/setrole.sql criados (valores não exibidos)');
