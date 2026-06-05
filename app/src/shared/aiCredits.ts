/**
 * AI credit constants shared between client and server.
 *
 * Credit rules:
 *   Free:           3 credits total (one-time, not renewable), max 3/day
 *   Catechist AI:   15 credits/month (renewable), max 10/day
 *   Parish/Diocese: 30 credits/month per managed user (renewable), max 20/day
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

  /** Daily usage caps per plan (abuse prevention) */
  DAILY_LIMIT: {
    catechist_free: 3,
    CATECHIST_FREE: 3,
    catechist_ai: 10,
    CATECHIST_AI: 10,
    catechist_pro: 0, // no AI access
    CATECHIST_PRO: 0,
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
