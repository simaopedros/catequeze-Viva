import { describe, expect, it } from 'vitest';
import { mapLegacyTenantPlan } from '../shared/planCatalog';

const SQL_CASE: Record<string, string> = {
  PARISH_COMPLETE: 'unlimited',
  DIOCESE: 'unlimited',
  PARISH: 'unlimited',
  UNLIMITED: 'unlimited',
  CATECHIST_PRO: 'single',
  CATECHIST_AI: 'single',
  PARISH_ESSENTIAL: 'single',
  SINGLE: 'single',
  CATECHIST_FREE: 'catechist_free',
  MISSIONARY_FREE: 'catechist_free',
};

describe('TenantBilling.plan CASE mapping', () => {
  it('maps every legacy enum value the same way as the SQL migration', () => {
    for (const [from, to] of Object.entries(SQL_CASE)) {
      expect(mapLegacyTenantPlan(from)).toBe(to);
    }
  });

  it('lowercases unknown values', () => {
    expect(mapLegacyTenantPlan('CUSTOM_PLAN')).toBe('custom_plan');
  });
});
