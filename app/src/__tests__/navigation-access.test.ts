/**
 * navigation-access.test.ts — Verify role-based menu filtering.
 */
import { describe, it, expect } from 'vitest';
import { filterByRole, ALL_NAV_ITEMS, NAV_SECTIONS } from '../shared/navigation';

describe('Navigation Role Filtering', () => {

  function visiblePaths(userRole: string, isAdmin = false) {
    return filterByRole(ALL_NAV_ITEMS, userRole, isAdmin).map(i => i.to);
  }

  function visibleLabels(userRole: string, isAdmin = false) {
    return filterByRole(ALL_NAV_ITEMS, userRole, isAdmin).map(i => i.labelKey);
  }

  describe('SUPER_ADMIN (isAdmin=true)', () => {
    it('sees all items', () => {
      const paths = visiblePaths('', true);
      expect(paths.length).toBe(ALL_NAV_ITEMS.length);
      expect(paths).toContain('/admin');
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/bible');
    });
  });

  describe('PARISH_COORDINATOR', () => {
    const paths = visiblePaths('PARISH_COORDINATOR');

    it('sees parish management items', () => {
      expect(paths).toContain('/app/parishes');
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/classes');
    });

    it('sees admin', () => {
      expect(paths).toContain('/admin');
      expect(paths).toContain('/app/billing');
    });
  });

  describe('LEAD_CATECHIST', () => {
    const paths = visiblePaths('LEAD_CATECHIST');

    it('sees families and classes', () => {
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/classes');
      expect(paths).toContain('/app/catechumens');
    });

    it('does NOT see admin or parishes', () => {
      expect(paths).not.toContain('/admin');
      expect(paths).not.toContain('/app/parishes');
    });

    it('sees bible, directory, catechism', () => {
      expect(paths).toContain('/app/bible');
      expect(paths).toContain('/app/directory');
      expect(paths).toContain('/app/catechism');
    });
  });

  describe('ASSISTANT_CATECHIST', () => {
    const paths = visiblePaths('ASSISTANT_CATECHIST');

    it('has same access as LEAD_CATECHIST for pedagogy items', () => {
      expect(paths).toContain('/app/classes');
      expect(paths).toContain('/app/catechumens');
      expect(paths).toContain('/app/families');
    });

    it('does NOT see admin', () => {
      expect(paths).not.toContain('/admin');
    });
  });

  describe('GUARDIAN', () => {
    const paths = visiblePaths('GUARDIAN');

    it('sees learner items', () => {
      expect(paths).toContain('/app');
      expect(paths).toContain('/app/catechumens');
      expect(paths).toContain('/app/calendar');
    });

    it('does NOT see admin items', () => {
      expect(paths).not.toContain('/app/families');
      expect(paths).not.toContain('/app/parishes');
      expect(paths).not.toContain('/admin');
      expect(paths).not.toContain('/app/communities');
    });

    it('sees pedagogy items (bible, directory, catechism)', () => {
      expect(paths).toContain('/app/bible');
      expect(paths).toContain('/app/directory');
      expect(paths).toContain('/app/catechism');
    });

    it('sees pastoral items (sacraments, documents, messages)', () => {
      expect(paths).toContain('/app/sacramental-journeys');
      expect(paths).toContain('/app/documents');
      expect(paths).toContain('/app/messages');
    });
  });

  describe('CATECHUMEN', () => {
    const paths = visiblePaths('CATECHUMEN');

    it('sees learner items', () => {
      expect(paths).toContain('/app');
      expect(paths).toContain('/app/catechumens');
      expect(paths).toContain('/app/calendar');
    });

    it('sees bible, directory, catechism', () => {
      expect(paths).toContain('/app/bible');
      expect(paths).toContain('/app/directory');
      expect(paths).toContain('/app/catechism');
    });

    it('does NOT see admin items', () => {
      expect(paths).not.toContain('/admin');
      expect(paths).not.toContain('/app/families');
      expect(paths).not.toContain('/app/parishes');
    });
  });

  describe('PASTORAL_VIEWER', () => {
    const paths = visiblePaths('PASTORAL_VIEWER');

    it('sees viewer items', () => {
      expect(paths).toContain('/app/classes');
      expect(paths).toContain('/app/reports');
    });

    it('does NOT see admin items', () => {
      expect(paths).not.toContain('/app/parishes');
      expect(paths).not.toContain('/app/families');
      expect(paths).not.toContain('/admin');
    });
  });

  describe('No role (empty string)', () => {
    it('returns empty array', () => {
      const paths = visiblePaths('');
      expect(paths.length).toBe(0);
    });
  });

  describe('BOTTOM_NAV_KEYS', () => {
    it('5 bottom nav items exist', async () => {
      const { BOTTOM_NAV_KEYS } = await import('../shared/navigation');
      expect(BOTTOM_NAV_KEYS.length).toBe(5);
    });
  });

});
