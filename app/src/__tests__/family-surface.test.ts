/**
 * Family surface resolution — pure helpers (no Wasp server env).
 */
import { describe, it, expect } from 'vitest';
import {
  rolesAreFamilyOnly,
  resolvePortalSurfaceFromRoles,
  isFamilyPortalRole,
  isStaffPortalRole,
} from '../shared/familySurface';

describe('familySurface helpers', () => {
  it('rolesAreFamilyOnly only when all roles are GUARDIAN/CATECHUMEN', () => {
    expect(rolesAreFamilyOnly(['GUARDIAN'])).toBe(true);
    expect(rolesAreFamilyOnly(['CATECHUMEN', 'GUARDIAN'])).toBe(true);
    expect(rolesAreFamilyOnly(['GUARDIAN', 'LEAD_CATECHIST'])).toBe(false);
    expect(rolesAreFamilyOnly(['LEAD_CATECHIST'])).toBe(false);
    expect(rolesAreFamilyOnly([])).toBe(false);
  });

  it('explicit surface PORTAL forces family even for mixed roles', () => {
    expect(
      resolvePortalSurfaceFromRoles(
        ['GUARDIAN', 'LEAD_CATECHIST'],
        'PORTAL',
      ),
    ).toBe('PORTAL');
  });

  it('pure family roles force PORTAL without surface', () => {
    expect(resolvePortalSurfaceFromRoles(['GUARDIAN'])).toBe('PORTAL');
  });

  it('staff-only roles stay STAFF without surface', () => {
    expect(resolvePortalSurfaceFromRoles(['LEAD_CATECHIST'])).toBe('STAFF');
  });

  it('STAFF surface is ignored for pure family accounts', () => {
    expect(
      resolvePortalSurfaceFromRoles(['CATECHUMEN'], 'STAFF'),
    ).toBe('PORTAL');
  });

  it('host flag forces PORTAL for mixed roles', () => {
    expect(
      resolvePortalSurfaceFromRoles(
        ['GUARDIAN', 'LEAD_CATECHIST'],
        null,
        true,
      ),
    ).toBe('PORTAL');
  });

  it('role classifiers', () => {
    expect(isFamilyPortalRole('GUARDIAN')).toBe(true);
    expect(isStaffPortalRole('LEAD_CATECHIST')).toBe(true);
    expect(isStaffPortalRole('GUARDIAN')).toBe(false);
  });
});
