import { documentRequirementsForWhere } from "../documents/requirements";
import { HttpError, prisma } from "wasp/server";
import { z } from "zod";
import {
  requireAuth,
  assertCanAccessCatechumenProfile,
  writeAuditLog,
} from "../auth/helpers";
import { requireWorkspaceAccess } from "./sharedScope";
import { listCatechumens } from "./catechumenOperations";
import {
  DOCUMENT_STAGES,
  DOCUMENT_TYPES,
} from "../../shared/documents/requirements";
import { validateOrThrow } from "../validation";

const scopeSchema = z.object({
  workspaceId: z.string().min(1),
  scope: z.enum(["PARISH", "DIOCESE"]).default("PARISH"),
});
const ruleSchema = scopeSchema
  .extend({
    stageKind: z.enum(DOCUMENT_STAGES),
    documentType: z.enum(DOCUMENT_TYPES),
    requirement: z.enum(["REQUIRED", "OPTIONAL", "NOT_APPLICABLE"]).nullable(),
  })
  .strict();
const sponsorSchema = z
  .object({
    catechumenProfileId: z.string().min(1),
    workspaceId: z.string().min(1),
    role: z.enum(["PADRINHO", "MADRINHA"]),
    name: z.string().trim().min(1).max(150),
    fromOtherParish: z.boolean(),
    parishName: z.string().trim().max(150).nullable().optional(),
  })
  .strict();

async function ruleScope(args: any, context: any, editing: boolean) {
  requireAuth(context.user);
  validateOrThrow(scopeSchema, args);
  const access = await requireWorkspaceAccess(context, args.workspaceId);
  const parish = await context.entities.Parish.findUnique({
    where: { id: args.workspaceId },
    select: { dioceseId: true },
  });
  if (!parish) throw new HttpError(404, "Paróquia não encontrada.");
  if (args.scope === "DIOCESE") {
    // Verify the actor administers this diocese, even when another role exists locally.
    const admin =
      context.user.isAdmin ||
      (await context.entities.Membership.findFirst({
        where: {
          userId: context.user.id,
          role: "DIOCESE_ADMIN",
          status: "ACTIVE",
          parish: { dioceseId: parish.dioceseId },
        },
        select: { id: true },
      }));
    if (!parish.dioceseId || !admin)
      throw new HttpError(403, "Sem permissão para configurar a diocese.");
    return { scope: "DIOCESE", dioceseId: parish.dioceseId, parishId: null };
  }
  if (
    editing &&
    !["PARISH_COORDINATOR", "PERSONAL_OWNER", "SUPER_ADMIN"].includes(
      access.role,
    )
  )
    throw new HttpError(403, "Sem permissão para configurar a paróquia.");
  return { scope: "PARISH", parishId: args.workspaceId, dioceseId: null };
}
export async function getDocumentStageRules(args: any, context: any) {
  const target = await ruleScope(args, context, true);
  const parish = await context.entities.Parish.findUnique({
    where: { id: args.workspaceId },
    select: { dioceseId: true },
  });
  const rules = await context.entities.DocumentStageRule.findMany({
    where: {
      OR: [
        { parishId: args.workspaceId },
        ...(parish.dioceseId ? [{ dioceseId: parish.dioceseId }] : []),
      ],
    },
  });
  const history = await context.entities.DocumentStageRuleChange.findMany({
    where:
      target.scope === "PARISH" && parish.dioceseId
        ? {
            OR: [
              target,
              { scope: "DIOCESE", dioceseId: parish.dioceseId, parishId: null },
            ],
          }
        : target,
    orderBy: { changedAt: "desc" },
    take: 100,
  });
  const users = await context.entities.User.findMany({
    where: { id: { in: [...new Set(history.map((h: any) => h.changedById))] } },
    select: { id: true, firstName: true, lastName: true },
  });
  return {
    rules,
    history: history.map((h: any) => ({
      ...h,
      changedBy: users.find((u: any) => u.id === h.changedById),
    })),
  };
}
export async function setDocumentStageRule(args: any, context: any) {
  validateOrThrow(ruleSchema, args);
  const target = await ruleScope(args, context, true);
  const cell = {
    ...target,
    stageKind: args.stageKind,
    documentType: args.documentType,
  };
  // Serializable protects previousValue and the history against concurrent edits.
  return prisma.$transaction(
    async (tx: any) => {
      const previous = await tx.documentStageRule.findFirst({ where: cell });
      const data = {
        ...cell,
        requirement: args.requirement,
        changedById: context.user.id,
        changedAt: new Date(),
      };
      if (args.requirement === null) {
        if (previous)
          await tx.documentStageRule.delete({ where: { id: previous.id } });
      } else if (previous)
        await tx.documentStageRule.update({ where: { id: previous.id }, data });
      else await tx.documentStageRule.create({ data });
      return tx.documentStageRuleChange.create({
        data: {
          ...cell,
          previousValue: previous?.requirement ?? null,
          newValue: args.requirement,
          changedById: context.user.id,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function saveCatechumenSponsor(args: any, context: any) {
  requireAuth(context.user);
  validateOrThrow(sponsorSchema, args);
  const parsed = sponsorSchema.parse(args);
  const access = await requireWorkspaceAccess(context, parsed.workspaceId);
  if (
    ![
      "SUPER_ADMIN",
      "DIOCESE_ADMIN",
      "PARISH_COORDINATOR",
      "PERSONAL_OWNER",
      "COMMUNITY_COORDINATOR",
      "LEAD_CATECHIST",
      "ASSISTANT_CATECHIST",
      "GUARDIAN",
      "CATECHUMEN",
    ].includes(access.role)
  )
    throw new HttpError(403, "Sem permissão para editar padrinhos.");
  await assertCanAccessCatechumenProfile(
    context,
    parsed.catechumenProfileId,
    parsed.workspaceId,
  );
  const profile = await context.entities.CatechumenProfile.findUnique({
    where: { id: parsed.catechumenProfileId },
    select: { parishId: true },
  });
  if (!profile || profile.parishId !== parsed.workspaceId)
    throw new HttpError(403, "Catequizando fora da paróquia selecionada.");
  const { workspaceId, ...data } = parsed;
  const sponsor = await context.entities.CatechumenSponsor.upsert({
    where: {
      catechumenProfileId_role: {
        catechumenProfileId: data.catechumenProfileId,
        role: data.role,
      },
    },
    create: data,
    update: data,
  });
  await writeAuditLog(context, "UPDATE", "CatechumenSponsor", sponsor.id, {
    parishId: workspaceId,
    catechumenProfileId: data.catechumenProfileId,
    role: data.role,
  });
  return sponsor;
}
export async function listDocumentRequirements(
  args: { workspaceId: string },
  context: any,
) {
  requireAuth(context.user);
  const access = await requireWorkspaceAccess(context, args.workspaceId);
  // Reuse the existing role, household and class scope; paginate without truncation.
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page: any = await listCatechumens(
      {
        workspaceId: args.workspaceId,
        take: 200,
        paginated: true,
        cursor,
      } as any,
      context,
    );
    ids.push(...page.items.map((p: any) => p.id));
    cursor = page.nextCursor;
  } while (cursor);
  const classWhere = access.allowedClassIds === 'ALL'
    ? { parishId: args.workspaceId }
    : (access.isCatechist || access.isScopedCoordinator)
      ? { id: { in: access.allowedClassIds } }
      : {};
  return documentRequirementsForWhere(context, { id: { in: ids } }, classWhere);
}
