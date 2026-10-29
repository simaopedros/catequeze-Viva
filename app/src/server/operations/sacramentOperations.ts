import { HttpError } from "wasp/server";
import {
  validateOrThrow,
  createSacramentalJourneySchema,
  updateMilestoneStatusSchema,
  updateJourneySchema,
  createTemplateSchema,
  updateTemplateSchema,
  updateMilestoneTemplateSchema,
  deleteMilestoneTemplateSchema,
  copyTemplateSchema,
  publishTemplateSchema,
} from "../validation";
import {
  requireAuth,
  getEffectiveParishRole,
  isCoordinatorOrAboveRole,
  getDioceseParishIds,
  assertCanAccessCatechumenProfile,
} from "../auth/helpers";
import { ensureSacramentalJourneyForCatechumen } from "../sacramentHelpers";
import { requireWorkspaceAccess, resolveWorkspaceAccess } from "./sharedScope";
import type { WorkspaceAccess } from "./sharedScope";
import {
  actorCanViewOfficialResource,
  assertCanPublish,
  resolveResourceActor,
} from "./resourceScope";
import { legacyTake } from "./listCursor";
import {
  buildJourneyTemplateListWhere,
  filterJourneyTemplatesByLocale,
} from "../../shared/journeyTemplateLocale";
import { pluralPt } from "../../shared/pluralPt";

/**
 * @deprecated Prefer resolveWorkspaceAccess for authorization.
 * Used only to discover the template catalog, never to authorize mutations.
 */
async function getEffectiveParishScope(
  context: any,
): Promise<{ parishIds: string[]; roles: string[] }> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: "ACTIVE" },
    select: { parishId: true, role: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);
  const roles = memberships.map((m: any) => m.role);

  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: "PERSONAL" },
    select: { id: true },
  });
  if (personalWorkspace) {
    if (!parishIds.includes(personalWorkspace.id))
      parishIds.push(personalWorkspace.id);
    if (!roles.includes("PERSONAL_OWNER")) roles.push("PERSONAL_OWNER");
  }

  if (memberships.some((m: any) => m.role === "DIOCESE_ADMIN")) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) parishIds.push(id);
    }
    if (!roles.includes("DIOCESE_ADMIN")) roles.push("DIOCESE_ADMIN");
  }

  return { parishIds, roles };
}

// Resolve each parish independently, including class scope for local staff.
async function requireJourneyStaff(context: any, catechumen: any) {
  if (context.user.isAdmin)
    return { isCoordinatorOrAbove: true, isCatechist: false };
  const parishIds = [
    ...new Set<string>(
      [
        catechumen.parishId,
        ...catechumen.enrollments.map((e: any) => e.class.parishId),
      ].filter(Boolean),
    ),
  ];
  let catechistAccess: WorkspaceAccess | null = null;
  for (const parishId of parishIds) {
    const access = await resolveWorkspaceAccess(context, parishId, {
      required: false,
    });
    if (!access || (!access.isCoordinatorOrAbove && !access.isCatechist))
      continue;
    const inScope =
      access.allowedClassIds === "ALL" ||
      catechumen.enrollments.some(
        (e: any) =>
          e.class.parishId === parishId &&
          access.allowedClassIds.includes(e.class.id),
      );
    if (!inScope) continue;
    if (access.isCoordinatorOrAbove) return access;
    catechistAccess = access;
  }
  if (catechistAccess) return catechistAccess;
  throw new HttpError(
    403,
    "Você não tem permissão para configurar a jornada deste catequizando.",
  );
}

// ─── List Sacramental Journeys ────────────────────────────────────────────────

export const listSacramentalJourneys = async (
  _args: { workspaceId?: string; take?: number; search?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const args = _args || {};
  const workspaceId = args.workspaceId?.trim() || undefined;
  const baseInclude = {
    catechumenProfile: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parishId: true,
        enrollments: {
          select: {
            class: { select: { id: true, parishId: true, name: true } },
          },
        },
      },
    },
    template: { select: { id: true, name: true, sacramentId: true } },
    milestones: {
      include: {
        templateMilestone: {
          select: {
            id: true,
            name: true,
            required: true,
            order: true,
            evidenceRequired: true,
            daysBeforeSacrament: true,
          },
        },
      },
      orderBy: { templateMilestone: { order: "asc" } },
    },
  };
  const take = legacyTake(args.take);
  const search = args.search?.trim();
  // Server-side name filter so the UI does not have to load every journey to search.
  const searchWhere = search
    ? {
        catechumenProfile: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : null;
  const listOpts = {
    include: baseInclude,
    orderBy: [{ targetDate: "asc" as const }, { id: "asc" as const }],
    take,
  };
  const withSearch = (where: any) =>
    searchWhere ? { AND: [where, searchWhere] } : where;

  if (context.user.isAdmin && !workspaceId) {
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({}),
      ...listOpts,
    });
  }

  if (!workspaceId) return [];

  const access = await requireWorkspaceAccess(context, workspaceId);
  const parishId = access.workspaceId;

  // Coordinator+PersonalOwner: journeys in this parish only
  // (scoped community coordinators use the class-scoped branch below)
  if (access.isCoordinatorOrAbove && !access.isScopedCoordinator) {
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({
        OR: [
          {
            catechumenProfile: {
              enrollments: { some: { class: { parishId } } },
            },
          },
          { catechumenProfile: { parishId } },
        ],
      }),
      ...listOpts,
    });
  }

  // Catechist / scoped coordinator: journeys of students in allowed classes
  if (access.isCatechist || access.isScopedCoordinator) {
    const classIds =
      access.allowedClassIds === "ALL" ? [] : access.allowedClassIds;
    if (classIds.length === 0) return [];
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds }, status: "ENROLLED" },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = enrollments.map((e: any) => e.catechumenProfileId);
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({ catechumenProfileId: { in: catechumenIds } }),
      ...listOpts,
    });
  }

  // Guardian: see journeys of their dependents
  if (access.role === "GUARDIAN") {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
    });
    if (!guardian?.householdId) return [];
    const dependents = await context.entities.CatechumenProfile.findMany({
      where: { householdId: guardian.householdId },
      select: { id: true },
    });
    const dependentIds = dependents.map((d: any) => d.id);
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({ catechumenProfileId: { in: dependentIds } }),
      ...listOpts,
    });
  }

  // Catechumen: see own journeys
  if (access.role === "CATECHUMEN") {
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });
    if (!catechumen) return [];
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({ catechumenProfileId: catechumen.id }),
      ...listOpts,
    });
  }

  return [];
};

// ─── Get Sacramental Journey ──────────────────────────────────────────────────

export const getSacramentalJourney = async (
  args: { id: string },
  context: any,
) => {
  requireAuth(context.user);

  const journey = await context.entities.SacramentalJourney.findUnique({
    where: { id: args.id },
    include: {
      catechumenProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          householdId: true,
          parishId: true,
          enrollments: {
            select: {
              class: { select: { id: true, parishId: true, name: true } },
            },
          },
        },
      },
      template: {
        include: {
          sacrament: { select: { id: true, name: true } },
          parish: { select: { id: true, name: true, type: true } },
        },
      },
      milestones: {
        include: { templateMilestone: true },
        orderBy: { templateMilestone: { order: "asc" } },
      },
    },
  });

  if (!journey) throw new HttpError(404, "Jornada sacramental não encontrada.");

  // Strong AuthZ for guardians (ACTIVE membership) and staff/self — never
  // rely on ad-hoc householdId match alone after partial removals.
  await assertCanAccessCatechumenProfile(context, journey.catechumenProfile.id);
  return journey;
};

// ─── Create Sacramental Journey ───────────────────────────────────────────────

export const createSacramentalJourney = async (
  args: { catechumenProfileId: string; templateId: string },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(createSacramentalJourneySchema, args);

  // Validate template exists and load it with milestones
  const template = await context.entities.SacramentalJourneyTemplate.findUnique(
    {
      where: { id: args.templateId },
    },
  );
  if (!template) throw new HttpError(404, "Modelo de jornada não encontrado.");

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenProfileId },
    select: {
      id: true,
      parishId: true,
      enrollments: {
        select: { class: { select: { id: true, parishId: true } } },
      },
    },
  });
  if (!catechumen) throw new HttpError(404, "Catequizando não encontrado.");

  await requireJourneyStaff(context, catechumen);

  // Check for duplicate journey (unique constraint on catechumenProfileId + templateId)
  const existing = await context.entities.SacramentalJourney.findUnique({
    where: {
      catechumenProfileId_templateId: {
        catechumenProfileId: args.catechumenProfileId,
        templateId: args.templateId,
      },
    },
  });
  if (existing) {
    throw new HttpError(
      409,
      "Já existe uma jornada sacramental com este modelo para este catequizando.",
    );
  }

  const journey = await context.entities.SacramentalJourney.create({
    data: {
      catechumenProfileId: args.catechumenProfileId,
      templateId: args.templateId,
    },
    select: { id: true },
  });

  // Create all milestones in bulk
  const templateMilestones =
    await context.entities.SacramentalMilestoneTemplate.findMany({
      where: { templateId: args.templateId },
      orderBy: { order: "asc" },
    });

  if (templateMilestones.length > 0) {
    await context.entities.SacramentalMilestone.createMany({
      data: templateMilestones.map((tm: any) => ({
        journeyId: journey.id,
        templateMilestoneId: tm.id,
        status: "PENDING",
      })),
    });
  }

  return { id: journey.id };
};

// Re-exported from sacramentHelpers for use in Wasp actions
export { ensureSacramentalJourneyForCatechumen };

// ─── Update Milestone Status ──────────────────────────────────────────────────

export const updateMilestoneStatus = async (
  args: {
    milestoneId: string;
    status?: string;
    notes?: string;
    evidenceUrl?: string;
    completedAt?: string | null;
  },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(updateMilestoneStatusSchema, args);

  // Load milestone with full context for authorization
  const milestone = await context.entities.SacramentalMilestone.findUnique({
    where: { id: args.milestoneId },
    include: {
      templateMilestone: true,
      journey: {
        include: {
          catechumenProfile: {
            select: {
              id: true,
              parishId: true,
              enrollments: {
                select: { class: { select: { id: true, parishId: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!milestone) throw new HttpError(404, "Marco sacramental não encontrado.");

  const access = await requireJourneyStaff(
    context,
    milestone.journey.catechumenProfile,
  );
  const isCoordinator = access.isCoordinatorOrAbove;
  const isCatechist = access.isCatechist;
  if (!context.user.isAdmin) {
    // Catechist: prevent changes to milestones in approval chain
    if (isCatechist && !isCoordinator && args.status) {
      const allowedForCatechist = [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "WAITING_APPROVAL",
      ];
      if (!allowedForCatechist.includes(args.status)) {
        throw new HttpError(
          403,
          "Catequistas podem apenas marcar como pendente, em andamento, concluído ou enviar para aprovação. Aprovar/rejeitar requer um coordenador.",
        );
      }
    }

    // Prevent catechist from changing milestones already in APPROVED or WAITING_APPROVAL state
    if (isCatechist && !isCoordinator) {
      if (
        milestone.status === "APPROVED" ||
        milestone.status === "WAITING_APPROVAL"
      ) {
        throw new HttpError(
          403,
          "Catequistas não podem alterar marcos que estão aguardando aprovação ou já aprovados.",
        );
      }
    }
  }

  const data: any = {};
  if (args.status !== undefined) {
    data.status = args.status;
    if (args.status === "COMPLETED") data.completedAt = new Date();
    if (args.status === "APPROVED") {
      data.completedAt = new Date();
      data.approvedById = context.user.id;
    }
    if (args.status !== "COMPLETED" && args.status !== "APPROVED")
      data.completedAt = null;
  }
  if (args.notes !== undefined) data.notes = args.notes;
  if (args.evidenceUrl !== undefined) data.evidenceUrl = args.evidenceUrl;
  if (args.completedAt !== undefined)
    data.completedAt = args.completedAt ? new Date(args.completedAt) : null;

  return context.entities.SacramentalMilestone.update({
    where: { id: args.milestoneId },
    data,
    select: { id: true },
  });
};

// ─── Update Journey ───────────────────────────────────────────────────────────

export const updateJourney = async (
  args: { id: string; targetDate?: string | null },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(updateJourneySchema, args);

  // Load journey with catechumen data for scope check (same logic as getSacramentalJourney)
  const journey = await context.entities.SacramentalJourney.findUnique({
    where: { id: args.id },
    include: {
      catechumenProfile: {
        select: {
          id: true,
          parishId: true,
          enrollments: {
            select: { class: { select: { id: true, parishId: true } } },
          },
        },
      },
    },
  });
  if (!journey) throw new HttpError(404, "Jornada não encontrada.");

  await requireJourneyStaff(context, journey.catechumenProfile);

  const data: any = {};
  if (args.targetDate !== undefined)
    data.targetDate = args.targetDate ? new Date(args.targetDate) : null;

  return context.entities.SacramentalJourney.update({
    where: { id: args.id },
    data,
    select: { id: true },
  });
};

// ─── List Journey Templates ───────────────────────────────────────────────────

export const listJourneyTemplates = async (
  args: { locale?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const locale = args && typeof args === "object" ? args.locale : undefined;

  const include = {
    milestones: { orderBy: { order: "asc" } as const },
    parish: { select: { id: true, name: true, type: true, dioceseId: true } },
    sacrament: { select: { id: true, name: true } },
  };

  const applyLocale = (rows: any[]) =>
    locale ? filterJourneyTemplatesByLocale(rows, locale) : rows;

  if (context.user.isAdmin) {
    const templates =
      await context.entities.SacramentalJourneyTemplate.findMany({
        include,
      });
    return applyLocale(templates);
  }

  const { parishIds } = await getEffectiveParishScope(context);
  const parishes: any[] =
    parishIds.length === 0
      ? []
      : await context.entities.Parish.findMany({
          where: { id: { in: parishIds } },
          select: { id: true, dioceseId: true, type: true },
        });

  const dioceseIds = [
    ...new Set(
      parishes
        .map((p: any) => p.dioceseId)
        .filter((id: any) => typeof id === "string" && id.length > 0),
    ),
  ] as string[];
  const hasOnlyPersonal =
    parishes.length > 0 && parishes.every((p: any) => p.type === "PERSONAL");
  const where = buildJourneyTemplateListWhere({
    isAdmin: false,
    parishIds: parishIds as string[],
    dioceseIds,
    hasOnlyPersonal,
  });

  const templates = await context.entities.SacramentalJourneyTemplate.findMany({
    where: where as any,
    include,
  });

  // Priority sort: personal/parish-specific > diocesan > global
  templates.sort((a: any, b: any) => {
    const score = (t: any) => {
      if (t.parishId && parishIds.includes(t.parishId)) return 0;
      if (t.parish?.dioceseId && dioceseIds.includes(t.parish.dioceseId))
        return 1;
      return 2; // global (parishId = null)
    };
    return score(a) - score(b);
  });

  return applyLocale(templates);
};

// ─── Template CRUD ────────────────────────────────────────────────────────────

/** Create a new template with optional milestones */
export const createTemplate = async (
  args: {
    name: string;
    description?: string;
    sacramentId?: string;
    parishId?: string;
    milestones?: any[];
  },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(createTemplateSchema, args);

  let parishId = args.parishId;

  // If parishId explicitly provided, verify coordinator+ role in that parish
  if (parishId && !context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(
        403,
        "Você não tem permissão para criar modelos nesta paróquia.",
      );
    }
  }

  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: "ACTIVE" },
      select: { parishId: true, role: true },
    });
    if (membership && isCoordinatorOrAboveRole(membership.role)) {
      parishId = membership.parishId;
    } else if (!context.user.isAdmin) {
      // Check personal workspace
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: "PERSONAL" },
        select: { id: true },
      });
      if (personal) parishId = personal.id;
    }
    if (!parishId && !context.user.isAdmin) {
      throw new HttpError(
        400,
        "Não foi possível determinar o workspace para criar o modelo.",
      );
    }
  }

  const template = await context.entities.SacramentalJourneyTemplate.create({
    data: {
      name: args.name,
      description: args.description,
      sacramentId: args.sacramentId,
      parishId: parishId || null,
      locale: context.user?.locale || "pt-BR",
    },
  });

  // Create milestones if provided
  const milestones = args.milestones || [];
  if (milestones.length > 0) {
    await context.entities.SacramentalMilestoneTemplate.createMany({
      data: milestones.map((m: any, idx: number) => ({
        templateId: template.id,
        name: m.name,
        description: m.description,
        required: m.required !== undefined ? m.required : true,
        evidenceRequired: m.evidenceRequired || false,
        order: m.order !== undefined ? m.order : idx,
        daysBeforeSacrament: m.daysBeforeSacrament || null,
      })),
    });
  }

  return context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: template.id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      parish: { select: { id: true, name: true, type: true } },
      sacrament: { select: { id: true, name: true } },
    },
  });
};

/** Update template metadata */
export const updateTemplate = async (
  args: {
    id: string;
    name?: string;
    description?: string;
    sacramentId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(updateTemplateSchema, args);

  const template = await context.entities.SacramentalJourneyTemplate.findUnique(
    {
      where: { id: args.id },
      select: { parishId: true },
    },
  );
  if (!template) throw new HttpError(404, "Modelo não encontrado.");

  if (!context.user.isAdmin) {
    if (!template.parishId)
      throw new HttpError(
        403,
        "Apenas administradores podem editar modelos globais.",
      );
    const role = await getEffectiveParishRole(context, template.parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(
        403,
        "Você não tem permissão para editar este modelo.",
      );
    }
  }

  const data: any = {};
  if (args.name !== undefined) data.name = args.name;
  if (args.description !== undefined) data.description = args.description;
  if (args.sacramentId !== undefined) data.sacramentId = args.sacramentId;

  return context.entities.SacramentalJourneyTemplate.update({
    where: { id: args.id },
    data,
  });
};

/** Update a single milestone template */
export const updateMilestoneTemplate = async (
  args: {
    id: string;
    name?: string;
    description?: string;
    required?: boolean;
    evidenceRequired?: boolean;
    order?: number;
    daysBeforeSacrament?: number | null;
  },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(updateMilestoneTemplateSchema, args);

  const milestone =
    await context.entities.SacramentalMilestoneTemplate.findUnique({
      where: { id: args.id },
      select: { template: { select: { parishId: true } } },
    });
  if (!milestone) throw new HttpError(404, "Marco não encontrado.");

  if (!context.user.isAdmin) {
    if (!milestone.template.parishId)
      throw new HttpError(
        403,
        "Apenas administradores podem editar marcos de modelos globais.",
      );
    const role = await getEffectiveParishRole(
      context,
      milestone.template.parishId,
    );
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(
        403,
        "Você não tem permissão para editar este marco.",
      );
    }
  }

  const data: any = {};
  if (args.name !== undefined) data.name = args.name;
  if (args.description !== undefined) data.description = args.description;
  if (args.required !== undefined) data.required = args.required;
  if (args.evidenceRequired !== undefined)
    data.evidenceRequired = args.evidenceRequired;
  if (args.order !== undefined) data.order = args.order;
  if (args.daysBeforeSacrament !== undefined)
    data.daysBeforeSacrament = args.daysBeforeSacrament;

  return context.entities.SacramentalMilestoneTemplate.update({
    where: { id: args.id },
    data,
  });
};

/** Delete a milestone template (only if no active journeys reference it) */
export const deleteMilestoneTemplate = async (
  args: { id: string },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(deleteMilestoneTemplateSchema, args);

  const milestone =
    await context.entities.SacramentalMilestoneTemplate.findUnique({
      where: { id: args.id },
      select: {
        template: { select: { parishId: true } },
        _count: { select: { milestones: true } },
      },
    });
  if (!milestone) throw new HttpError(404, "Marco não encontrado.");

  if (!context.user.isAdmin) {
    if (!milestone.template.parishId)
      throw new HttpError(
        403,
        "Apenas administradores podem remover marcos de modelos globais.",
      );
    const role = await getEffectiveParishRole(
      context,
      milestone.template.parishId,
    );
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(
        403,
        "Você não tem permissão para remover este marco.",
      );
    }
  }

  // Check if milestone is used in any active journeys
  const usageCount = await context.entities.SacramentalMilestone.count({
    where: { templateMilestoneId: args.id },
  });
  if (usageCount > 0) {
    throw new HttpError(
      409,
      `Este marco está em uso por ${pluralPt(
        usageCount,
        "jornada ativa",
        "jornadas ativas",
      )} e não pode ser removido.`,
    );
  }

  await context.entities.SacramentalMilestoneTemplate.delete({
    where: { id: args.id },
  });
  return { success: true };
};

// ─── Copy Template ────────────────────────────────────────────────────────────

/** Clone a template (global/diocesan) to the user's parish/workspace */
export const copyTemplate = async (
  args: { templateId: string; parishId?: string },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(copyTemplateSchema, args);

  const source = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      parish: { select: { dioceseId: true, type: true } },
    },
  });
  if (!source) throw new HttpError(404, "Modelo de origem não encontrado.");

  // Determine target parish
  let targetParishId = args.parishId;
  if (!targetParishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: "ACTIVE" },
      select: { parishId: true, role: true },
    });
    if (membership && isCoordinatorOrAboveRole(membership.role)) {
      targetParishId = membership.parishId;
    } else {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: "PERSONAL" },
        select: { id: true },
      });
      if (personal) targetParishId = personal.id;
    }
    if (!targetParishId && !context.user.isAdmin) {
      throw new HttpError(
        400,
        "Não foi possível determinar o workspace de destino.",
      );
    }
  } else if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, targetParishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(
        403,
        "Você não tem permissão para criar modelos nesta paróquia.",
      );
    }
  }

  if (targetParishId) {
    const actor = await resolveResourceActor(context, targetParishId);
    assertCanPublish(actor);
    // Keep legacy global models and diocesan models visible in the template catalog.
    const globalLegacy = !source.parishId && !source.dioceseId;
    const sameDioceseCatalog = Boolean(
      actor.dioceseId && source.parish?.dioceseId === actor.dioceseId,
    );
    if (
      !globalLegacy &&
      !sameDioceseCatalog &&
      !actorCanViewOfficialResource(actor, {
        ...source,
        ownerType: source.ownerType || "PARISH",
      })
    )
      throw new HttpError(403, "Você não tem acesso ao modelo de origem.");
  }

  // Create the copy
  const copy = await context.entities.SacramentalJourneyTemplate.create({
    data: {
      name: `${source.name} (cópia)`,
      description: source.description,
      sacramentId: source.sacramentId,
      parishId: targetParishId || null,
    },
    select: { id: true },
  });

  if (source.milestones.length > 0) {
    await context.entities.SacramentalMilestoneTemplate.createMany({
      data: source.milestones.map((m: any) => ({
        templateId: copy.id,
        name: m.name,
        description: m.description,
        required: m.required,
        evidenceRequired: m.evidenceRequired,
        order: m.order,
        daysBeforeSacrament: m.daysBeforeSacrament,
      })),
    });
  }

  return { id: copy.id };
};

// ─── Publish Template ─────────────────────────────────────────────────────────

/**
 * Diocese admin publishes a template to all parishes in the diocese.
 * Creates a copy of the template with parishId = null (global/diocesan scope).
 * If the template is already diocesan (parishId = null), it simply updates its name/description.
 */
export const publishTemplate = async (
  args: { templateId: string },
  context: any,
) => {
  requireAuth(context.user);
  validateOrThrow(publishTemplateSchema, args);

  const source = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      parish: { select: { dioceseId: true, type: true } },
    },
  });
  if (!source) throw new HttpError(404, "Modelo não encontrado.");

  // Only DIOCESE_ADMIN or SUPER_ADMIN can publish
  if (!context.user.isAdmin) {
    // Must have DIOCESE_ADMIN role and the source template must belong to the admin's diocese
    const dioceses = await context.entities.Membership.findMany({
      where: {
        userId: context.user.id,
        role: "DIOCESE_ADMIN",
        status: "ACTIVE",
      },
      select: { parish: { select: { dioceseId: true } } },
    });
    const dioceseIds = [
      ...new Set(dioceses.map((d: any) => d.parish?.dioceseId).filter(Boolean)),
    ];

    if (dioceseIds.length === 0) {
      throw new HttpError(
        403,
        "Apenas administradores diocesanos podem publicar modelos.",
      );
    }

    // Source must belong to this diocese
    const sourceDioceseId = source.parish?.dioceseId;
    if (!sourceDioceseId || !dioceseIds.includes(sourceDioceseId)) {
      throw new HttpError(403, "Este modelo não pertence à sua diocese.");
    }
  }

  // If template is already global/parishId=null, stamp diocesan inheritance fields.
  if (!source.parishId) {
    const dioceseId = source.dioceseId || source.parish?.dioceseId || null;
    return context.entities.SacramentalJourneyTemplate.update({
      where: { id: source.id },
      data: {
        ownerType: "DIOCESE",
        inheritancePolicy: "SUGGESTED",
        dioceseId,
      },
      include: {
        milestones: { orderBy: { order: "asc" } },
        parish: { select: { id: true, name: true, type: true } },
        sacrament: { select: { id: true, name: true } },
      },
    });
  }

  const dioceseId = source.parish?.dioceseId || source.dioceseId || null;

  // Create a diocesan copy (parishId = null) — represents "published to diocese"
  const published = await context.entities.SacramentalJourneyTemplate.create({
    data: {
      name: source.name,
      description: source.description,
      sacramentId: source.sacramentId,
      parishId: null,
      dioceseId,
      ownerType: "DIOCESE",
      inheritancePolicy: "SUGGESTED",
      sourceTemplateId: source.id,
    },
  });

  if (source.milestones.length > 0) {
    await context.entities.SacramentalMilestoneTemplate.createMany({
      data: source.milestones.map((m: any) => ({
        templateId: published.id,
        name: m.name,
        description: m.description,
        required: m.required,
        evidenceRequired: m.evidenceRequired,
        order: m.order,
        daysBeforeSacrament: m.daysBeforeSacrament,
      })),
    });
  }

  return context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: published.id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      parish: { select: { id: true, name: true, type: true } },
      sacrament: { select: { id: true, name: true } },
    },
  });
};
