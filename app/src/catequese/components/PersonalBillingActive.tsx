import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Check,
  CheckCircle,
  CreditCard,
  History,
  Loader2,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../client/components/ui/accordion";
import { SalesWhatsAppCta } from "../../client/components/SalesWhatsAppCta";
import {
  formatMonthlyFromAnnualCents,
  formatPrice,
} from "../../shared/currency";
import { OrganizeParishCard } from "./OrganizeParishCard";

export type PersonalBillingActiveProps = {
  workspaceName: string;
  planName: string;
  features: string[];
  monthlyCents?: number;
  annualCents?: number;
  billedAnnually: boolean;
  classesUsed: number;
  catechumensUsed: number;
  maxClasses: number;
  maxCatechumens: number;
  onManage: () => void;
  manageLoading: boolean;
  onCancel: () => void;
  cancelling: boolean;
  cancelScheduled: boolean;
  onSwitchAnnual?: () => void;
  switchingInterval?: boolean;
  annualSavingsLabel?: string | null;
  error?: string | null;
};

export function usageBarPercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

function UsageRow({
  label,
  used,
  limit,
  ariaLabel,
}: {
  label: string;
  used: number;
  limit: number;
  ariaLabel: string;
}) {
  const finite = Number.isFinite(limit) && limit > 0;
  const width = usageBarPercent(used, limit);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold tracking-tight text-brand-ink">
        {label}
      </p>
      <div className="h-1.5 w-full rounded-sm bg-muted">
        <div
          className="h-1.5 rounded-sm bg-brand-ink"
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={finite ? limit : 0}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function PersonalBillingActive({
  workspaceName,
  planName,
  features,
  monthlyCents,
  annualCents,
  billedAnnually,
  classesUsed,
  catechumensUsed,
  maxClasses,
  maxCatechumens,
  onManage,
  manageLoading,
  onCancel,
  cancelling,
  cancelScheduled,
  onSwitchAnnual,
  switchingInterval,
  annualSavingsLabel,
  error,
}: PersonalBillingActiveProps) {
  const { t } = useTranslation("billing");
  const hasAnnual = typeof annualCents === "number" && annualCents > 0;
  const hasMonthly = typeof monthlyCents === "number" && monthlyCents > 0;
  const priceLabel =
    billedAnnually && hasAnnual
      ? formatMonthlyFromAnnualCents(annualCents)
      : hasMonthly
        ? formatPrice(monthlyCents)
        : "—";

  return (
    <div
      className="mx-auto max-w-3xl space-y-8"
      data-testid="personal-billing-active"
    >
      <section
        data-testid="personal-active-hero"
        className="relative overflow-hidden rounded-sm border border-border/70 bg-white px-5 py-6 sm:px-8 sm:py-8"
      >
        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("personal_active.workspace_eyebrow")}
              </p>
              <p className="truncate text-sm font-semibold tracking-tight text-brand-ink sm:text-base">
                {planName}
                {workspaceName ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {workspaceName}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-success"
              data-testid="personal-active-badge"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-success"
                aria-hidden
              />
              {cancelScheduled
                ? t("cancel_scheduled")
                : t("personal_active.active_badge")}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle
              className="mt-0.5 h-6 w-6 shrink-0 text-success"
              aria-hidden
            />
            <div className="max-w-xl space-y-1">
              <h1 className="font-sans text-title-sm font-semibold tracking-tight text-brand-ink sm:text-title-md">
                {t("personal_active.headline")}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
                {cancelScheduled
                  ? t("cancel_scheduled_desc")
                  : t("personal_active.result")}
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Button
              size="lg"
              className="h-11 rounded-sm px-5"
              data-testid="personal-active-manage"
              onClick={onManage}
              disabled={manageLoading}
            >
              {manageLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {manageLoading ? t("redirecting") : t("personal_active.manage")}
            </Button>
            {!cancelScheduled && (
              <div>
                <button
                  type="button"
                  data-testid="personal-active-cancel"
                  onClick={onCancel}
                  disabled={cancelling}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                >
                  {cancelling
                    ? t("cancelling")
                    : t("personal_active.cancel_link")}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("personal_active.scope_hint")}
          </p>
        </div>
        <BookOpen
          className="pointer-events-none absolute -bottom-6 -right-4 hidden h-36 w-36 text-brand-ink/10 sm:block"
          strokeWidth={1}
          aria-hidden
        />
      </section>

      <section
        data-testid="personal-active-plan"
        className="rounded-sm border border-border/70 bg-white p-5 sm:p-7"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("personal_active.your_plan")}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-brand-ink">
            {planName}
          </h2>
          <span className="rounded-sm border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-ink">
            {t("personal_active.current_badge")}
          </span>
        </div>

        <div className="mt-4">
          <p className="flex flex-wrap items-baseline gap-1 text-brand-ink">
            <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {priceLabel}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("personal_active.per_month")}
            </span>
          </p>
          {billedAnnually && hasAnnual && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("personal_active.billed_annually", {
                price: formatPrice(annualCents),
              })}
            </p>
          )}
          {billedAnnually && annualSavingsLabel && (
            <p className="mt-0.5 text-sm font-semibold text-brand-gold-muted">
              {t("personal_active.save_year", { price: annualSavingsLabel })}
            </p>
          )}
          {!billedAnnually && onSwitchAnnual && annualSavingsLabel && (
            <button
              type="button"
              onClick={onSwitchAnnual}
              disabled={switchingInterval}
              className="mt-2 text-sm font-medium text-brand-ink underline-offset-2 hover:underline"
            >
              {switchingInterval
                ? t("switching")
                : t("personal_active.switch_annual", {
                    savings: annualSavingsLabel,
                  })}
            </button>
          )}
        </div>

        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-brand-ink"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                aria-hidden
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-4 border-t border-border/60 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("personal_active.usage_title")}
          </p>
          <UsageRow
            label={t("personal_active.usage_classes", {
              used: classesUsed,
              limit: Number.isFinite(maxClasses) ? maxClasses : "∞",
            })}
            used={classesUsed}
            limit={maxClasses}
            ariaLabel={t("classes_quota_label")}
          />
          <UsageRow
            label={t("personal_active.usage_catechumens", {
              used: catechumensUsed,
              limit: Number.isFinite(maxCatechumens) ? maxCatechumens : "∞",
            })}
            used={catechumensUsed}
            limit={maxCatechumens}
            ariaLabel={t("catechumens_quota_label")}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-brand-ink">
              {t("personal_active.usage_bridge")}{" "}
            </span>
            {t("personal_active.usage_bridge_desc")}
          </p>
        </div>
      </section>

      <OrganizeParishCard variant="upsell" />

      <Accordion
        type="single"
        collapsible
        className="rounded-sm border border-border/60 bg-white px-5"
      >
        <AccordionItem value="history" className="border-b-0">
          <AccordionTrigger data-testid="personal-active-history">
            <span className="inline-flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("payment_history")}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("payment_history_desc")}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <footer
        data-testid="personal-active-support"
        className="flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t("personal_active.support_question")}
        </p>
        <SalesWhatsAppCta
          placement="billing_plans"
          variant="row"
          className="justify-center"
          cta={t("personal_active.support_cta")}
        />
      </footer>
    </div>
  );
}
