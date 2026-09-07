import { HttpError } from "wasp/server";
import { z } from "zod";
import { defaultPolicyFor } from "../../shared/resourceInheritance";
import { validateOrThrow } from "../validation";
import {
  assertCanPublish,
  resolveActorForResource,
  resolveResourceActor,
  withOrigin,
} from "./resourceScope";

const uuid = z.string().uuid();

const createItinerarySchema = z.object({
  workspaceId: uuid.optional(),
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(2000).optional(),
        minAge: z.number().int().min(0).max(120).optional(),
        durationWeeks: z.number().int().min(1).max(520).optional(),
      }),
    )
    .max(30)
    .optional(),
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

  const or: any[] = [{ parishId: actor.parishId }];
  if (actor.dioceseId) {
    or.push({
      dioceseId: actor.dioceseId,
      status: "PUBLISHED",
      inheritancePolicy: { not: "LOCAL" },
    });
  }
  if (actor.ownerType === "DIOCESE") {
    or.push({ dioceseId: actor.dioceseId, ownerType: "DIOCESE" });
  }

  const rows = await context.entities.CatecheticalItinerary.findMany({
    where: { OR: or },
    orderBy: { updatedAt: "desc" },
    include: { stages: { orderBy: { order: "asc" } }, _count: { select: { years: true } } },
    take: 100,
  });
  return rows.map((row: any) => withOrigin(row, actor));
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
      inheritancePolicy: defaultPolicyFor("ITINERARY", actor.ownerType),
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
  return context.entities.CatecheticalItinerary.update({
    where: { id },
    data: { status: "PUBLISHED" },
    include: { stages: { orderBy: { order: "asc" } } },
  });
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
  if (itinerary.status !== "PUBLISHED" && itinerary.parishId !== actor.parishId) {
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
