import { ArrowRight } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";

type TransformRow = { before: string; after: string };

/**
 * Horizontal before/after — not a feature table.
 */
export function TransformSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const rows = tr("transform.rows", { returnObjects: true });
  const list = Array.isArray(rows) ? (rows as TransformRow[]) : [];
  const eyebrow = String(tr("transform.eyebrow") || "").trim();

  if (list.length === 0) return null;

  return (
    <section className="border-y border-border/50 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-xl space-y-3">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl text-balance">
            {tr("transform.title")}
          </h2>
          <div
            className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
            aria-hidden
          />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-10">
          <div className="rounded-sm border border-border/70 bg-card/70 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("transform.col_before")}
            </p>
            <ul className="mt-5 space-y-3">
              {list.map((row) => (
                <li
                  key={row.before}
                  className="border-b border-border/50 pb-3 text-sm text-muted-foreground last:border-b-0 last:pb-0"
                >
                  {row.before}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border border-brand-ink/20 bg-white p-5 sm:p-6 shadow-elevation-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              {tr("transform.col_after")}
            </p>
            <ul className="mt-5 space-y-3">
              {list.map((row) => (
                <li
                  key={row.after}
                  className="flex items-start gap-2 border-b border-border/50 pb-3 last:border-b-0 last:pb-0"
                >
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-brand-ink">
                    {row.after}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
