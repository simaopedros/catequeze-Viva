import { describe, expect, it } from 'vitest';
import { canCreateHousehold } from '../shared/householdPermissions';

describe('canCreateHousehold', () => {
  it.each(['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'])('allows %s', (role) => {
    expect(canCreateHousehold(role)).toBe(true);
  });
  it.each(['GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER', '', 'UNKNOWN'])('denies %s', (role) => {
    expect(canCreateHousehold(role)).toBe(false);
  });
  it('allows platform admins without a workspace role', () => {
    expect(canCreateHousehold(undefined, true)).toBe(true);
  });
});
