import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { ArrowRight } from "lucide-react";

export interface CompletionSummary {
  role: string;
  title: string;
  description: string;
  items: { label: string; value: string }[];
  primaryActionLabel: string;
  primaryActionTo: string;
  secondaryActionLabel?: string;
}

interface CompletionStepProps {
  summary: CompletionSummary;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export function CompletionStep({
  summary,
  onPrimaryAction,
  onSecondaryAction,
}: CompletionStepProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("completion.progress_badge")}
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.85rem]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {summary.title}
        </h2>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary.description}
        </p>
      </div>

      <dl className="divide-y divide-border/70 border-y border-border/70">
        {summary.items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="text-sm font-medium text-foreground text-right">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-muted-foreground">
        {t("completion.next_step_hint")}
      </p>

      <div className="flex flex-col gap-2.5">
        <Button
          onClick={onPrimaryAction}
          className="h-11 w-full rounded-sm shadow-none"
        >
          {summary.primaryActionLabel}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSecondaryAction}
          className="h-11 w-full rounded-sm"
        >
          {summary.secondaryActionLabel || t("completion.go_dashboard")}
        </Button>
      </div>
    </div>
  );
}
