/** Decide the initial state of a placement without delivering communications. */
export function publicationState(seatPolicy: 'RESERVE' | 'OFFER', now: Date, responseDeadlineDays: number) {
  if ((seatPolicy !== 'RESERVE' && seatPolicy !== 'OFFER') || !Number.isFinite(now.getTime()) || !Number.isInteger(responseDeadlineDays) || responseDeadlineDays < 1 || responseDeadlineDays > 365) throw new Error('Invalid publication policy');
  return {
    offerStatus: 'AWAITING_RESPONSE' as const,
    enroll: seatPolicy === 'RESERVE',
    deadline: new Date(now.getTime() + responseDeadlineDays * 86_400_000),
  };
}
