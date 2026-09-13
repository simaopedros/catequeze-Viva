/**
 * Mobile Bearer wrappers around existing Wasp pastoral operations.
 * Same 2FA session gate as /mobile/* — do not invent parallel CRUD.
 */
import type { Request, Response } from 'express';
import { prisma } from 'wasp/server';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import {
  createClass,
  updateClass,
  archiveClass,
  enrollCatechumen,
} from '../operations/classOperations';
import { createMeeting, updateMeeting, deleteMeeting } from '../operations/meetingOperations';
import { createLiturgicalEvent, deleteLiturgicalEvent } from '../operations/calendarOperations';
import { createConversation } from '../operations/conversationOperations';
import {
  createPastoralAnnouncement,
  publishPastoralAnnouncement,
} from '../operations/pastoralAnnouncementOperations';
import { createPastoralGroup, joinPastoralGroup } from '../operations/pastoralGroupOperations';
import {
  createCatechumen,
  updateCatechumen,
  deleteCatechumen,
} from '../operations/catechumenOperations';
import { createHousehold, updateHousehold } from '../operations/familyOperations';
import { inviteUserToParish, updateMembershipRole } from '../operations/memberOperations';
import { verifyDocument } from '../operations/documentOperations';
import { createContentItem, updateContentItem } from '../operations/contentOperations';
import {
  createSacramentalJourney,
  updateMilestoneStatus,
  updateJourney,
} from '../operations/sacramentOperations';
import {
  createFormationTrack,
  updateFormationTrack,
  deleteFormationTrack,
} from '../operations/formationOperations';
import { createParish, updateParish, deleteParish } from '../operations/parishOperations';
import { exportReport } from '../operations/missingOperations';

type AuthedContext = {
  user: any;
  req?: Request;
  res?: Response;
  entities: typeof prisma;
};

function toOp(context: any): AuthedContext {
  return {
    ...context,
    entities: {
      ...(context?.entities ?? {}),
      UserTwoFactor: context?.entities?.UserTwoFactor ?? (prisma as any).userTwoFactor,
    },
  };
}

async function requireSession(context: any) {
  const opCtx = toOp(context);
  await assertTwoFactorSessionVerified(opCtx);
  return opCtx;
}

function mergeArgs(req: Request): Record<string, unknown> {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const args: Record<string, unknown> = { ...body };
  if (req.params?.id && args.id == null) args.id = req.params.id;
  if (req.params?.milestoneId && args.milestoneId == null) {
    args.milestoneId = req.params.milestoneId;
  }
  return args;
}

async function invoke(
  req: Request,
  res: Response,
  context: any,
  action: (args: any, ctx: any) => Promise<any>,
) {
  const opCtx = await requireSession(context);
  const result = await action(mergeArgs(req), opCtx);
  return res.json(result ?? { success: true });
}

export async function mobileCreateClass(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createClass);
}
export async function mobileUpdateClass(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateClass);
}
export async function mobileArchiveClass(req: Request, res: Response, context: any) {
  return invoke(req, res, context, archiveClass);
}
export async function mobileEnrollCatechumen(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const args = mergeArgs(req);
  if (!args.classId && req.params?.id) args.classId = req.params.id;
  return res.json(await enrollCatechumen(args, opCtx));
}

export async function mobileCreateMeeting(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createMeeting);
}
export async function mobileUpdateMeeting(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateMeeting);
}
export async function mobileDeleteMeeting(req: Request, res: Response, context: any) {
  return invoke(req, res, context, deleteMeeting);
}

export async function mobileCreateCalendarEvent(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createLiturgicalEvent);
}
export async function mobileDeleteCalendarEvent(req: Request, res: Response, context: any) {
  return invoke(req, res, context, deleteLiturgicalEvent);
}

export async function mobileCreateConversation(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createConversation);
}

export async function mobileCreateAnnouncement(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createPastoralAnnouncement);
}
export async function mobilePublishAnnouncement(req: Request, res: Response, context: any) {
  return invoke(req, res, context, publishPastoralAnnouncement);
}

export async function mobileCreateGroup(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createPastoralGroup);
}
export async function mobileJoinGroup(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const args = mergeArgs(req);
  if (!args.groupId && req.params?.id) args.groupId = req.params.id;
  return res.json(await joinPastoralGroup(args as { groupId: string }, opCtx));
}

export async function mobileCreateCatechumen(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createCatechumen);
}
export async function mobileUpdateCatechumen(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateCatechumen);
}
export async function mobileDeleteCatechumen(req: Request, res: Response, context: any) {
  return invoke(req, res, context, deleteCatechumen);
}

export async function mobileCreateHousehold(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createHousehold);
}
export async function mobileUpdateHousehold(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateHousehold);
}

export async function mobileInviteUser(req: Request, res: Response, context: any) {
  return invoke(req, res, context, inviteUserToParish);
}
export async function mobileCreateFamilyInvite(req: Request, res: Response, context: any) {
  return mobileInviteUser(req, res, context);
}
export async function mobileUpdateMembershipRole(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const args = mergeArgs(req);
  if (!args.membershipId && req.params?.id) args.membershipId = req.params.id;
  return res.json(await updateMembershipRole(args, opCtx));
}

export async function mobileVerifyDocument(req: Request, res: Response, context: any) {
  return invoke(req, res, context, verifyDocument);
}

export async function mobileCreateContent(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createContentItem);
}
export async function mobileUpdateContent(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateContentItem);
}

export async function mobileCreateSacrament(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createSacramentalJourney);
}
export async function mobileUpdateSacrament(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateJourney);
}
export async function mobileUpdateMilestone(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateMilestoneStatus);
}

export async function mobileCreateFormation(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createFormationTrack);
}
export async function mobileUpdateFormation(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateFormationTrack);
}
export async function mobileDeleteFormation(req: Request, res: Response, context: any) {
  return invoke(req, res, context, deleteFormationTrack);
}

export async function mobileCreateParish(req: Request, res: Response, context: any) {
  return invoke(req, res, context, createParish);
}
export async function mobileUpdateParish(req: Request, res: Response, context: any) {
  return invoke(req, res, context, updateParish);
}
export async function mobileDeleteParish(req: Request, res: Response, context: any) {
  return invoke(req, res, context, deleteParish);
}

export async function mobileExportReports(req: Request, res: Response, context: any) {
  return invoke(req, res, context, exportReport);
}
