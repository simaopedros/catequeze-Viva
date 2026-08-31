/**
 * Shared content access control helpers.
 *
 * Reused by contentOperations.ts and collaborativeOperations.ts to enforce
 * parish-scoped tenant isolation: admin, creator, or active parish member.
 */
import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { getDioceseParishIds } from './helpers';

export function isCoordinatorOrAbove(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

export function canCreateContent(role: string): boolean {
  return isCoordinatorOrAbove(role) || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'CONTENT_REVIEWER'].includes(role);
}

export function canReviewContent(role: string): boolean {
  return isCoordinatorOrAbove(role) || role === 'CONTENT_REVIEWER';
}

export async function getUserRoleAndParish(context: any): Promise<{ role: string; parishId: string | null }> {
  if (context.user?.isAdmin) return { role: 'SUPER_ADMIN', parishId: null };
  const m = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { role: true, parishId: true },
  });
  return { role: m?.role || '', parishId: m?.parishId || null };
}

export async function getParishIds(context: any): Promise<string[]> {
  if (context.user?.isAdmin) return [];
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

/** Verifica que o user tem acesso ao conteúdo (parish-scope ou é o criador) */
export async function assertCanAccessContent(
  context: any,
  item: { id?: string; parishId?: string | null; createdById?: string | null },
) {
  if (context.user?.isAdmin) return;
  if (item.createdById === context.user.id) return;

  if (item.parishId) {
    const parishIds = await getParishIds(context);
    if (!parishIds.includes(item.parishId)) {
      throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
    }
    return;
  }

  // Global/unscoped content is only visible to creator or platform admin
  throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
}

export async function assertCanModifyContent(
  context: any,
  item: { parishId?: string | null; createdById?: string | null },
) {
  if (context.user?.isAdmin) return;
  if (item.createdById === context.user.id) return;

  const { role } = await getUserRoleAndParish(context);
  if (!canCreateContent(role)) throw new HttpError(403, 'Sem permissão.');

  if (item.parishId) {
    const parishIds = await getParishIds(context);
    if (!parishIds.includes(item.parishId)) {
      throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
    }
    return;
  }

  throw new HttpError(403, 'Sem permissão para alterar este conteúdo.');
}

// ── Collaborative Session access wrappers ──────────────────────────────────

/** Resolve a session to its ContentItem for access checks */
async function getContentItemForSession(context: any, sessionId: string) {
  const session = await context.entities.CollaborativeSession.findUnique({
    where: { id: sessionId },
    include: { contentItem: { select: { id: true, parishId: true, createdById: true } } },
  });
  if (!session) throw new HttpError(404, 'Sessão não encontrada.');
  if (!session.contentItem) throw new HttpError(404, 'Conteúdo não encontrado.');
  return session.contentItem;
}

/** Read access to a collaborative session (resolved via its ContentItem) */
export async function assertCanAccessSession(context: any, sessionId: string) {
  const contentItem = await getContentItemForSession(context, sessionId);
  await assertCanAccessContent(context, contentItem);
}

/** Write access to a collaborative session */
export async function assertCanModifySession(context: any, sessionId: string) {
  const contentItem = await getContentItemForSession(context, sessionId);
  await assertCanModifyContent(context, contentItem);
}

/** Read access to a content version (resolved via its parent ContentItem) */
export async function assertCanAccessVersion(context: any, versionId: string) {
  const version = await context.entities.ContentVersion.findUnique({
    where: { id: versionId },
    include: { content: { select: { id: true, parishId: true, createdById: true } } },
  });
  if (!version) throw new HttpError(404, 'Versão não encontrada.');
  await assertCanAccessContent(context, version.content);
}

/** Read access to a context attachment (resolved via session → ContentItem) */
export async function assertCanAccessAttachment(context: any, attachmentId: string) {
  const attachment = await context.entities.ContextAttachment.findUnique({
    where: { id: attachmentId },
    include: { session: { include: { contentItem: { select: { id: true, parishId: true, createdById: true } } } } },
  });
  if (!attachment) throw new HttpError(404, 'Anexo não encontrado.');
  if (!attachment.session?.contentItem) throw new HttpError(404, 'Conteúdo não encontrado.');
  await assertCanAccessContent(context, attachment.session.contentItem);
}
