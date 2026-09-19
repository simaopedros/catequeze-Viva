import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';

import { markConversationRead, muteConversation, removeConversationParticipant } from '../operations/conversationOperations';
import { deleteSocialComment, deleteSocialPost, recordSocialWatch, registerSocialShare } from '../operations/socialOperations';
import { getSocialFollowState } from '../operations/socialDiscoveryOperations';
import { getEncounterFocus } from '../operations/encounterOperations';
import { listUpcomingBirthdays, toggleBirthdayGift } from '../operations/pastoralReportOperations';
import { globalSearch } from '../operations/searchOperations';
import { acknowledgePastoralAnnouncement, listPastoralAnnouncements } from '../operations/pastoralAnnouncementOperations';
import { parseOptionalString, parseRequiredString, requireMobileSessionVerification, toOperationContext } from './mobile';

type Handler = (req: Request, res: Response, context: any) => Promise<Response>;

function mobileOp<TArgs>(op: (args: TArgs, context: any) => Promise<unknown>, build: (req: Request) => TArgs): Handler {
  return async (req, res, context) => {
    const opCtx = toOperationContext(context);
    await requireMobileSessionVerification(opCtx);
    const result = await op(build(req), opCtx);
    return res.json(result ?? { success: true });
  };
}

function body(req: Request): Record<string, any> {
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mensagens
// ─────────────────────────────────────────────────────────────────────────────

export const mobileMarkConversationRead = mobileOp(markConversationRead, (req) => ({
  conversationId: parseRequiredString(req.params.id, 'id'),
  workspaceId: parseOptionalString(body(req).workspaceId),
}));

export const mobileMuteConversation = mobileOp(muteConversation, (req) => {
  const b = body(req);
  if (typeof b.mute !== 'boolean') throw new HttpError(400, 'Missing or invalid mute.');
  return { conversationId: parseRequiredString(req.params.id, 'id'), mute: b.mute, workspaceId: parseOptionalString(b.workspaceId) };
});

export const mobileRemoveConversationParticipant = mobileOp(removeConversationParticipant, (req) => ({
  conversationId: parseRequiredString(req.params.id, 'id'),
  userId: parseRequiredString(req.params.userId, 'userId'),
  workspaceId: parseOptionalString(req.query.workspaceId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Comunidade
// ─────────────────────────────────────────────────────────────────────────────

export const mobileDeleteSocialPost = mobileOp(deleteSocialPost, (req) => ({
  postId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileDeleteSocialComment = mobileOp(deleteSocialComment, (req) => ({
  commentId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileRegisterSocialShare = mobileOp(registerSocialShare, (req) => ({
  postId: parseRequiredString(body(req).postId, 'postId'),
}));

export const mobileRecordSocialWatch = mobileOp(recordSocialWatch, (req) => {
  const b = body(req);
  return {
    postId: parseRequiredString(b.postId, 'postId'),
    watchSeconds: optionalNumber(b.watchSeconds),
    completionRate: optionalNumber(b.completionRate) ?? null,
  };
});

export const mobileSocialFollowState = mobileOp(getSocialFollowState, (req) => {
  const raw = parseOptionalString(req.query.authorIds) ?? '';
  return { authorIds: raw.split(',').map((item) => item.trim()).filter(Boolean) };
});

// ─────────────────────────────────────────────────────────────────────────────
// Início por papel, avisos, aniversários, pesquisa
// ─────────────────────────────────────────────────────────────────────────────

export const mobileEncounterFocus = mobileOp(getEncounterFocus, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
  dependentId: parseOptionalString(req.query.dependentId),
  surface: parseOptionalString(req.query.surface) ?? 'STAFF',
}));

export const mobileAnnouncements = mobileOp(listPastoralAnnouncements, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
}));

export const mobileAcknowledgeAnnouncement = mobileOp(acknowledgePastoralAnnouncement, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileBirthdays = mobileOp(listUpcomingBirthdays, (req) => ({
  classId: parseOptionalString(req.query.classId),
  days: optionalNumber(req.query.days),
}));

export const mobileToggleBirthdayGift = mobileOp(toggleBirthdayGift, (req) => {
  const b = body(req);
  const year = optionalNumber(b.year) ?? new Date().getFullYear();
  return { catechumenId: parseRequiredString(b.catechumenId, 'catechumenId'), year };
});

export const mobileGlobalSearch = mobileOp(globalSearch, (req) => ({
  query: parseRequiredString(req.query.q ?? req.query.query, 'q'),
  locale: parseOptionalString(req.query.locale) ?? null,
}));
