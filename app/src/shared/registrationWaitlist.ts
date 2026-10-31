/** Stable ordering for reviewed promotions: earlier submissions have priority. */
export function orderRegistrationWaitlist<T extends { applicationId: string; submittedAt: Date | string }>(entries: T[]): T[] {
  if (entries.some(entry => !Number.isFinite(new Date(entry.submittedAt).getTime()))) throw new Error('Invalid submission date');
  return [...entries].sort((a, b) => {
    const difference = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    if (!Number.isFinite(difference)) throw new Error('Invalid submission date');
    return difference || a.applicationId.localeCompare(b.applicationId);
  });
}

export function expiredOfferAction(deadline: Date, now: Date, policy: 'NOTIFY_COORDINATOR' | 'RELEASE_SEAT' | 'KEEP') {
  if (!Number.isFinite(deadline.getTime()) || !Number.isFinite(now.getTime())) throw new Error('Invalid offer date');
  if (deadline.getTime() > now.getTime()) return 'NONE' as const;
  return policy;
}
