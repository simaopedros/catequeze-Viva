import { hasInstitutionalAccess } from "./pricing";

export type MemberPauseKind = "parish" | "diocese";

type PauseBilling = {
  plan?: string | null;
  status?: string | null;
  trialEndsAt?: string | Date | null;
};

/**
 * A collaborator lost the host parish/diocese license.
 * Owners and billing managers are excluded: they still see billing details.
 * A workspace with no billing row is left alone (it never had this license).
 */
export function isMemberInstitutionPaused(opts: {
  isPersonal: boolean;
  isBillingManager: boolean;
  billing?: PauseBilling | null;
}): boolean {
  if (opts.isPersonal || opts.isBillingManager) return false;
  const status = (opts.billing?.status || "").trim();
  if (!status) return false;
  return !hasInstitutionalAccess({
    plan: opts.billing?.plan || "catechist_free",
    status,
    trialEndsAt: opts.billing?.trialEndsAt,
  });
}

export function memberPauseKind(workspaceType?: string | null): MemberPauseKind {
  return workspaceType === "DIOCESE" ? "diocese" : "parish";
}
