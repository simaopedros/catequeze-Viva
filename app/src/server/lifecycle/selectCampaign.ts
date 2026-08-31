import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";

export const LIFECYCLE_CAMPAIGNS = [
  "activate_create_class",
  "activate_add_people",
  "activate_first_action",
  "convert_after_value",
  "trial_d3",
  "trial_d1",
  "winback_d1",
  "winback_d3",
  "winback_d7",
] as const;

export type LifecycleCampaign = (typeof LIFECYCLE_CAMPAIGNS)[number];

export type LifecyclePhase = "trialing" | "expired";

export type SelectCampaignInput = {
  isEligibleAudience: boolean;
  optedOut: boolean;
  isPaid: boolean;
  alreadySentToday: boolean;
  alreadySent: readonly string[];
  daysSinceSignup: number;
  daysLeft: number | null;
  expiredDays: number | null;
  phase: LifecyclePhase;
  hasClasses: boolean;
  hasPeople: boolean;
  firstValueReached: boolean;
};

const FAMILY_ROLES = new Set(["GUARDIAN", "CATECHUMEN"]);

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function trialEndsAt(
  createdAt: Date,
  trialDays = SUBSCRIPTION_TRIAL_DAYS,
): Date {
  return new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

export function computeTrialClock(
  createdAt: Date,
  now: Date,
  trialDays = SUBSCRIPTION_TRIAL_DAYS,
): {
  daysSinceSignup: number;
  daysLeft: number | null;
  expiredDays: number | null;
  phase: LifecyclePhase;
  endsAt: Date;
} {
  const endsAt = trialEndsAt(createdAt, trialDays);
  const daysSinceSignup = calendarDaysBetween(createdAt, now);
  if (now >= endsAt) {
    return {
      daysSinceSignup,
      daysLeft: null,
      expiredDays: calendarDaysBetween(endsAt, now),
      phase: "expired",
      endsAt,
    };
  }
  return {
    daysSinceSignup,
    daysLeft: calendarDaysBetween(now, endsAt),
    expiredDays: null,
    phase: "trialing",
    endsAt,
  };
}

export function isPaidLifecycleUser(user: {
  paymentProcessorUserId?: string | null;
  subscriptionStatus?: string | null;
}): boolean {
  if (user.paymentProcessorUserId) return true;
  const status = (user.subscriptionStatus || "").toLowerCase();
  return (
    status === "active" ||
    status === "past_due" ||
    status === "cancel_at_period_end"
  );
}

/**
 * Personal catechist on a product trial (or expired trial), not family / invited staff.
 */
export function isLifecycleAudience(input: {
  email: string | null | undefined;
  isAdmin?: boolean;
  optedOut: boolean;
  isPaid: boolean;
  membershipRoles: readonly string[];
  ownsPersonalParish: boolean;
}): boolean {
  if (!input.email) return false;
  if (input.optedOut) return false;
  if (input.isPaid) return false;
  if (input.isAdmin) return false;
  if (input.ownsPersonalParish) return true;
  if (input.membershipRoles.includes("PERSONAL_OWNER")) return true;
  if (input.membershipRoles.length === 0) return true;
  if (input.membershipRoles.every((role) => FAMILY_ROLES.has(role)))
    return false;
  return false;
}

export function selectLifecycleCampaign(
  input: SelectCampaignInput,
): LifecycleCampaign | null {
  if (!input.isEligibleAudience) return null;
  if (input.optedOut) return null;
  if (input.isPaid) return null;
  if (input.alreadySentToday) return null;

  const sent = new Set(input.alreadySent);
  const notSent = (campaign: LifecycleCampaign) => !sent.has(campaign);

  if (input.phase === "expired") {
    if (input.expiredDays === 1 && notSent("winback_d1")) return "winback_d1";
    if (input.expiredDays === 3 && notSent("winback_d3")) return "winback_d3";
    if (input.expiredDays === 7 && notSent("winback_d7")) return "winback_d7";
    return null;
  }

  if (input.daysLeft === 1 && notSent("trial_d1")) return "trial_d1";
  if (input.daysLeft === 3 && notSent("trial_d3")) return "trial_d3";

  if (input.daysSinceSignup < 1) return null;

  if (!input.hasClasses && notSent("activate_create_class")) {
    return "activate_create_class";
  }
  if (input.hasClasses && !input.hasPeople && notSent("activate_add_people")) {
    return "activate_add_people";
  }
  if (
    input.hasClasses &&
    input.hasPeople &&
    !input.firstValueReached &&
    notSent("activate_first_action")
  ) {
    return "activate_first_action";
  }
  if (input.firstValueReached && notSent("convert_after_value")) {
    return "convert_after_value";
  }

  return null;
}

export function resolveCampaignCtaPath(
  campaign: LifecycleCampaign,
  flags: {
    hasClasses: boolean;
    hasPeople: boolean;
    firstValueReached: boolean;
    firstClassId?: string | null;
  },
): string {
  const classPath = flags.firstClassId
    ? `/app/classes/${flags.firstClassId}`
    : "/app/classes";
  const peoplePath = flags.firstClassId
    ? `/app/classes/${flags.firstClassId}`
    : "/app/catechumens/new";
  const attendancePath = flags.firstClassId
    ? `/app/classes/${flags.firstClassId}/attendance`
    : "/app/classes";

  switch (campaign) {
    case "activate_create_class":
      return "/app/classes/new";
    case "activate_add_people":
      return peoplePath;
    case "activate_first_action":
      return attendancePath;
    case "convert_after_value":
    case "winback_d1":
    case "winback_d3":
    case "winback_d7":
      return "/app/billing";
    case "trial_d3":
    case "trial_d1":
      if (flags.firstValueReached) return "/app/billing";
      if (!flags.hasClasses) return "/app/classes/new";
      if (!flags.hasPeople) return peoplePath;
      return attendancePath;
    default:
      return classPath;
  }
}
