import { HttpError } from "wasp/server";
import { z } from "zod";
import { canPublishAt } from "../../shared/resourceInheritance";
import { validateOrThrow } from "../validation";
import {
  assertCanManageOwned,
  assertCanPublish,
  canManageOwned,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const trackKindEnum = z.enum([
  "INITIAL",
  "PERMANENT",
  "INSTITUTED_MINISTRY",
  "COORDINATION",
  "INCLUSIVE",
]);

const policyEnum = z.enum([
  "LOCKED",
  "REQUIRED_EXTENDABLE",
  "SUGGESTED",
  "LOCAL",
]);

function userName(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
) {
  if (!user) return "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "";
}

function actorCanViewTrack(actor: any, track: any): boolean {
  if (actor.isPlatformAdmin) return true;
  if (track.ownerType === actor.ownerType) {
    if (actor.ownerType === "DIOCESE") {
      return track.dioceseId === actor.dioceseId;
    }
    return track.parishId === actor.parishId;
  }
  if (!track.active || track.inheritancePolicy === "LOCAL") return false;
  if (track.ownerType === "DIOCESE") {
    return Boolean(actor.dioceseId && track.dioceseId === actor.dioceseId);
  }
  return track.parishId === actor.parishId;
}

export const listFormationTracks = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const actor = await resolveResourceActor(
    context,
    args && typeof args === "object" ? args.workspaceId : undefined,
  );

  const or: any[] = [];
  if (actor.ownerType === "DIOCESE") {
    or.push({ dioceseId: actor.dioceseId, ownerType: "DIOCESE" });
  } else {
    or.push({
      parishId: actor.parishId,
      ownerType: { in: ["PARISH", "COMMUNITY"] },
    });
    if (actor.dioceseId) {
      or.push({
        dioceseId: actor.dioceseId,
        ownerType: "DIOCESE",
        active: true,
        inheritancePolicy: { not: "LOCAL" },
      });
    }
  }

  const tracks = await context.entities.FormationTrack.findMany({
    where: or.length ? { OR: or } : { id: { in: [] } },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { startsAt: "asc" }, take: 8 },
      enrollments: {
        where: { userId: context.user.id },
        take: 1,
      },
      _count: { select: { enrollments: true, sessions: true } },
    },
    take: 100,
  });

  const seen = new Set<string>();
  return tracks
    .filter((track: any) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    })
    .map((track: any) => {
      const annotated = withOrigin(track, actor);
      return {
        ...annotated,
        myEnrollment: track.enrollments?.[0] ?? null,
      };
    });
};

export const getFormationTrack = async (
  args: { id: string; workspaceId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const actor = await resolveResourceActor(context, validated.workspaceId);
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.id },
    include: {
      sessions: {
        orderBy: { startsAt: "asc" },
        include: {
          attendances: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      enrollments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });
  if (!track || !actorCanViewTrack(actor, track)) {
    throw new HttpError(404, "Trilha não encontrada.");
  }

  const canManage = canManageOwned(actor, track);
  const canSeeRoster =
    canManage ||
    canPublishAt(actor.role, actor.ownerType, actor.isPlatformAdmin);

  let enrollments = track.enrollments.map((row: any) => ({
    id: row.id,
    status: row.status,
    hoursDone: row.hoursDone,
    completedAt: row.completedAt,
    userId: row.userId,
    userName: userName(row.user),
  }));

  if (!canSeeRoster) {
    enrollments = enrollments.filter(
      (row: any) => row.userId === context.user.id,
    );
  } else if (!canManage) {
    const members = await context.entities.Membership.findMany({
      where: { parishId: actor.parishId, status: "ACTIVE" },
      select: { userId: true },
    });
    const allowed = new Set(members.map((m: any) => m.userId));
    allowed.add(context.user.id);
    enrollments = enrollments.filter((row: any) => allowed.has(row.userId));
  }

  const allowedUserIds = new Set(enrollments.map((e: any) => e.userId));
  const sessions = track.sessions.map((session: any) => ({
    id: session.id,
    title: session.title,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    location: session.location,
    hours: session.hours,
    notes: session.notes,
    attendances: (session.attendances || [])
      .filter((a: any) => allowedUserIds.has(a.userId) || canManage)
      .map((a: any) => ({
        id: a.id,
        userId: a.userId,
        present: a.present,
        userName: userName(a.user),
      })),
  }));

  const annotated = withOrigin(track, actor);
  return {
    ...annotated,
    sessions,
    enrollments,
    myEnrollment:
      track.enrollments.find((e: any) => e.userId === context.user.id) || null,
    canSeeRoster,
  };
};

export const createFormationTrack = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      workspaceId: uuid.optional(),
      name: z.string().min(2).max(200),
      description: z.string().max(5000).optional(),
      kind: trackKindEnum.default("INITIAL"),
      hours: z.number().int().min(1).max(2000).optional(),
      inheritancePolicy: policyEnum.optional(),
    }),
    args,
  );
  const actor = await resolveResourceActor(context, validated.workspaceId);
  assertCanPublish(actor);

  return context.entities.FormationTrack.create({
    data: {
      name: validated.name.trim(),
      description: validated.description || null,
      kind: validated.kind,
      hours: validated.hours ?? null,
      ownerType: actor.ownerType,
      inheritancePolicy: validated.inheritancePolicy || "SUGGESTED",
      dioceseId: actor.dioceseId,
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      createdById: context.user.id,
    },
  });
};

export const updateFormationTrack = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      id: uuid,
      workspaceId: uuid.optional(),
      name: z.string().min(2).max(200).optional(),
      description: z.string().max(5000).nullable().optional(),
      kind: trackKindEnum.optional(),
      hours: z.number().int().min(1).max(2000).nullable().optional(),
      active: z.boolean().optional(),
      inheritancePolicy: policyEnum.optional(),
    }),
    args,
  );
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.id },
  });
  if (!track) throw new HttpError(404, "Trilha não encontrada.");
  const actor = await resolveActorForResource(
    context,
    track,
    validated.workspaceId,
  );
  assertCanManageOwned(actor, track);

  const data: any = {};
  if (validated.name !== undefined) data.name = validated.name.trim();
  if (validated.description !== undefined) {
    data.description = validated.description || null;
  }
  if (validated.kind !== undefined) data.kind = validated.kind;
  if (validated.hours !== undefined) data.hours = validated.hours;
  if (validated.active !== undefined) data.active = validated.active;
  if (validated.inheritancePolicy !== undefined) {
    data.inheritancePolicy = validated.inheritancePolicy;
  }

  return context.entities.FormationTrack.update({
    where: { id: track.id },
    data,
  });
};

export const deleteFormationTrack = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id, workspaceId } = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const track = await context.entities.FormationTrack.findUnique({
    where: { id },
    include: { _count: { select: { enrollments: true, sessions: true } } },
  });
  if (!track) throw new HttpError(404, "Trilha não encontrada.");
  const actor = await resolveActorForResource(context, track, workspaceId);
  assertCanManageOwned(actor, track);

  const hasHistory =
    (track._count?.enrollments || 0) > 0 || (track._count?.sessions || 0) > 0;
  if (!hasHistory) {
    await context.entities.FormationTrack.delete({ where: { id } });
    return { id, deleted: true, archived: false };
  }
  await context.entities.FormationTrack.update({
    where: { id },
    data: { active: false },
  });
  return { id, deleted: false, archived: true };
};

export const createFormationSession = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      trackId: uuid,
      workspaceId: uuid.optional(),
      title: z.string().min(2).max(200),
      startsAt: z.string(),
      endsAt: z.string().optional(),
      location: z.string().max(200).optional(),
      hours: z.number().int().min(1).max(80).optional(),
      notes: z.string().max(5000).optional(),
    }),
    args,
  );
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.trackId },
  });
  if (!track) throw new HttpError(404, "Trilha não encontrada.");
  const actor = await resolveActorForResource(
    context,
    track,
    validated.workspaceId,
  );
  assertCanManageOwned(actor, track);

  return context.entities.FormationSession.create({
    data: {
      trackId: track.id,
      title: validated.title.trim(),
      startsAt: new Date(validated.startsAt),
      endsAt: validated.endsAt ? new Date(validated.endsAt) : null,
      location: validated.location || null,
      hours: validated.hours ?? null,
      notes: validated.notes || null,
    },
  });
};

export const updateFormationSession = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      id: uuid,
      workspaceId: uuid.optional(),
      title: z.string().min(2).max(200).optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().nullable().optional(),
      location: z.string().max(200).nullable().optional(),
      hours: z.number().int().min(1).max(80).nullable().optional(),
      notes: z.string().max(5000).nullable().optional(),
    }),
    args,
  );
  const session = await context.entities.FormationSession.findUnique({
    where: { id: validated.id },
    include: { track: true },
  });
  if (!session)
    throw new HttpError(404, "Encontro de formação não encontrado.");
  const actor = await resolveActorForResource(
    context,
    session.track,
    validated.workspaceId,
  );
  assertCanManageOwned(actor, session.track);

  const data: any = {};
  if (validated.title !== undefined) data.title = validated.title.trim();
  if (validated.startsAt !== undefined)
    data.startsAt = new Date(validated.startsAt);
  if (validated.endsAt !== undefined) {
    data.endsAt = validated.endsAt ? new Date(validated.endsAt) : null;
  }
  if (validated.location !== undefined)
    data.location = validated.location || null;
  if (validated.hours !== undefined) data.hours = validated.hours;
  if (validated.notes !== undefined) data.notes = validated.notes || null;

  return context.entities.FormationSession.update({
    where: { id: session.id },
    data,
  });
};

export const deleteFormationSession = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id, workspaceId } = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const session = await context.entities.FormationSession.findUnique({
    where: { id },
    include: { track: true },
  });
  if (!session)
    throw new HttpError(404, "Encontro de formação não encontrado.");
  const actor = await resolveActorForResource(
    context,
    session.track,
    workspaceId,
  );
  assertCanManageOwned(actor, session.track);
  await context.entities.FormationSession.delete({ where: { id } });
  return { success: true };
};

export const enrollInFormationTrack = async (
  args: { trackId: string; workspaceId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({ trackId: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const actor = await resolveResourceActor(context, validated.workspaceId);
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.trackId },
  });
  if (!track || !actorCanViewTrack(actor, track) || !track.active) {
    throw new HttpError(404, "Trilha não encontrada.");
  }
  return context.entities.FormationEnrollment.upsert({
    where: {
      trackId_userId: { trackId: track.id, userId: context.user.id },
    },
    create: { trackId: track.id, userId: context.user.id },
    update: { status: "ENROLLED" },
  });
};

export const unenrollFromFormationTrack = async (
  args: { trackId: string; workspaceId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({ trackId: uuid, workspaceId: uuid.optional() }),
    args,
  );
  await resolveResourceActor(context, validated.workspaceId);
  const enrollment = await context.entities.FormationEnrollment.findUnique({
    where: {
      trackId_userId: { trackId: validated.trackId, userId: context.user.id },
    },
  });
  if (!enrollment) throw new HttpError(404, "Inscrição não encontrada.");
  return context.entities.FormationEnrollment.update({
    where: { id: enrollment.id },
    data: { status: "DROPPED" },
  });
};

export const markFormationAttendance = async (
  args: {
    sessionId: string;
    userId: string;
    present?: boolean;
    workspaceId?: string;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      sessionId: uuid,
      userId: uuid,
      present: z.boolean().optional(),
      workspaceId: uuid.optional(),
    }),
    args,
  );
  const session = await context.entities.FormationSession.findUnique({
    where: { id: validated.sessionId },
    include: { track: true },
  });
  if (!session)
    throw new HttpError(404, "Encontro de formação não encontrado.");

  const viewer = await resolveResourceActor(context, validated.workspaceId);
  const ownerActor = await resolveActorForResource(context, session.track);

  if (validated.userId !== context.user.id) {
    const managesTrack = canManageOwned(ownerActor, session.track);
    const parishCoord = canPublishAt(
      viewer.role,
      viewer.ownerType,
      viewer.isPlatformAdmin,
    );
    if (!managesTrack) {
      if (!parishCoord) {
        throw new HttpError(
          403,
          "Sem permissão para marcar presença de outra pessoa.",
        );
      }
      const membership = await context.entities.Membership.findFirst({
        where: {
          userId: validated.userId,
          parishId: viewer.parishId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!membership && validated.userId !== context.user.id) {
        throw new HttpError(
          403,
          "Só é possível marcar presença de membros deste espaço.",
        );
      }
    }
  }

  const enrollment = await context.entities.FormationEnrollment.findUnique({
    where: {
      trackId_userId: {
        trackId: session.trackId,
        userId: validated.userId,
      },
    },
  });
  if (!enrollment || enrollment.status === "DROPPED") {
    throw new HttpError(400, "A pessoa precisa estar inscrita na trilha.");
  }

  return context.entities.FormationAttendance.upsert({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId: validated.userId,
      },
    },
    create: {
      sessionId: session.id,
      userId: validated.userId,
      present: validated.present ?? true,
      recordedById: context.user.id,
    },
    update: {
      present: validated.present ?? true,
      recordedById: context.user.id,
    },
  });
};

export const getHierarchyAdoptionReport = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const actor = await resolveResourceActor(
    context,
    args && typeof args === "object" ? args.workspaceId : undefined,
  );
  if (actor.ownerType !== "DIOCESE" && !actor.isPlatformAdmin) {
    throw new HttpError(
      403,
      "Apenas a coordenação diocesana vê o relatório de adesão.",
    );
  }
  if (!actor.dioceseId) {
    throw new HttpError(400, "Este espaço não está ligado a uma diocese.");
  }

  const parishes = await context.entities.Parish.findMany({
    where: {
      dioceseId: actor.dioceseId,
      type: { in: ["PARISH", "COMMUNITY"] },
    },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { classes: true, memberships: true } },
    },
    take: 200,
  });
  const parishIds = parishes.map((p: any) => p.id);

  const [resources, itineraries, tracks, adoptions, itineraryAdoptions] =
    await Promise.all([
      context.entities.OfficialResource.count({
        where: { dioceseId: actor.dioceseId, status: "PUBLISHED" },
      }),
      context.entities.CatecheticalItinerary.count({
        where: { dioceseId: actor.dioceseId, status: "PUBLISHED" },
      }),
      context.entities.FormationTrack.findMany({
        where: { dioceseId: actor.dioceseId, active: true },
        select: {
          id: true,
          name: true,
          _count: { select: { enrollments: true } },
        },
      }),
      context.entities.OfficialResourceAdoption.findMany({
        where: { adopterType: "PARISH", adopterId: { in: parishIds } },
        select: { adopterId: true, status: true },
      }),
      context.entities.ResourceAdoption.findMany({
        where: {
          resourceKind: "ITINERARY",
          adopterType: "PARISH",
          adopterId: { in: parishIds },
        },
        select: { adopterId: true, status: true },
      }),
    ]);

  const adoptionByParish: Record<
    string,
    { official: number; itinerary: number }
  > = {};
  for (const parish of parishes) {
    adoptionByParish[parish.id] = { official: 0, itinerary: 0 };
  }
  for (const row of adoptions) {
    if (adoptionByParish[row.adopterId] && row.status !== "DISMISSED") {
      adoptionByParish[row.adopterId].official += 1;
    }
  }
  for (const row of itineraryAdoptions) {
    if (adoptionByParish[row.adopterId]) {
      adoptionByParish[row.adopterId].itinerary += 1;
    }
  }

  const enrolled = tracks.reduce(
    (sum: number, track: any) => sum + (track._count?.enrollments || 0),
    0,
  );

  return {
    dioceseId: actor.dioceseId,
    publishedResources: resources,
    publishedItineraries: itineraries,
    formationTracks: tracks.length,
    formationEnrollments: enrolled,
    parishes: parishes.map((parish: any) => ({
      id: parish.id,
      name: parish.name,
      type: parish.type,
      classCount: parish._count.classes,
      memberCount: parish._count.memberships,
      officialAdoptions: adoptionByParish[parish.id]?.official ?? 0,
      itineraryAdoptions: adoptionByParish[parish.id]?.itinerary ?? 0,
    })),
  };
};
