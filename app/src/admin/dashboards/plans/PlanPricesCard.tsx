import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Badge } from "../../../client/components/ui/badge";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { formatPrice } from "../../../shared/currency";
import type { AdminPricingPlan, AdminPricingPlanPrice } from "./PlansPage";

function intervalLabel(
  interval: AdminPricingPlanPrice["interval"],
  t: (key: string) => string,
): string {
  if (interval === "ANNUAL") return t("pages.plans.interval_annual");
  if (interval === "ONE_TIME") return t("pages.plans.interval_one_time");
  return t("pages.plans.interval_monthly");
}

interface PlanPricesCardProps {
  plan: AdminPricingPlan;
  onChangePrice: (interval: "monthly" | "annual" | "one_time", unitAmountCents: number) => Promise<void>;
  changing?: boolean;
}

export function PlanPricesCard({ plan, onChangePrice, changing }: PlanPricesCardProps) {
  const { t } = useTranslation("admin");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{
    interval: "monthly" | "annual" | "one_time";
    cents: number;
  } | null>(null);

  const active = plan.prices.filter((price) => price.isActive);
  const archived = plan.prices.filter((price) => !price.isActive);
  const wanted: Array<"MONTHLY" | "ANNUAL" | "ONE_TIME"> =
    plan.kind === "CREDITS" ? ["ONE_TIME"] : ["MONTHLY", "ANNUAL"];

  const toClientInterval = (interval: AdminPricingPlanPrice["interval"]): "monthly" | "annual" | "one_time" => {
    if (interval === "ANNUAL") return "annual";
    if (interval === "ONE_TIME") return "one_time";
    return "monthly";
  };

  return (
    <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("pages.plans.prices_title")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("pages.plans.prices_hint")}</p>
      <div className="space-y-3">
        {wanted.map((interval) => {
          const current = active.find((price) => price.interval === interval);
          const key = `${plan.id}-${interval}`;
          const draft = drafts[key] ?? (current ? String(current.unitAmountCents / 100) : "");
          return (
            <div key={interval} className="rounded-sm border border-border/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-brand-ink">
                  {intervalLabel(interval, t)}
                </span>
                {current?.stripePriceId ? (
                  <Badge variant="success" size="sm">
                    Stripe
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    {t("pages.plans.no_stripe_price")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {current
                  ? `${formatPrice(current.unitAmountCents)} · ${current.stripeLookupKey || "—"}`
                  : t("pages.plans.no_active_price")}
              </p>
              {current?.stripePriceId && (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{current.stripePriceId}</p>
              )}
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="max-w-[140px]"
                  value={draft}
                  onChange={(event) => setDrafts((currentDrafts) => ({ ...currentDrafts, [key]: event.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={changing || !draft}
                  onClick={() => {
                    const reais = Number(draft);
                    if (!Number.isFinite(reais) || reais <= 0) return;
                    setPending({
                      interval: toClientInterval(interval),
                      cents: Math.round(reais * 100),
                    });
                  }}
                >
                  {t("pages.plans.change_price")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {archived.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("pages.plans.archived_prices")}
          </p>
          {archived.slice(0, 8).map((price) => (
            <p key={price.id} className="font-mono text-[11px] text-muted-foreground">
              {intervalLabel(price.interval, t)} · {formatPrice(price.unitAmountCents)} ·{" "}
              {price.stripePriceId || "—"}
            </p>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={t("pages.plans.change_price_title")}
        description={t("pages.plans.change_price_desc")}
        confirmLabel={t("pages.plans.change_price")}
        onConfirm={() => {
          if (!pending) return;
          void onChangePrice(pending.interval, pending.cents).finally(() => setPending(null));
        }}
        loading={changing}
      />
    </div>
  );
}
