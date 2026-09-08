import { HttpError } from "wasp/server";
import {
  annotateOrigin,
  canEditResource,
  canPublishAt,
  ownerTypeFromWorkspace,
  type InheritanceContext,
  type InheritancePolicy,
  type OriginAnnotation,
  type ResourceOwnerType,
} from "../../shared/resourceInheritance";
import { requireWorkspaceAccess } from "./sharedScope";

export type ResourceActor = {
  workspaceId: string;
  workspaceType: string;
  role: string;
  parishId: string;
  dioceseId: string | null;
  communityId: string | null;
  ownerType: ResourceOwnerType;
  ownerId: string;
  isPlatformAdmin: boolean;
  context: InheritanceContext;
};

export async function resolveResourceActor(
  context: any,
  workspaceId?: string | null,
): Promise<ResourceActor> {
  if (!context.user) throw new HttpError(401);

  let parish: {
    id: string;
    type: string;
    dioceseId: string | null;
  } | null = null;
  let role = "PERSONAL_OWNER";
  let communityId: string | null = null;
  let isPlatformAdmin = Boolean(context.user.isAdmin);

  if (workspaceId) {
    const access = await requireWorkspaceAccess(context, workspaceId);
    parish = await context.entities.Parish.findUnique({
      where: { id: workspaceId },
      select: { id: true, type: true, dioceseId: true },
    });
    if (!parish) throw new HttpError(404, "Espaço não encontrado.");
    role = access.role;
    communityId = access.communityId;
    isPlatformAdmin = access.isPlatformAdmin;
  } else if (isPlatformAdmin) {
    throw new HttpError(400, "workspaceId é obrigatório.");
  } else {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: "ACTIVE" },
      select: {
        role: true,
        communityId: true,
        parish: { select: { id: true, type: true, dioceseId: true } },
      },
    });
    if (membership?.parish) {
      parish = membership.parish;
      role = membership.role;
      communityId = membership.communityId;
    } else {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: "PERSONAL" },
        select: { id: true, type: true, dioceseId: true },
      });
      if (!personal) {
        throw new HttpError(400, "Você não está vinculado a nenhum espaço.");
      }
      parish = personal;
      role = "PERSONAL_OWNER";
    }
  }

  if (!parish) throw new HttpError(400, "Espaço não encontrado.");

  const ownerType = ownerTypeFromWorkspace(parish.type);
  const dioceseId = parish.dioceseId;
  const ownerId = ownerType === "DIOCESE" ? dioceseId || parish.id : parish.id;

  return {
    workspaceId: parish.id,
    workspaceType: parish.type,
    role,
    parishId: parish.id,
    dioceseId,
    communityId,
    ownerType,
    ownerId,
    isPlatformAdmin,
    context: {
      ownerType,
      ownerId,
      dioceseId,
      parishId: parish.id,
      communityId,
    },
  };
}

export function assertCanPublish(
  actor: ResourceActor,
  ownerType: ResourceOwnerType = actor.ownerType,
) {
  if (!canPublishAt(actor.role, ownerType, actor.isPlatformAdmin)) {
    throw new HttpError(
      403,
      "Você não tem permissão para publicar neste nível.",
    );
  }
}

export function ownerFieldsFor(actor: ResourceActor) {
  return {
    ownerType: actor.ownerType,
    dioceseId: actor.dioceseId,
    parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
    communityId: actor.ownerType === "COMMUNITY" ? actor.communityId : null,
  };
}

export async function resolveActorForResource(
  context: any,
  resource: {
    parishId?: string | null;
    dioceseId?: string | null;
    ownerType?: string | null;
  },
  workspaceId?: string | null,
): Promise<ResourceActor> {
  if (workspaceId) return resolveResourceActor(context, workspaceId);
  if (resource.parishId) {
    return resolveResourceActor(context, resource.parishId);
  }
  if (resource.dioceseId) {
    const dioceseWorkspace = await context.entities.Parish.findFirst({
      where: { dioceseId: resource.dioceseId, type: "DIOCESE" },
      select: { id: true },
    });
    if (dioceseWorkspace) {
      return resolveResourceActor(context, dioceseWorkspace.id);
    }
  }
  return resolveResourceActor(context);
}

export function canManageOwned(
  actor: ResourceActor,
  resource: {
    ownerType?: string | null;
    inheritancePolicy?: string | null;
  },
): boolean {
  return canEditResource({
    role: actor.role,
    actorOwnerType: actor.ownerType,
    resourceOwnerType: (resource.ownerType ||
      actor.ownerType) as ResourceOwnerType,
    policy: (resource.inheritancePolicy || "LOCAL") as InheritancePolicy,
    isPlatformAdmin: actor.isPlatformAdmin,
  });
}

export function assertCanManageOwned(
  actor: ResourceActor,
  resource: {
    ownerType?: string | null;
    inheritancePolicy?: string | null;
  },
) {
  if (!canManageOwned(actor, resource)) {
    throw new HttpError(403, "Você não pode alterar este recurso.");
  }
}

export function isPublishedStatus(status: string | null | undefined): boolean {
  return status === "PUBLISHED" || status === "APPROVED";
}

export function actorCanViewOfficialResource(
  actor: ResourceActor,
  row: {
    ownerType?: string | null;
    inheritancePolicy?: string | null;
    status?: string | null;
    dioceseId?: string | null;
    parishId?: string | null;
    communityId?: string | null;
    classId?: string | null;
  },
): boolean {
  if (actor.isPlatformAdmin) return true;
  const published = isPublishedStatus(row.status);
  const ownDrafts = canPublishAt(
    actor.role,
    actor.ownerType,
    actor.isPlatformAdmin,
  );

  if (row.ownerType === actor.ownerType) {
    if (actor.ownerType === "DIOCESE") {
      return row.dioceseId === actor.dioceseId && (published || ownDrafts);
    }
    if (actor.ownerType === "COMMUNITY") {
      return row.communityId === actor.communityId && (published || ownDrafts);
    }
    if (actor.ownerType === "CLASS") {
      return Boolean(row.classId) && (published || ownDrafts);
    }
    return row.parishId === actor.parishId && (published || ownDrafts);
  }

  if (!published || row.inheritancePolicy === "LOCAL") return false;
  if (row.ownerType === "DIOCESE") {
    return Boolean(actor.dioceseId && row.dioceseId === actor.dioceseId);
  }
  if (row.ownerType === "PARISH") return row.parishId === actor.parishId;
  if (row.ownerType === "COMMUNITY") {
    return row.communityId === actor.communityId;
  }
  return false;
}

export function withOrigin<
  T extends {
    ownerType?: ResourceOwnerType | string | null;
    inheritancePolicy?: InheritancePolicy | string | null;
    dioceseId?: string | null;
    parishId?: string | null;
    communityId?: string | null;
    classId?: string | null;
  },
>(
  row: T,
  actor: ResourceActor,
): T & {
  origin: OriginAnnotation;
  inherited: boolean;
  canManage: boolean;
} {
  const ownerType = (row.ownerType || actor.ownerType) as ResourceOwnerType;
  const policy = (row.inheritancePolicy || "LOCAL") as InheritancePolicy;
  const ownerId =
    ownerType === "DIOCESE"
      ? row.dioceseId || actor.dioceseId || actor.ownerId
      : ownerType === "COMMUNITY"
        ? row.communityId || actor.communityId || actor.ownerId
        : ownerType === "CLASS"
          ? row.classId || actor.ownerId
          : row.parishId || actor.parishId;
  const origin = annotateOrigin({
    ownerType,
    ownerId: ownerId || actor.ownerId,
    policy,
    viewerOwnerType: actor.ownerType,
  });
  return {
    ...row,
    origin,
    inherited: origin.inherited,
    canManage: canManageOwned(actor, row),
  };
}
