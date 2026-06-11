import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { logger } from '../logger';

function isCoordinatorOrAbove(role: string | null): boolean {
  if (!role) return false;
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

function isCatechistOrAbove(role: string): boolean {
  return isCoordinatorOrAbove(role) || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

async function getUserRole(context: any): Promise<string> {
  if (context.user?.isAdmin) return 'SUPER_ADMIN';
  const m = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
  });
  return m?.role || '';
}

/** Verifica se o usuário pertence à turma (por parish ou como catequista) */
async function assertUserBelongsToClass(context: any, classId: string): Promise<void> {
  if (context.user?.isAdmin) return;

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });

  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  // Verificar membership na paróquia da turma
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: classData.parishId, status: MembershipStatus.ACTIVE },
  });

  if (!membership) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (isPersonalOwner) return; // Personal owner has full access
    throw new HttpError(403, 'Você não pertence a esta paróquia.');
  }

  // Coordenadores: acesso a qualquer turma da paróquia
  if (isCoordinatorOrAbove(membership.role)) return;

  // Catequistas: verificar se pertencem à turma
  if (isCatechistOrAbove(membership.role)) {
    const isClassCatechist = classData.catechists.some((cc: any) => cc.userId === context.user.id);
    if (!isClassCatechist) throw new HttpError(403, 'Você não é catequista desta turma.');
    return;
  }

  // Guardians: only classes where their dependents are enrolled
  if (membership.role === 'GUARDIAN') {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    if (guardian?.householdId) {
      const enrollment = await context.entities.ClassEnrollment.findFirst({
        where: {
          classId,
          catechumenProfile: { householdId: guardian.householdId },
        },
      });
      if (enrollment) return;
    }
    throw new HttpError(403, 'Seus dependentes não estão matriculados nesta turma.');
  }

  // CATECHUMEN: only classes they're enrolled in
  if (membership.role === 'CATECHUMEN') {
    const enrollment = await context.entities.ClassEnrollment.findFirst({
      where: {
        classId,
        catechumenProfile: { userId: context.user.id },
      },
    });
    if (enrollment) return;
    throw new HttpError(403, 'Você não está matriculado nesta turma.');
  }

  throw new HttpError(403, 'Você não tem acesso a esta turma.');
}

export const listMeetings = async (args: { classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertUserBelongsToClass(context, args.classId);

  return context.entities.Meeting.findMany({
    where: { classId: args.classId },
    orderBy: { date: 'desc' },
    include: {
      content: { select: { id: true, title: true } },
      _count: { select: { attendance: true } },
    },
  });
};

export const createMeeting = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) throw new HttpError(403, 'Apenas catequistas e coordenadores podem criar encontros.');

  // Verificar pertencimento à turma
  await assertUserBelongsToClass(context, args.classId);

  try {
    return await context.entities.Meeting.create({
      data: {
        classId: args.classId, title: args.title, theme: args.theme,
        date: new Date(args.date), notes: args.notes,
        contentId: args.contentId || null, status: 'NOT_STARTED',
      },
    });
  } catch (e: any) {
    logger.warn('[meetingOps] createMeeting error', { error: e.message });
    throw new HttpError(500, 'Erro ao criar encontro: ' + e.message);
  }
};

export const getMeetingAttendance = async (args: { meetingId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Verificar acesso ao meeting através da turma
  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  await assertUserBelongsToClass(context, meeting.classId);

  return context.entities.AttendanceRecord.findMany({
    where: { meetingId: args.meetingId },
    include: {
      catechumenProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    },
  });
};

export const saveAttendance = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) throw new HttpError(403, 'Apenas catequistas e coordenadores podem registrar presença.');

  // Verificar pertencimento à turma através do meeting
  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  await assertUserBelongsToClass(context, meeting.classId);

  // Validate catechumen is enrolled in this class
  const isEnrolled = await context.entities.ClassEnrollment.findFirst({
    where: { classId: meeting.classId, catechumenProfileId: args.catechumenProfileId, status: 'ENROLLED' },
    select: { id: true },
  });
  if (!isEnrolled) throw new HttpError(400, 'Catequizando não está inscrito nesta turma.');

  const existing = await context.entities.AttendanceRecord.findFirst({
    where: { meetingId: args.meetingId, catechumenProfileId: args.catechumenProfileId },
  });

  if (existing) {
    return context.entities.AttendanceRecord.update({
      where: { id: existing.id },
      data: { status: args.status, note: args.note, recordedById: context.user.id },
    });
  }
  return context.entities.AttendanceRecord.create({
    data: {
      meetingId: args.meetingId, catechumenProfileId: args.catechumenProfileId,
      status: args.status, note: args.note, recordedById: context.user.id,
    },
  });
};

export const justifyAbsence = async (args: { attendanceId: string; note: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Verificar se o attendance record existe e o usuário é guardian do catequizando
  const attendance = await context.entities.AttendanceRecord.findUnique({
    where: { id: args.attendanceId },
    select: { catechumenProfileId: true },
  });
  if (!attendance) throw new HttpError(404, 'Registro de presença não encontrado.');

  if (!context.user.isAdmin) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (!guardian?.householdId) throw new HttpError(403, 'Acesso negado.');

    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: attendance.catechumenProfileId },
      select: { householdId: true },
    });
    if (catechumen?.householdId !== guardian.householdId) {
      throw new HttpError(403, 'Você não é responsável por este catequizando.');
    }
  }

  return context.entities.AttendanceRecord.update({
    where: { id: args.attendanceId },
    data: { status: 'JUSTIFIED', note: args.note },
  });
};

export const updateMeeting = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.id },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');

  // Check access: must belong to the class (catechist or coordinator)
  await assertUserBelongsToClass(context, meeting.classId);

  // Validate contentId belongs to the same parish if provided
  if (args.contentId) {
    const classData = await context.entities.CatechesisClass.findUnique({
      where: { id: meeting.classId },
      select: { parishId: true },
    });
    const content = await context.entities.ContentItem.findUnique({
      where: { id: args.contentId },
      select: { parishId: true },
    });
    if (!content || content.parishId !== classData?.parishId) {
      throw new HttpError(400, 'O conteúdo não pertence à mesma paróquia da turma.');
    }
  }

  // Unlink content by passing null contentId — handled by the spread below

  const { id, ...data } = args;

  // Convert date string to Date object if present
  if (data.date) {
    data.date = new Date(data.date);
  }

  return context.entities.Meeting.update({
    where: { id },
    data,
    include: {
      content: { select: { id: true, title: true, theme: true } },
    },
  });
};
