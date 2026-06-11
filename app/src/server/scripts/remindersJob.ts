/**
 * Daily reminder job — sends notifications for:
 * 1. Meetings happening tomorrow
 */
import { getMeetingReminderNotification, resolveUserLocale } from '../i18n/serverLocale';
import { logger } from '../logger';
import { skipIfNotJobWorker } from '../jobs/jobGuard';

export async function sendRemindersJob(_args: any, context: any) {
  if (skipIfNotJobWorker()) return;

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

    for (const meeting of upcomingMeetings) {
      // Collect unique user IDs to notify (catechists + guardians)
      const userIds = new Set<string>();
      for (const ct of meeting.class?.catechists || []) {
        userIds.add(ct.userId);
      }
      for (const enrollment of meeting.class?.enrollments || []) {
        for (const guardian of enrollment.catechumenProfile?.household?.guardians || []) {
          userIds.add(guardian.userId);
        }
      }

      const userLocales = new Map<string, ReturnType<typeof resolveUserLocale>>();
      if (userIds.size > 0) {
        const users = await context.entities.User.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, locale: true },
        });
        for (const u of users) {
          userLocales.set(u.id, resolveUserLocale(u));
        }
      }

      for (const userId of userIds) {
        const locale = userLocales.get(userId) ?? 'pt-BR';
        const { title, body } = getMeetingReminderNotification(
          locale,
          meeting.class?.name,
          meeting.title,
          tomorrow,
        );
        await context.entities.Notification.create({
          data: {
            userId,
            type: 'ATTENDANCE',
            title,
            body,
            link: `/app/classes/${meeting.classId}/attendance`,
          },
        });
        meetingReminders++;
      }
    }

    // Document expiration reminders disabled — Document model has no expirationDate field.
    // When sacramental document validity tracking is added, this section can be re-enabled.

    logger.info(`[remindersJob] Sent ${meetingReminders} meeting reminders.`);
  } catch (err: any) {
    logger.error('[remindersJob] Error:', { error: err.message });
  }

  return { meetingReminders };
}
