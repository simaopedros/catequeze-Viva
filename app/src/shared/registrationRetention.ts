/** Períodos acordados para a rotina de retenção de inscrições. */
export const REGISTRATION_DRAFT_RETENTION_DAYS = 30;
export const REGISTRATION_CYCLE_RETENTION_DAYS = 180;

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
