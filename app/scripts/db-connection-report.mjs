#!/usr/bin/env node

/**
 * Database connection diagnostic report.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/db-connection-report.mjs
 *   DB_CONNECTION_WARN_PERCENT=80 node scripts/db-connection-report.mjs
 *
 * Prints:
 *   1. SHOW max_connections (server limit)
 *   2. pg_stat_activity grouped by application_name + state
 *   3. Usage percentage; exits non-zero if above DB_CONNECTION_WARN_PERCENT
 */

import pg from 'pg'

const { Pool } = pg

const WARN_PERCENT = parseInt(process.env.DB_CONNECTION_WARN_PERCENT || '70', 10)

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1, // Diagnostic script: open just one connection
  application_name: 'catechis-diagnostic',
})

async function report() {
  const client = await pool.connect()
  try {
    // 1. Server max_connections
    const maxRes = await client.query('SHOW max_connections')
    const maxConnections = parseInt(maxRes.rows[0].max_connections, 10)
    console.log(`max_connections (server limit): ${maxConnections}`)

    // 2. Current activity grouped by application_name + state
    const activityRes = await client.query(`
      SELECT
        application_name,
        state,
        COUNT(*)::int AS count
      FROM pg_stat_activity
      GROUP BY application_name, state
      ORDER BY application_name, state
    `)
    console.log('\npg_stat_activity by application_name / state:')
    console.table(activityRes.rows)

    // 3. Total connections and usage
    const totalRes = await client.query(
      'SELECT COUNT(*)::int AS total FROM pg_stat_activity'
    )
    const total = totalRes.rows[0].total
    const pct = ((total / maxConnections) * 100).toFixed(1)
    console.log(`\nTotal connections: ${total} / ${maxConnections} (${pct}%)`)

    if (parseFloat(pct) >= WARN_PERCENT) {
      console.error(
        `\n⚠️  WARNING: Connection usage (${pct}%) exceeds threshold (${WARN_PERCENT}%).`
      )
      process.exitCode = 1
    } else {
      console.log(
        `\n✅ Connection usage within threshold (${WARN_PERCENT}%).`
      )
    }
  } finally {
    client.release()
    await pool.end()
  }
}

report().catch((err) => {
  console.error(err)
  process.exit(1)
})
