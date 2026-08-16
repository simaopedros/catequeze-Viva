import { useLandingText } from "../hooks/useLandingText";

type Outcome = { title: string; desc: string };

/**
 * Editorial outcomes — numbered list, no icon bubbles (avoids AI-template look).
 */
export function OutcomesSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const items = tr("outcomes.items", { returnObjects: true });
  const list = Array.isArray(items) ? (items as Outcome[]) : [];

  if (list.length === 0) return null;

  return (
    <section id="recursos" className="scroll-mt-20 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {tr("outcomes.eyebrow")}
          </p>
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
            {tr("outcomes.title")}
          </h2>
          <div className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
          <p className="text-muted-foreground leading-relaxed">
            {tr("outcomes.subtitle")}
          </p>
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
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground max-w-[17rem]">
                {item.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
