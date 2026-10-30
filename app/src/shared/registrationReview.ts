import { z } from 'zod';

const transitions = {
  START_REVIEW: { SUBMITTED: 'UNDER_REVIEW' },
  REQUEST_CORRECTION: { UNDER_REVIEW: 'NEEDS_CORRECTION' },
  REJECT: { SUBMITTED: 'REJECTED', UNDER_REVIEW: 'REJECTED', NEEDS_CORRECTION: 'REJECTED' },
  REOPEN: { NEEDS_CORRECTION: 'UNDER_REVIEW' },
} as const;
export const reviewSchema = z.object({ id: z.string().min(1), revision: z.number().int().nonnegative(), decision: z.enum(['START_REVIEW', 'REQUEST_CORRECTION', 'REJECT', 'REOPEN']), note: z.string().trim().max(500).optional() }).strict();
export const listReviewSchema = z.object({ campaignId: z.string().min(1), status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_CORRECTION', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN', 'REJECTED']).optional(), needsReview: z.boolean().optional(), cursor: z.string().min(1).optional(), take: z.number().int().min(1).max(50).optional() }).strict();
export function reviewTransition(status: string, decision: keyof typeof transitions): string | null {
  return (transitions[decision] as Record<string, string> | undefined)?.[status] ?? null;
}
export function normalizeRegistrationName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
export function duplicateReason(a: { name: string; birthDate: Date | null; email?: string | null; phone?: string | null }, b: typeof a): { reason: string; score: number } | null {
  const left = normalizeRegistrationName(a.name), right = normalizeRegistrationName(b.name);
  const sameDate = !!a.birthDate && !!b.birthDate && a.birthDate.toISOString().slice(0, 10) === b.birthDate.toISOString().slice(0, 10);
  if (sameDate && left === right) return { reason: 'SAME_NAME_BIRTHDATE', score: 3 };
  const words = left.split(' ').filter(w => w.length > 1);
  if (sameDate && words.some(w => right.split(' ').includes(w))) return { reason: 'SAME_BIRTHDATE_SIMILAR_NAME', score: 2 };
  const phone = (v?: string | null) => v?.replace(/\D/g, '') || '';
  if ((a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) || (phone(a.phone) && phone(a.phone) === phone(b.phone))) return { reason: 'SAME_CONTACT', score: 1 };
  return null;
}
