import { HttpError } from 'wasp/server';
import { getDioceseParishIds } from '../auth/helpers';

export const getDashboardStats = async (args: { parishId?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const isAdmin = context.user.isAdmin;

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);
  const roles = memberships.map((m: any) => m.role);

  // Include personal workspace
  let personalWorkspaceId: string | null = null;
  if (!isAdmin) {
    const personal = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personal) {
      personalWorkspaceId = personal.id;
      if (!parishIds.includes(personal.id)) {
        parishIds.push(personal.id);
        roles.push('PERSONAL_OWNER');
      }
    }
  }

  // DIOCESE_ADMIN: include all parishes in the diocese for access validation
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) {
        parishIds.push(id);
        roles.push('DIOCESE_ADMIN');
      }
    }
  }

  if (parishIds.length === 0 && !isAdmin) {
    return { activeCatechumens: 0, activeClasses: 0, avgAttendance: 0, pendingSacraments: 0, recentAlerts: [], aniversariantes: [], upcomingMeetings: [], reviewQueue: [], myClasses: [] };
  }

  // Validate args.parishId belongs to user
  if (args.parishId && !isAdmin && !parishIds.includes(args.parishId)) {
    throw new HttpError(403, 'Voce nao tem acesso a esta paroquia.');
  }

  const whereClause = args.parishId
    ? { parishId: args.parishId }
    : isAdmin ? {} : { parishId: { in: parishIds } };

  const [activeClasses, totalEnrollments] = await Promise.all([
    context.entities.CatechesisClass.count({ where: { ...whereClause, status: 'ACTIVE' } }),
    context.entities.ClassEnrollment.count({ where: { status: 'ENROLLED', class: whereClause } }),
  ]);

  const pendingSacraments = await context.entities.SacramentalMilestone.count({
    where: { status: { in: ['PENDING','IN_PROGRESS','WAITING_APPROVAL'] }, journey: { catechumenProfile: { enrollments: { some: { class: whereClause } } } } },
  });

  // ─── avgAttendance (cálculo real baseado em registros) ──────────────────
  let avgAttendance = 0;
  const attendanceTotal = await context.entities.AttendanceRecord.count({
    where: { status: 'PRESENT', meeting: { class: whereClause } },
  });
  const attendanceRecordsTotal = await context.entities.AttendanceRecord.count({
    where: { meeting: { class: whereClause } },
  });
  if (attendanceRecordsTotal > 0) {
    avgAttendance = Math.round((attendanceTotal / attendanceRecordsTotal) * 100);
  }

  // ─── myClasses (para catequistas e coordenadores que também dão aulas) ──
  let myClasses: any[] = [];
  // Always check ClassCatechist regardless of membership role — coordinators can also be catechists
  const myClassLinks = await context.entities.ClassCatechist.findMany({
    where: { userId: context.user.id },
    include: {
      class: {
        include: {
          _count: { select: { enrollments: true } },
          meetings: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            orderBy: { date: 'asc' },
            take: 3,
          },
        },
      },
    },
  });
  myClasses = myClassLinks.map((link: any) => ({
    id: link.class.id,
      name: link.class.name,
      enrollmentCount: link.class._count.enrollments,
      todayMeetings: link.class.meetings,
    }));
  

  // ─── todayMeetings ────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let todayMeetings: any[] = [];
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const myClassIds = myClasses.map((c: any) => c.id);
    todayMeetings = await context.entities.Meeting.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        classId: { in: myClassIds },
      },
      orderBy: { date: 'asc' },
      include: { class: { select: { id: true, name: true } } },
    });
  } else if (isAdmin || roles.some((r: string) => ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN'].includes(r))) {
    todayMeetings = await context.entities.Meeting.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        class: whereClause,
      },
      orderBy: { date: 'asc' },
      include: { class: { select: { id: true, name: true } } },
    });
  }

  // ─── Aniversariantes ──────────────────────────────────────────────────
  const allCatechumens = await context.entities.CatechumenProfile.findMany({
    where: isAdmin ? {} : { enrollments: { some: { class: whereClause } } },
    select: { id: true, firstName: true, lastName: true, birthDate: true },
  });
  const aniversariantes = allCatechumens
    .filter((c: any) => c.birthDate && new Date(c.birthDate).getMonth() === today.getMonth())
    .sort((a: any, b: any) => new Date(a.birthDate).getDate() - new Date(b.birthDate).getDate())
    .slice(0, 10);

  // ─── Proximos encontros (7 dias) ──────────────────────────────────────
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingMeetings = await context.entities.Meeting.findMany({
    where: {
      date: { gte: today, lte: nextWeek },
      ...(isAdmin ? {} : { class: whereClause }),
    },
    orderBy: { date: 'asc' },
    take: 5,
    include: { class: { select: { id: true, name: true } } },
  });

  // ─── Alertas ──────────────────────────────────────────────────────────
  const recentAlerts: { type: string; message: string }[] = [];
  if (activeClasses === 0) {
    const draftCount = await context.entities.CatechesisClass.count({
      where: { ...whereClause, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      recentAlerts.push({ type: 'info', message: `Tens ${draftCount} turma(s) em rascunho. Ativa-as na página de Turmas para começarem a contar.` });
    } else {
      recentAlerts.push({ type: 'info', message: 'Nenhuma turma ativa. Crie uma turma para começar.' });
    }
  }
  if (avgAttendance < 50 && attendanceRecordsTotal > 0) recentAlerts.push({ type: 'warning', message: 'Presença média abaixo de 50%. Considere entrar em contato com as famílias.' });

  // ─── reviewQueue (conteúdos pendentes de revisão) ─────────────────────
  let reviewQueue: any[] = [];
  if (roles.includes('CONTENT_REVIEWER') || isAdmin || roles.some((r: string) => ['PARISH_COORDINATOR', 'DIOCESE_ADMIN'].includes(r))) {
    reviewQueue = await context.entities.ContentItem.findMany({
      where: { status: 'IN_REVIEW', ...(isAdmin ? {} : { parishId: { in: parishIds } }) },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { id: true, title: true, status: true, updatedAt: true },
    });
  }

  return {
    activeCatechumens: totalEnrollments,
    activeClasses,
    avgAttendance,
    pendingSacraments,
    totalUsers: isAdmin ? await context.entities.User.count() : undefined,
    totalParishes: isAdmin ? await context.entities.Parish.count() : undefined,
    recentAlerts,
    aniversariantes,
    upcomingMeetings,
    todayMeetings,
    reviewQueue,
    myClasses,
  };
};
