import { useLandingText } from "../hooks/useLandingText";

type ProblemItem = { title: string; desc: string };

/**
 * Three pains under the emotional headline — not a feature dump.
 */
export function ProblemSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const items = tr("problem.items", { returnObjects: true });
  const list = Array.isArray(items) ? (items as ProblemItem[]) : [];
  const eyebrow = String(tr("problem.eyebrow") || "").trim();
  const subtitle = String(tr("problem.subtitle") || "").trim();
  const line2 = String(tr("problem.title_line2") || "").trim();

  if (list.length === 0) return null;

  return (
    <section
      id="recursos"
      className="scroll-mt-20 border-y border-brand-ink/10 bg-brand-paper/60"
    >
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          {eyebrow ? (
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-brand-ink sm:text-5xl text-balance">
            {tr("problem.title")}
            {line2 ? (
              <>
                <br />
                {line2}
              </>
            ) : null}
          </h2>
          {subtitle ? (
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        <ol className="grid gap-0 md:grid-cols-3">
          {list.map((item, index) => (
            <li
              key={item.title}
              className="border-b border-border/70 py-8 last:border-b-0 md:border-b-0 md:border-r md:border-border/70 md:px-8 md:py-2 last:md:border-r-0 first:md:pl-0"
            >
              <span className="text-[11px] font-bold tracking-[0.15em] text-brand-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3.5 text-lg font-semibold tracking-tight text-brand-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
