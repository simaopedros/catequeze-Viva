import { HttpError } from "wasp/server";
import { getDioceseParishIds } from "../auth/helpers";
import { resolveUserLocale } from "../i18n/serverLocale";
import {
  canEditResource,
  defaultPolicyFor,
  type InheritancePolicy,
  type ResourceOwnerType,
} from "../../shared/resourceInheritance";
import {
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

function layeredEventWhere(args: {
  parishId?: string | null;
  dioceseId?: string | null;
  communityId?: string | null;
  ownerType?: ResourceOwnerType;
}) {
  const or: any[] = [];
  if (args.parishId) or.push({ parishId: args.parishId });
  if (args.dioceseId) {
    or.push({
      dioceseId: args.dioceseId,
      ownerType: "DIOCESE",
      inheritancePolicy: { not: "LOCAL" },
    });
  }
  if (args.communityId) or.push({ communityId: args.communityId });
  return or.length ? { OR: or } : undefined;
}

export const listLiturgicalEvents = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const workspaceId =
    args && typeof args === "object" ? args.workspaceId : undefined;

  if (workspaceId) {
    const actor = await resolveResourceActor(context, workspaceId);
    const rows = await context.entities.LiturgicalEvent.findMany({
      where: layeredEventWhere({
        parishId: actor.parishId,
        dioceseId: actor.dioceseId,
        communityId: actor.communityId,
        ownerType: actor.ownerType,
      }),
      orderBy: { date: "asc" },
    });
    return rows.map((row: any) => withOrigin(row, actor));
  }

  if (context.user.isAdmin) {
    return context.entities.LiturgicalEvent.findMany({
      orderBy: { date: "asc" },
    });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: "ACTIVE" },
    select: { parishId: true, role: true, communityId: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);

  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: "PERSONAL" },
    select: { id: true, dioceseId: true },
  });
  if (personalWorkspace && !parishIds.includes(personalWorkspace.id)) {
    parishIds.push(personalWorkspace.id);
  }

  if (memberships.some((m: any) => m.role === "DIOCESE_ADMIN")) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) parishIds.push(id);
    }
  }

  if (parishIds.length === 0) return [];

  const parishes = await context.entities.Parish.findMany({
    where: { id: { in: parishIds } },
    select: { id: true, dioceseId: true },
  });
  const dioceseIds = [
    ...new Set(
      parishes
        .map((p: any) => p.dioceseId)
        .filter((id: any) => typeof id === "string" && id.length > 0),
    ),
  ];
  const communityIds = memberships
    .map((m: any) => m.communityId)
    .filter(Boolean);

  const or: any[] = [{ parishId: { in: parishIds } }];
  if (dioceseIds.length > 0) {
    or.push({
      dioceseId: { in: dioceseIds },
      ownerType: "DIOCESE",
      inheritancePolicy: { not: "LOCAL" },
    });
  }
  if (communityIds.length > 0) {
    or.push({ communityId: { in: communityIds } });
  }

  return context.entities.LiturgicalEvent.findMany({
    where: { OR: or },
    orderBy: { date: "asc" },
  });
};

export const createLiturgicalEvent = async (
  args: {
    name: string;
    date: string;
    description?: string;
    endDate?: string;
    color?: string;
    type?: string;
    recurring?: boolean;
    recurrenceRule?: string;
    parishId?: string;
    workspaceId?: string;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const workspaceId = args.workspaceId || args.parishId;

  const { assertStaffOperation } = await import("../auth/familySurface");
  await assertStaffOperation(context, {
    parishId: workspaceId,
    message: "Apenas a equipe pastoral pode criar eventos no calendário.",
  });

  const actor = await resolveResourceActor(context, workspaceId);
  const policy = defaultPolicyFor("CALENDAR", actor.ownerType);
  const defaultType =
    actor.ownerType === "DIOCESE"
      ? "diocese"
      : actor.ownerType === "PARISH"
        ? "parish"
        : "liturgical";

  return context.entities.LiturgicalEvent.create({
    data: {
      name: args.name,
      date: new Date(args.date),
      description: args.description,
      endDate: args.endDate ? new Date(args.endDate) : null,
      color: args.color || "#6366f1",
      type: args.type || defaultType,
      recurring: args.recurring || false,
      recurrenceRule: args.recurrenceRule,
      locale: resolveUserLocale(context.user),
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      dioceseId: actor.dioceseId,
      communityId:
        actor.ownerType === "COMMUNITY" ? actor.communityId : null,
      ownerType: actor.ownerType,
      inheritancePolicy: policy,
    },
  });
};

export const deleteLiturgicalEvent = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const event = await context.entities.LiturgicalEvent.findUnique({
    where: { id: args.id },
  });
  if (!event) throw new HttpError(404, "Evento nao encontrado.");

  const { assertStaffOperation } = await import("../auth/familySurface");
  await assertStaffOperation(context, {
    parishId: event.parishId,
    message: "Apenas a equipe pastoral pode remover eventos do calendário.",
  });

  const actor = await resolveActorForResource(context, event);
  const policy = (event.inheritancePolicy ||
    "REQUIRED_EXTENDABLE") as InheritancePolicy;
  const ownerType = (event.ownerType || "PARISH") as ResourceOwnerType;
  if (
    !canEditResource({
      role: actor.role,
      actorOwnerType: actor.ownerType,
      resourceOwnerType: ownerType,
      policy,
      isPlatformAdmin: actor.isPlatformAdmin,
    })
  ) {
    throw new HttpError(
      403,
      "Eventos herdados não podem ser removidos neste nível.",
    );
  }

  if (!context.user.isAdmin) {
    if (!event.parishId && ownerType !== "DIOCESE") {
      throw new HttpError(403, "Apenas admin pode remover eventos globais.");
    }
    if (ownerType !== "DIOCESE" && event.parishId) {
      const membership = await context.entities.Membership.findFirst({
        where: {
          userId: context.user.id,
          parishId: event.parishId,
          status: "ACTIVE",
          role: {
            in: [
              "SUPER_ADMIN",
              "DIOCESE_ADMIN",
              "PARISH_COORDINATOR",
              "COMMUNITY_COORDINATOR",
              "PERSONAL_OWNER",
            ],
          },
        },
      });
      const isPersonalOwner =
        !membership &&
        (await context.entities.Parish.findFirst({
          where: {
            id: event.parishId,
            ownerId: context.user.id,
            type: "PERSONAL",
          },
          select: { id: true },
        }));
      if (!membership && !isPersonalOwner) {
        throw new HttpError(
          403,
          "Voce nao tem permissao para remover este evento.",
        );
      }
    }
  }

  return context.entities.LiturgicalEvent.delete({ where: { id: args.id } });
};
