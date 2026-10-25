import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";
import { HomeMotion } from "./HomeMotion";
import { HomeReveal } from "./HomeReveal";
import { prefersReducedMotion } from "./homeMotionEnv";

type DemoTopic = {
  id: string;
  label: string;
  theme?: string;
  age?: string;
  duration?: string;
  steps: string[];
};
type DemoStep = { title: string; detail: string; minutes: number };
type Status = "idle" | "generating" | "done";

const CHARS_PER_TICK = 2;
const TICK_MS = 18;
const STEP_PAUSE_MS = 160;
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: Math.cos(angle) * (60 + (i % 3) * 18), y: Math.sin(angle) * (40 + (i % 2) * 16) };
});

export function HomeAiDemo({ ns = "landing" }: { ns?: string }) {
  return (
    <HomeMotion>
      <DemoContent ns={ns} />
    </HomeMotion>
  );
}

function DemoContent({ ns }: { ns: string }) {
  const tr = useLandingText(ns);
  const topicsRaw = tr("demo.topics", { returnObjects: true });
  const topics = Array.isArray(topicsRaw) ? (topicsRaw as DemoTopic[]) : [];

  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [chars, setChars] = useState(0);
  const [runId, setRunId] = useState(0);

  const selected = topics.find((t) => t.id === selectedId) ?? topics[0];
  const richRaw = selected ? tr(`home.demo.topics.${selected.id}`, { returnObjects: true }) : null;
  const steps: DemoStep[] = Array.isArray(richRaw)
    ? (richRaw as DemoStep[])
    : (selected?.steps ?? []).map((title) => ({ title, detail: "", minutes: 0 }));

  useEffect(() => {
    if (topics.length > 0 && !selectedId) setSelectedId(topics[0].id);
  }, [topics, selectedId]);

  const finish = useCallback(() => {
    setStatus("done");
    trackMarketingEvent("primary_cta_clicked", {
      landing: ns,
      placement: "interactive_demo_done",
      destination: "demo",
      topic: selected?.id,
    });
  }, [ns, selected?.id]);

  useEffect(() => {
    if (status !== "generating") return;
    const step = steps[stepIndex];
    if (!step) {
      finish();
      return;
    }
    if (chars < step.detail.length) {
      const id = window.setTimeout(
        () => setChars((c) => Math.min(step.detail.length, c + CHARS_PER_TICK)),
        TICK_MS,
      );
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (stepIndex + 1 < steps.length) {
        setStepIndex(stepIndex + 1);
        setChars(0);
      } else {
        finish();
      }
    }, STEP_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [status, stepIndex, chars, steps, finish]);

  const runGenerate = () => {
    if (!selected || status === "generating") return;
    trackMarketingEvent("primary_cta_clicked", {
      landing: ns,
      placement: "interactive_demo_generate",
      destination: "demo",
      topic: selected.id,
    });
    setRunId((n) => n + 1);
    if (prefersReducedMotion()) {
      setStepIndex(steps.length - 1);
      setChars(Number.MAX_SAFE_INTEGER);
      finish();
      return;
    }
    setStepIndex(0);
    setChars(0);
    setStatus("generating");
  };

  const pickTopic = (id: string) => {
    setSelectedId(id);
    setStatus("idle");
    setStepIndex(0);
    setChars(0);
  };

  if (topics.length === 0 || !selected) return null;

  const total = steps.length;
  const currentLen = steps[stepIndex]?.detail.length || 1;
  const progress =
    status === "done"
      ? 1
      : status === "generating"
        ? (stepIndex + Math.min(1, chars / currentLen)) / total
        : 0;
  const visibleCount = status === "done" ? total : status === "generating" ? stepIndex + 1 : 0;
  const done = status === "done";

  return (
    <section id="demo" className="relative isolate scroll-mt-20 overflow-hidden bg-brand-ink text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 home-grain opacity-[0.08]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(211,154,43,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(56,125,189,0.18),transparent)]"
      />

      <div className="mx-auto grid max-w-[70rem] items-center gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <HomeReveal className="space-y-5">
          <span aria-hidden className="block h-10 w-px bg-gradient-to-b from-transparent via-brand-gold to-brand-gold" />
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold">
            {tr("demo.badge")}
          </p>
          <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-white text-balance sm:text-5xl">
            {tr("demo.title")}
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-[#bdcad5]">{tr("demo.subtitle")}</p>

          {topics.length > 1 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={selected.id === topic.id}
                  onClick={() => pickTopic(topic.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    selected.id === topic.id
                      ? "border-brand-gold bg-brand-gold text-brand-ink"
                      : "border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:text-white",
                  )}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              size="lg"
              asChild
              className="rounded-md bg-white text-brand-ink shadow-none hover:bg-white/90"
            >
              <Link
                to="/signup"
                onClick={() =>
                  trackMarketingEvent("primary_cta_clicked", {
                    landing: ns,
                    placement: "interactive_demo_cta",
                    destination: "/signup",
                  })
                }
              >
                {tr("demo.cta")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
        </HomeReveal>

        <HomeReveal delay={150}>
          <div className="relative rounded-3xl bg-white p-4 text-brand-ink shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-brand-display text-lg font-semibold tracking-tight">
                {tr("demo.panel_title")}
              </p>
              <dl className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  [tr("demo.theme_label"), selected.theme || selected.label],
                  [tr("demo.age_label"), selected.age],
                  [tr("demo.duration_label"), selected.duration],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={String(label)} className="rounded-full border border-brand-ink/10 bg-[#FBF9F4] px-2.5 py-1">
                      <dt className="sr-only">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            <Button
              type="button"
              size="lg"
              className="home-shimmer home-loop mt-4 w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90"
              disabled={status === "generating"}
              onClick={runGenerate}
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tr("demo.generating")}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {done ? tr("demo.regenerate") : tr("demo.generate")}
                </>
              )}
            </Button>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-ink/8">
                <m.div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-brand-gold-muted via-brand-gold to-[#F1C76B]"
                  initial={false}
                  animate={{ scaleX: progress }}
                  transition={{ duration: 0.2, ease: "linear" }}
                />
              </div>
              <span className="w-24 text-right text-[11px] tabular-nums text-muted-foreground">
                {tr("home.demo.progress", { current: visibleCount, total })}
              </span>
            </div>

            <ol className="mt-4 space-y-1.5">
              {steps.map((step, i) => {
                const visible = i < visibleCount;
                const typing = status === "generating" && i === stepIndex;
                const text = typing ? step.detail.slice(0, chars) : step.detail;
                return (
                  <li
                    key={`${selected.id}-${i}`}
                    className={cn(
                      "flex h-[60px] items-start gap-3 rounded-xl border px-3 py-2 transition-colors duration-300",
                      visible ? "border-brand-ink/10 bg-white" : "border-dashed border-brand-ink/10 bg-[#FBF9F4]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                        visible ? "bg-brand-ink text-white" : "bg-brand-ink/8 text-brand-ink/40",
                      )}
                    >
                      {i + 1}
                    </span>
                    {visible ? (
                      <m.div
                        className="min-w-0 flex-1"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold">{step.title}</p>
                          {step.minutes ? (
                            <span className="rounded-full bg-brand-gold/15 px-1.5 py-px text-[10px] font-semibold text-brand-gold-muted">
                              {tr("home.demo.minutes", { count: step.minutes })}
                            </span>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                          {text}
                          {typing ? (
                            <span className="ml-px inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-brand-gold" />
                          ) : null}
                        </p>
                      </m.div>
                    ) : (
                      <div className="flex-1 space-y-1.5 pt-1" aria-hidden>
                        <span className="block h-2 w-24 rounded bg-brand-ink/8" />
                        <span className="block h-2 w-40 rounded bg-brand-ink/5" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <div
              aria-live="polite"
              className="relative mt-4 min-h-[148px] overflow-hidden rounded-2xl border border-brand-gold/30 bg-[linear-gradient(135deg,#FFF9EF,#FFFFFF)] p-4"
            >
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <m.div
                    key={`done-${runId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p className="font-brand-display text-xl font-semibold leading-tight">
                      {tr("home.demo.done_title")}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {tr("home.demo.done_text")}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button size="lg" asChild className="rounded-md">
                        <Link
                          to="/signup"
                          onClick={() =>
                            trackMarketingEvent("primary_cta_clicked", {
                              landing: ns,
                              placement: "interactive_demo_done_cta",
                              destination: "/signup",
                              topic: selected.id,
                            })
                          }
                        >
                          {tr("home.demo.done_cta")}
                          <ArrowRight className="h-4 w-4 shrink-0" />
                        </Link>
                      </Button>
                      <span className="text-[11px] text-muted-foreground">{tr("home.demo.done_helper")}</span>
                    </div>
                  </m.div>
                ) : (
                  <m.div
                    key="hint"
                    className="flex min-h-[116px] flex-col items-center justify-center gap-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Sparkles className="h-5 w-5 text-brand-gold" aria-hidden />
                    <p className="max-w-xs text-[13px] text-muted-foreground">
                      {status === "generating" ? tr("demo.generating") : tr("demo.empty")}
                    </p>
                  </m.div>
                )}
              </AnimatePresence>

              {done ? (
                <span key={`sparks-${runId}`} aria-hidden className="pointer-events-none absolute right-10 top-8">
                  {SPARKS.map((s, i) => (
                    <m.span
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full bg-brand-gold"
                      initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                      animate={{ x: s.x, y: s.y, scale: [0, 1.4, 0.6], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.015 }}
                    />
                  ))}
                </span>
              ) : null}
            </div>

          </div>
        </HomeReveal>
      </div>
    </section>
  );
}
