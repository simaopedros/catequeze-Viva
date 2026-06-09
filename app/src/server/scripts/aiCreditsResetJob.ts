/**
 * PgBoss job: resets AI credits monthly for users on AI plans.
 * Scheduled via main.wasp (daily at 3am — checks if reset is due).
 */
import { resetAllAiCredits } from '../ai/credits';
import { skipIfNotJobWorker } from '../jobs/jobGuard';

export const resetAiCreditsJob = async (
  _args: unknown,
  context: {
    entities: {
      UserAiCredits: any;
      User: any;
    };
  },
) => {
  if (skipIfNotJobWorker()) return;
  const count = await resetAllAiCredits(context.entities);
  console.log(`[aiCreditsResetJob] Reset ${count} user(s) AI credits.`);
  return { resetCount: count };
};
