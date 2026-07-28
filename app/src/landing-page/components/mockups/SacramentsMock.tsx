import { CheckCircle2, Circle, Cross } from "lucide-react";
import { useTranslation } from "react-i18next";

export function SacramentsMock({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);

  const MILESTONES = [
    { label: t("mockup_sacraments.enrollment"), done: true },
    { label: t("mockup_sacraments.documents"), done: true },
    { label: t("mockup_sacraments.retreat"), done: true },
    { label: t("mockup_sacraments.interview"), done: false },
    { label: t("mockup_sacraments.celebration"), done: false },
  ];

  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-overline sm:text-xs">
      <div>
        <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
          {t("mockup_sacraments.title")}
        </p>
        <p className="text-muted-foreground">
          {t("mockup_sacraments.subtitle")}
        </p>
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-sm border border-border/70 bg-muted/30 p-1.5">
            <Cross className="h-4 w-4 text-brand-ink" />
          </div>
          <div>
            <p className="font-brand-display font-semibold tracking-tight text-brand-ink">
              Maria Oliveira
            </p>
            <p className="text-muted-foreground">
              {t("mockup_sacraments.class")}
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-1">
          <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-border -translate-y-1/2" />
          {MILESTONES.map((m) => (
            <div
              key={m.label}
              className="relative flex flex-col items-center gap-1 z-10"
            >
              {m.done ? (
                <CheckCircle2 className="h-5 w-5 text-brand-ink bg-background" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground bg-background" />
              )}
              <span
                className={`text-overline text-center max-w-[48px] ${
                  m.done
                    ? "text-brand-ink font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "João P.", progress: "4/5", pct: 80 },
          { name: "Sofia R.", progress: "5/5", pct: 100 },
          { name: "Lucas M.", progress: "2/5", pct: 40 },
          { name: "Beatriz L.", progress: "3/5", pct: 60 },
        ].map((c) => (
          <div
            key={c.name}
            className="rounded-sm border border-border/70 bg-white p-2"
          >
            <div className="flex justify-between mb-1">
              <span className="font-semibold tracking-tight text-brand-ink">
                {c.name}
              </span>
              <span className="text-muted-foreground">{c.progress}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm bg-brand-ink"
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
