'use strict';
const crypto = require('crypto');

// PRNG determinístico (mulberry32) para o gerador.
function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

// UUID determinístico a partir de (seed, rótulo).
function uuidFor(seed, label) {
  const h = crypto.createHash('sha256').update(`${seed}:${label}`).digest();
  h[6] = (h[6] & 0x0f) | 0x40;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// Timestamp no formato do Postgres timestamp(3) sem fuso.
function ts(base, addMinutes = 0) {
  const d = new Date(Date.parse(base + 'Z') + addMinutes * 60000);
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

const ms = (t0) => Number((process.hrtime.bigint() - t0) / 1000000n);
const now = () => process.hrtime.bigint();

function p95(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
}
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Insere em lotes usando o rowtype da tabela (converte enums/timestamps pelo próprio Postgres).
async function insertRows(client, table, rows, { batch = 2000, rowtype = table } = {}) {
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const keys = new Set();
    for (const r of chunk) for (const k of Object.keys(r)) keys.add(k);
    const cols = [...keys].map((c) => `"${c}"`).join(', ');
    await client.query(`insert into ${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::${rowtype}, $1::jsonb)`, [JSON.stringify(chunk)]);
  }
}

module.exports = { rng, uuidFor, ts, ms, now, p95, median, insertRows };
