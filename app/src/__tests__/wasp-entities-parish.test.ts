/**
 * Regression: createParish / onboarding billing look up context.entities.User.
 * Wasp only injects entities listed in main.wasp — missing User caused production 500s.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function entitiesForAction(waspSource: string, actionName: string): string[] {
  const re = new RegExp(
    `action\\s+${actionName}\\s*\\{[\\s\\S]*?entities:\\s*\\[([^\\]]+)\\]`,
    'm',
  );
  const match = waspSource.match(re);
  if (!match) {
    throw new Error(`Action ${actionName} not found in main.wasp`);
  }
  return match[1]
    .split(',')
    .map((part) => part.replace(/\/\/.*$/gm, '').trim())
    .filter(Boolean);
}

describe('Wasp entities for parish onboarding actions', () => {
  const waspSource = readFileSync(
    resolve(__dirname, '../../main.wasp'),
    'utf8',
  );

  it('createParish declares User and AuditLog', () => {
    const entities = entitiesForAction(waspSource, 'createParish');
    expect(entities).toContain('User');
    expect(entities).toContain('AuditLog');
    expect(entities).toContain('Parish');
    expect(entities).toContain('TenantBilling');
  });

  it('getOrCreateParishByOsmId declares User', () => {
    const entities = entitiesForAction(waspSource, 'getOrCreateParishByOsmId');
    expect(entities).toContain('User');
    expect(entities).toContain('TenantBilling');
  });

  it('completeCoordinatorOnboarding declares User', () => {
    const entities = entitiesForAction(
      waspSource,
      'completeCoordinatorOnboarding',
    );
    expect(entities).toContain('User');
    expect(entities).toContain('TenantBilling');
  });
});
