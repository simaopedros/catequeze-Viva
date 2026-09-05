import { Check } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";
import { cn } from "../../client/utils";

type HowRow = {
  step: string;
  title: string;
  desc: string;
  bullets?: string[];
  visual?: string[];
};

/**
 * Three alternating result rows — transformation, not a feature grid.
 */
export function HowItWorksSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const rowsRaw = tr("how.rows", { returnObjects: true });
  const rows = Array.isArray(rowsRaw) ? (rowsRaw as HowRow[]) : [];
  const eyebrow = String(tr("how.eyebrow") || "").trim();
  const subtitle = String(tr("how.subtitle") || "").trim();

  if (rows.length === 0) return null;

  return (
    <section id="como" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-xl text-center sm:mb-16">
          {eyebrow ? (
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-brand-ink sm:text-5xl text-balance">
            {tr("how.title")}
          </h2>
          {subtitle ? (
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="divide-y divide-border/70">
          {rows.map((row, index) => (
            <article
              key={row.title}
              className="grid items-center gap-8 py-10 md:grid-cols-2 md:gap-14 md:py-12"
            >
              <div className={cn(index % 2 === 1 && "md:order-2")}>
                <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
                  {row.step}
                </p>
                <h3 className="font-brand-display mt-3 text-xl font-medium tracking-tight text-brand-ink sm:text-2xl text-balance">
                  {row.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {row.desc}
                </p>
                {row.bullets && row.bullets.length > 0 ? (
                  <ul className="mt-6 space-y-2.5">
                    {row.bullets.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-brand-ink/80"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div
                className={cn(
                  "min-h-[240px] rounded-xl border border-border/70 bg-muted/30 p-5",
                  index % 2 === 1 && "md:order-1",
                )}
              >
                <MiniUi lines={row.visual ?? []} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniUi({ lines }: { lines: string[] }) {
  return (
    <div className="h-full rounded-[10px] border border-border/70 bg-white p-4">
      <div className="mb-4 h-3 w-32 rounded bg-muted" aria-hidden />
      <ul className="grid gap-2.5">
        {lines.map((line) => (
          <li
            key={line}
            className="rounded-md border border-border/70 px-3 py-3 text-[11px] leading-snug text-muted-foreground"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
