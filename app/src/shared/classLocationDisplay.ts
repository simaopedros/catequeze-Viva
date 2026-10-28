/**
 * Display label for a class "Local" field.
 *
 * Onboarding used to persist the personal workspace name when location was
 * empty (e.g. "Catequese de Catequista"). That is not a place — treat it as
 * missing without mutating stored data.
 */
export function resolveClassLocationLabel(
  location: string | null | undefined,
  workspaceName: string | null | undefined,
  notInformedLabel: string,
): string {
  const loc = (location ?? "").trim();
  if (!loc) return notInformedLabel;
  const ws = (workspaceName ?? "").trim();
  if (
    ws &&
    loc.localeCompare(ws, undefined, { sensitivity: "accent" }) === 0
  ) {
    return notInformedLabel;
  }
  return loc;
}
