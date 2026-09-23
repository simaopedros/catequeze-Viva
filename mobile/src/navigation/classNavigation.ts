import type { Href } from 'expo-router';

export function classMeetingsHref(classId: string): Href {
  return {
    pathname: '/(app)/class-meetings',
    params: { classId },
  };
}

type RouterPush = { push: (href: Href) => void };

export function navigateToClassMeetings(router: RouterPush, classId: string) {
  const id = classId.trim();
  if (!id) return;
  router.push(classMeetingsHref(id));
}
