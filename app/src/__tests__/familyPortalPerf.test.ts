import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('family portal dashboard performance', () => {
  it('short-circuits getDashboardStats for surface=PORTAL', () => {
    const ops = readFileSync(
      resolve(__dirname, '../server/operations/dashboardOperations.ts'),
      'utf8',
    );
    expect(ops).toContain('getFamilyPortalDashboardStats');
    expect(ops).toContain('args.surface === "PORTAL"');
    expect(ops).toContain('loadActiveRoles');
  });

  it('does not block the family dashboard on a full-page skeleton for stats', () => {
    const page = readFileSync(
      resolve(__dirname, '../catequese/pages/DashboardPage.tsx'),
      'utf8',
    );
    expect(page).toContain('onFamilySurface');
    expect(page).toContain('staleTime: onFamilySurface ? 60_000 : 0');
    expect(page).toMatch(
      /loadingCtx \|\| \(!isInstitutional && !onFamilySurface && loadingStats\)/,
    );
  });
});
