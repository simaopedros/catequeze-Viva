/**
 * Daily reminder job — sends notifications for:
 * 1. Meetings happening tomorrow
 */
import { getMeetingReminderNotification, resolveUserLocale } from '../i18n/serverLocale';
import { logger } from '../logger';

const NOTIFICATION_BATCH_SIZE = 500;

export async function sendRemindersJob(_args: any, context: any) {

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  let meetingReminders = 0;

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
                catechumenProfile: {
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

    const dayKey = tomorrow.toISOString().slice(0, 10);

    // Recipients per meeting (catechists + guardians), de-duplicated.
    const recipientsByMeeting = new Map<string, Set<string>>();
    const allUserIds = new Set<string>();
    for (const meeting of upcomingMeetings) {
      const userIds = new Set<string>();
      for (const ct of meeting.class?.catechists || []) {
        if (ct.userId) userIds.add(ct.userId);
      }
      for (const enrollment of meeting.class?.enrollments || []) {
        for (const guardian of enrollment.catechumenProfile?.household?.guardians || []) {
          if (guardian.userId) userIds.add(guardian.userId);
        }
      }
      recipientsByMeeting.set(meeting.id, userIds);
      for (const id of userIds) allUserIds.add(id);
    }

    if (allUserIds.size > 0) {
      // One lookup for locales and one for already-sent markers (instead of per user).
      const markers = upcomingMeetings.map((m: any) => `${m.id}:${dayKey}`);
      const [users, existing] = await Promise.all([
        context.entities.User.findMany({
          where: { id: { in: [...allUserIds] } },
          select: { id: true, locale: true },
        }),
        context.entities.Notification.findMany({
          where: {
            entityType: 'MEETING_REMINDER',
            entityId: { in: markers },
            userId: { in: [...allUserIds] },
          },
          select: { userId: true, entityId: true },
        }),
      ]);

      const userLocales = new Map<string, ReturnType<typeof resolveUserLocale>>();
      for (const u of users) userLocales.set(u.id, resolveUserLocale(u));
      const alreadySent = new Set(existing.map((n: any) => `${n.entityId}|${n.userId}`));

      const toCreate: Array<Record<string, unknown>> = [];
      for (const meeting of upcomingMeetings) {
        const reminderMarker = `${meeting.id}:${dayKey}`;
        for (const userId of recipientsByMeeting.get(meeting.id) ?? []) {
          if (alreadySent.has(`${reminderMarker}|${userId}`)) continue;
          const locale = userLocales.get(userId) ?? 'pt-BR';
          const { title, body } = getMeetingReminderNotification(
            locale,
            meeting.class?.name,
            meeting.title,
            tomorrow,
          );
          toCreate.push({
            userId,
            type: 'ATTENDANCE',
            title,
            body,
            link: `/app/classes/${meeting.classId}/attendance`,
            entityType: 'MEETING_REMINDER',
            entityId: reminderMarker,
          });
        }
      }

      for (let i = 0; i < toCreate.length; i += NOTIFICATION_BATCH_SIZE) {
        const chunk = toCreate.slice(i, i + NOTIFICATION_BATCH_SIZE);
        const created = await context.entities.Notification.createMany({ data: chunk });
        meetingReminders += created?.count ?? chunk.length;
      }
    }

    // Document expiration reminders disabled — Document model has no expirationDate field.
    // When sacramental document validity tracking is added, this section can be re-enabled.

    logger.info(`[remindersJob] Sent ${meetingReminders} meeting reminders.`);
  } catch (err: any) {
    logger.error('[remindersJob] Error:', { error: err.message });
    throw err;
  }

  return { meetingReminders };
}
