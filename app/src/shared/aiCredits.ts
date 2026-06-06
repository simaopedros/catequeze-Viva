/**
 * AI credit constants shared between client and server.
 *
 * Credit rules:
 *   Free:           3 credits total (one-time, not renewable), max 3/day
 *   Catechist Pro:  2 credits/month (renewable), max 2/day
 *   Catechist AI:   15 credits/month (renewable), max 10/day
 *   Parish:         50 credits/month (renewable), max 20/day
 *   Diocese:        50 credits/month per user (renewable), max 20/day
 */
export const AI_CREDITS = {
  /** Plans that have AI access */
  AI_PLANS: ['CATECHIST_PRO', 'catechist_pro', 'CATECHIST_AI', 'catechist_ai', 'PARISH', 'parish', 'DIOCESE', 'diocese'] as string[],

  /** Monthly credit allowance per plan */
  MONTHLY_ALLOWANCE: {
    catechist_pro: 2,
    CATECHIST_PRO: 2,
    catechist_ai: 15,
    CATECHIST_AI: 15,
    parish: 50,
    PARISH: 50,
    diocese: 50,
    DIOCESE: 50,
  } as Record<string, number>,

  /** Daily usage caps per plan (abuse prevention) */
  DAILY_LIMIT: {
    catechist_free: 3,
    CATECHIST_FREE: 3,
    catechist_pro: 2,
    CATECHIST_PRO: 2,
    catechist_ai: 10,
    CATECHIST_AI: 10,
    parish: 20,
    PARISH: 20,
    diocese: 20,
    DIOCESE: 20,
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

export function getDailyLimit(plan: string | null | undefined): number {
  if (!plan) return 0;
  return AI_CREDITS.DAILY_LIMIT[plan] ?? 0;
}
