/**
 * AI credit constants shared between client and server.
 *
 * Credit rules:
 *   Free:           3 credits total (one-time, not renewable)
 *   Catechist AI:   15 credits/month (renewable)
 *   Parish/Diocese: 30 credits/month per managed user (renewable)
 */
export const AI_CREDITS = {
  /** Plans that have AI access */
  AI_PLANS: ['CATECHIST_AI', 'catechist_ai', 'PARISH', 'parish', 'DIOCESE', 'diocese'] as string[],

  /** Monthly credit allowance per plan */
  MONTHLY_ALLOWANCE: {
    catechist_ai: 15,
    CATECHIST_AI: 15,
    parish: 30,
    PARISH: 30,
    diocese: 30,
    DIOCESE: 30,
  } as Record<string, number>,

  /** One-time free credits (not renewable) */
  FREE_TRIAL_CREDITS: 3,

  /** Cost per operation (in credits) */
  COST: {
    generateMeeting: 1,
    generateAnnualPlanning: 3,
    generateActivity: 1,
    chatMessage: 0, // chat is free for AI/PARISH users
  },
} as const;

export function planHasAiAccess(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return AI_CREDITS.AI_PLANS.includes(plan);
}

export function getMonthlyAllowance(plan: string | null | undefined): number {
  if (!plan) return 0;
  return AI_CREDITS.MONTHLY_ALLOWANCE[plan] ?? 0;
}
