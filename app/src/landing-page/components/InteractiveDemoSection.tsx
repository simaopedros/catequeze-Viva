import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Loader2, Feather, RefreshCw } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";

type DemoTopic = {
  id: string;
  label: string;
  prompt: string;
  steps: string[];
};

/**
 * Public interactive demo: pick a theme, "generate" a meeting outline
 * client-side (no account, no API). Designed to prove value before signup.
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
        window.setTimeout(tick, 320);
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

    window.setTimeout(tick, 450);
  }, [ns, selected, status]);

  if (topics.length === 0 || !selected) return null;

  return (
    <section
      id="demo"
      className="scroll-mt-20 relative overflow-hidden border-y"
    >
      <div className="absolute inset-0 bg-background/70" />
      <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div
          ref={ref}
          className={cn(
            "grid gap-10 lg:grid-cols-2 lg:items-center",
            className,
          )}
        >
          <div className="space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-sm border border-brand-ink/20 bg-brand-ink/8 px-3 py-1 text-sm font-medium text-brand-ink">
              <Feather className="h-3.5 w-3.5" />
              {tr("demo.badge")}
            </div>
            <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              {tr("demo.title")}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              {tr("demo.subtitle")}
            </p>
            <p className="text-sm text-muted-foreground">{tr("demo.helper")}</p>

            <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-1">
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
          </div>

          <div className="rounded-sm border border-border/70 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <div className="mx-auto flex-1 max-w-[220px] rounded-sm bg-background/80 px-3 py-1 text-center text-xs text-muted-foreground truncate">
                catechis.app/demo
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-sm bg-brand-ink/8 p-2">
                  <Feather className="h-4 w-4 text-brand-ink" />
                </div>
                <div>
                  <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                    {tr("demo.panel_title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tr("demo.panel_subtitle")}
                  </p>
                </div>
              </div>

              <div className="rounded-sm border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tr("demo.prompt_label")}
                </p>
                <p className="text-sm leading-relaxed">{selected.prompt}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="brand"
                  className="w-full sm:w-auto"
                  disabled={status === "generating"}
                  onClick={runGenerate}
                >
                  {status === "generating" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {tr("demo.generating")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      {status === "done"
                        ? tr("demo.regenerate")
                        : tr("demo.generate")}
                    </>
                  )}
                </Button>
              </div>

              <div
                className={cn(
                  "rounded-sm border p-3 min-h-[160px] transition-colors",
                  status === "idle"
                    ? "border-dashed bg-muted/10"
                    : "border-brand-ink/20 bg-brand-ink/5",
                )}
              >
                {status === "idle" && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {tr("demo.empty")}
                  </p>
                )}
                {(status === "generating" || status === "done") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-brand-ink">
                        {tr("demo.result_title")}
                      </p>
                      <span className="rounded-sm bg-brand-ink/8 px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                        {tr("demo.result_badge")}
                      </span>
                    </div>
                    {selected.steps
                      .slice(0, visibleSteps)
                      .map((step, index) => (
                        <div
                          key={`${selected.id}-${index}`}
                          className="flex gap-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
                        >
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm bg-brand-ink/15 text-[11px] font-semibold text-brand-ink">
                            {index + 1}
                          </span>
                          <span className="leading-snug">{step}</span>
                        </div>
                      ))}
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
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    {tr("demo.done_note")}
                  </p>
                  <Button
                    size="sm"
                    variant="brand"
                    asChild
                    className="shrink-0"
                  >
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
      </div>
    </section>
  );
}
