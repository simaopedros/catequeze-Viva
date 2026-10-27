/**
 * Records a JobRun row around an async job body.
 * Maintenance / expiration routes can adopt this later without coupling here.
 */
export async function recordJobRun<T>(
  context: { entities: { JobRun: any } },
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const run = await context.entities.JobRun.create({
    data: { name },
  });

  try {
    const result = await fn();
    await context.entities.JobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: true,
        error: null,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await context.entities.JobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: false,
        error: message.slice(0, 2000),
      },
    });
    throw err;
  }
}
