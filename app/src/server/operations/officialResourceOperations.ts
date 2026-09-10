import { HttpError } from "wasp/server";
import {
  canAdaptResource,
  canDismissResource,
  canPublishAt,
  cascadesToChildren,
  defaultPolicyFor,
  type InheritancePolicy,
  type OfficialResourceKind,
} from "../../shared/resourceInheritance";
import { validateOrThrow } from "../validation";
import { z } from "zod";
import { deleteDocumentFile } from "../storage/documentStorage";
import {
  actorCanViewOfficialResource,
  assertCanManageOwned,
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const officialKindEnum = z.enum([
  "DIRECTORY",
  "SUBSIDY",
  "CIRCULAR",
  "FORM_TEMPLATE",
  "POLICY",
  "RITE",
  "HYMN",
  "OTHER",
]);

const policyEnum = z.enum([
  "LOCKED",
  "REQUIRED_EXTENDABLE",
  "SUGGESTED",
  "LOCAL",
]);

const statusEnum = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);

const createOfficialResourceSchema = z.object({
  workspaceId: uuid.optional(),
  title: z.string().min(2).max(200),
  summary: z.string().max(500).optional(),
  body: z.string().max(200000).optional(),
  fileUrl: z.string().max(2000).optional(),
  fileName: z.string().max(300).optional(),
  kind: officialKindEnum.default("OTHER"),
  stageKey: z.string().max(80).optional(),
  inheritancePolicy: policyEnum.optional(),
});

const updateOfficialResourceSchema = z.object({
  id: uuid,
  workspaceId: uuid.optional(),
  title: z.string().min(2).max(200).optional(),
  summary: z.string().max(500).nullable().optional(),
  body: z.string().max(200000).nullable().optional(),
  kind: officialKindEnum.optional(),
  inheritancePolicy: policyEnum.optional(),
  status: statusEnum.optional(),
  stageKey: z.string().max(80).nullable().optional(),
});

const publishOfficialResourceSchema = z.object({ id: uuid });
const adoptOfficialResourceSchema = z.object({
  id: uuid,
  workspaceId: uuid.optional(),
  status: z.enum(["INHERITED", "ADAPTED", "DISMISSED"]),
});

function publicAttachment(row: {
  id: string;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType ?? null,
    sizeBytes: row.sizeBytes ?? null,
    createdAt: row.createdAt,
  };
}

function withPublicAttachments(row: any) {
  const attachments = (row.attachments || []).map(publicAttachment);
  if (row.fileUrl && row.fileName) {
    attachments.unshift({
      id: `legacy:${row.id}`,
      name: row.fileName,
      mimeType: null,
      sizeBytes: null,
      createdAt: row.createdAt,
      fileUrl: row.fileUrl,
    });
  }
  const { attachments: _omit, ...rest } = row;
  return { ...rest, attachments };
}

async function copyAttachments(
  context: any,
  sourceId: string,
  targetId: string,
  uploadedById: string,
) {
  const rows = await context.entities.OfficialResourceAttachment.findMany({
    where: { resourceId: sourceId },
  });
  if (!rows.length) return;
  await Promise.all(
    rows.map((att: any) =>
      context.entities.OfficialResourceAttachment.create({
        data: {
          resourceId: targetId,
          name: att.name,
          mimeType: att.mimeType,
          s3Key: att.s3Key,
          sizeBytes: att.sizeBytes,
          uploadedById,
        },
      }),
    ),
  );
}

async function deleteUnusedAttachmentFiles(context: any, keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  for (const s3Key of unique) {
    const remaining = await context.entities.OfficialResourceAttachment.count({
      where: { s3Key },
    });
    if (remaining > 0) continue;
    try {
      await deleteDocumentFile(s3Key);
    } catch {
      // best-effort blob cleanup
    }
  }
}

export const listOfficialResources = async (
  args: { workspaceId?: string; kind?: string; includeDrafts?: boolean } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const actor = await resolveResourceActor(
    context,
    args && typeof args === "object" ? args.workspaceId : undefined,
  );

  const kind = args && typeof args === "object" ? args.kind : undefined;
  const includeDrafts = Boolean(
    args && typeof args === "object" && args.includeDrafts,
  );

  const published = { status: { in: ["PUBLISHED", "APPROVED"] } };
  const seeOwnDrafts =
    includeDrafts &&
    canPublishAt(actor.role, actor.ownerType, actor.isPlatformAdmin);

  const or: any[] = [];
  if (actor.dioceseId) {
    if (actor.ownerType === "DIOCESE") {
      or.push({
        dioceseId: actor.dioceseId,
        ownerType: "DIOCESE",
        ...(seeOwnDrafts ? {} : published),
      });
    } else {
      or.push({
        dioceseId: actor.dioceseId,
        ownerType: "DIOCESE",
        ...published,
        inheritancePolicy: { not: "LOCAL" },
      });
    }
  }
  if (actor.ownerType !== "DIOCESE") {
    or.push({
      parishId: actor.parishId,
      ownerType: { in: ["PARISH", "COMMUNITY"] },
      ...(seeOwnDrafts ? {} : published),
    });
    if (actor.communityId) {
      or.push({ communityId: actor.communityId });
    }
  }

  const where: any = or.length ? { OR: or } : { id: { in: [] } };
  if (kind && kind !== "all") where.kind = kind;

  const rows = await context.entities.OfficialResource.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      adoptions: {
        where: { adopterType: actor.ownerType, adopterId: actor.ownerId },
        take: 1,
      },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  return rows.map((row: any) => {
    const annotated = withOrigin(row, actor);
    return {
      ...withPublicAttachments(annotated),
      inherited:
        row.ownerType !== actor.ownerType &&
        cascadesToChildren(row.inheritancePolicy),
      adoption: row.adoptions?.[0] ?? null,
    };
  });
};

export const createOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(createOfficialResourceSchema, args);
  const actor = await resolveResourceActor(context, validated.workspaceId);
  assertCanPublish(actor);

  const policy =
    (validated.inheritancePolicy as InheritancePolicy | undefined) ||
    defaultPolicyFor("OFFICIAL", actor.ownerType);

  return context.entities.OfficialResource.create({
    data: {
      title: validated.title.trim(),
      summary: validated.summary?.trim() || null,
      body: validated.body || null,
      fileUrl: validated.fileUrl || null,
      fileName: validated.fileName || null,
      kind: validated.kind as OfficialResourceKind,
      stageKey: validated.stageKey || null,
      ownerType: actor.ownerType,
      inheritancePolicy: policy,
      dioceseId: actor.dioceseId,
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      communityId: actor.ownerType === "COMMUNITY" ? actor.communityId : null,
      createdById: context.user.id,
      status: "DRAFT",
    },
  });
};

export const updateOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(updateOfficialResourceSchema, args);
  const row = await context.entities.OfficialResource.findUnique({
    where: { id: validated.id },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) throw new HttpError(404, "Recurso não encontrado.");

  const actor = await resolveActorForResource(
    context,
    row,
    validated.workspaceId,
  );
  assertCanManageOwned(actor, row);

  const data: any = {};
  if (validated.title !== undefined) data.title = validated.title.trim();
  if (validated.summary !== undefined) {
    data.summary = validated.summary?.trim() || null;
  }
  if (validated.body !== undefined) data.body = validated.body || null;
  if (validated.kind !== undefined) data.kind = validated.kind;
  if (validated.inheritancePolicy !== undefined) {
    data.inheritancePolicy = validated.inheritancePolicy;
  }
  if (validated.stageKey !== undefined) {
    data.stageKey = validated.stageKey || null;
  }
  if (validated.status !== undefined) {
    data.status = validated.status;
    if (validated.status === "PUBLISHED" && row.status !== "PUBLISHED") {
      data.version = { increment: 1 };
    }
  }

  const updated = await context.entities.OfficialResource.update({
    where: { id: row.id },
    data,
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  return withPublicAttachments(withOrigin(updated, actor));
};

export const deleteOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id, workspaceId } = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const row = await context.entities.OfficialResource.findUnique({
    where: { id },
    include: { attachments: { select: { s3Key: true } } },
  });
  if (!row) throw new HttpError(404, "Recurso não encontrado.");

  const actor = await resolveActorForResource(context, row, workspaceId);
  assertCanManageOwned(actor, row);

  if (row.status === "DRAFT" || row.status === "IN_REVIEW") {
    const keys = row.attachments.map((a: { s3Key: string }) => a.s3Key);
    await context.entities.OfficialResource.delete({ where: { id } });
    await deleteUnusedAttachmentFiles(context, keys);
    return { id, deleted: true, archived: false };
  }

  const archived = await context.entities.OfficialResource.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { id: archived.id, deleted: false, archived: true };
};

export const removeOfficialResourceAttachment = async (
  args: any,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const { id, workspaceId } = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const attachment =
    await context.entities.OfficialResourceAttachment.findUnique({
      where: { id },
      include: { resource: true },
    });
  if (!attachment) throw new HttpError(404, "Anexo não encontrado.");

  const actor = await resolveActorForResource(
    context,
    attachment.resource,
    workspaceId,
  );
  assertCanManageOwned(actor, attachment.resource);

  await context.entities.OfficialResourceAttachment.delete({ where: { id } });
  await deleteUnusedAttachmentFiles(context, [attachment.s3Key]);
  return { success: true };
};

export const publishOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id } = validateOrThrow(publishOfficialResourceSchema, args);
  const row = await context.entities.OfficialResource.findUnique({
    where: { id },
  });
  if (!row) throw new HttpError(404, "Recurso não encontrado.");

  const actor = await resolveActorForResource(context, row);
  assertCanPublish(actor, row.ownerType);
  assertCanManageOwned(actor, row);

  return context.entities.OfficialResource.update({
    where: { id },
    data: { status: "PUBLISHED", version: { increment: 1 } },
  });
};

export const adoptOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(adoptOfficialResourceSchema, args);
  const row = await context.entities.OfficialResource.findUnique({
    where: { id: validated.id },
  });
  if (!row) throw new HttpError(404, "Recurso não encontrado.");
  if (row.status !== "PUBLISHED" && row.status !== "APPROVED") {
    throw new HttpError(400, "Só é possível adotar recursos publicados.");
  }

  const actor = await resolveResourceActor(context, validated.workspaceId);
  if (
    validated.status === "ADAPTED" &&
    !canAdaptResource(row.inheritancePolicy)
  ) {
    throw new HttpError(403, "Este recurso não pode ser adaptado.");
  }
  if (
    validated.status === "DISMISSED" &&
    !canDismissResource(row.inheritancePolicy)
  ) {
    throw new HttpError(
      403,
      "Este recurso é obrigatório e não pode ser ignorado.",
    );
  }

  let adaptedCopyId: string | null = null;
  if (validated.status === "ADAPTED") {
    const copy = await context.entities.OfficialResource.create({
      data: {
        title: `${row.title} (adaptação local)`,
        summary: row.summary,
        body: row.body,
        fileUrl: row.fileUrl,
        fileName: row.fileName,
        kind: row.kind,
        stageKey: row.stageKey,
        status: "PUBLISHED",
        ownerType: actor.ownerType,
        inheritancePolicy: "LOCAL",
        dioceseId: actor.dioceseId,
        parishId: actor.parishId,
        communityId: actor.communityId,
        createdById: context.user.id,
        sourceResourceId: row.id,
      },
    });
    adaptedCopyId = copy.id;
    await copyAttachments(context, row.id, copy.id, context.user.id);
  }

  return context.entities.OfficialResourceAdoption.upsert({
    where: {
      resourceId_adopterType_adopterId: {
        resourceId: row.id,
        adopterType: actor.ownerType,
        adopterId: actor.ownerId,
      },
    },
    create: {
      resourceId: row.id,
      adopterType: actor.ownerType,
      adopterId: actor.ownerId,
      status: validated.status,
      adaptedCopyId,
      sourceVersion: row.version,
      copiedVersion: adaptedCopyId ? row.version : null,
    },
    update: {
      status: validated.status,
      adaptedCopyId,
      sourceVersion: row.version,
      copiedVersion: adaptedCopyId ? row.version : null,
    },
  });
};

export { actorCanViewOfficialResource, publicAttachment };
