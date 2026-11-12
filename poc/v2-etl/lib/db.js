'use strict';
// Conexões da PoC. Só bancos locais de homologação com dados fictícios.
// LEGACY_DATABASE_URL e V2_DATABASE_URL vêm do ambiente (arquivo .env.local fora do git).
const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// Timestamps e números como texto: o ETL copia o valor exato, sem conversão de fuso.
for (const oid of [1114, 1184, 1082, 700, 701, 1700, 20]) types.setTypeParser(oid, (v) => v);

function loadEnv() {
  const f = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`variável ${name} ausente (veja .env.local.example)`);
  return v;
}

const pools = {};
function legacy() {
  return (pools.legacy ||= new Pool({ connectionString: need('LEGACY_DATABASE_URL'), max: 4 }));
}
function v2() {
  return (pools.v2 ||= new Pool({ connectionString: need('V2_DATABASE_URL'), max: 4 }));
}
// Pool da API: mesmo banco v2, mas com o papel app_rw (sem BYPASSRLS).
function v2App() {
  if (pools.v2App) return pools.v2App;
  return (pools.v2App = new Pool({ connectionString: need('V2_DATABASE_URL'), max: 8, options: '-c role=app_rw' }));
}
async function closeAll() {
  await Promise.all(Object.values(pools).map((p) => p.end()));
  for (const k of Object.keys(pools)) delete pools[k];
}

module.exports = { legacy, v2, v2App, closeAll };
