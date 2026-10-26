/**
 * Badge shown on the attendance sheet: once anyone is registered, never keep
 * showing "Não iniciado" next to a non-zero progress percentage.
 */
export function displayMeetingRollCallStatus(args: {
  meetingStatus: string;
  registeredCount: number;
}): string {
  const { meetingStatus, registeredCount } = args;
  if (meetingStatus === "CANCELLED" || meetingStatus === "COMPLETED") {
    return meetingStatus;
  }
  if (registeredCount > 0 && meetingStatus === "NOT_STARTED") {
    return "IN_PROGRESS";
  }
  return meetingStatus;
}
