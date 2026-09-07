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
import {
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const createOfficialResourceSchema = z.object({
  workspaceId: uuid.optional(),
  title: z.string().min(2).max(200),
  summary: z.string().max(500).optional(),
  body: z.string().max(200000).optional(),
  fileUrl: z.string().max(2000).optional(),
  fileName: z.string().max(300).optional(),
  kind: z
    .enum([
      "DIRECTORY",
      "SUBSIDY",
      "CIRCULAR",
      "FORM_TEMPLATE",
      "POLICY",
      "RITE",
      "HYMN",
      "OTHER",
    ])
    .default("OTHER"),
  stageKey: z.string().max(80).optional(),
  inheritancePolicy: z
    .enum(["LOCKED", "REQUIRED_EXTENDABLE", "SUGGESTED", "LOCAL"])
    .optional(),
});

const publishOfficialResourceSchema = z.object({ id: uuid });
const adoptOfficialResourceSchema = z.object({
  id: uuid,
  workspaceId: uuid.optional(),
  status: z.enum(["INHERITED", "ADAPTED", "DISMISSED"]),
});

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
    includeDrafts && canPublishAt(actor.role, actor.ownerType, actor.isPlatformAdmin);

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
    },
  });

  return rows.map((row: any) => ({
    ...withOrigin(row, actor),
    inherited:
      row.ownerType !== actor.ownerType &&
      cascadesToChildren(row.inheritancePolicy),
    adoption: row.adoptions?.[0] ?? null,
  }));
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

export const publishOfficialResource = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id } = validateOrThrow(publishOfficialResourceSchema, args);
  const row = await context.entities.OfficialResource.findUnique({
    where: { id },
  });
  if (!row) throw new HttpError(404, "Recurso não encontrado.");

  const actor = await resolveActorForResource(context, row);
  assertCanPublish(actor, row.ownerType);

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
  if (validated.status === "ADAPTED" && !canAdaptResource(row.inheritancePolicy)) {
    throw new HttpError(403, "Este recurso não pode ser adaptado.");
  }
  if (validated.status === "DISMISSED" && !canDismissResource(row.inheritancePolicy)) {
    throw new HttpError(403, "Este recurso é obrigatório e não pode ser ignorado.");
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
