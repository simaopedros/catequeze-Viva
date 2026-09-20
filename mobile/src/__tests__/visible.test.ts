import { getBottomNavKeysForRole, getVisibleNavigation, WEB_NAV_ICON_KEYS } from '../navigation/visible';
import { NATIVE_ROUTE_BY_ICON, WEB_ONLY_ICON_KEYS } from '../navigation/destinations';

describe('visible navigation contract', () => {
  it('keeps the same icon keys as the web NAV_GROUPS set', () => {
    expect(WEB_NAV_ICON_KEYS).toEqual([
      'dashboard',
      'classes',
      'calendar',
      'messages',
      'announcements',
      'groups',
      'community',
      'catechumens',
      'families',
      'team',
      'family_portal_invites',
      'content_library',
      'official_library',
      'bible',
      'catechism',
      'directory',
      'sacraments',
      'journey_templates',
      'documents',
      'parishes',
      'communities',
      'reports',
      'catechetical_years',
      'formation',
      'settings',
      'billing',
      'consents',
      'admin',
    ]);
  });

  it('uses 4 tabs + Mais for catechists and guardians', () => {
    expect(getBottomNavKeysForRole('LEAD_CATECHIST', false)).toEqual([
      'dashboard',
      'community',
      'classes',
      'calendar',
    ]);
    expect(getBottomNavKeysForRole('GUARDIAN', false)).toEqual([
      'dashboard',
      'community',
      'calendar',
      'messages',
    ]);
    expect(getBottomNavKeysForRole('PLATFORM_MEMBER', false)).toEqual([
      'dashboard',
      'groups',
      'bible',
      'calendar',
    ]);
  });

  it('hides personal-workspace destinations and AI hub', () => {
    const nav = getVisibleNavigation({
      role: 'PARISH_COORDINATOR',
      isAdmin: false,
      workspaceType: 'PERSONAL',
    });
    expect(nav.all.map((item) => item.iconKey)).not.toContain('parishes');
    expect(nav.all.map((item) => item.iconKey)).not.toContain('ai_hub');
    expect(nav.bottomBar).toHaveLength(4);
  });

  it('maps every native destination and isolates web-only keys', () => {
    for (const key of WEB_NAV_ICON_KEYS) {
      if (WEB_ONLY_ICON_KEYS.has(key)) continue;
      expect(NATIVE_ROUTE_BY_ICON[key]).toBeTruthy();
    }
    expect([...WEB_ONLY_ICON_KEYS]).toEqual(expect.arrayContaining(['billing', 'admin', 'ai_hub']));
  });
});
