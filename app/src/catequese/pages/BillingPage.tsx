import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { CheckCircle, TrendingUp, Clock, ArrowUpRight, History, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getDashboardStats, getAiCreditsStatus, generateCheckoutSession, cancelSubscription, getParishById } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { PaymentPlanId, SubscriptionStatus } from '../../payment/plans';
import { getMonthlyAllowance } from '../../shared/aiCredits';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';
import { useUserContext } from '../../client/hooks/useUserContext';

// ─── Plan definitions ───────────────────────────────────────────────────────

interface PlanCard {
  planId: PaymentPlanId;
  name: string;
  price: string;
  priceCents?: number;
  annualPrice?: string;
  priceCentsAnnual?: number;
  maxClasses: number | null;
  maxCatechumens: number | null;
  features: string[];
  color: string;
  highlight: boolean;
  isFree: boolean;
}

const ALL_PLANS: PlanCard[] = [
  {
    planId: PaymentPlanId.CatechistFree,
    name: 'Catequista Grátis',
    price: 'Grátis',
    maxClasses: 2,
    maxCatechumens: 30,
    features: ['2 turmas', 'Até 30 catequizandos', 'Presença básica', 'Suporte comunitário'],
    color: 'bg-green-50 border-green-200',
    highlight: false,
    isFree: true,
  },
  {
    planId: PaymentPlanId.CatechistPro,
    name: 'Catequista Pro',
    price: 'R$ 9/mês',
    priceCents: 900,
    annualPrice: 'R$ 90/ano (R$ 7,50/mês)',
    priceCentsAnnual: 9000,
    maxClasses: null,
    maxCatechumens: null,
    features: ['Turmas ilimitadas', 'Catequizandos ilimitados', 'Relatórios avançados', 'Suporte prioritário', '2 créditos IA/mês (amostra)'],
    color: 'bg-blue-50 border-blue-200',
    highlight: false,
    isFree: false,
  },
  {
    planId: PaymentPlanId.CatechistAi,
    name: 'Catequista IA',
    price: 'R$ 29/mês',
    priceCents: 2900,
    annualPrice: 'R$ 290/ano (R$ 24/mês)',
    priceCentsAnnual: 29000,
    maxClasses: null,
    maxCatechumens: null,
    features: ['Tudo do Pro', 'Gerador de encontros por IA', 'Planejamento anual automático', 'Gerador de atividades e quizzes', 'Assistente teológico', 'Mensagens WhatsApp', '15 créditos/mês'],
    color: 'bg-violet-50 border-violet-300',
    highlight: true,
    isFree: false,
  },
  {
    planId: PaymentPlanId.CatechistAiAddon,
    name: 'Add-on IA',
    price: 'R$ 15/mês',
    priceCents: 1500,
    annualPrice: 'R$ 150/ano (R$ 12,50/mês)',
    priceCentsAnnual: 15000,
    maxClasses: null,
    maxCatechumens: null,
    features: ['Adiciona 15 créditos IA/mês', 'Compatível com qualquer plano pago', 'Gerador de encontros', 'Assistente teológico'],
    color: 'bg-indigo-50 border-indigo-200',
    highlight: false,
    isFree: false,
  },
  {
    planId: PaymentPlanId.Parish,
    name: 'Paróquia',
    price: 'R$ 49/mês',
    priceCents: 4900,
    annualPrice: 'R$ 490/ano (R$ 41/mês)',
    priceCentsAnnual: 49000,
    maxClasses: null,
    maxCatechumens: null,
    features: ['Tudo do IA', 'Multi-catequista', 'Turmas ilimitadas', 'Comunicação integrada', 'Documentos e certidões', 'Consentimentos LGPD', 'Painel do coordenador', '50 créditos de IA/mês'],
    color: 'bg-purple-50 border-purple-200',
    highlight: false,
    isFree: false,
  },
  {
    planId: PaymentPlanId.Diocese,
    name: 'Diocese',
    price: 'R$ 149/mês',
    priceCents: 14900,
    annualPrice: 'R$ 1.490/ano (R$ 124/mês)',
    priceCentsAnnual: 149000,
    maxClasses: null,
    maxCatechumens: null,
    features: ['Tudo do Paróquia', 'Multi-paróquia', 'Biblioteca oficial', 'Analytics consolidado', 'Gestão centralizada', 'Suporte prioritário', '50 créditos IA/mês por usuário'],
    color: 'bg-amber-50 border-amber-200',
    highlight: false,
    isFree: false,
  },
];

function getPlanDef(planId: PaymentPlanId): PlanCard {
  return ALL_PLANS.find((p) => p.planId === planId) || ALL_PLANS[0];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: stats, isLoading: loading } = useQuery(getDashboardStats);
  const { data: aiCredits } = useQuery(getAiCreditsStatus);
  const { data: user } = useAuth();
  const { parishId } = useUserContext();
  const { data: parish, isLoading: loadingParish } = useQuery(
    getParishById,
    { id: parishId },
    { enabled: !!parishId }
  );

  const [upgradingPlan, setUpgradingPlan] = useState<PaymentPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ── Determine effective plan ──────────────────────────────────────────────
  const hasPersonalPlan = user?.subscriptionStatus === SubscriptionStatus.Active;
  
  let effectivePlanId = PaymentPlanId.CatechistFree;
  let isActive = false;
  let isParishManaged = false;

  if (hasPersonalPlan && user?.subscriptionPlan) {
    effectivePlanId = user.subscriptionPlan as PaymentPlanId;
    isActive = true;
  } else if (parish?.billing) {
    const pBilling = parish.billing;
    const planUpper = pBilling.plan?.toUpperCase();
    const isBillingActive =
      pBilling.status === 'ACTIVE' ||
      (pBilling.status === 'TRIAL' && pBilling.trialEndsAt && new Date(pBilling.trialEndsAt) >= new Date());

    if (isBillingActive) {
      if (planUpper === 'PARISH') {
        effectivePlanId = PaymentPlanId.Parish;
        isActive = true;
        isParishManaged = true;
      } else if (planUpper === 'DIOCESE') {
        effectivePlanId = PaymentPlanId.Diocese;
        isActive = true;
        isParishManaged = true;
      }
    }
  }

  const effectivePlan = getPlanDef(effectivePlanId);

  // Determine if user has privileges to manage/cancel the effective plan
  const isPlanManager =
    user?.isAdmin ||
    (!isParishManaged) ||
    (effectivePlanId === PaymentPlanId.Parish && parish?.ownerId === user?.id) ||
    (effectivePlanId === PaymentPlanId.Diocese && parish?.dioceseAdmins?.some((da: any) => da.user?.id === user?.id));

  // Show all plans including Parish/Diocese — non-admins see them as "institutional" reference
  const visiblePlans = ALL_PLANS;

  if (loading || (parishId && loadingParish)) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Effective plan resolved above ─────────────────────────────────────────
  // ── Usage stats ───────────────────────────────────────────────────────────

  const classesUsed = stats?.activeClasses ?? 0;
  const catechumensUsed = stats?.activeCatechumens ?? 0;
  const maxClasses = effectivePlan.maxClasses ?? Infinity;
  const maxCatechumens = effectivePlan.maxCatechumens ?? Infinity;

  const handleUpgrade = async (planId: PaymentPlanId) => {
    if (planId === effectivePlanId) return;
    setError(null);
    setUpgradingPlan(planId);
    try {
      const result = await generateCheckoutSession(planId);
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar pagamento. Tente novamente.');
      setUpgradingPlan(null);
    }
  };



  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    setError(null);
    setCancelling(true);
    try {
      await cancelSubscription();
      toast({ title: 'Assinatura cancelada.' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao cancelar. Contacte o suporte.');
      setCancelling(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Assinatura</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              Plano atual: <Badge>{effectivePlan.name}</Badge>
              {isActive && <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Ativo</Badge>}
            </p>
            {isParishManaged && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span className="font-semibold">Plano Gerenciado Corporativo</span>
                </div>
                <div className="pl-6 space-y-1 text-xs text-blue-700">
                  {effectivePlanId === PaymentPlanId.Diocese && (
                    <>
                      <p>Diocese responsável: <strong>{parish?.diocese?.name || 'Não informada'}</strong></p>
                      {parish?.dioceseAdmins && parish.dioceseAdmins.length > 0 && (
                        <p>Administrador(es) diocesano(s): <strong>{parish.dioceseAdmins.map((da: any) => `${da.user.firstName} ${da.user.lastName} (${da.user.email})`).join(', ')}</strong></p>
                      )}
                    </>
                  )}
                  {effectivePlanId === PaymentPlanId.Parish && (
                    <>
                      <p>Paróquia responsável: <strong>{parish?.name || 'Não informada'}</strong></p>
                      {parish?.owner && (
                        <p>Coordenador responsável: <strong>{parish.owner.firstName} {parish.owner.lastName} ({parish.owner.email})</strong></p>
                      )}
                    </>
                  )}
                  <p className="mt-1.5 text-blue-600/80">Por favor, entre em contato com o responsável indicado para qualquer alteração ou dúvida sobre o plano.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Usage */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Uso do plano
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Turmas</span>
                  <span className="font-bold">
                    {classesUsed}/{maxClasses === Infinity ? '∞' : maxClasses}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${maxClasses === Infinity ? 0 : Math.min((classesUsed / maxClasses) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Catequizandos</span>
                  <span className="font-bold">
                    {catechumensUsed}/{maxCatechumens === Infinity ? '∞' : maxCatechumens}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${maxCatechumens === Infinity ? 0 : Math.min((catechumensUsed / maxCatechumens) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className={`rounded-lg p-3 ${isActive ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {isActive ? 'Assinatura ativa' : effectivePlan.isFree ? 'Plano gratuito' : 'Aguardando pagamento'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'A sua subscrição está ativa. Aproveite todos os recursos.'
                  : effectivePlan.isFree
                    ? 'Atualize para acessar recursos ilimitados.'
                    : 'Complete o pagamento PIX para ativar seu plano.'}
              </p>
              {isActive && !effectivePlan.isFree && isPlanManager && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  {cancelling ? 'Cancelando…' : 'Cancelar assinatura'}
                </Button>
              )}
            </div>
          </div>

          {/* AI Credits */}
          {aiCredits && aiCredits.monthlyAllowance > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
                  <circle cx="12" cy="13" r="2" />
                </svg>
                Créditos de IA
                {aiCredits.hasAiAccess ? (
                  <Badge className="bg-violet-100 text-violet-700 text-[10px] ml-1">Mensal</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 text-[10px] ml-1">Teste</Badge>
                )}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{aiCredits.hasAiAccess ? 'Créditos usados este mês' : 'Créditos de teste usados'}</span>
                    <span className="font-bold">
                      {aiCredits.monthlyAllowance - aiCredits.creditsLeft}/{aiCredits.monthlyAllowance}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${aiCredits.hasAiAccess ? 'bg-violet-500' : 'bg-gray-500'}`}
                      style={{ width: `${Math.min(((aiCredits.monthlyAllowance - aiCredits.creditsLeft) / aiCredits.monthlyAllowance) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Restantes</span>
                  <span className="font-bold text-foreground">{aiCredits.creditsLeft} crédito{aiCredits.creditsLeft !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plans comparison */}
        {!isParishManaged && (
          <>
            <h2 className="text-lg font-semibold mt-8">Planos disponíveis</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {visiblePlans.map((plan) => {
            const isCurrent = plan.planId === effectivePlanId;
            const isUpgrading = upgradingPlan === plan.planId;

            return (
              <div
                key={plan.planId}
                className={`rounded-xl border-2 p-5 ${plan.color} ${
                  plan.highlight ? 'ring-2 ring-primary shadow-lg' : ''
                } ${isCurrent ? 'border-primary' : 'border-muted'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">{plan.name}</h3>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <p className="text-xl font-bold mb-1">{plan.price}</p>
                {plan.annualPrice && (
                  <p className="text-xs text-green-600 font-medium mb-2">{plan.annualPrice}</p>
                )}
                <ul className="space-y-1.5 text-xs mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full text-xs" disabled>
                    Plano atual
                  </Button>
                ) : plan.isFree ? (
                  <Button variant="outline" className="w-full text-xs" disabled>
                    Plano base
                  </Button>
                ) : (plan.planId === PaymentPlanId.Parish || plan.planId === PaymentPlanId.Diocese) && !user?.isAdmin && parish?.ownerId !== user?.id ? (
                  <Button variant="outline" className="w-full text-xs" disabled title="Requer administrador da paróquia">
                    Plano institucional
                  </Button>
                ) : (
                  <Button
                    className="w-full text-xs"
                    variant={plan.highlight ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.planId)}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Redirecionando…
                      </>
                    ) : (
                      <>
                        Assinar
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
          </>
        )}

        {/* Payment history */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            Histórico de pagamentos
          </h3>
          <p className="text-sm text-muted-foreground">
            Os pagamentos são processados via PIX pela Woovi. O histórico estará disponível após a primeira cobrança.
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancelar assinatura"
        description="Tens a certeza que queres cancelar a tua assinatura? Perderás o acesso aos recursos premium no final do período atual."
        confirmLabel="Sim, cancelar"
        cancelLabel="Manter assinatura"
        variant="destructive"
        onConfirm={confirmCancel}
      />
    </AppShell>
  );
}
