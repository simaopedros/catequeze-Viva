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
} as const;

export function resolveAuthHref(status: 'booting' | 'guest' | 'needs2fa' | 'ready') {
  if (status === 'guest') return publicRoutes.login;
  if (status === 'needs2fa') return publicRoutes.twoFactor;
  if (status === 'ready') return appRoutes.home;
  return null;
}
