import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import {
  CheckCircle2,
  FolderOpen,
  MessageCircle,
  NotebookPen,
  Sheet,
  Shuffle,
} from "lucide-react";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";
import { HomeMotion } from "./HomeMotion";
import { HomeReveal } from "./HomeReveal";
import { HomeSectionHeader } from "./HomeSectionHeader";
import { prefersReducedMotion, useInViewOnce } from "./homeMotionEnv";

type ProblemItem = { title: string; desc: string };
type TransformRow = { before: string; after: string };

const BEFORE_ICONS = [NotebookPen, MessageCircle, Sheet, FolderOpen, Shuffle];

/** Scattered positions (px from the stage centre line), scaled per breakpoint. */
const SCATTER = [
  { x: -70, y: 78, r: -9 },
  { x: 62, y: 124, r: 7 },
  { x: -44, y: 182, r: 5 },
  { x: 76, y: 232, r: -6 },
  { x: -58, y: 282, r: 10 },
];
const ROW_TOP = 70;
const ROW_GAP = 54;

export function HomeBeforeAfter({ ns = "landing" }: { ns?: string }) {
  return (
    <HomeMotion>
      <BeforeAfterContent ns={ns} />
    </HomeMotion>
  );
}

function BeforeAfterContent({ ns }: { ns: string }) {
  const tr = useLandingText(ns);
  const itemsRaw = tr("problem.items", { returnObjects: true });
  const items = Array.isArray(itemsRaw) ? (itemsRaw as ProblemItem[]) : [];
  const rowsRaw = tr("transform.rows", { returnObjects: true });
  const rows = Array.isArray(rowsRaw) ? (rowsRaw as TransformRow[]).slice(0, 5) : [];
  const line2 = String(tr("problem.title_line2") || "").trim();
  const subtitle = String(tr("problem.subtitle") || "").trim();
  const eyebrow = String(tr("problem.eyebrow") || "").trim();

  if (items.length === 0) return null;

  return (
    <section
      id="recursos"
      className="relative scroll-mt-20 border-y border-brand-ink/5 bg-[linear-gradient(180deg,#F7F3EA_0%,#FBF9F4_100%)]"
    >
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-24">
        <HomeSectionHeader
          eyebrow={eyebrow}
          title={
            <>
              {tr("problem.title")}
              {line2 ? (
                <>
                  <br />
                  {line2}
                </>
              ) : null}
            </>
          }
          subtitle={subtitle}
        />

        <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.title}>
                <HomeReveal delay={index * 120}>
                  <div className="group flex gap-4 rounded-2xl border border-brand-ink/8 bg-white/80 p-5 transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(7,26,45,0.45)]">
                    <span className="font-brand-display text-3xl font-semibold leading-none text-brand-gold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-brand-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </HomeReveal>
              </li>
            ))}
          </ol>

          {rows.length > 0 ? <OrganizeStage ns={ns} rows={rows} /> : null}
        </div>
      </div>
    </section>
  );
}

function OrganizeStage({ ns, rows }: { ns: string; rows: TransformRow[] }) {
  const tr = useLandingText(ns);
  const { ref, inView } = useInViewOnce<HTMLDivElement>("0px 0px -25% 0px");
  const [organized, setOrganized] = useState(false);
  const [touched, setTouched] = useState(false);
  const [spread, setSpread] = useState(0.55);

  useEffect(() => {
    setSpread(window.matchMedia("(min-width: 640px)").matches ? 1.25 : 0.55);
    if (prefersReducedMotion()) setOrganized(true);
  }, []);

  useEffect(() => {
    if (!inView || touched) return;
    const id = window.setTimeout(() => setOrganized(true), 700);
    return () => window.clearTimeout(id);
  }, [inView, touched]);

  const choose = (value: boolean) => {
    setTouched(true);
    setOrganized(value);
  };

  const before = String(tr("transform.col_before") || "").trim();
  const after = String(tr("transform.col_after") || "").trim();
  const caption = organized
    ? tr("home.before_after.caption_after")
    : tr("home.before_after.caption_before");

  return (
    <div ref={ref}>
      <div className="relative h-[380px] overflow-hidden rounded-3xl border border-brand-ink/8 bg-white shadow-[0_30px_70px_-40px_rgba(7,26,45,0.45)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 home-grain opacity-[0.05]"
        />
        <m.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -ml-36 -mt-28 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.12),transparent)]"
          animate={{ opacity: organized ? 1 : 0, scale: organized ? 1 : 0.6 }}
          transition={{ duration: 0.8 }}
        />

        <div
          role="group"
          aria-label={tr("home.before_after.toggle_label")}
          className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 rounded-full border border-brand-ink/10 bg-[#F7F3EA] p-1 text-[12px] font-semibold"
        >
          {[
            { label: before, value: false },
            { label: after, value: true },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={organized === opt.value}
              onClick={() => choose(opt.value)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors sm:px-4",
                organized === opt.value
                  ? "text-white"
                  : "text-brand-ink/60 hover:text-brand-ink",
              )}
            >
              {organized === opt.value ? (
                <m.span
                  className={cn(
                    "absolute inset-0 -z-0 rounded-full",
                    opt.value ? "bg-emerald-700" : "bg-brand-ink",
                  )}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                />
              ) : null}
              <span className="relative">{opt.label}</span>
            </button>
          ))}
        </div>

        <ul aria-hidden>
          {rows.map((row, i) => {
            const Icon = BEFORE_ICONS[i] ?? Shuffle;
            const s = SCATTER[i] ?? SCATTER[0];
            return (
              <m.li
                key={row.before}
                className="absolute left-1/2 top-0 -ml-[110px] w-[220px] sm:-ml-[130px] sm:w-[260px]"
                initial={false}
                animate={
                  organized
                    ? { x: 0, y: ROW_TOP + i * ROW_GAP, rotate: 0 }
                    : { x: s.x * spread, y: s.y, rotate: s.r }
                }
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 16,
                  delay: organized ? i * 0.08 : (rows.length - i) * 0.04,
                }}
              >
                <div
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-xl border px-3 transition-[background-color,border-color,box-shadow] duration-500",
                    organized
                      ? "border-emerald-700/15 bg-white shadow-[0_10px_24px_-16px_rgba(7,26,45,0.5)]"
                      : "border-dashed border-brand-gold/45 bg-[#FFF9EF] shadow-none",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-500",
                      organized
                        ? "bg-emerald-600/10 text-emerald-700"
                        : "bg-brand-gold/15 text-brand-gold-muted",
                    )}
                  >
                    {organized ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="relative h-5 flex-1 overflow-hidden text-[13px]">
                    <m.span
                      className="absolute inset-0 truncate text-brand-ink/60 line-through decoration-brand-gold/60"
                      initial={false}
                      animate={{ opacity: organized ? 0 : 1, y: organized ? -14 : 0 }}
                      transition={{ duration: 0.3, delay: organized ? i * 0.08 + 0.15 : 0 }}
                    >
                      {row.before}
                    </m.span>
                    <m.span
                      className="absolute inset-0 truncate font-semibold text-brand-ink"
                      initial={false}
                      animate={{ opacity: organized ? 1 : 0, y: organized ? 0 : 14 }}
                      transition={{ duration: 0.3, delay: organized ? i * 0.08 + 0.2 : 0 }}
                    >
                      {row.after}
                    </m.span>
                  </span>
                </div>
              </m.li>
            );
          })}
        </ul>
        <ul className="sr-only">
          {rows.map((row) => (
            <li key={row.before}>
              {before}: {row.before}. {after}: {row.after}.
            </li>
          ))}
        </ul>
      </div>
      <p
        className="mt-4 text-center text-sm font-medium text-brand-ink/70"
        aria-live="polite"
      >
        {caption}
      </p>
    </div>
  );
}
