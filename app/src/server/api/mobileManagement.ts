import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';

import {
  acceptInvitation,
  cancelInvitation,
  getParishTeam,
  inviteUserToParish,
  listFamilyPortalInvitations,
  removeMembership,
  resendInvitation,
  setCoordinatorClasses,
  updateMembershipRole,
} from '../operations/memberOperations';
import { getReportsOverview } from '../operations/reportOperations';
import { getClassPastoralReport } from '../operations/pastoralReportOperations';
import { changePassword, requestDataExport, updateUserProfile } from '../operations/userOperations';
import { getMyEmailPreferences, updateMyEmailPreferences } from '../operations/emailPreferenceOperations';
import { disableTwoFactor, getTwoFactorStatus, startTwoFactorSetup, verifyTwoFactorSetup } from '../operations/twoFactorOperations';
import { listPastoralGroups, joinPastoralGroup, leavePastoralGroup } from '../operations/pastoralGroupOperations';
import { enrollInFormationTrack, listFormationTracks, unenrollFromFormationTrack } from '../operations/formationOperations';
import { getSacramentalJourney, listSacramentalJourneys } from '../operations/sacramentOperations';
import { getMySupportMessages, submitContactMessage } from '../operations/supportOperations';
import { parseOptionalString, parseRequiredString, requireMobileSessionVerification, toOperationContext } from './mobile';

type Handler = (req: Request, res: Response, context: any) => Promise<Response>;

function mobileOp<TArgs>(op: (args: TArgs, context: any) => Promise<unknown>, build: (req: Request) => TArgs, options: { skipVerification?: boolean } = {}): Handler {
  return async (req, res, context) => {
    const opCtx = toOperationContext(context);
    if (!options.skipVerification) await requireMobileSessionVerification(opCtx);
    const result = await op(build(req), opCtx);
    return res.json(result ?? { success: true });
  };
}

function body(req: Request): Record<string, any> {
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function omitUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipa e convites
// ─────────────────────────────────────────────────────────────────────────────

export const mobileTeam = mobileOp(getParishTeam, (req) => ({
  parishId: parseRequiredString(req.query.workspaceId ?? req.query.parishId, 'workspaceId'),
  communityId: parseOptionalString(req.query.communityId),
}));

export const mobileTeamInvite = mobileOp(inviteUserToParish, (req) => {
  const b = body(req);
  const role = parseRequiredString(b.role, 'role');
  const assignment = parseOptionalString(b.classAssignmentRole);
  const classAssignmentRole: 'LEAD' | 'ASSISTANT' | undefined = assignment === 'LEAD' || assignment === 'ASSISTANT' ? assignment : undefined;
  return omitUndefined({
    email: parseRequiredString(b.email, 'email').trim().toLowerCase(),
    parishId: parseRequiredString(b.workspaceId ?? b.parishId, 'workspaceId'),
    role,
    communityId: parseOptionalString(b.communityId),
    householdId: parseOptionalString(b.householdId),
    classId: parseOptionalString(b.classId),
    classAssignmentRole,
  });
});

export const mobileTeamResendInvite = mobileOp(resendInvitation, (req) => {
  const b = body(req);
  const pendingInvitationId = parseOptionalString(b.pendingInvitationId);
  const membershipId = parseOptionalString(b.membershipId);
  if (!pendingInvitationId && !membershipId) throw new HttpError(400, 'Missing pendingInvitationId or membershipId.');
  return omitUndefined({ pendingInvitationId, membershipId });
});

export const mobileTeamCancelInvite = mobileOp(cancelInvitation, (req) => {
  const b = body(req);
  const pendingInvitationId = parseOptionalString(b.pendingInvitationId);
  const membershipId = parseOptionalString(b.membershipId);
  if (!pendingInvitationId && !membershipId) throw new HttpError(400, 'Missing pendingInvitationId or membershipId.');
  return omitUndefined({ pendingInvitationId, membershipId });
});

export const mobileTeamRemoveMember = mobileOp(removeMembership, (req) => ({
  membershipId: parseRequiredString(req.params.membershipId, 'membershipId'),
}));

export const mobileTeamUpdateRole = mobileOp(updateMembershipRole, (req) => {
  const b = body(req);
  return omitUndefined({
    membershipId: parseRequiredString(req.params.membershipId, 'membershipId'),
    role: parseRequiredString(b.role, 'role'),
    communityId: b.communityId === null ? null : parseOptionalString(b.communityId),
  });
});

export const mobileTeamSetCoordinatorClasses = mobileOp(setCoordinatorClasses, (req) => ({
  membershipId: parseRequiredString(req.params.membershipId, 'membershipId'),
  classIds: stringArray(body(req).classIds),
}));

export const mobileFamilyInvites = mobileOp(listFamilyPortalInvitations, (req) => ({
  parishId: parseRequiredString(req.query.workspaceId ?? req.query.parishId, 'workspaceId'),
}));

export const mobileAcceptInvitation = mobileOp(
  acceptInvitation,
  (req) => ({ membershipId: parseRequiredString(body(req).membershipId, 'membershipId') }),
  { skipVerification: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Relatórios
// ─────────────────────────────────────────────────────────────────────────────

export const mobileReportsOverview = mobileOp(getReportsOverview, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
}));

export const mobileClassReport = mobileOp(getClassPastoralReport, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Conta, preferências e 2FA
// ─────────────────────────────────────────────────────────────────────────────

export const mobileUpdateProfile = mobileOp(updateUserProfile, (req) => {
  const b = body(req);
  return omitUndefined({
    firstName: parseOptionalString(b.firstName),
    lastName: parseOptionalString(b.lastName),
    phone: parseOptionalString(b.phone),
  });
});

export const mobileChangePassword = mobileOp(changePassword, (req) => ({
  currentPassword: parseRequiredString(body(req).currentPassword, 'currentPassword'),
  newPassword: parseRequiredString(body(req).newPassword, 'newPassword'),
}));

export const mobileEmailPreferences = mobileOp(getMyEmailPreferences, () => undefined as void);

export const mobileUpdateEmailPreference = mobileOp(updateMyEmailPreferences, (req) => {
  const b = body(req);
  if (typeof b.optedIn !== 'boolean') throw new HttpError(400, 'Missing or invalid optedIn.');
  return { topic: parseRequiredString(b.topic, 'topic'), optedIn: b.optedIn };
});

export const mobileRequestDataExport = mobileOp(requestDataExport, () => undefined);

export const mobileTwoFactorStatusDetails = mobileOp(getTwoFactorStatus, () => undefined as void, { skipVerification: true });

export const mobileTwoFactorStart = mobileOp(startTwoFactorSetup, () => undefined as void);

export const mobileTwoFactorVerifySetup = mobileOp(verifyTwoFactorSetup, (req) => ({
  token: parseRequiredString(body(req).token, 'token'),
}));

export const mobileTwoFactorDisable = mobileOp(disableTwoFactor, (req) => ({
  token: parseRequiredString(body(req).token, 'token'),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Módulos secundários (leitura)
// ─────────────────────────────────────────────────────────────────────────────

export const mobilePastoralGroups = mobileOp(listPastoralGroups, (req) => ({
  kind: parseOptionalString(req.query.kind) ?? null,
  q: parseOptionalString(req.query.q) ?? null,
  city: parseOptionalString(req.query.city) ?? null,
  mine: req.query.mine === 'true',
}));

export const mobileFormationTracks = mobileOp(listFormationTracks, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
}));

export const mobileSacramentalJourneys = mobileOp(listSacramentalJourneys, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
  search: parseOptionalString(req.query.search),
  take: req.query.take ? Number(req.query.take) : undefined,
}));

export const mobileSacramentalJourney = mobileOp(getSacramentalJourney, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileSupportMessages = mobileOp(getMySupportMessages, () => undefined as void);

export const mobileJoinPastoralGroup = mobileOp(joinPastoralGroup, (req) => ({
  groupId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileLeavePastoralGroup = mobileOp(leavePastoralGroup, (req) => ({
  groupId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileEnrollInFormationTrack = mobileOp(enrollInFormationTrack, (req) =>
  omitUndefined({
    trackId: parseRequiredString(req.params.id, 'id'),
    workspaceId: parseOptionalString(body(req).workspaceId),
  }),
);

export const mobileUnenrollFromFormationTrack = mobileOp(unenrollFromFormationTrack, (req) =>
  omitUndefined({
    trackId: parseRequiredString(req.params.id, 'id'),
    workspaceId: parseOptionalString(body(req).workspaceId),
  }),
);

export const mobileSubmitSupport = mobileOp(submitContactMessage, (req) => {
  const b = body(req);
  return {
    name: parseRequiredString(b.name, 'name'),
    email: parseRequiredString(b.email, 'email'),
    message: parseRequiredString(b.message, 'message'),
  };
});
