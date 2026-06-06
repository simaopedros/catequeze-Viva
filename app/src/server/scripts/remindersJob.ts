/**
 * Daily reminder job — sends notifications for:
 * 1. Meetings happening tomorrow
 * 2. Documents expiring in the next 7 days
 */
export async function sendRemindersJob(_args: any, context: any) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  let meetingReminders = 0;
  let documentReminders = 0;

  try {
    // 1. Find meetings happening tomorrow
    const upcomingMeetings = await context.entities.Meeting.findMany({
      where: {
        date: { gte: tomorrow, lt: dayAfterTomorrow },
        status: 'NOT_STARTED',
      },
      select: {
        id: true,
        title: true,
        date: true,
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            parishId: true,
            catechists: {
              select: { userId: true },
            },
            enrollments: {
              where: { status: 'ENROLLED' },
              select: {
                catechumen: {
                  select: {
                    id: true,
                    household: {
                      select: {
                        guardians: {
                          select: { userId: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const meeting of upcomingMeetings) {
      // Collect unique user IDs to notify (catechists + guardians)
      const userIds = new Set<string>();
      for (const ct of meeting.class?.catechists || []) {
        userIds.add(ct.userId);
      }
      for (const enrollment of meeting.class?.enrollments || []) {
        for (const guardian of enrollment.catechumen?.household?.guardians || []) {
          userIds.add(guardian.userId);
        }
      }

      for (const userId of userIds) {
        await context.entities.Notification.create({
          data: {
            userId,
            type: 'ATTENDANCE',
            title: 'Encontro amanhã',
            message: `${meeting.class?.name || 'Turma'}: "${meeting.title}" — ${tomorrow.toLocaleDateString('pt-BR')}`,
            link: `/app/classes/${meeting.classId}/attendance`,
            parishId: meeting.class?.parishId || null,
          },
        });
        meetingReminders++;
      }
    }

    // 2. Find documents expiring in the next 7 days
    const expiringDocs = await context.entities.Document.findMany({
      where: {
        expirationDate: { gte: now, lte: in7Days },
      },
      select: {
        id: true,
        name: true,
        expirationDate: true,
        catechumenId: true,
        catechumen: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            parishId: true,
            household: {
              select: {
                guardians: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    for (const doc of expiringDocs) {
      const daysUntilExpiry = Math.ceil(
        (new Date(doc.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      for (const guardian of doc.catechumen?.household?.guardians || []) {
        await context.entities.Notification.create({
          data: {
            userId: guardian.userId,
            type: 'DOCUMENT',
            title: 'Documento a vencer',
            message: `"${doc.name}" de ${doc.catechumen?.firstName} vence em ${daysUntilExpiry} dia(s). Atualize para evitar pendências.`,
            link: `/app/documents`,
            parishId: doc.catechumen?.parishId || null,
          },
        });
        documentReminders++;
      }
    }

    console.log(`[remindersJob] Sent ${meetingReminders} meeting reminders + ${documentReminders} document reminders.`);
  } catch (err: any) {
    console.error('[remindersJob] Error:', err.message);
  }

  return { meetingReminders, documentReminders };
}
