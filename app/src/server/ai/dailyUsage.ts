/**
 * Persisted daily AI usage tracker — replaces in-memory Map.
 * Uses DailyAiUsage model in the database.
 */
/**
 * Get today's usage count for a user.
 */
export async function getDailyUsage(entities: any, userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const usage = await entities.DailyAiUsage.findFirst({
    where: {
      userId,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  return usage?.count ?? 0;
}

/**
 * Increment daily usage for a user by a given amount.
 */
export async function incrementDailyUsage(entities: any, userId: string, amount: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await entities.DailyAiUsage.upsert({
    where: {
      userId_date: { userId, date: today },
    },
    update: {
      count: { increment: amount },
    },
    create: {
      userId,
      date: today,
      count: amount,
    },
  });
}
