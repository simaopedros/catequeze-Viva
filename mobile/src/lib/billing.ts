const PLAN_NAMES: Record<string, string> = {
  single: 'Plano Catequista',
  unlimited: 'Plano Paróquia',
  catechist_free: 'Catequista gratuito',
  diocese: 'Plano Diocese',
  ai_credits_20: 'Créditos de IA (20)',
  ai_credits_50: 'Créditos de IA (50)',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Em período de teste',
  past_due: 'Pagamento em atraso',
  cancel_at_period_end: 'Cancela no fim do período',
  deleted: 'Cancelada',
};

export function planLabel(planId?: string | null): string {
  if (!planId) return '—';
  return PLAN_NAMES[planId] || planId;
}

export function subscriptionStatusLabel(status?: string | null): string {
  if (!status) return '';
  return STATUS_LABELS[status] || status;
}
