import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";

type DemoTopic = {
  id: string;
  label: string;
  theme?: string;
  age?: string;
  duration?: string;
  prompt?: string;
  steps: string[];
};

/**
 * Form-style AI demo: theme, age, duration → meeting outline. Local only.
 */
export function InteractiveDemoSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { ref, className } = useScrollReveal();

  const topicsRaw = tr("demo.topics", { returnObjects: true });
  const topics = Array.isArray(topicsRaw) ? (topicsRaw as DemoTopic[]) : [];

  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (topics.length > 0 && !selectedId) {
      setSelectedId(topics[0].id);
    }
  }, [topics, selectedId]);

  const selected = topics.find((t) => t.id === selectedId) ?? topics[0];

  const runGenerate = useCallback(() => {
    if (!selected || status === "generating") return;

    trackMarketingEvent("primary_cta_clicked", {
      landing: ns,
      placement: "interactive_demo_generate",
      destination: "demo",
      topic: selected.id,
    });

    setStatus("generating");
    setVisibleSteps(0);

    const total = selected.steps.length;
    let step = 0;

    const tick = () => {
      step += 1;
      setVisibleSteps(step);
      if (step < total) {
        window.setTimeout(tick, 280);
      } else {
        setStatus("done");
        trackMarketingEvent("primary_cta_clicked", {
          landing: ns,
          placement: "interactive_demo_done",
          destination: "demo",
          topic: selected.id,
        });
      }
    };

    window.setTimeout(tick, 400);
  }, [ns, selected, status]);

  if (topics.length === 0 || !selected) return null;

  const helper = String(tr("demo.helper") || "").trim();
  const panelSubtitle = String(tr("demo.panel_subtitle") || "").trim();
  const resultBadge = String(tr("demo.result_badge") || "").trim();
  const doneNote = String(tr("demo.done_note") || "").trim();

  return (
    <section id="demo" className="scroll-mt-20 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div
          ref={ref}
          className={cn(
            "grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start",
            className,
          )}
        >
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("demo.badge")}
            </p>
            <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl text-balance">
              {tr("demo.title")}
            </h2>
            <div
              className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
              aria-hidden
            />
            <p className="text-muted-foreground leading-relaxed max-w-md">
              {tr("demo.subtitle")}
            </p>
            {helper ? (
              <p className="text-sm text-muted-foreground">{helper}</p>
            ) : null}

            {topics.length > 1 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(topic.id);
                      setStatus("idle");
                      setVisibleSteps(0);
                    }}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedId === topic.id
                        ? "border-brand-ink bg-brand-ink text-white"
                        : "border-border bg-card text-muted-foreground hover:border-brand-ink/40 hover:text-brand-ink",
                    )}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-sm border border-border/70 bg-white p-5 sm:p-6 shadow-elevation-sm">
              <p className="font-brand-display text-base font-semibold tracking-tight text-brand-ink">
                {tr("demo.panel_title")}
              </p>
              {panelSubtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {panelSubtitle}
                </p>
              ) : null}

              <dl className="mt-5 space-y-3 text-sm">
                <Field
                  label={tr("demo.theme_label")}
                  value={selected.theme || selected.label}
                />
                {selected.age ? (
                  <Field label={tr("demo.age_label")} value={selected.age} />
                ) : null}
                {selected.duration ? (
                  <Field
                    label={tr("demo.duration_label")}
                    value={selected.duration}
                  />
                ) : null}
              </dl>

              <Button
                type="button"
                size="lg"
                variant="brand"
                className="mt-5 w-full"
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
                    <Sparkles className="h-4 w-4" />
                    {status === "done"
                      ? tr("demo.regenerate")
                      : tr("demo.generate")}
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-center" aria-hidden>
              <ArrowDown className="h-5 w-5 text-brand-gold/80" />
            </div>

            <div
              className={cn(
                "rounded-sm border p-5 sm:p-6 min-h-[220px]",
                status === "idle"
                  ? "border-dashed border-border/70 bg-muted/10"
                  : "border-brand-ink/15 bg-white",
              )}
            >
              {status === "idle" && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {tr("demo.empty")}
                </p>
              )}
              {(status === "generating" || status === "done") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                      {tr("demo.result_title")}
                    </p>
                    {resultBadge ? (
                      <span className="rounded-sm bg-brand-ink/8 px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                        {resultBadge}
                      </span>
                    ) : null}
                  </div>
                  <ol className="space-y-2">
                    {selected.steps
                      .slice(0, visibleSteps)
                      .map((step, index) => (
                        <li
                          key={`${selected.id}-${index}`}
                          className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-brand-ink/10 text-[11px] font-semibold text-brand-ink">
                            {index + 1}
                          </span>
                          <span className="leading-snug text-brand-ink">
                            {step}
                          </span>
                        </li>
                      ))}
                  </ol>
                  {status === "generating" &&
                    visibleSteps < selected.steps.length && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {tr("demo.generating")}
                      </div>
                    )}
                </div>
              )}
            </div>

            {status === "done" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {doneNote ? (
                  <p className="text-xs text-muted-foreground">{doneNote}</p>
                ) : null}
                <Button size="sm" variant="brand" asChild className="shrink-0">
                  <Link
                    to="/signup"
                    onClick={() =>
                      trackMarketingEvent("primary_cta_clicked", {
                        landing: ns,
                        placement: "interactive_demo_cta",
                        destination: "/signup",
                        topic: selected.id,
                      })
                    }
                  >
                    {tr("demo.cta")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2.5">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium text-brand-ink">{value}</dd>
    </div>
  );
}
