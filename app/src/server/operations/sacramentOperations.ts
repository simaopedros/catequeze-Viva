import { HttpError } from 'wasp/server';
import { validateOrThrow, createSacramentalJourneySchema, updateMilestoneStatusSchema, updateJourneySchema, createTemplateSchema, updateTemplateSchema, updateMilestoneTemplateSchema, deleteMilestoneTemplateSchema, copyTemplateSchema, publishTemplateSchema } from '../validation';
import { requireAuth, getEffectiveParishRole, isCoordinatorOrAboveRole, getDioceseParishIds } from '../auth/helpers';
import { ensureSacramentalJourneyForCatechumen } from '../sacramentHelpers';
import { requireWorkspaceAccess } from './sharedScope';
import { legacyTake } from './listCursor';
import {
  buildJourneyTemplateListWhere,
  filterJourneyTemplatesByLocale,
} from '../../shared/journeyTemplateLocale';

/**
 * @deprecated Prefer resolveWorkspaceAccess for authorization.
 * Still used by some journey mutations pending full workspace scoping.
 */
async function getEffectiveParishScope(context: any): Promise<{ parishIds: string[]; roles: string[] }> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);
  const roles = memberships.map((m: any) => m.role);

  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personalWorkspace) {
    if (!parishIds.includes(personalWorkspace.id)) parishIds.push(personalWorkspace.id);
    if (!roles.includes('PERSONAL_OWNER')) roles.push('PERSONAL_OWNER');
  }

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) parishIds.push(id);
    }
    if (!roles.includes('DIOCESE_ADMIN')) roles.push('DIOCESE_ADMIN');
  }

  return { parishIds, roles };
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
        enrollments: { select: { class: { select: { id: true, parishId: true, name: true } } } },
      },
    },
    template: { select: { id: true, name: true, sacramentId: true } },
    milestones: {
      include: { templateMilestone: { select: { id: true, name: true, required: true, order: true, evidenceRequired: true, daysBeforeSacrament: true } } },
      orderBy: { templateMilestone: { order: 'asc' } },
    },
  };
  const take = legacyTake(args.take);
  const search = args.search?.trim();
  // Server-side name filter so the UI does not have to load every journey to search.
  const searchWhere = search
    ? {
        catechumenProfile: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : null;
  const listOpts = {
    include: baseInclude,
    orderBy: [{ targetDate: 'asc' as const }, { id: 'asc' as const }],
    take,
  };
  const withSearch = (where: any) => (searchWhere ? { AND: [where, searchWhere] } : where);


  if (context.user.isAdmin && !workspaceId) {
    return context.entities.SacramentalJourney.findMany({ where: withSearch({}), ...listOpts });
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
          { catechumenProfile: { enrollments: { some: { class: { parishId } } } } },
          { catechumenProfile: { parishId } },
        ],
      }),
      ...listOpts,
    });
  }

  // Catechist / scoped coordinator: journeys of students in allowed classes
  if (access.isCatechist || access.isScopedCoordinator) {
    const classIds =
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds;
    if (classIds.length === 0) return [];
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = enrollments.map((e: any) => e.catechumenProfileId);
    return context.entities.SacramentalJourney.findMany({
      where: withSearch({ catechumenProfileId: { in: catechumenIds } }),
      ...listOpts,
    });
  }

  // Guardian: see journeys of their dependents
  if (access.role === 'GUARDIAN') {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
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
  if (access.role === 'CATECHUMEN') {
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

export const getSacramentalJourney = async (args: { id: string }, context: any) => {
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
          enrollments: { select: { class: { select: { id: true, parishId: true, name: true } } } },
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
        orderBy: { templateMilestone: { order: 'asc' } },
      },
    },
  });

  if (!journey) throw new HttpError(404, 'Jornada sacramental não encontrada.');

  if (context.user.isAdmin) return journey;

  const { parishIds, roles } = await getEffectiveParishScope(context);

  // Coordinator+PersonalOwner: access if catechumen is in their parish
  if (roles.some((r: string) => isCoordinatorOrAboveRole(r))) {
    const catechumenClasses = await context.entities.ClassEnrollment.findMany({
      where: { catechumenProfileId: journey.catechumenProfile.id },
      select: { class: { select: { parishId: true } } },
    });
    const catechumenParishIds = catechumenClasses.map((e: any) => e.class.parishId);
    if (catechumenParishIds.some((pid: string) => parishIds.includes(pid))) return journey;
    if (journey.catechumenProfile.parishId && parishIds.includes(journey.catechumenProfile.parishId)) return journey;
  }

  // Catechist: access if catechumen is in one of their classes
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const enrollment = await context.entities.ClassEnrollment.findFirst({
      where: { catechumenProfileId: journey.catechumenProfile.id, classId: { in: classIds } },
    });
    if (enrollment) return journey;
  }

  // Guardian: access own dependents
  if (roles.includes('GUARDIAN')) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (guardian?.householdId && guardian.householdId === journey.catechumenProfile.householdId) return journey;
  }

  // Catechumen: own journey
  if (roles.includes('CATECHUMEN')) {
    const catechumen = await context.entities.CatechumenProfile.findFirst({ where: { userId: context.user.id } });
    if (catechumen?.id === journey.catechumenProfile.id) return journey;
  }

  throw new HttpError(403, 'Acesso negado a esta jornada sacramental.');
};

// ─── Create Sacramental Journey ───────────────────────────────────────────────

export const createSacramentalJourney = async (
  args: { catechumenProfileId: string; templateId: string },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(createSacramentalJourneySchema, args);

  // Validate template exists and load it with milestones
  const template = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
  });
  if (!template) throw new HttpError(404, 'Modelo de jornada não encontrado.');

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenProfileId },
    select: {
      id: true,
      parishId: true,
      enrollments: { select: { class: { select: { id: true, parishId: true } } } },
    },
  });
  if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

  if (!context.user.isAdmin) {
    const { parishIds, roles } = await getEffectiveParishScope(context);

    const isCoordinator = roles.some((r: string) => isCoordinatorOrAboveRole(r));
    const isCatechist = roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST');

    if (!isCoordinator && !isCatechist) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem criar jornadas sacramentais.');
    }

    // Catechist: only for students in their own classes
    if (isCatechist && !isCoordinator) {
      const myClasses = await context.entities.ClassCatechist.findMany({
        where: { userId: context.user.id },
        select: { classId: true },
      });
      const myClassIds = myClasses.map((cc: any) => cc.classId);
      const isMyStudent = catechumen.enrollments.some((e: any) => myClassIds.includes(e.class.id));
      if (!isMyStudent) {
        throw new HttpError(403, 'Este catequizando não está em nenhuma das suas turmas.');
      }
    }

    // Coordinator: verify catechumen is in their parish scope
    if (isCoordinator) {
      const catechumenParishIds = catechumen.enrollments.map((e: any) => e.class.parishId);
      if (catechumen.parishId) catechumenParishIds.push(catechumen.parishId);
      const inScope = catechumenParishIds.some((pid: string) => parishIds.includes(pid));
      if (!inScope) {
        throw new HttpError(403, 'Este catequizando não pertence à sua paróquia.');
      }
    }
  }

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
    throw new HttpError(409, 'Já existe uma jornada sacramental com este modelo para este catequizando.');
  }

  const journey = await context.entities.SacramentalJourney.create({
    data: { catechumenProfileId: args.catechumenProfileId, templateId: args.templateId },
  });

  // Create all milestones in bulk
  const templateMilestones = await context.entities.SacramentalMilestoneTemplate.findMany({
    where: { templateId: args.templateId },
    orderBy: { order: 'asc' },
  });

  if (templateMilestones.length > 0) {
    await context.entities.SacramentalMilestone.createMany({
      data: templateMilestones.map((tm: any) => ({
        journeyId: journey.id,
        templateMilestoneId: tm.id,
        status: 'PENDING',
      })),
    });
  }

  // Return the created journey with milestones
  return context.entities.SacramentalJourney.findUnique({
    where: { id: journey.id },
    include: {
      catechumenProfile: { select: { id: true, firstName: true, lastName: true } },
      template: { select: { id: true, name: true } },
      milestones: {
        include: { templateMilestone: { select: { id: true, name: true, required: true, order: true } } },
        orderBy: { templateMilestone: { order: 'asc' } },
      },
    },
  });
};

// Re-exported from sacramentHelpers for use in Wasp actions
export { ensureSacramentalJourneyForCatechumen };

// ─── Update Milestone Status ──────────────────────────────────────────────────

export const updateMilestoneStatus = async (
  args: { milestoneId: string; status?: string; notes?: string; evidenceUrl?: string; completedAt?: string | null },
  context: any
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
              enrollments: { select: { class: { select: { id: true, parishId: true } } } },
            },
          },
        },
      },
    },
  });

  if (!milestone) throw new HttpError(404, 'Marco sacramental não encontrado.');

  if (!context.user.isAdmin) {
    const { parishIds, roles } = await getEffectiveParishScope(context);

    const isCoordinator = roles.some((r: string) => isCoordinatorOrAboveRole(r));
    const isCatechist = roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST');

    if (!isCoordinator && !isCatechist) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem atualizar marcos sacramentais.');
    }

    const catechumenClassParishIds = milestone.journey.catechumenProfile.enrollments.map(
      (e: any) => e.class.parishId
    );

    if (isCoordinator) {
      // Coordinator: can update if catechumen is in their parish
      const inScope = catechumenClassParishIds.some((pid: string) => parishIds.includes(pid)) ||
        (milestone.journey.catechumenProfile.parishId && parishIds.includes(milestone.journey.catechumenProfile.parishId));
      if (!inScope) {
        throw new HttpError(403, 'Este catequizando não pertence à sua paróquia.');
      }
    }

    if (isCatechist && !isCoordinator) {
      // Catechist: can only update milestones for students in their own classes
      const myClasses = await context.entities.ClassCatechist.findMany({
        where: { userId: context.user.id },
        select: { classId: true },
      });
      const myClassIds = myClasses.map((cc: any) => cc.classId);
      const enrollmentClassIds = milestone.journey.catechumenProfile.enrollments.map(
        (e: any) => e.class.id
      );
      const isMyStudent = enrollmentClassIds.some((cid: string) => myClassIds.includes(cid));
      if (!isMyStudent) {
        throw new HttpError(403, 'Este catequizando não está em nenhuma das suas turmas.');
      }
    }

    // Catechist: prevent changes to milestones in approval chain
    if (isCatechist && !isCoordinator && args.status) {
      const allowedForCatechist = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAITING_APPROVAL'];
      if (!allowedForCatechist.includes(args.status)) {
        throw new HttpError(403, 'Catequistas podem apenas marcar como pendente, em andamento, concluído ou enviar para aprovação. Aprovar/rejeitar requer um coordenador.');
      }
    }

    // Prevent catechist from changing milestones already in APPROVED or WAITING_APPROVAL state
    if (isCatechist && !isCoordinator) {
      if (milestone.status === 'APPROVED' || milestone.status === 'WAITING_APPROVAL') {
        throw new HttpError(403, 'Catequistas não podem alterar marcos que estão aguardando aprovação ou já aprovados.');
      }
    }
  }

  const data: any = {};
  if (args.status !== undefined) {
    data.status = args.status;
    if (args.status === 'COMPLETED') data.completedAt = new Date();
    if (args.status === 'APPROVED') {
      data.completedAt = new Date();
      data.approvedById = context.user.id;
    }
    if (args.status !== 'COMPLETED' && args.status !== 'APPROVED') data.completedAt = null;
  }
  if (args.notes !== undefined) data.notes = args.notes;
  if (args.evidenceUrl !== undefined) data.evidenceUrl = args.evidenceUrl;
  if (args.completedAt !== undefined) data.completedAt = args.completedAt ? new Date(args.completedAt) : null;

  return context.entities.SacramentalMilestone.update({
    where: { id: args.milestoneId },
    data,
  });
};

// ─── Update Journey ───────────────────────────────────────────────────────────

export const updateJourney = async (
  args: { id: string; targetDate?: string | null },
  context: any
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
          enrollments: { select: { class: { select: { id: true, parishId: true } } } },
        },
      },
    },
  });
  if (!journey) throw new HttpError(404, 'Jornada não encontrada.');

  if (!context.user.isAdmin) {
    const { parishIds, roles } = await getEffectiveParishScope(context);

    // Coordinator+PersonalOwner: can manage if catechumen is in their parish
    if (roles.some((r: string) => isCoordinatorOrAboveRole(r))) {
      const catechumenParishIds = journey.catechumenProfile.enrollments.map((e: any) => e.class.parishId);
      if (journey.catechumenProfile.parishId) catechumenParishIds.push(journey.catechumenProfile.parishId);
      const inScope = catechumenParishIds.some((pid: string) => parishIds.includes(pid));
      if (!inScope) throw new HttpError(403, 'Este catequizando não pertence à sua paróquia.');
    } else if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
      // Catechist: only for students in their own classes
      const myClasses = await context.entities.ClassCatechist.findMany({
        where: { userId: context.user.id },
        select: { classId: true },
      });
      const myClassIds = myClasses.map((cc: any) => cc.classId);
      const enrollmentClassIds = journey.catechumenProfile.enrollments.map((e: any) => e.class.id);
      const isMyStudent = enrollmentClassIds.some((cid: string) => myClassIds.includes(cid));
      if (!isMyStudent) {
        throw new HttpError(403, 'Este catequizando não está em nenhuma das suas turmas.');
      }
    } else {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem configurar a jornada.');
    }
  }

  const data: any = {};
  if (args.targetDate !== undefined) data.targetDate = args.targetDate ? new Date(args.targetDate) : null;

  return context.entities.SacramentalJourney.update({
    where: { id: args.id },
    data,
  });
};

// ─── List Journey Templates ───────────────────────────────────────────────────

export const listJourneyTemplates = async (
  args: { locale?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const locale = args && typeof args === 'object' ? args.locale : undefined;

  const include = {
    milestones: { orderBy: { order: 'asc' } as const },
    parish: { select: { id: true, name: true, type: true, dioceseId: true } },
    sacrament: { select: { id: true, name: true } },
  };

  const applyLocale = (rows: any[]) =>
    locale ? filterJourneyTemplatesByLocale(rows, locale) : rows;

  if (context.user.isAdmin) {
    const templates = await context.entities.SacramentalJourneyTemplate.findMany({
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
        .filter((id: any) => typeof id === 'string' && id.length > 0),
    ),
  ] as string[];
  const hasOnlyPersonal = parishes.length > 0 && parishes.every((p: any) => p.type === 'PERSONAL');
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
      if (t.parish?.dioceseId && dioceseIds.includes(t.parish.dioceseId)) return 1;
      return 2; // global (parishId = null)
    };
    return score(a) - score(b);
  });

  return applyLocale(templates);
};

// ─── Template CRUD ────────────────────────────────────────────────────────────

/** Create a new template with optional milestones */
export const createTemplate = async (
  args: { name: string; description?: string; sacramentId?: string; parishId?: string; milestones?: any[] },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(createTemplateSchema, args);

  let parishId = args.parishId;

  // If parishId explicitly provided, verify coordinator+ role in that parish
  if (parishId && !context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(403, 'Você não tem permissão para criar modelos nesta paróquia.');
    }
  }

  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true, role: true },
    });
    if (membership && isCoordinatorOrAboveRole(membership.role)) {
      parishId = membership.parishId;
    } else if (!context.user.isAdmin) {
      // Check personal workspace
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (personal) parishId = personal.id;
    }
    if (!parishId && !context.user.isAdmin) {
      throw new HttpError(400, 'Não foi possível determinar o workspace para criar o modelo.');
    }
  }

  const template = await context.entities.SacramentalJourneyTemplate.create({
    data: {
      name: args.name,
      description: args.description,
      sacramentId: args.sacramentId,
      parishId: parishId || null,
      locale: context.user?.locale || 'pt-BR',
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
      milestones: { orderBy: { order: 'asc' } },
      parish: { select: { id: true, name: true, type: true } },
      sacrament: { select: { id: true, name: true } },
    },
  });
};

/** Update template metadata */
export const updateTemplate = async (
  args: { id: string; name?: string; description?: string; sacramentId?: string },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(updateTemplateSchema, args);

  const template = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.id },
    select: { parishId: true },
  });
  if (!template) throw new HttpError(404, 'Modelo não encontrado.');

  if (!context.user.isAdmin) {
    if (!template.parishId) throw new HttpError(403, 'Apenas administradores podem editar modelos globais.');
    const role = await getEffectiveParishRole(context, template.parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(403, 'Você não tem permissão para editar este modelo.');
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
  args: { id: string; name?: string; description?: string; required?: boolean; evidenceRequired?: boolean; order?: number; daysBeforeSacrament?: number | null },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(updateMilestoneTemplateSchema, args);

  const milestone = await context.entities.SacramentalMilestoneTemplate.findUnique({
    where: { id: args.id },
    select: { template: { select: { parishId: true } } },
  });
  if (!milestone) throw new HttpError(404, 'Marco não encontrado.');

  if (!context.user.isAdmin) {
    if (!milestone.template.parishId) throw new HttpError(403, 'Apenas administradores podem editar marcos de modelos globais.');
    const role = await getEffectiveParishRole(context, milestone.template.parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(403, 'Você não tem permissão para editar este marco.');
    }
  }

  const data: any = {};
  if (args.name !== undefined) data.name = args.name;
  if (args.description !== undefined) data.description = args.description;
  if (args.required !== undefined) data.required = args.required;
  if (args.evidenceRequired !== undefined) data.evidenceRequired = args.evidenceRequired;
  if (args.order !== undefined) data.order = args.order;
  if (args.daysBeforeSacrament !== undefined) data.daysBeforeSacrament = args.daysBeforeSacrament;

  return context.entities.SacramentalMilestoneTemplate.update({
    where: { id: args.id },
    data,
  });
};

/** Delete a milestone template (only if no active journeys reference it) */
export const deleteMilestoneTemplate = async (
  args: { id: string },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(deleteMilestoneTemplateSchema, args);

  const milestone = await context.entities.SacramentalMilestoneTemplate.findUnique({
    where: { id: args.id },
    select: {
      template: { select: { parishId: true } },
      _count: { select: { milestones: true } },
    },
  });
  if (!milestone) throw new HttpError(404, 'Marco não encontrado.');

  if (!context.user.isAdmin) {
    if (!milestone.template.parishId) throw new HttpError(403, 'Apenas administradores podem remover marcos de modelos globais.');
    const role = await getEffectiveParishRole(context, milestone.template.parishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(403, 'Você não tem permissão para remover este marco.');
    }
  }

  // Check if milestone is used in any active journeys
  const usageCount = await context.entities.SacramentalMilestone.count({
    where: { templateMilestoneId: args.id },
  });
  if (usageCount > 0) {
    throw new HttpError(409, `Este marco está em uso por ${usageCount} jornada(s) ativa(s) e não pode ser removido.`);
  }

  await context.entities.SacramentalMilestoneTemplate.delete({ where: { id: args.id } });
  return { success: true };
};

// ─── Copy Template ────────────────────────────────────────────────────────────

/** Clone a template (global/diocesan) to the user's parish/workspace */
export const copyTemplate = async (
  args: { templateId: string; parishId?: string },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(copyTemplateSchema, args);

  const source = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
    include: { milestones: { orderBy: { order: 'asc' } } },
  });
  if (!source) throw new HttpError(404, 'Modelo de origem não encontrado.');

  // Determine target parish
  let targetParishId = args.parishId;
  if (!targetParishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true, role: true },
    });
    if (membership && isCoordinatorOrAboveRole(membership.role)) {
      targetParishId = membership.parishId;
    } else {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (personal) targetParishId = personal.id;
    }
    if (!targetParishId && !context.user.isAdmin) {
      throw new HttpError(400, 'Não foi possível determinar o workspace de destino.');
    }
  } else if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, targetParishId);
    if (!role || !isCoordinatorOrAboveRole(role)) {
      throw new HttpError(403, 'Você não tem permissão para criar modelos nesta paróquia.');
    }
  }

  // Create the copy
  const copy = await context.entities.SacramentalJourneyTemplate.create({
    data: {
      name: `${source.name} (cópia)`,
      description: source.description,
      sacramentId: source.sacramentId,
      parishId: targetParishId || null,
    },
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

  return context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: copy.id },
    include: {
      milestones: { orderBy: { order: 'asc' } },
      parish: { select: { id: true, name: true, type: true } },
      sacrament: { select: { id: true, name: true } },
    },
  });
};

// ─── Publish Template ─────────────────────────────────────────────────────────

/**
 * Diocese admin publishes a template to all parishes in the diocese.
 * Creates a copy of the template with parishId = null (global/diocesan scope).
 * If the template is already diocesan (parishId = null), it simply updates its name/description.
 */
export const publishTemplate = async (
  args: { templateId: string },
  context: any
) => {
  requireAuth(context.user);
  validateOrThrow(publishTemplateSchema, args);

  const source = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
    include: { milestones: { orderBy: { order: 'asc' } }, parish: { select: { dioceseId: true, type: true } } },
  });
  if (!source) throw new HttpError(404, 'Modelo não encontrado.');

  // Only DIOCESE_ADMIN or SUPER_ADMIN can publish
  if (!context.user.isAdmin) {
    // Must have DIOCESE_ADMIN role and the source template must belong to the admin's diocese
    const dioceses = await context.entities.Membership.findMany({
      where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
      select: { parish: { select: { dioceseId: true } } },
    });
    const dioceseIds = [...new Set(dioceses.map((d: any) => d.parish?.dioceseId).filter(Boolean))];

    if (dioceseIds.length === 0) {
      throw new HttpError(403, 'Apenas administradores diocesanos podem publicar modelos.');
    }

    // Source must belong to this diocese
    const sourceDioceseId = source.parish?.dioceseId;
    if (!sourceDioceseId || !dioceseIds.includes(sourceDioceseId)) {
      throw new HttpError(403, 'Este modelo não pertence à sua diocese.');
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
      milestones: { orderBy: { order: 'asc' } },
      parish: { select: { id: true, name: true, type: true } },
      sacrament: { select: { id: true, name: true } },
    },
  });
};
