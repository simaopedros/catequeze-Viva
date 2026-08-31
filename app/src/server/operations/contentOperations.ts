import { HttpError } from "wasp/server";
import { resolveUserLocale } from "../i18n/serverLocale";
import {
  canCreateContent,
  canReviewContent,
  getUserRoleAndParish,
  getParishIds,
  assertCanAccessContent,
  assertCanModifyContent,
} from "../auth/contentAccess";
import { requireWorkspaceAccess } from "./sharedScope";
import {
  CONTENT_DOCUMENT_VERSION,
  buildLegacyContentDocument,
  createEmptyContentDocument,
  parseContentDocument,
} from "../../shared/contentDocument";
import { logger } from "../logger";
import { deleteContentSourceFile } from "../storage/contentSourceStorage";
import {
  dateIdCursorWhere,
  emptyPage,
  mergeWhere,
  pageParams,
  wrapDateIdPage,
} from "./listCursor";

function normalizeDocumentJson(
  value: string | null | undefined,
  fallback?: Record<string, any>,
): string {
  if (value === null) {
    return JSON.stringify(createEmptyContentDocument());
  }

  const parsed = parseContentDocument(value);
  if (parsed) {
    return JSON.stringify(parsed);
  }

  if (value !== undefined) {
    throw new HttpError(400, "Documento inválido.");
  }

  return JSON.stringify(
    fallback
      ? buildLegacyContentDocument(fallback)
      : createEmptyContentDocument(),
  );
}

/** Returns array (legacy) or { items, nextCursor } when paginated/cursor. */
export const listContentItems = async (
  _args: {
    take?: number;
    skip?: number;
    search?: string;
    status?: string;
    workspaceId?: string;
    cursor?: string | null;
    paginated?: boolean;
  } | void,
  context: any,
): Promise<any> => {
  const args = _args || {};
  const { useCursorPage, pageSize, take, skip } = pageParams(args);
  const search = args.search?.trim();
  if (!context.user) throw new HttpError(401);

  const include = {
    createdBy: { select: { id: true, firstName: true, lastName: true } },
    _count: { select: { activities: true, meetings: true } },
  };
  const orderBy = [{ updatedAt: "desc" as const }, { id: "desc" as const }];

  const buildWhere = (base: any) => {
    let where = mergeWhere(base, dateIdCursorWhere(args.cursor, "updatedAt"));
    const and: any[] = [];
    if (where && Object.keys(where).length) and.push(where);
    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { theme: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }
    if (args.status && args.status !== "all") {
      and.push({ status: args.status });
    }
    if (and.length === 0) return {};
    if (and.length === 1) return and[0];
    return { AND: and };
  };

  if (context.user.isAdmin && !args.workspaceId) {
    const rows = await context.entities.ContentItem.findMany({
      where: buildWhere({}),
      orderBy,
      take: take ?? 50,
      skip,
      include,
    });
    return wrapDateIdPage(rows, pageSize, useCursorPage, "updatedAt");
  }

  // Prefer explicit workspace; fall back to all accessible parishes
  let parishFilter: any;
  if (args.workspaceId?.trim()) {
    await requireWorkspaceAccess(context, args.workspaceId.trim());
    parishFilter = { parishId: args.workspaceId.trim() };
  } else {
    const parishIds = await getParishIds(context);
    if (parishIds.length === 0) return emptyPage(useCursorPage);
    parishFilter = { parishId: { in: parishIds } };
  }

  const rows = await context.entities.ContentItem.findMany({
    where: buildWhere(parishFilter),
    orderBy,
    take: take ?? 50,
    skip,
    include,
  });
  return wrapDateIdPage(rows, pageSize, useCursorPage, "updatedAt");
};

export const getContentItem = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      versions: { orderBy: { version: "desc" } },
      activities: true,
      meetings: true,
      bibleRefs: {
        include: {
          verse: {
            include: {
              chapter: {
                include: {
                  book: {
                    select: { id: true, name: true, abbreviation: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      catechismRefs: {
        include: { entry: true },
        orderBy: { position: "asc" },
      },
      ContentDirectoryReference: {
        include: { entry: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");

  await assertCanAccessContent(context, item);

  return {
    ...item,
    directoryRefs: item.ContentDirectoryReference,
  };
};

export const createContentItem = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { role, parishId } = await getUserRoleAndParish(context);
  if (!canCreateContent(role))
    throw new HttpError(403, "Sem permissão para criar conteúdo.");

  const title =
    String(args.title || "Novo encontro")
      .trim()
      .slice(0, 200) || "Novo encontro";
  const theme = args.theme ? String(args.theme).slice(0, 500) : null;
  const mainContent =
    typeof args.mainContent === "string" ? args.mainContent : "";
  const fallback = {
    title,
    theme,
    pastoralObjective: args.pastoralObjective,
    openingPrayer: args.openingPrayer,
    closingPrayer: args.closingPrayer,
    mainContent,
    dynamic: args.dynamic,
    materials: args.materials,
    activity: args.activity,
    familyTask: args.familyTask,
    estimatedTime: args.estimatedTime,
    tags: args.tags,
  };

  return context.entities.ContentItem.create({
    data: {
      title,
      theme,
      pastoralObjective: args.pastoralObjective ?? null,
      biblicalRef: args.biblicalRef ?? null,
      catechismRef: args.catechismRef ?? null,
      openingPrayer: args.openingPrayer ?? null,
      dynamic: args.dynamic ?? null,
      materials: args.materials ?? null,
      mainContent,
      activity: args.activity ?? null,
      familyTask: args.familyTask ?? null,
      closingPrayer: args.closingPrayer ?? null,
      estimatedTime:
        typeof args.estimatedTime === "number" ? args.estimatedTime : 60,
      tags: args.tags ?? null,
      documentJson: normalizeDocumentJson(args.documentJson, fallback),
      documentVersion: CONTENT_DOCUMENT_VERSION,
      status: "DRAFT",
      locale: resolveUserLocale(context.user),
      createdById: context.user.id,
      parishId: parishId || null,
    },
  });
};

export const updateContentStatus = async (
  args: { id: string; status: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
    select: { parishId: true, createdById: true },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");

  await assertCanModifyContent(context, item);

  const { role } = await getUserRoleAndParish(context);
  if (
    ["APPROVED", "PUBLISHED"].includes(args.status) &&
    !canReviewContent(role)
  ) {
    throw new HttpError(
      403,
      "Apenas revisores e coordenadores podem aprovar ou publicar conteúdo.",
    );
  }

  return context.entities.ContentItem.update({
    where: { id: args.id },
    data: { status: args.status as any },
  });
};

export const updateContentItem = async (
  args: {
    id: string;
    title?: string;
    theme?: string | null;
    pastoralObjective?: string | null;
    openingPrayer?: string | null;
    closingPrayer?: string | null;
    mainContent?: string;
    dynamic?: string | null;
    materials?: string | null;
    activity?: string | null;
    familyTask?: string | null;
    estimatedTime?: number | null;
    biblicalRef?: string | null;
    catechismRef?: string | null;
    tags?: string | null;
    documentJson?: string | null;
    documentVersion?: number;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");

  await assertCanModifyContent(context, item);

  if (
    args.documentVersion !== undefined &&
    args.documentVersion !== CONTENT_DOCUMENT_VERSION
  ) {
    throw new HttpError(400, "Versão de documento inválida.");
  }

  const documentJson =
    args.documentJson !== undefined
      ? normalizeDocumentJson(args.documentJson, item)
      : undefined;

  return context.entities.ContentItem.update({
    where: { id: args.id },
    data: {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.theme !== undefined ? { theme: args.theme } : {}),
      ...(args.pastoralObjective !== undefined
        ? { pastoralObjective: args.pastoralObjective }
        : {}),
      ...(args.openingPrayer !== undefined
        ? { openingPrayer: args.openingPrayer }
        : {}),
      ...(args.closingPrayer !== undefined
        ? { closingPrayer: args.closingPrayer }
        : {}),
      ...(args.mainContent !== undefined
        ? { mainContent: args.mainContent }
        : {}),
      ...(args.dynamic !== undefined ? { dynamic: args.dynamic } : {}),
      ...(args.materials !== undefined ? { materials: args.materials } : {}),
      ...(args.activity !== undefined ? { activity: args.activity } : {}),
      ...(args.familyTask !== undefined ? { familyTask: args.familyTask } : {}),
      ...(args.estimatedTime !== undefined
        ? { estimatedTime: args.estimatedTime }
        : {}),
      ...(args.biblicalRef !== undefined
        ? { biblicalRef: args.biblicalRef }
        : {}),
      ...(args.catechismRef !== undefined
        ? { catechismRef: args.catechismRef }
        : {}),
      ...(args.tags !== undefined ? { tags: args.tags } : {}),
      ...(documentJson !== undefined
        ? { documentJson, documentVersion: CONTENT_DOCUMENT_VERSION }
        : {}),
    },
  });
};
export const deleteContentItem = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      parishId: true,
      createdById: true,
      sourceFileKey: true,
    },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");

  await assertCanModifyContent(context, item);

  if (item.sourceFileKey) {
    try {
      await deleteContentSourceFile(item.sourceFileKey);
    } catch (error) {
      logger.warn("failed to delete content source file", {
        contentId: args.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await context.entities.Meeting.updateMany({
    where: { contentId: args.id },
    data: { contentId: null },
  });

  await context.entities.Activity.updateMany({
    where: { contentId: args.id },
    data: { contentId: null },
  });

  await context.entities.ContentVersion.deleteMany({
    where: { contentId: args.id },
  });

  await context.entities.ContentItem.delete({
    where: { id: args.id },
  });

  return { success: true };
};

export const addBibleRef = async (
  args: { contentId: string; verseId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.contentId },
    select: { parishId: true, createdById: true },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");
  await assertCanModifyContent(context, item);

  const existing = await context.entities.ContentBibleReference.findFirst({
    where: { contentId: args.contentId, verseId: args.verseId },
  });
  if (existing) return existing;
  return context.entities.ContentBibleReference.create({
    data: { contentId: args.contentId, verseId: args.verseId },
  });
};

export const removeBibleRef = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const ref = await context.entities.ContentBibleReference.findUnique({
    where: { id: args.id },
    select: { contentId: true },
  });
  if (!ref) return { success: true };

  const item = await context.entities.ContentItem.findUnique({
    where: { id: ref.contentId },
    select: { parishId: true, createdById: true },
  });
  if (item) await assertCanModifyContent(context, item);

  await context.entities.ContentBibleReference.delete({
    where: { id: args.id },
  });
  return { success: true };
};

export const addCatechismRef = async (
  args: { contentId: string; entryId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.contentId },
    select: { parishId: true, createdById: true },
  });
  if (!item) throw new HttpError(404, "Conteúdo não encontrado.");
  await assertCanModifyContent(context, item);

  const existing = await context.entities.ContentCatechismReference.findFirst({
    where: { contentId: args.contentId, entryId: args.entryId },
  });
  if (existing) return existing;
  return context.entities.ContentCatechismReference.create({
    data: { contentId: args.contentId, entryId: args.entryId },
  });
};

export const removeCatechismRef = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const ref = await context.entities.ContentCatechismReference.findUnique({
    where: { id: args.id },
    select: { contentId: true },
  });
  if (!ref) return { success: true };

  const item = await context.entities.ContentItem.findUnique({
    where: { id: ref.contentId },
    select: { parishId: true, createdById: true },
  });
  if (item) await assertCanModifyContent(context, item);

  await context.entities.ContentCatechismReference.delete({
    where: { id: args.id },
  });
  return { success: true };
};
