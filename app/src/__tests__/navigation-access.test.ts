/**
 * navigation-access.test.ts — Role + workspace menu filtering.
 *
 * Nav visibility is UX only — not AuthZ. Server access-control tests live elsewhere.
 */
import { describe, it, expect } from 'vitest';
import {
  filterByRole,
  filterByWorkspace,
  filterLaunchHidden,
  getVisibleNavigation,
  ALL_NAV_ITEMS,
  BOTTOM_NAV_KEYS,
  PERSONAL_HIDDEN_ICON_KEYS,
} from '../shared/navigation';
import { AI_FEATURES_ENABLED, isAiAppPath } from '../shared/aiFeatures';

describe('Navigation Role Filtering', () => {
  function visiblePaths(userRole: string, isAdmin = false) {
    return filterByRole(ALL_NAV_ITEMS, userRole, isAdmin).map((i) => i.to);
  }

  describe('SUPER_ADMIN (isAdmin=true)', () => {
    it('sees all non-launch-hidden items', () => {
      const paths = visiblePaths('', true);
      expect(paths.length).toBe(filterLaunchHidden(ALL_NAV_ITEMS).length);
      expect(paths).toContain('/admin');
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/bible');
      if (!AI_FEATURES_ENABLED) {
        expect(paths).not.toContain('/app/ai-hub');
      }
    });
  });

  describe('PARISH_COORDINATOR', () => {
    const paths = visiblePaths('PARISH_COORDINATOR');

    it('sees parish management items', () => {
      expect(paths).toContain('/app/parishes');
      expect(paths).toContain('/app/communities');
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/classes');
    });

    it('does NOT see admin (only isAdmin users see /admin)', () => {
      expect(paths).not.toContain('/admin');
      expect(paths).toContain('/app/billing');
    });
  });

  describe('LEAD_CATECHIST', () => {
    const paths = visiblePaths('LEAD_CATECHIST');

    it('sees families, classes, and team', () => {
      expect(paths).toContain('/app/families');
      expect(paths).toContain('/app/classes');
      expect(paths).toContain('/app/catechumens');
      expect(paths).toContain('/app/team');
    });

    it('does NOT see admin, parishes, or billing', () => {
      expect(paths).not.toContain('/admin');
      expect(paths).not.toContain('/app/parishes');
      expect(paths).not.toContain('/app/billing');
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

    it('does NOT see admin or billing', () => {
      expect(paths).not.toContain('/admin');
      expect(paths).not.toContain('/app/billing');
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
      expect(paths).toContain('/app/calendar');
    });

    it('does NOT see /app/catechumens', () => {
      expect(paths).not.toContain('/app/catechumens');
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

  describe('PERSONAL_OWNER role mapping', () => {
    it('sees coordinator-level items via defensive role mapping', () => {
      const paths = visiblePaths('PERSONAL_OWNER');
      expect(paths).toContain('/app/classes');
      expect(paths).toContain('/app/parishes');
      expect(paths).toContain('/app/billing');
    });
  });
});

describe('Workspace filter (UX, not AuthZ)', () => {
  it('hides PERSONAL institutional iconKeys', () => {
    const filtered = filterByWorkspace(ALL_NAV_ITEMS, 'PERSONAL');
    const keys = filtered.map((i) => i.iconKey);
    for (const hidden of PERSONAL_HIDDEN_ICON_KEYS) {
      expect(keys).not.toContain(hidden);
    }
  });

  it('does not hide parishes or communities in PERSONAL workspace', () => {
    const filtered = filterByWorkspace(ALL_NAV_ITEMS, 'PERSONAL');
    expect(filtered.map((i) => i.iconKey)).toContain('parishes');
    expect(filtered.map((i) => i.iconKey)).toContain('communities');
  });

  it('does not hide institutional items for PARISH', () => {
    const filtered = filterByWorkspace(ALL_NAV_ITEMS, 'PARISH');
    expect(filtered.map((i) => i.iconKey)).toContain('parishes');
    expect(filtered.map((i) => i.iconKey)).toContain('reports');
  });
});

describe('getVisibleNavigation SSOT', () => {
  it('BOTTOM_NAV_KEYS has at most 4 entries (settings + rest in More)', () => {
    expect(BOTTOM_NAV_KEYS.length).toBe(4);
    expect(BOTTOM_NAV_KEYS).not.toContain('settings');
    expect(BOTTOM_NAV_KEYS).not.toContain('catechumens');
    expect([...BOTTOM_NAV_KEYS]).toEqual([
      'dashboard',
      'classes',
      'calendar',
      'messages',
    ]);
  });

  it('catechist bottomBar: Início, Turmas, Agenda, Mensagens', () => {
    const nav = getVisibleNavigation({
      role: 'LEAD_CATECHIST',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.bottomBar.length).toBeLessThanOrEqual(4);
    expect(nav.bottomBar.map((i) => i.iconKey)).toEqual([
      'dashboard',
      'classes',
      'calendar',
      'messages',
    ]);
  });

  it('coordinator bottomBar: Início, Turmas, Agenda, Pessoas', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.bottomBar.map((i) => i.iconKey)).toEqual([
      'dashboard',
      'classes',
      'calendar',
      'catechumens',
    ]);
  });

  it('groups are task-oriented (operation, people, content, management, settings)', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    const ids = nav.groups.map((g) => g.id);
    expect(ids[0]).toBe('operation');
    expect(ids).toContain('people');
    expect(ids).toContain('content');
    expect(ids).toContain('management');
    expect(ids).toContain('settings');
    expect(nav.groups.find((g) => g.id === 'operation')?.collapsible).toBe(
      false,
    );
    expect(nav.groups.find((g) => g.id === 'people')?.collapsible).toBe(true);
  });

  it('sheetItems exclude bottomBar keys and include settings/documents', () => {
    const nav = getVisibleNavigation({
      role: 'LEAD_CATECHIST',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    const barKeys = new Set(nav.bottomBar.map((i) => i.iconKey));
    for (const item of nav.sheetItems) {
      expect(barKeys.has(item.iconKey)).toBe(false);
    }
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('settings');
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('catechumens');
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('documents');
    // Invited catechists do not manage payment
    expect(nav.sheetItems.map((i) => i.iconKey)).not.toContain('billing');
  });

  it('sheetGroups match group order and exclude bottomBar', () => {
    const nav = getVisibleNavigation({
      role: 'LEAD_CATECHIST',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    const barKeys = new Set(nav.bottomBar.map((i) => i.iconKey));
    for (const g of nav.sheetGroups) {
      for (const item of g.items) {
        expect(barKeys.has(item.iconKey)).toBe(false);
      }
    }
  });

  it('parish coordinator sheet includes billing', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('billing');
  });

  it('PERSONAL workspace hides reports and catechetical years, but keeps parish management', () => {
    const nav = getVisibleNavigation({
      role: 'PERSONAL_OWNER',
      isAdmin: false,
      workspaceType: 'PERSONAL',
    });
    const keys = nav.all.map((i) => i.iconKey);
    expect(keys).toContain('parishes');
    expect(keys).toContain('communities');
    expect(keys).not.toContain('reports');
    expect(keys).not.toContain('catechetical_years');
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('parishes');
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('communities');
  });

  it('coordinator in PERSONAL workspace still sees parish and community management', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PERSONAL',
    });
    expect(nav.all.map((i) => i.iconKey)).toContain('parishes');
    expect(nav.all.map((i) => i.iconKey)).toContain('communities');
  });

  it('institutional PARISH still shows parishes for staff role', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.all.map((i) => i.iconKey)).toContain('parishes');
    expect(nav.sheetItems.map((i) => i.iconKey)).toContain('parishes');
  });

  it('isAdmin includes /admin in settings group', () => {
    const nav = getVisibleNavigation({
      role: '',
      isAdmin: true,
      workspaceType: 'PARISH',
    });
    expect(nav.bottom.map((i) => i.to)).toContain('/admin');
    expect(nav.sheetItems.map((i) => i.to)).toContain('/admin');
  });

  it('catechumen bottomBar drops classes without padding; keeps messages', () => {
    const nav = getVisibleNavigation({
      role: 'CATECHUMEN',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.bottomBar.map((i) => i.iconKey)).toEqual([
      'dashboard',
      'calendar',
      'messages',
    ]);
  });

  it('hides AI hub from every nav surface while launch AI is off', () => {
    const roles = [
      'LEAD_CATECHIST',
      'ASSISTANT_CATECHIST',
      'PARISH_COORDINATOR',
      'PERSONAL_OWNER',
      'CONTENT_REVIEWER',
    ];
    for (const role of roles) {
      const nav = getVisibleNavigation({
        role,
        isAdmin: role === 'SUPER_ADMIN',
        workspaceType: 'PARISH',
      });
      const paths = nav.all.map((i) => i.to);
      const keys = nav.all.map((i) => i.iconKey);
      if (!AI_FEATURES_ENABLED) {
        expect(paths).not.toContain('/app/ai-hub');
        expect(keys).not.toContain('ai_hub');
        expect(nav.sheetItems.map((i) => i.to)).not.toContain('/app/ai-hub');
        expect(nav.bottomBar.map((i) => i.to)).not.toContain('/app/ai-hub');
      } else {
        expect(paths).toContain('/app/ai-hub');
      }
    }
  });

  it('filterLaunchHidden drops AI destinations when the flag is off', () => {
    const filtered = filterLaunchHidden(ALL_NAV_ITEMS);
    if (!AI_FEATURES_ENABLED) {
      expect(filtered.map((i) => i.iconKey)).not.toContain('ai_hub');
      expect(filtered.some((i) => isAiAppPath(i.to))).toBe(false);
    }
  });

  it('admin also loses the AI hub item while launch AI is off', () => {
    const nav = getVisibleNavigation({
      role: '',
      isAdmin: true,
      workspaceType: 'PARISH',
    });
    if (!AI_FEATURES_ENABLED) {
      expect(nav.all.map((i) => i.to)).not.toContain('/app/ai-hub');
    }
  });

  it('guardian bottomBar includes catechumens for family portal', () => {
    const nav = getVisibleNavigation({
      role: 'GUARDIAN',
      isAdmin: false,
      workspaceType: 'PARISH',
    });
    expect(nav.bottomBar.map((i) => i.iconKey)).toEqual([
      'dashboard',
      'calendar',
      'messages',
      'catechumens',
    ]);
  });
});
