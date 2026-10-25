export type EncouragementTier =
  | "none"
  | "perfect"
  | "excellent"
  | "good"
  | "missYou"
  | "newStart";

export type EncouragementInput = {
  frequency: number;
  totalValidMeetings: number;
  consecutiveAbsences?: number | null;
};

/** Consecutive missed meetings from which a good rate still asks for a gentle nudge. */
export const ENCOURAGEMENT_CONSECUTIVE_THRESHOLD = 3;

export function getAttendanceEncouragement({
  frequency,
  totalValidMeetings,
  consecutiveAbsences,
}: EncouragementInput): EncouragementTier {
  if (!totalValidMeetings || totalValidMeetings <= 0) return "none";
  const streak = consecutiveAbsences ?? 0;
  if (frequency >= 100) return "perfect";
  if (frequency >= 90) return "excellent";
  if (frequency >= 75 && streak < ENCOURAGEMENT_CONSECUTIVE_THRESHOLD) {
    return "good";
  }
  if (frequency >= 50) return "missYou";
  return "newStart";
}

export function firstNameOf(fullName: string | null | undefined): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}
