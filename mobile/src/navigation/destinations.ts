import type { Ionicons } from '@expo/vector-icons';

export const WEB_ONLY_ICON_KEYS = new Set(['billing', 'admin', 'ai_hub']);

export const WEB_PATH_BY_ICON: Record<string, string> = {
  billing: '/app/billing',
  admin: '/admin',
  ai_hub: '/app/ai-hub',
  content_library: '/app/content-library',
};

export const NATIVE_ROUTE_BY_ICON: Record<string, string> = {
  dashboard: '/(app)/(tabs)',
  community: '/(app)/(tabs)/community',
  classes: '/(app)/(tabs)/classes',
  calendar: '/(app)/(tabs)/calendar',
  messages: '/(app)/(tabs)/messages',
  groups: '/(app)/groups',
  announcements: '/(app)/announcements',
  catechumens: '/(app)/people/catechumens',
  families: '/(app)/people/families',
  team: '/(app)/people/team',
  family_portal_invites: '/(app)/people/invites',
  content_library: '/(app)/content/library',
  official_library: '/(app)/content/official',
  bible: '/(app)/bible',
  catechism: '/(app)/content/catechism',
  directory: '/(app)/content/directory',
  sacraments: '/(app)/content/journeys',
  journey_templates: '/(app)/content/journey-templates',
  documents: '/(app)/documents',
  parishes: '/(app)/manage/parishes',
  communities: '/(app)/manage/communities',
  reports: '/(app)/manage/reports',
  catechetical_years: '/(app)/manage/years',
  formation: '/(app)/manage/formation',
  settings: '/(app)/settings',
  consents: '/(app)/settings/consents',
  birthdays: '/(app)/birthdays',
};

export const NAV_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  dashboard: 'home-outline',
  community: 'sparkles-outline',
  classes: 'school-outline',
  calendar: 'calendar-outline',
  messages: 'chatbubble-outline',
  announcements: 'megaphone-outline',
  groups: 'people-circle-outline',
  catechumens: 'person-outline',
  families: 'heart-outline',
  team: 'people-outline',
  family_portal_invites: 'mail-outline',
  content_library: 'library-outline',
  official_library: 'folder-outline',
  ai_hub: 'sparkles-outline',
  bible: 'book-outline',
  catechism: 'reader-outline',
  directory: 'albums-outline',
  sacraments: 'flower-outline',
  journey_templates: 'list-outline',
  documents: 'document-text-outline',
  parishes: 'business-outline',
  communities: 'home-outline',
  reports: 'stats-chart-outline',
  catechetical_years: 'calendar-number-outline',
  formation: 'ribbon-outline',
  settings: 'settings-outline',
  billing: 'card-outline',
  consents: 'checkbox-outline',
  admin: 'shield-outline',
};

export function isWebDestination(iconKey: string) {
  return WEB_ONLY_ICON_KEYS.has(iconKey);
}
