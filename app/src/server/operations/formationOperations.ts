import { HttpError } from "wasp/server";
import { z } from "zod";
import { validateOrThrow } from "../validation";
import {
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
} from "./resourceScope";

const uuid = z.string().uuid();

export const listFormationTracks = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const actor = await resolveResourceActor(
    context,
    args && typeof args === "object" ? args.workspaceId : undefined,
  );

  const or: any[] = [{ parishId: actor.parishId, active: true }];
  if (actor.dioceseId) {
    or.push({ dioceseId: actor.dioceseId, active: true });
  }

  const tracks = await context.entities.FormationTrack.findMany({
    where: { OR: or },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { startsAt: "asc" }, take: 20 },
      enrollments: {
        where: { userId: context.user.id },
        take: 1,
      },
      _count: { select: { enrollments: true, sessions: true } },
    },
    take: 100,
  });

  return tracks.map((track: any) => ({
    ...track,
    inherited: track.ownerType !== actor.ownerType,
    myEnrollment: track.enrollments?.[0] ?? null,
  }));
};

export const createFormationTrack = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      workspaceId: uuid.optional(),
      name: z.string().min(2).max(200),
      description: z.string().max(5000).optional(),
      kind: z
        .enum([
          "INITIAL",
          "PERMANENT",
          "INSTITUTED_MINISTRY",
          "COORDINATION",
          "INCLUSIVE",
        ])
        .default("INITIAL"),
      hours: z.number().int().min(1).max(2000).optional(),
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
      inheritancePolicy: "SUGGESTED",
      dioceseId: actor.dioceseId,
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      createdById: context.user.id,
    },
  });
};

export const createFormationSession = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      trackId: uuid,
      title: z.string().min(2).max(200),
      startsAt: z.string(),
      endsAt: z.string().optional(),
      location: z.string().max(200).optional(),
      hours: z.number().int().min(1).max(80).optional(),
    }),
    args,
  );
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.trackId },
  });
  if (!track) throw new HttpError(404, "Trilha não encontrada.");
  const actor = await resolveActorForResource(context, track);
  assertCanPublish(actor, track.ownerType);

  return context.entities.FormationSession.create({
    data: {
      trackId: track.id,
      title: validated.title.trim(),
      startsAt: new Date(validated.startsAt),
      endsAt: validated.endsAt ? new Date(validated.endsAt) : null,
      location: validated.location || null,
      hours: validated.hours ?? null,
    },
  });
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
  await resolveResourceActor(context, validated.workspaceId);
  const track = await context.entities.FormationTrack.findUnique({
    where: { id: validated.trackId },
  });
  if (!track || !track.active) {
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

export const markFormationAttendance = async (
  args: { sessionId: string; userId: string; present?: boolean },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z.object({
      sessionId: uuid,
      userId: uuid,
      present: z.boolean().optional(),
    }),
    args,
  );
  const session = await context.entities.FormationSession.findUnique({
    where: { id: validated.sessionId },
    include: { track: true },
  });
  if (!session) throw new HttpError(404, "Encontro de formação não encontrado.");
  const actor = await resolveActorForResource(context, session.track);
  if (validated.userId !== context.user.id) {
    assertCanPublish(actor, session.track.ownerType);
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

  const adoptionByParish: Record<string, { official: number; itinerary: number }> =
    {};
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
