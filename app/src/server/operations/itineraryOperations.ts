import { HttpError } from "wasp/server";
import { z } from "zod";
import { defaultPolicyFor } from "../../shared/resourceInheritance";
import { validateOrThrow } from "../validation";
import {
  assertCanManageOwned,
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const stageInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  minAge: z.number().int().min(0).max(120).optional(),
  durationWeeks: z.number().int().min(1).max(520).optional(),
});

const createItinerarySchema = z.object({
  workspaceId: uuid.optional(),
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  inheritancePolicy: z
    .enum(["LOCKED", "REQUIRED_EXTENDABLE", "SUGGESTED", "LOCAL"])
    .optional(),
  stages: z.array(stageInput).max(30).optional(),
});

const updateItinerarySchema = z.object({
  id: uuid,
  workspaceId: uuid.optional(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z
    .enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  inheritancePolicy: z
    .enum(["LOCKED", "REQUIRED_EXTENDABLE", "SUGGESTED", "LOCAL"])
    .optional(),
  stages: z.array(stageInput).max(30).optional(),
});

export const listCatecheticalItineraries = async (
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
        status: "PUBLISHED",
        inheritancePolicy: { not: "LOCAL" },
      });
    }
  }

  const rows = await context.entities.CatecheticalItinerary.findMany({
    where: or.length ? { OR: or } : { id: { in: [] } },
    orderBy: { updatedAt: "desc" },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { years: true } },
    },
    take: 100,
  });
  const seen = new Set<string>();
  return rows
    .filter((row: any) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map((row: any) => withOrigin(row, actor));
};

export const createCatecheticalItinerary = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(createItinerarySchema, args);
  const actor = await resolveResourceActor(context, validated.workspaceId);
  assertCanPublish(actor);

  return context.entities.CatecheticalItinerary.create({
    data: {
      name: validated.name.trim(),
      description: validated.description || null,
      ownerType: actor.ownerType,
      inheritancePolicy:
        validated.inheritancePolicy ||
        defaultPolicyFor("ITINERARY", actor.ownerType),
      dioceseId: actor.dioceseId,
      parishId: actor.ownerType === "DIOCESE" ? null : actor.parishId,
      createdById: context.user.id,
      status: "DRAFT",
      stages: {
        create: (validated.stages || []).map((stage, index) => ({
          name: stage.name,
          description: stage.description || null,
          minAge: stage.minAge ?? null,
          durationWeeks: stage.durationWeeks ?? null,
          order: index,
        })),
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });
};

export const publishCatecheticalItinerary = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const id = validateOrThrow(z.object({ id: uuid }), args).id;
  const row = await context.entities.CatecheticalItinerary.findUnique({
    where: { id },
  });
  if (!row) throw new HttpError(404, "Itinerário não encontrado.");
  const actor = await resolveActorForResource(context, row);
  assertCanPublish(actor, row.ownerType);
  assertCanManageOwned(actor, row);
  return context.entities.CatecheticalItinerary.update({
    where: { id },
    data: { status: "PUBLISHED" },
    include: { stages: { orderBy: { order: "asc" } } },
  });
};

export const updateCatecheticalItinerary = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(updateItinerarySchema, args);
  const row = await context.entities.CatecheticalItinerary.findUnique({
    where: { id: validated.id },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!row) throw new HttpError(404, "Itinerário não encontrado.");

  const actor = await resolveActorForResource(
    context,
    row,
    validated.workspaceId,
  );
  assertCanManageOwned(actor, row);

  const data: any = {};
  if (validated.name !== undefined) data.name = validated.name.trim();
  if (validated.description !== undefined) {
    data.description = validated.description || null;
  }
  if (validated.status !== undefined) data.status = validated.status;
  if (validated.inheritancePolicy !== undefined) {
    data.inheritancePolicy = validated.inheritancePolicy;
  }

  if (validated.stages) {
    await context.entities.CatecheticalItineraryStage.deleteMany({
      where: { itineraryId: row.id },
    });
    data.stages = {
      create: validated.stages.map((stage, index) => ({
        name: stage.name,
        description: stage.description || null,
        minAge: stage.minAge ?? null,
        durationWeeks: stage.durationWeeks ?? null,
        order: index,
      })),
    };
  }

  const updated = await context.entities.CatecheticalItinerary.update({
    where: { id: row.id },
    data,
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { years: true } },
    },
  });
  return withOrigin(updated, actor);
};

export const deleteCatecheticalItinerary = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { id, workspaceId } = validateOrThrow(
    z.object({ id: uuid, workspaceId: uuid.optional() }),
    args,
  );
  const row = await context.entities.CatecheticalItinerary.findUnique({
    where: { id },
    include: { _count: { select: { years: true } } },
  });
  if (!row) throw new HttpError(404, "Itinerário não encontrado.");

  const actor = await resolveActorForResource(context, row, workspaceId);
  assertCanManageOwned(actor, row);

  const hasYears = (row._count?.years || 0) > 0;
  if (row.status === "DRAFT" && !hasYears) {
    await context.entities.CatecheticalItinerary.delete({ where: { id } });
    return { id, deleted: true, archived: false };
  }

  const archived = await context.entities.CatecheticalItinerary.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { id: archived.id, deleted: false, archived: true };
};

export const instantiateCatecheticalItinerary = async (
  args: {
    itineraryId: string;
    workspaceId?: string;
    name: string;
    startDate: string;
    endDate: string;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const validated = validateOrThrow(
    z
      .object({
        itineraryId: uuid,
        workspaceId: uuid.optional(),
        name: z.string().min(2).max(100),
        startDate: z.string(),
        endDate: z.string(),
      })
      .refine((d) => new Date(d.startDate) < new Date(d.endDate), {
        message: "A data de início deve ser anterior à data de fim.",
        path: ["endDate"],
      }),
    args,
  );
  const actor = await resolveResourceActor(context, validated.workspaceId);
  if (actor.workspaceType === "DIOCESE") {
    throw new HttpError(
      400,
      "Instancie o itinerário a partir de uma paróquia.",
    );
  }
  assertCanPublish(actor, "PARISH");

  const itinerary = await context.entities.CatecheticalItinerary.findUnique({
    where: { id: validated.itineraryId },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!itinerary) throw new HttpError(404, "Itinerário não encontrado.");
  if (
    itinerary.status !== "PUBLISHED" &&
    itinerary.parishId !== actor.parishId
  ) {
    throw new HttpError(400, "Publique o itinerário antes de instanciá-lo.");
  }

  const year = await context.entities.CatecheticalYear.create({
    data: {
      name: validated.name.trim(),
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      parishId: actor.parishId,
      sourceItineraryId: itinerary.id,
      ownerType: "PARISH",
      inheritancePolicy: "LOCAL",
      stages: {
        create: itinerary.stages.map((stage: any) => ({
          name: stage.name,
          description: stage.description,
          order: stage.order,
        })),
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  await context.entities.ResourceAdoption.upsert({
    where: {
      resourceKind_sourceId_adopterType_adopterId: {
        resourceKind: "ITINERARY",
        sourceId: itinerary.id,
        adopterType: "PARISH",
        adopterId: actor.parishId,
      },
    },
    create: {
      resourceKind: "ITINERARY",
      sourceId: itinerary.id,
      adopterType: "PARISH",
      adopterId: actor.parishId,
      status: "INHERITED",
      adaptedCopyId: year.id,
      adoptedById: context.user.id,
    },
    update: { adaptedCopyId: year.id, status: "INHERITED" },
  });

  return year;
};
