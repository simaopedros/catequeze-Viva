export const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border dark:border-blue-900/50',
  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border dark:border-green-900/50',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border dark:border-amber-900/50',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 dark:border dark:border-purple-900/50',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 dark:border dark:border-pink-900/50'
];

export function getAvatarColorClass(name: string | undefined | null): string {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(charCode) % AVATAR_COLORS.length];
}
