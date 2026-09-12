export const publicRoutes = {
  login: '/login',
  twoFactor: '/two-factor',
  forgotPassword: '/forgot-password',
} as const;

export const appRoutes = {
  home: '/(app)/(tabs)',
  community: '/(app)/(tabs)/community',
  classes: '/(app)/(tabs)/classes',
  messages: '/(app)/(tabs)/messages',
  more: '/(app)/(tabs)/more',
  compose: '/(app)/community/compose',
  search: '/(app)/community/search',
  members: '/(app)/community/members',
  topics: '/(app)/community/topics',
  shorts: '/(app)/community/shorts',
  followingFeed: '/(app)/community/following',
  editProfile: '/(app)/community/edit',
  blocked: '/(app)/community/blocked',
  connections: (handle: string, kind: 'followers' | 'following') =>
    `/(app)/community/connections?handle=${encodeURIComponent(handle)}&kind=${kind}`,
  post: (slug: string) => `/(app)/community/p/${encodeURIComponent(slug)}`,
  topic: (slug: string) => `/(app)/community/t/${encodeURIComponent(slug)}`,
  profile: (handle: string) => `/(app)/community/${encodeURIComponent(handle)}`,
  classDetails: (id: string) => `/(app)/class/${id}`,
  meeting: (id: string) => `/(app)/meeting/${id}`,
  attendance: (id: string) => `/(app)/meeting/${id}/attendance`,
  thread: (id: string) => `/(app)/messages/${id}`,
  bible: '/(app)/bible',
  bibleBook: (bookId: string) => `/(app)/bible/${bookId}`,
  bibleChapter: (bookId: string, chapter: number) => `/(app)/bible/${bookId}/${chapter}`,
  documents: '/(app)/documents',
  myProfile: '/(app)/profile',
  notifications: '/(app)/notifications',
  catechumens: '/(app)/catechumens',
  catechumen: (id: string) => `/(app)/catechumens/${id}`,
  families: '/(app)/families',
  family: (id: string) => `/(app)/families/${id}`,
  team: '/(app)/team',
  parishCommunities: '/(app)/communities',
  content: '/(app)/content',
  contentItem: (id: string) => `/(app)/content/${id}`,
  calendar: '/(app)/calendar',
  announcements: '/(app)/announcements',
  formation: '/(app)/formation',
  formationTrack: (id: string) => `/(app)/formation/${id}`,
  sacraments: '/(app)/sacraments',
  sacrament: (id: string) => `/(app)/sacraments/${id}`,
  catechism: '/(app)/catechism',
  directory: '/(app)/directory',
  reports: '/(app)/reports',
  birthdays: '/(app)/birthdays',
  officialLibrary: '/(app)/official-library',
  groups: '/(app)/groups',
  group: (id: string) => `/(app)/groups/${id}`,
  billing: '/(app)/billing',
  settings: '/(app)/settings',
  catecheticalYears: '/(app)/years',
  aiHub: '/(app)/ai',
} as const;

export function resolveAuthHref(status: 'booting' | 'guest' | 'needs2fa' | 'ready') {
  if (status === 'guest') return publicRoutes.login;
  if (status === 'needs2fa') return publicRoutes.twoFactor;
  if (status === 'ready') return appRoutes.home;
  return null;
}
