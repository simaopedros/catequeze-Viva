import { HttpError } from 'wasp/server';
import { validateOrThrow, createClassSchema, updateClassSchema } from '../validation';
import { requireClassAccess, getEffectiveParishRole, isCoordinatorOrAboveRole } from '../auth/helpers';
import { ClassStatus, CatechistAssignmentRole, EnrollmentStatus, MembershipStatus } from '@prisma/client';
import { assertCanCreateClass, assertCanEnrollCatechumen } from './billingEnforcement';
import { ensurePersonalWorkspace } from './workspaceOperations';
import { ensureSacramentalJourneyForCatechumen } from '../sacramentHelpers';
import { logger } from '../logger';

// isCoordinatorOrAbove now delegates to the auth helper which includes PERSONAL_OWNER
function isCoordinatorOrAbove(role: string | null): boolean {
  if (!role) return false;
  return isCoordinatorOrAboveRole(role);
}

function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

export const listClasses = async (_args: { communityId?: string; workspaceId?: string } | void, context: any) => {
  const args = _args || {};
  if (!context.user) throw new HttpError(401);

  if (context.user.isAdmin) {
    const whereAdmin: any = {};
    if (args.communityId) whereAdmin.communityId = args.communityId;
    if (args.workspaceId) whereAdmin.parishId = args.workspaceId;
    return context.entities.CatechesisClass.findMany({
      where: whereAdmin,
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        sacrament: { select: { id: true, name: true } },
        catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { enrollments: true, meetings: true } },
      },
    });
  }

  // Check if user has a personal workspace to include
  let personalParishId: string | null = null;
  if (args.workspaceId) {
    // Filter by specific workspace
    const personalCheck = await context.entities.Parish.findFirst({
      where: { id: args.workspaceId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personalCheck) personalParishId = personalCheck.id;
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });

  // Filter memberships by workspaceId if provided
  const relevantMemberships = args.workspaceId
    ? memberships.filter((m: { parishId: string; role: string }) => m.parishId === args.workspaceId)
    : memberships;

  if (relevantMemberships.length === 0 && !personalParishId) return [];

  const roles = relevantMemberships.map((m: any) => m.role);
  const parishIds = relevantMemberships.map((m: any) => m.parishId);
  if (personalParishId) parishIds.push(personalParishId);

  // Include classes owned via personal workspace
  const whereParishIds = [...new Set(parishIds)];

  if (roles.some((r: string) => isCoordinatorOrAbove(r))) {
    const whereCoords: any = { parishId: { in: whereParishIds } };
    if (args.communityId) whereCoords.communityId = args.communityId;
    return context.entities.CatechesisClass.findMany({
      where: whereCoords,
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        sacrament: { select: { id: true, name: true } },
        catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { enrollments: true, meetings: true } },
      },
    });
  }

  if (roles.some((r: string) => isCatechist(r))) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const whereCatechist: any = {
      id: { in: classIds },
    };
    if (args.communityId) {
      whereCatechist.AND = [
        { id: { in: classIds } },
        { communityId: args.communityId },
      ];
      delete whereCatechist.id;
    }
    return context.entities.CatechesisClass.findMany({
      where: whereCatechist,
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        sacrament: { select: { id: true, name: true } },
        catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { enrollments: true, meetings: true } },
      },
    });
  }

  if (roles.includes('GUARDIAN')) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (guardian?.householdId) {
      const catechumens = await context.entities.CatechumenProfile.findMany({
        where: { householdId: guardian.householdId },
        select: { id: true },
      });
      const catechumenIds = catechumens.map((c: any) => c.id);
      const enrollments = await context.entities.ClassEnrollment.findMany({
        where: { catechumenProfileId: { in: catechumenIds } },
        select: { classId: true },
      });
      const classIds = enrollments.map((e: any) => e.classId);
      const whereGuardian: any = { id: { in: classIds } };
      if (args.communityId) whereGuardian.communityId = args.communityId;
      return context.entities.CatechesisClass.findMany({
        where: whereGuardian,
        orderBy: { name: 'asc' },
        include: {
          parish: { select: { id: true, name: true } },
          community: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
          sacrament: { select: { id: true, name: true } },
          catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          _count: { select: { enrollments: true, meetings: true } },
        },
      });
    }
    return [];
  }

  if (roles.includes('CATECHUMEN')) {
    // CATECHUMEN should see classes they're enrolled in
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        catechumenProfile: {
          userId: context.user.id,
        },
      },
      select: { classId: true },
    });
    const classIds = enrollments.map((e: any) => e.classId);
    if (classIds.length > 0) {
      const whereCatechumen: any = { id: { in: classIds } };
      if (args.communityId) whereCatechumen.communityId = args.communityId;
      return context.entities.CatechesisClass.findMany({
        where: whereCatechumen,
        orderBy: { name: 'asc' },
        include: {
          parish: { select: { id: true, name: true } },
          community: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, meetings: true } },
        },
      });
    }
    return [];
  }

  // Pastoral viewer: read-only access to parish classes
  if (roles.includes('PASTORAL_VIEWER')) {
    const whereViewer: any = { parishId: { in: whereParishIds } };
    if (args.communityId) whereViewer.communityId = args.communityId;
    return context.entities.CatechesisClass.findMany({
      where: whereViewer,
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        sacrament: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, meetings: true } },
      },
    });
  }

  // Personal workspace owner: has full access to their workspace classes
  if (personalParishId) {
    const wherePersonal: any = { parishId: { in: whereParishIds } };
    if (args.communityId) wherePersonal.communityId = args.communityId;
    return context.entities.CatechesisClass.findMany({
      where: wherePersonal,
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        sacrament: { select: { id: true, name: true } },
        catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { enrollments: true, meetings: true } },
      },
    });
  }

  return [];
};

export const createClass = async (args: any, context: any) => {
  validateOrThrow(createClassSchema, args);
  if (!context.user) throw new HttpError(401);

  let effectiveParishId = args.parishId;

  if (!effectiveParishId) {
    // Try membership
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    if (membership?.parishId) {
      effectiveParishId = membership.parishId;
    }
  }

  if (!effectiveParishId) {
    // Use shared personal workspace helper (find-or-create, idempotent)
    const personalWs = await ensurePersonalWorkspace(undefined, context);
    effectiveParishId = personalWs.id;
  }

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, effectiveParishId);
    if (!role) throw new HttpError(403, 'Você não tem permissão para criar turmas nesta paróquia.');
    if (!isCoordinatorOrAbove(role) && role !== 'LEAD_CATECHIST' && role !== 'ASSISTANT_CATECHIST') {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem criar turmas.');
    }
  }

  // Enforce plan limits
  if (!context.user.isAdmin) {
    await assertCanCreateClass(context, effectiveParishId);
  }

  const newClass = await context.entities.CatechesisClass.create({
    data: {
      name: args.name, parishId: effectiveParishId,
      communityId: args.communityId || null,
      stageId: args.stageId || null, sacramentId: args.sacramentId || null,
      yearId: args.yearId || null, dayOfWeek: args.dayOfWeek,
      startTime: args.startTime, endTime: args.endTime,
      location: args.location, maxCapacity: args.maxCapacity || 30,
      status: ClassStatus.DRAFT,
    },
  });

  // Auto-assign the creator as the lead catechist of this class (only for catechist roles, not coordinators/owners)
  if (!context.user.isAdmin) {
    const creatorRole = await getEffectiveParishRole(context, effectiveParishId);
    if (creatorRole && isCatechist(creatorRole)) {
      await context.entities.ClassCatechist.create({
        data: {
          classId: newClass.id,
          userId: context.user.id,
          role: CatechistAssignmentRole.LEAD,
        },
      });
    }
  }

  return newClass;
};

export const getClassDetails = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.id },
    select: { parishId: true, id: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  // RBAC: verify user has access to this class
  if (!context.user.isAdmin) {
    // Use effective role which works for personal workspace owners too
    const role = await getEffectiveParishRole(context, classData.parishId);

    // Coordinators (including PERSONAL_OWNER) can access any class in their parish/workspace
    const isCoordinator = isCoordinatorOrAbove(role);

    // Catechists: only classes they're assigned to
    let isCatechistOfClass = false;
    if (!isCoordinator) {
      isCatechistOfClass = !!(await context.entities.ClassCatechist.findFirst({
        where: { userId: context.user.id, classId: args.id },
      }));
    }

    // Guardians: only classes where their dependents are enrolled
    let isGuardianOfEnrolled = false;
    if (!isCoordinator && !isCatechistOfClass) {
      const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
      if (guardian?.householdId) {
        const enrolled = await context.entities.ClassEnrollment.findFirst({
          where: {
            classId: args.id,
            catechumenProfile: { householdId: guardian.householdId },
          },
        });
        isGuardianOfEnrolled = !!enrolled;
      }
    }

    // Catechumens: only classes they're enrolled in
    let isCatechumenOfClass = false;
    if (!isCoordinator && !isCatechistOfClass && !isGuardianOfEnrolled) {
      const enrollment = await context.entities.ClassEnrollment.findFirst({
        where: {
          classId: args.id,
          catechumenProfile: { userId: context.user.id },
        },
      });
      isCatechumenOfClass = !!enrollment;
    }

    if (!isCoordinator && !isCatechistOfClass && !isGuardianOfEnrolled && !isCatechumenOfClass) {
      throw new HttpError(403, 'Você não tem acesso a esta turma.');
    }
  }

  return context.entities.CatechesisClass.findUnique({
    where: { id: args.id },
    include: {
      parish: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      sacrament: { select: { id: true, name: true } },
      year: { select: { id: true, name: true } },
      catechists: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      enrollments: {
        include: {
          catechumenProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              sacramentalJourneys: {
                include: {
                  template: { select: { id: true, name: true, sacramentId: true } },
                  milestones: { select: { id: true, status: true } },
                },
              },
            },
          },
        },
      },
      meetings: {
        orderBy: { date: 'desc' },
        include: {
          content: { select: { id: true, title: true } },
          _count: { select: { attendance: true } },
        },
      },
      _count: { select: { enrollments: true, meetings: true } },
    },
  });
};

export const updateClass = async (args: any, context: any) => {
  validateOrThrow(updateClassSchema, args);
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.id },
    select: { parishId: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    // Allow coordinators (including PERSONAL_OWNER) OR the lead catechist of this specific class to edit
    if (!isCoordinatorOrAbove(role)) {
      const isLeadCatechist = await context.entities.ClassCatechist.findFirst({
        where: { userId: context.user.id, classId: args.id, role: CatechistAssignmentRole.LEAD },
      });
      if (!isLeadCatechist) {
        throw new HttpError(403, 'Apenas coordenadores ou o catequista responsável podem editar turmas.');
      }
    }
  }

  const { id, ...data } = args;

  // Validate communityId belongs to the same parish if provided
  if (data.communityId) {
    const community = await context.entities.Community.findUnique({
      where: { id: data.communityId },
      select: { parishId: true },
    });
    if (!community || community.parishId !== classData.parishId) {
      throw new HttpError(400, 'A comunidade não pertence à mesma paróquia da turma.');
    }
  }

  return context.entities.CatechesisClass.update({ where: { id }, data });
};

export const assignLeadCatechist = async (args: { classId: string; userId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { parishId: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    if (!isCoordinatorOrAbove(role)) {
      throw new HttpError(403, 'Apenas coordenadores podem designar catequistas responsáveis.');
    }
  }

  // Validate the target user belongs to the same parish
  const targetMembership = await context.entities.Membership.findFirst({
    where: { userId: args.userId, parishId: classData.parishId, status: MembershipStatus.ACTIVE },
  });
  if (!targetMembership) {
    throw new HttpError(400, 'O usuário não possui vínculo ativo com a paróquia desta turma.');
  }

  await context.entities.ClassCatechist.deleteMany({ where: { classId: args.classId, role: CatechistAssignmentRole.LEAD } });
  return context.entities.ClassCatechist.create({ data: { classId: args.classId, userId: args.userId, role: CatechistAssignmentRole.LEAD } });
};

export const addAssistantCatechist = async (args: { classId: string; userId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { parishId: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  // Check if target user has an active membership in the parish
  const targetMembership = await context.entities.Membership.findFirst({
    where: { userId: args.userId, parishId: classData.parishId, status: MembershipStatus.ACTIVE },
  });
  if (!targetMembership) {
    throw new HttpError(400, 'O usuário não possui vínculo ativo com a paróquia desta turma.');
  }

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    if (!role) throw new HttpError(403, 'Sem permissão para adicionar catequistas.');

    // Coordinator (including PERSONAL_OWNER) can add anyone
    if (isCoordinatorOrAbove(role)) {
      // allowed
    } else {
      // Check if caller is the LEAD catechist of this class
      const isLead = await context.entities.ClassCatechist.findFirst({
        where: { classId: args.classId, userId: context.user.id, role: CatechistAssignmentRole.LEAD },
      });
      if (!isLead) {
        throw new HttpError(403, 'Apenas o coordenador ou o catequista responsável podem adicionar auxiliares.');
      }
    }
  }

  const existing = await context.entities.ClassCatechist.findFirst({ where: { classId: args.classId, userId: args.userId } });
  if (existing) throw new HttpError(400, 'Este catequista já está vinculado.');

  return context.entities.ClassCatechist.create({ data: { classId: args.classId, userId: args.userId, role: CatechistAssignmentRole.ASSISTANT } });
};

export const removeCatechistFromClass = async (args: { classId: string; userId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { parishId: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  const assignment = await context.entities.ClassCatechist.findFirst({
    where: { classId: args.classId, userId: args.userId },
  });
  if (!assignment) throw new HttpError(404, 'Catequista não está vinculado a esta turma.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    if (!role) throw new HttpError(403, 'Sem permissão para remover catequistas.');

    // Self-removal: assistant can remove themselves
    if (args.userId === context.user.id && assignment.role === CatechistAssignmentRole.ASSISTANT) {
      // allowed
    }
    // Coordinator (including PERSONAL_OWNER) can remove anyone
    else if (isCoordinatorOrAbove(role)) {
      // allowed
    }
    // LEAD can remove ASSISTANTs
    else if (assignment.role === CatechistAssignmentRole.ASSISTANT) {
      const isLead = await context.entities.ClassCatechist.findFirst({
        where: { classId: args.classId, userId: context.user.id, role: CatechistAssignmentRole.LEAD },
      });
      if (!isLead) {
        throw new HttpError(403, 'Apenas o coordenador ou o catequista responsável podem remover auxiliares.');
      }
    }
    // LEAD cannot be removed by non-coordinators
    else {
      throw new HttpError(403, 'Apenas o coordenador pode remover o catequista responsável.');
    }
  }

  return context.entities.ClassCatechist.delete({
    where: { id: assignment.id },
  });
};

export const enrollCatechumen = async (args: { classId: string; catechumenProfileId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { parishId: true, maxCapacity: true, sacramentId: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    if (!role) {
      throw new HttpError(403, 'Sem permissão para matricular catequizandos.');
    }
    if (isCoordinatorOrAbove(role)) {
      // Coordinators (including PERSONAL_OWNER) can enroll in any class in their parish/workspace
    } else if (isCatechist(role)) {
      // Catechists can only enroll in classes they are assigned to
      const assignment = await context.entities.ClassCatechist.findFirst({
        where: { classId: args.classId, userId: context.user.id },
      });
      if (!assignment) {
        throw new HttpError(403, 'Apenas catequistas vinculados a esta turma podem matricular catequizandos.');
      }
    } else {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem matricular catequizandos.');
    }
  }

  // Check capacity
  const enrolledCount = await context.entities.ClassEnrollment.count({
    where: { classId: args.classId, status: EnrollmentStatus.ENROLLED },
  });
  if (classData.maxCapacity && enrolledCount >= classData.maxCapacity) {
    throw new HttpError(400, 'Turma lotada. Capacidade máxima atingida.');
  }

  // Enforce plan catechumen limits
  if (!context.user.isAdmin) {
    await assertCanEnrollCatechumen(context, classData.parishId);
  }

  const existing = await context.entities.ClassEnrollment.findFirst({
    where: { classId: args.classId, catechumenProfileId: args.catechumenProfileId },
  });
  if (existing) throw new HttpError(400, 'Já está inscrito.');
  const enrollment = await context.entities.ClassEnrollment.create({
    data: { classId: args.classId, catechumenProfileId: args.catechumenProfileId, status: EnrollmentStatus.ENROLLED },
  });

  // Auto-create sacramental journey if class is linked to a sacrament
  if (classData.sacramentId) {
    try {
      await ensureSacramentalJourneyForCatechumen(
        args.catechumenProfileId,
        classData.sacramentId,
        classData.parishId,
        context
      );
    } catch (e: any) {
      logger.warn('Failed to auto-create sacramental journey on enrollment', {
        catechumenProfileId: args.catechumenProfileId,
        sacramentId: classData.sacramentId,
        parishId: classData.parishId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return enrollment;
};

export const archiveClass = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: args.id },
    select: { parishId: true, status: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, classData.parishId);
    if (!isCoordinatorOrAbove(role)) {
      throw new HttpError(403, 'Apenas coordenadores podem arquivar turmas.');
    }
  }

  const activeMeetings = await context.entities.Meeting.count({
    where: { classId: args.id, date: { gte: new Date() } },
  });
  if (activeMeetings > 0) {
    throw new HttpError(400, 'Não é possível arquivar uma turma com encontros futuros.');
  }

  return context.entities.CatechesisClass.update({
    where: { id: args.id },
    data: { status: 'ARCHIVED' },
  });
};

export const cancelEnrollment = async (args: { enrollmentId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const enrollment = await context.entities.ClassEnrollment.findUnique({
    where: { id: args.enrollmentId },
    select: { class: { select: { id: true, parishId: true } } },
  });
  if (!enrollment) throw new HttpError(404, 'Inscrição não encontrada.');

  if (!context.user.isAdmin) {
    const role = await getEffectiveParishRole(context, enrollment.class.parishId);
    if (!role) {
      throw new HttpError(403, 'Sem permissão para cancelar inscrições.');
    }
    if (isCoordinatorOrAbove(role)) {
      // Coordinators (including PERSONAL_OWNER) can cancel any enrollment in their parish/workspace
    } else if (isCatechist(role)) {
      // Catechists can only cancel enrollments in classes they are assigned to
      const assignment = await context.entities.ClassCatechist.findFirst({
        where: { classId: enrollment.class.id, userId: context.user.id },
      });
      if (!assignment) {
        throw new HttpError(403, 'Apenas catequistas vinculados a esta turma podem cancelar inscrições.');
      }
    } else {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem cancelar inscrições.');
    }
  }

  return context.entities.ClassEnrollment.update({
    where: { id: args.enrollmentId },
    data: { status: EnrollmentStatus.DROPPED },
  });
};

export const listParishCatechists = async (args: { parishId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  return context.entities.Membership.findMany({
    where: {
      parishId: args.parishId,
      status: MembershipStatus.ACTIVE,
      role: { in: ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] },
    },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { role: 'asc' },
  });
};
