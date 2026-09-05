import { useLandingText } from "../hooks/useLandingText";

type ProblemItem = { title: string; desc: string };

/**
 * Pain before solution: why the catechist needs this, without a feature dump.
 */
export function ProblemSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const items = tr("problem.items", { returnObjects: true });
  const list = Array.isArray(items) ? (items as ProblemItem[]) : [];
  const eyebrow = String(tr("problem.eyebrow") || "").trim();
  const subtitle = String(tr("problem.subtitle") || "").trim();

  if (list.length === 0) return null;

  return (
    <section id="recursos" className="scroll-mt-20 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-2xl space-y-3">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl text-balance">
            {tr("problem.title")}
          </h2>
          <div
            className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
            aria-hidden
          />
          {subtitle ? (
            <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        <ol className="mt-12 grid gap-0 border-t border-border/60 md:grid-cols-3 md:border-t-0 md:border-l md:border-border/60">
          {list.map((item, index) => (
            <li
              key={item.title}
              className="border-b border-border/60 px-0 py-8 last:border-b-0 md:border-b-0 md:border-r md:border-border/60 md:px-8 md:py-1 last:md:border-r-0 first:md:pl-0"
            >
              <span className="font-brand-display block text-[2rem] font-semibold tabular-nums leading-none text-brand-gold/80">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-brand-display mt-5 text-[1.05rem] font-semibold tracking-tight text-brand-ink">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground max-w-[18rem]">
                {item.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
