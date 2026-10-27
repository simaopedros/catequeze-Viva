import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('family verification email portal wiring', () => {
  it('registers portal ALS in global server middleware (before auth routes)', () => {
    const wasp = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
    expect(wasp).toMatch(
      /middlewareConfigFn:\s*import\s*\{\s*serverMiddlewareConfigFn\s*\}\s*from\s*"@src\/server\/globalMiddleware"/,
    );

    const mw = readFileSync(
      resolve(__dirname, '../server/globalMiddleware.ts'),
      'utf8',
    );
    expect(mw).toContain('portalRequestContextMiddleware');
  });

  it('remembers family invite emails for verification copy', () => {
    const ops = readFileSync(
      resolve(__dirname, '../server/operations/memberOperations.ts'),
      'utf8',
    );
    expect(ops).toContain('rememberFamilyAuthEmail');
    expect(ops).toContain('isFamilyPortalRole(args.role)');
  });
});
