import { useTranslation } from "react-i18next";
import { cn } from "../../client/utils";
import type { BillingInterval } from "../lib/intendedPlan";

export function BillingIntervalToggle({
  interval,
  onChange,
  discountPercent = 0,
  ns = "parish_offer",
  monthlyLabel,
  annualLabel,
  ariaLabel,
  discountLabel,
}: {
  interval: BillingInterval;
  onChange: (next: BillingInterval) => void;
  discountPercent?: number;
  ns?: string;
  monthlyLabel?: string;
  annualLabel?: string;
  ariaLabel?: string;
  discountLabel?: string;
}) {
  const { t } = useTranslation("billing");
  const monthly = monthlyLabel ?? t(`${ns}.interval_monthly`);
  const annual = annualLabel ?? t(`${ns}.interval_annual`);
  const aria = ariaLabel ?? t(`${ns}.interval_aria`);
  const discount =
    discountLabel ??
    (discountPercent > 0
      ? t(`${ns}.annual_discount`, { percent: discountPercent })
      : null);

  return (
    <div className="flex justify-center">
      <div
        className="inline-flex items-center rounded-full border border-border/70 bg-white p-1"
        role="tablist"
        aria-label={aria}
      >
        <button
          type="button"
          role="tab"
          aria-selected={interval === "monthly"}
          data-testid="billing-interval-monthly"
          onClick={() => onChange("monthly")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            interval === "monthly"
              ? "bg-brand-ink text-white"
              : "text-muted-foreground hover:text-brand-ink",
          )}
        >
          {monthly}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={interval === "annual"}
          data-testid="billing-interval-annual"
          onClick={() => onChange("annual")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            interval === "annual"
              ? "bg-brand-ink text-white"
              : "text-muted-foreground hover:text-brand-ink",
          )}
        >
          {annual}
          {discount && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                interval === "annual"
                  ? "bg-brand-gold text-brand-ink"
                  : "bg-brand-gold/15 text-brand-gold-muted",
              )}
            >
              {discount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
