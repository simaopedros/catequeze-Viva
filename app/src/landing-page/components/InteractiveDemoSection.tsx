import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
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
    <section id="demo" className="scroll-mt-20">
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-20">
        <div
          ref={ref}
          className={cn(
            "grid items-center gap-10 rounded-2xl border border-brand-ink/10 bg-card p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:p-12",
            className,
          )}
        >
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
              {tr("demo.badge")}
            </p>
            <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-brand-ink sm:text-4xl text-balance">
              {tr("demo.title")}
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
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
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedId === topic.id
                        ? "sacred-selected border-brand-gold/40 text-brand-ink"
                        : "border-brand-ink/15 bg-card text-muted-foreground hover:border-brand-ink/40 hover:text-brand-ink",
                    )}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            ) : null}

            <Button size="lg" variant="default" asChild className="rounded-md">
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

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-[10px] border border-border/70 bg-white p-4 sm:p-5">
              <p className="font-brand-display text-base font-semibold tracking-tight text-brand-ink">
                {tr("demo.panel_title")}
              </p>
              {panelSubtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {panelSubtitle}
                </p>
              ) : null}

              <dl className="mt-5 space-y-2">
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

            <div className="min-h-[220px] rounded-[10px] border border-border/70 border-l-[3px] border-l-brand-gold bg-white p-4 sm:p-5">
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
                    .slice(
                      0,
                      status === "generating"
                        ? visibleSteps
                        : selected.steps.length,
                    )
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
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {tr("demo.generating")}
                    </div>
                  )}
              </div>
            </div>

            {status === "done" && doneNote ? (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                {doneNote}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
      <dt className="sr-only">{label}</dt>
      <dd>
        {label}: {value}
      </dd>
    </div>
  );
}
