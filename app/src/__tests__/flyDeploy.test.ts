import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appRoot = resolve(__dirname, '../..')

function read(rel: string) {
  return readFileSync(resolve(appRoot, rel), 'utf8')
}

describe('Fly API deploy configs', () => {
  it('homolog and prod listen on Wasp port 3001 and stay warm', () => {
    for (const file of ['fly.homolog.toml', 'fly.toml']) {
      const toml = read(file)
      expect(toml).toContain('internal_port = 3001')
      expect(toml).toContain('PORT = "3001"')
      expect(toml).toContain('auto_stop_machines = "off"')
      expect(toml).toContain('dockerfile = "deploy/Dockerfile.server"')
      expect(toml).toContain('path = "/health"')
    }
  })

  it('homolog Fly Caddyfile still proxies /api before the SPA', () => {
    const caddy = read('deploy/Caddyfile.homolog.fly')
    expect(caddy).toMatch(/handle\s+\/api\/\*/)
    expect(caddy).toContain('catechis-api-homolog.fly.dev')
    expect(caddy).toContain('flush_interval -1')
  })
})
