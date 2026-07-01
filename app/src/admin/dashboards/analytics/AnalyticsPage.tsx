import { type AuthUser } from "wasp/auth";
import { useQuery, getPricingFunnel } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  BarChart3,
  MousePointerClick,
  CreditCard,
  ShoppingCart,
  Rocket,
  Share2,
  Users,
} from 'lucide-react';

type Counts = {
  landing_viewed: number;
  pricing_viewed: number;
  plan_selected: number;
  signup_started: number;
  signup_completed: number;
  checkout_started: number;
  purchase_completed: number;
  activation_completed: number;
  invite_sent: number;
  invite_accepted: number;
  share_clicked: number;
};

type FunnelData = {
  windowDays: number;
  counts7d: Counts;
  counts30d: Counts;
  conversion30d: {
    landingToPricing: number | null;
    pricingToPlan: number | null;
    planToSignup: number | null;
    signupToCheckout: number | null;
    checkoutToPurchase: number | null;
    purchaseToActivation: number | null;
    inviteAcceptance: number | null;
  };
  topPlans: Array<{ plan: string; count: number }>;
  topProcessors: Array<{ processor: string; count: number }>;
  recentPurchases: Array<{
    createdAt: string;
    toPlan: string | null;
    processor: string | null;
    userId: string | null;
  }>;
};

function percent(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

function pretty(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replaceAll('_', ' ');
}

const AnalyticsPage = ({ user }: { user: AuthUser }) => {
  const { data, isLoading } = useQuery(getPricingFunnel) as {
    data: FunnelData | undefined;
    isLoading: boolean;
  };

  const counts = data?.counts30d;
  const topCards = [
    {
      label: 'Landing views (30d)',
      value: counts?.landing_viewed ?? 0,
      subtitle: `${data?.counts7d.landing_viewed ?? 0} nos últimos 7 dias`,
      icon: BarChart3,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Pricing views (30d)',
      value: counts?.pricing_viewed ?? 0,
      subtitle: percent(data?.conversion30d.landingToPricing ?? null),
      icon: MousePointerClick,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Checkout started (30d)',
      value: counts?.checkout_started ?? 0,
      subtitle: percent(data?.conversion30d.signupToCheckout ?? null),
      icon: CreditCard,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Purchases (30d)',
      value: counts?.purchase_completed ?? 0,
      subtitle: percent(data?.conversion30d.checkoutToPurchase ?? null),
      icon: ShoppingCart,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Activations (30d)',
      value: counts?.activation_completed ?? 0,
      subtitle: percent(data?.conversion30d.purchaseToActivation ?? null),
      icon: Rocket,
      color: 'text-violet-600 bg-violet-50',
    },
  ];

  const funnelSteps = [
    { label: 'Landing viewed', count: counts?.landing_viewed ?? 0, rate: null },
    { label: 'Pricing viewed', count: counts?.pricing_viewed ?? 0, rate: data?.conversion30d.landingToPricing ?? null },
    { label: 'Plan selected', count: counts?.plan_selected ?? 0, rate: data?.conversion30d.pricingToPlan ?? null },
    { label: 'Signup started', count: counts?.signup_started ?? 0, rate: data?.conversion30d.planToSignup ?? null },
    { label: 'Signup completed', count: counts?.signup_completed ?? 0, rate: null },
    { label: 'Checkout started', count: counts?.checkout_started ?? 0, rate: data?.conversion30d.signupToCheckout ?? null },
    { label: 'Purchase completed', count: counts?.purchase_completed ?? 0, rate: data?.conversion30d.checkoutToPurchase ?? null },
    { label: 'Activation completed', count: counts?.activation_completed ?? 0, rate: data?.conversion30d.purchaseToActivation ?? null },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing Funnel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conversão comercial baseada em PricingEvent dos últimos {data?.windowDays ?? 30} dias.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {topCards.map((card) => (
                <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className={`inline-flex rounded-lg p-2.5 ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-caption text-muted-foreground/70 mt-0.5">{card.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-xl border bg-card p-5">
                <h2 className="font-semibold">Etapas do funil</h2>
                <p className="text-sm text-muted-foreground mt-1">Contagens em 30 dias com conversão entre etapas principais.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {funnelSteps.map((step) => (
                    <div key={step.label} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{step.label}</p>
                          <p className="text-2xl font-bold mt-1">{step.count}</p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {percent(step.rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Convites e share
                  </h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Invites sent</span>
                      <strong>{counts?.invite_sent ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Invites accepted</span>
                      <strong>{counts?.invite_accepted ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Invite acceptance</span>
                      <strong>{percent(data?.conversion30d.inviteAcceptance ?? null)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Share clicked</span>
                      <strong>{counts?.share_clicked ?? 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Top plans (30d)
                  </h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {data?.topPlans.length ? data.topPlans.map((item) => (
                      <div key={item.plan} className="flex items-center justify-between">
                        <span className="uppercase text-muted-foreground">{pretty(item.plan)}</span>
                        <strong>{item.count}</strong>
                      </div>
                    )) : <p className="text-muted-foreground">Sem compras no período.</p>}
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h2 className="font-semibold">Processors (30d)</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {data?.topProcessors.length ? data.topProcessors.map((item) => (
                      <div key={item.processor} className="flex items-center justify-between">
                        <span className="uppercase text-muted-foreground">{pretty(item.processor)}</span>
                        <strong>{item.count}</strong>
                      </div>
                    )) : <p className="text-muted-foreground">Sem processadores registados.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Recent purchases</h2>
              <p className="text-sm text-muted-foreground mt-1">Últimos eventos autoritativos de pagamento confirmado.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Data</th>
                      <th className="pb-3 pr-4 font-medium">Plano</th>
                      <th className="pb-3 pr-4 font-medium">Processor</th>
                      <th className="pb-3 pr-4 font-medium">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentPurchases.length ? data.recentPurchases.map((item, index) => (
                      <tr key={`${item.createdAt}-${index}`} className="border-b last:border-0">
                        <td className="py-3 pr-4">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="py-3 pr-4 uppercase">{pretty(item.toPlan)}</td>
                        <td className="py-3 pr-4 uppercase">{pretty(item.processor)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{item.userId || '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhuma compra confirmada ainda.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AnalyticsPage;