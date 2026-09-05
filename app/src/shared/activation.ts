/**
 * Activation / first-value helpers (pure).
 * Nav-filter style: client UX only; server still enforces access.
 */

export type ActivationStatsInput = {
  activeClasses?: number;
  activeCatechumens?: number;
  hasAnyAttendance?: boolean;
  hasAnyMeeting?: boolean;
  /** @deprecated Prefer hasAnyAttendance — avg can be 0 with only absences */
  avgAttendance?: number;
  upcomingMeetings?: unknown[];
  myClasses?: { id: string; name?: string }[];
};

export type ActivationStepId = "class" | "people" | "attendance" | "meeting";

export type ActivationStepDef = {
  id: ActivationStepId;
  done: boolean;
};

/**
 * Canonical first value (ICP catequista / staff de turma):
 * hasClass && hasPeople && (hasAnyAttendance || hasAnyMeeting)
 */
export function computeActivationFlags(stats: ActivationStatsInput | null | undefined) {
  const firstClassId = stats?.myClasses?.[0]?.id;
  const hasClasses = (stats?.activeClasses || 0) > 0 || Boolean(firstClassId);
  const hasPeople = (stats?.activeCatechumens || 0) > 0;
  const hasAnyAttendance = Boolean(stats?.hasAnyAttendance);
  const hasAnyMeeting = Boolean(stats?.hasAnyMeeting);
  const firstValueReached =
    hasClasses && hasPeople && (hasAnyAttendance || hasAnyMeeting);

  const steps: ActivationStepDef[] = [
    { id: "class", done: hasClasses },
    { id: "people", done: hasPeople },
    // Action branches — first value needs only one of these
    { id: "attendance", done: hasAnyAttendance },
    { id: "meeting", done: hasAnyMeeting },
  ];

  // Next incomplete foundation step, else first incomplete action branch
  let nextStep: ActivationStepDef | undefined;
  if (!hasClasses) nextStep = steps[0];
  else if (!hasPeople) nextStep = steps[1];
  else if (!hasAnyAttendance && !hasAnyMeeting) {
    // Prefer attendance as the default real-world action
    nextStep = steps[2];
  } else {
    nextStep = undefined; // first value reached
  }

  /** Optional bonus after first value (other branch not done) */
  const bonusStep: ActivationStepDef | undefined = firstValueReached
    ? steps.find((s) => (s.id === "attendance" || s.id === "meeting") && !s.done)
    : undefined;

  return {
    firstClassId: firstClassId as string | undefined,
    hasClasses,
    hasPeople,
    hasAnyAttendance,
    hasAnyMeeting,
    firstValueReached,
    steps,
    nextStep,
    bonusStep,
  };
}

/**
 * Product-trial upgrade chrome modes (PR9). Pure for unit tests.
 * Call only when user is on product trial.
 */
export type TrialBannerMode = "hidden" | "soft" | "urgency";

export function getTrialBannerMode(args: {
  daysLeft: number | null;
  hasReachedFirstValue: boolean;
  softDismissed: boolean;
}): TrialBannerMode {
  const { daysLeft, hasReachedFirstValue, softDismissed } = args;
  const isActivating = !hasReachedFirstValue;

  if (daysLeft != null && daysLeft <= 2) return "urgency";
  if (isActivating) return "hidden";
  if (hasReachedFirstValue && !softDismissed) return "soft";
  return "hidden";
}

/** Next path after personal onboarding — always land on roll call when a class exists. */
export function getPersonalOnboardingNextPath(args: {
  classId: string | null | undefined;
  catechumensCount: number;
}): { to: string; action: "add_people" | "register_attendance" | "open_class" } {
  const { classId, catechumensCount } = args;
  if (!classId) {
    return { to: "/app/classes", action: "open_class" };
  }
  // Activation goal: first attendance in <2 min — people can be added from the sheet later.
  return {
    to: `/app/classes/${classId}/attendance`,
    action: catechumensCount > 0 ? "register_attendance" : "add_people",
  };
}
