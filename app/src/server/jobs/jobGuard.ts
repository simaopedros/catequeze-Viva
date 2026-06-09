/** When RUN_JOBS=false (API server), skip scheduled/triggered background jobs. */
export function skipIfNotJobWorker(): boolean {
  if (process.env.RUN_JOBS === 'false') return true;
  return false;
}

export function isJobWorkerProcess(): boolean {
  if (process.env.RUN_JOBS === 'true') return true;
  if (process.env.RUN_JOBS === 'false') return false;
  return true; // dev: single process runs jobs
}
