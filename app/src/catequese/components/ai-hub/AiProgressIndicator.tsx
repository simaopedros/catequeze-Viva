import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "../../../client/components/ui/progress";

/** After this many seconds the indicator explains that generation can take a while. */
const SLOW_HINT_AFTER_S = 15;
/** Server-side AI timeout is 120s; the bar approaches (never reaches) 100% by then. */
const EXPECTED_MAX_S = 120;

/**
 * Determinate-looking progress for long AI generations: elapsed time, an
 * asymptotic bar and a "taking longer than usual" hint. Shown while `active`.
 */
export function AiProgressIndicator({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  const { t } = useTranslation("ai");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  // Asymptotic curve: fast at first, slows down, caps at 95% until completion.
  const value = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / (EXPECTED_MAX_S / 3)))));

  return (
    <div
      className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-brand-ink">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {t("progress.elapsed", { seconds: elapsed })}
        </span>
      </div>
      <Progress value={value} aria-label={label} />
      <p className="text-xs text-muted-foreground">
        {elapsed >= SLOW_HINT_AFTER_S
          ? t("progress.slow_hint")
          : t("progress.keep_page_open")}
      </p>
    </div>
  );
}
