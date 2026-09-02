import { type AuthUser } from "wasp/auth";
import { useQuery, getPricingFunnel } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import {
  BarChart3,
  MousePointerClick,
  CreditCard,
  ShoppingCart,
  Rocket,
  Share2,
  Users,
} from "lucide-react";
import { formatDateTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

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
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function pretty(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

const AnalyticsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data, isLoading } = useQuery(getPricingFunnel) as {
    data: FunnelData | undefined;
    isLoading: boolean;
  };

  const counts = data?.counts30d;
  const topCards = [
    {
      label: t("pages.analytics.landing_views"),
      value: counts?.landing_viewed ?? 0,
      subtitle: t("pages.analytics.last_7d", {
        count: data?.counts7d.landing_viewed ?? 0,
      }),
      icon: BarChart3,
    },
    {
      label: t("pages.analytics.pricing_views"),
      value: counts?.pricing_viewed ?? 0,
      subtitle: percent(data?.conversion30d.landingToPricing ?? null),
      icon: MousePointerClick,
    },
    {
      label: t("pages.analytics.checkout_started"),
      value: counts?.checkout_started ?? 0,
      subtitle: percent(data?.conversion30d.signupToCheckout ?? null),
      icon: CreditCard,
    },
    {
      label: t("pages.analytics.purchases"),
      value: counts?.purchase_completed ?? 0,
      subtitle: percent(data?.conversion30d.checkoutToPurchase ?? null),
      icon: ShoppingCart,
    },
    {
      label: t("pages.analytics.activations"),
      value: counts?.activation_completed ?? 0,
      subtitle: percent(data?.conversion30d.purchaseToActivation ?? null),
      icon: Rocket,
    },
  ];

  const funnelSteps = [
    { key: "landing_viewed", count: counts?.landing_viewed ?? 0, rate: null },
    {
      key: "pricing_viewed",
      count: counts?.pricing_viewed ?? 0,
      rate: data?.conversion30d.landingToPricing ?? null,
    },
    {
      key: "plan_selected",
      count: counts?.plan_selected ?? 0,
      rate: data?.conversion30d.pricingToPlan ?? null,
    },
    {
      key: "signup_started",
      count: counts?.signup_started ?? 0,
      rate: data?.conversion30d.planToSignup ?? null,
    },
    {
      key: "signup_completed",
      count: counts?.signup_completed ?? 0,
      rate: null,
    },
    {
      key: "checkout_started",
      count: counts?.checkout_started ?? 0,
      rate: data?.conversion30d.signupToCheckout ?? null,
    },
    {
      key: "purchase_completed",
      count: counts?.purchase_completed ?? 0,
      rate: data?.conversion30d.checkoutToPurchase ?? null,
    },
    {
      key: "activation_completed",
      count: counts?.activation_completed ?? 0,
      rate: data?.conversion30d.purchaseToActivation ?? null,
    },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.analytics.title")}
          subtitle={t("pages.analytics.subtitle", {
            days: data?.windowDays ?? 30,
          })}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {topCards.map((card) => (
                <div key={card.label} className="space-y-1">
                  <AppMetric
                    label={card.label}
                    value={card.value}
                    className="bg-white"
                  />
                  <p className="px-1 text-caption text-muted-foreground/70">
                    {card.subtitle}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="space-y-1.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("pages.analytics.funnel_title")}
                  </h2>
                  <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("pages.analytics.funnel_hint")}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {funnelSteps.map((step) => (
                    <div
                      key={step.key}
                      className="rounded-sm border border-border/70 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold tracking-tight text-[#071A2D]">
                            {t(`pages.analytics.step_${step.key}`)}
                          </p>
                          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[#071A2D]">
                            {step.count}
                          </p>
                        </div>
                        <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {percent(step.rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-sm border border-border/70 bg-white p-5">
                  <div className="space-y-1.5">
                    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-[#071A2D]" />
                      {t("pages.analytics.invites_title")}
                    </h2>
                    <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{t("pages.analytics.invites_sent")}</span>
                      <strong>{counts?.invite_sent ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("pages.analytics.invites_accepted")}</span>
                      <strong>{counts?.invite_accepted ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("pages.analytics.invite_acceptance")}</span>
                      <strong>
                        {percent(data?.conversion30d.inviteAcceptance ?? null)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("pages.analytics.share_clicked")}</span>
                      <strong>{counts?.share_clicked ?? 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-border/70 bg-white p-5">
                  <div className="space-y-1.5">
                    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Share2 className="h-3.5 w-3.5 text-[#071A2D]" />
                      {t("pages.analytics.top_plans")}
                    </h2>
                    <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {data?.topPlans.length ? (
                      data.topPlans.map((item) => (
                        <div
                          key={item.plan}
                          className="flex items-center justify-between"
                        >
                          <span className="uppercase text-muted-foreground">
                            {pretty(item.plan)}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        {t("pages.analytics.no_purchases")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-sm border border-border/70 bg-white p-5">
                  <div className="space-y-1.5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.analytics.processors")}
                    </h2>
                    <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {data?.topProcessors.length ? (
                      data.topProcessors.map((item) => (
                        <div
                          key={item.processor}
                          className="flex items-center justify-between"
                        >
                          <span className="uppercase text-muted-foreground">
                            {pretty(item.processor)}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        {t("pages.analytics.no_processors")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-border/70 bg-white p-5">
              <div className="space-y-1.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("pages.analytics.recent_purchases")}
                </h2>
                <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("pages.analytics.recent_hint")}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {t("pages.analytics.col_date")}
                      </th>
                      <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {t("pages.analytics.col_plan")}
                      </th>
                      <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {t("pages.analytics.col_processor")}
                      </th>
                      <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {t("pages.analytics.col_user")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentPurchases.length ? (
                      data.recentPurchases.map((item, index) => (
                        <tr
                          key={`${item.createdAt}-${index}`}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4">
                            {formatDateTime(item.createdAt, currentLocale)}
                          </td>
                          <td className="py-3 pr-4 uppercase">
                            {pretty(item.toPlan)}
                          </td>
                          <td className="py-3 pr-4 uppercase">
                            {pretty(item.processor)}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                            {item.userId || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          {t("pages.analytics.no_confirmed")}
                        </td>
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
