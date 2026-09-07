/**
 * Regression: Wasp only injects entities listed in main.wasp.
 * Missing User caused onboarding 500s; missing Parish caused Relatórios 500s.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function entitiesForOperation(
  waspSource: string,
  kind: 'action' | 'query',
  name: string,
): string[] {
  const re = new RegExp(
    `${kind}\\s+${name}\\s*\\{[\\s\\S]*?entities:\\s*\\[([^\\]]+)\\]`,
    'm',
  );
  const match = waspSource.match(re);
  if (!match) {
    throw new Error(`${kind} ${name} not found in main.wasp`);
  }
  return match[1]
    .split(',')
    .map((part) => part.replace(/\/\/.*$/gm, '').trim())
    .filter(Boolean);
}

function entitiesForAction(waspSource: string, actionName: string): string[] {
  return entitiesForOperation(waspSource, 'action', actionName);
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

  it('createClass declares Community so parish/community linking can be validated', () => {
    const entities = entitiesForAction(waspSource, 'createClass');
    expect(entities).toContain('Community');
    expect(entities).toContain('Parish');
  });

  it('completeCoordinatorOnboarding declares User', () => {
    const entities = entitiesForAction(
      waspSource,
      'completeCoordinatorOnboarding',
    );
    expect(entities).toContain('User');
    expect(entities).toContain('TenantBilling');
  });

  it('getReportsOverview declares Parish and ClassCatechist for workspace access', () => {
    const entities = entitiesForOperation(
      waspSource,
      'query',
      'getReportsOverview',
    );
    expect(entities).toContain('Parish');
    expect(entities).toContain('ClassCatechist');
    expect(entities).toContain('Membership');
    expect(entities).toContain('CatechesisClass');
  });

  it('diocese deal operations declare TenantBilling, Diocese and AuditLog', () => {
    const list = entitiesForOperation(waspSource, 'query', 'listDioceseDeals');
    expect(list).toContain('TenantBilling');
    expect(list).toContain('Diocese');
    expect(list).toContain('Parish');

    const upsert = entitiesForAction(waspSource, 'upsertDioceseDeal');
    expect(upsert).toContain('TenantBilling');
    expect(upsert).toContain('Diocese');
    expect(upsert).toContain('AuditLog');
    expect(upsert).toContain('User');

    const status = entitiesForAction(waspSource, 'setDioceseDealStatus');
    expect(status).toContain('AuditLog');
    expect(status).toContain('TenantBilling');

    const mine = entitiesForOperation(waspSource, 'query', 'getMyDioceseDeal');
    expect(mine).toContain('Membership');
    expect(mine).toContain('TenantBilling');
  });
});
