import { HttpError } from "wasp/server";
import { z } from "zod";
import {
  canPublishAt,
  defaultPolicyFor,
} from "../../shared/resourceInheritance";
import {
  isCatechistOrAboveRole,
  isCoordinatorOrAboveRole,
} from "../auth/helpers";
import { validateOrThrow } from "../validation";
import {
  actorCanViewOfficialResource,
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const createAnnouncementSchema = z.object({
  workspaceId: uuid.optional(),
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(50000),
  audience: z
    .enum(["coordinators", "catechists", "families", "all"])
    .default("coordinators"),
  requireAck: z.boolean().optional(),
  inheritancePolicy: z
    .enum(["LOCKED", "REQUIRED_EXTENDABLE", "SUGGESTED", "LOCAL"])
    .optional(),
});

/** Whether a published announcement's audience includes this membership role. */
export function audienceAllowsRole(audience: string, role: string): boolean {
  switch (audience) {
    case "all":
      return true;
    case "families":
      return role === "GUARDIAN" || role === "CATECHUMEN";
    case "catechists":
      return isCatechistOrAboveRole(role);
    case "coordinators":
      return isCoordinatorOrAboveRole(role);
    default:
      return false;
  }
}

export const listPastoralAnnouncements = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const actor = await resolveResourceActor(
    context,
    args && typeof args === "object" ? args.workspaceId : undefined,
  );
  const canManage = canPublishAt(
    actor.role,
    actor.ownerType,
    actor.isPlatformAdmin,
  );

  const or: any[] = [
    {
      parishId: actor.parishId,
      ownerType: "PARISH",
      ...(canManage ? {} : { status: "PUBLISHED" }),
    },
  ];
  if (actor.dioceseId) {
    or.push({
      dioceseId: actor.dioceseId,
      ownerType: "DIOCESE",
      status: "PUBLISHED",
      inheritancePolicy: { not: "LOCAL" },
    });
  }
  if (actor.communityId) {
    or.push({
      communityId: actor.communityId,
      ...(canManage ? {} : { status: "PUBLISHED" }),
    });
  }
  if (actor.ownerType === "DIOCESE") {
    or.push({
      dioceseId: actor.dioceseId,
      ownerType: "DIOCESE",
      ...(canManage ? {} : { status: "PUBLISHED" }),
    });
  }

  const rows = await context.entities.PastoralAnnouncement.findMany({
    where: { OR: or },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      acknowledgements: {
        where: { userId: context.user.id },
        take: 1,
      },
      _count: { select: { acknowledgements: true } },
    },
  });

  const visible = canManage
    ? rows
    : rows.filter(
        (row: any) =>
          row.status === "PUBLISHED" &&
          audienceAllowsRole(row.audience, actor.role),
      );

  return visible.map((row: any) => ({
    ...withOrigin(row, actor),
    inherited: row.ownerType !== actor.ownerType,
    acknowledged: Boolean(row.acknowledgements?.[0]),
  }));
};

export const createPastoralAnnouncement = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(createAnnouncementSchema, args);
  const actor = await resolveResourceActor(context, validated.workspaceId);
  assertCanPublish(actor);

  return context.entities.PastoralAnnouncement.create({
    data: {
      title: validated.title.trim(),
      body: validated.body,
      audience: validated.audience,
      requireAck: validated.requireAck ?? true,
      ownerType: actor.ownerType,
      inheritancePolicy:
        validated.inheritancePolicy ||
        defaultPolicyFor("ANNOUNCEMENT", actor.ownerType),
      dioceseId: actor.dioceseId,
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      communityId: actor.ownerType === "COMMUNITY" ? actor.communityId : null,
      createdById: context.user.id,
      status: "DRAFT",
    },
  });
};

export const publishPastoralAnnouncement = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const id = validateOrThrow(z.object({ id: uuid }), args).id;
  const row = await context.entities.PastoralAnnouncement.findUnique({
    where: { id },
  });
  if (!row) throw new HttpError(404, "Comunicado não encontrado.");
  const actor = await resolveActorForResource(context, row);
  assertCanPublish(actor, row.ownerType);
  return context.entities.PastoralAnnouncement.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
};

export const acknowledgePastoralAnnouncement = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const id = validateOrThrow(z.object({ id: uuid }), args).id;
  const row = await context.entities.PastoralAnnouncement.findUnique({
    where: { id },
  });
  if (!row) throw new HttpError(404, "Comunicado não encontrado.");
  if (row.status !== "PUBLISHED") {
    throw new HttpError(400, "Comunicado ainda não publicado.");
  }
  const actor = await resolveActorForResource(context, row);
  const canManage = canPublishAt(
    actor.role,
    actor.ownerType,
    actor.isPlatformAdmin,
  );
  if (!canManage && !audienceAllowsRole(row.audience, actor.role)) {
    throw new HttpError(403, "Este comunicado não é destinado ao seu papel.");
  }
  return context.entities.PastoralAnnouncementAck.upsert({
    where: {
      announcementId_userId: { announcementId: id, userId: context.user.id },
    },
    create: { announcementId: id, userId: context.user.id },
    update: { readAt: new Date() },
  });
};

export const republishPastoralAnnouncement = async (
  args: { id: string; workspaceId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const source = await context.entities.PastoralAnnouncement.findUnique({
    where: { id: validated.id },
  });
  if (!source) throw new HttpError(404, "Comunicado não encontrado.");
  const actor = await resolveResourceActor(context, validated.workspaceId);
  assertCanPublish(actor);
  if (!actorCanViewOfficialResource(actor, source)) {
    throw new HttpError(
      403,
      "Você não pode republicar um comunicado fora do seu escopo.",
    );
  }
  return context.entities.PastoralAnnouncement.create({
    data: {
      title: source.title,
      body: source.body,
      audience: source.audience,
      requireAck: source.requireAck,
      status: "PUBLISHED",
      publishedAt: new Date(),
      ownerType: actor.ownerType,
      inheritancePolicy: defaultPolicyFor("ANNOUNCEMENT", actor.ownerType),
      dioceseId: actor.dioceseId,
      parishId: actor.parishId,
      communityId: actor.communityId,
      sourceAnnouncementId: source.id,
      createdById: context.user.id,
    },
  });
};
