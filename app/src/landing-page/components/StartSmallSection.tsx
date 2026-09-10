import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";

/**
 * Zero-risk first week: today vs the next meeting.
 */
export function StartSmallSection({
  ns = "landing",
  responsiveCtas = false,
}: {
  ns?: string;
  responsiveCtas?: boolean;
}) {
  const tr = useLandingText(ns);
  const todayRaw = tr("start_small.today", { returnObjects: true });
  const nextRaw = tr("start_small.next", { returnObjects: true });
  const today = Array.isArray(todayRaw) ? (todayRaw as string[]) : [];
  const next = Array.isArray(nextRaw) ? (nextRaw as string[]) : [];
  const eyebrow = String(tr("start_small.eyebrow") || "").trim();
  const subtitle = String(tr("start_small.subtitle") || "").trim();

  return (
    <section className="border-y border-brand-ink/10 bg-white/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-xl space-y-3">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl text-balance">
            {tr("start_small.title")}
          </h2>
          <div
            className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
            aria-hidden
          />
          {subtitle ? (
            <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        <div className="mt-10 overflow-hidden rounded-sm border border-border/70 bg-white">
          <div className="grid md:grid-cols-2">
            <ChecklistColumn
              title={tr("start_small.today_title")}
              items={today}
            />
            <ChecklistColumn
              title={tr("start_small.next_title")}
              items={next}
              emphasized
            />
          </div>
        </div>

        <div className="mt-8">
          <Button
            size="xl"
            asChild
            className={cn(
              "rounded-sm shadow-none",
              responsiveCtas &&
                "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-8",
            )}
          >
            <Link
              to="/signup"
              onClick={() =>
                trackMarketingEvent("primary_cta_clicked", {
                  landing: ns,
                  placement: "start_small",
                  destination: "/signup",
                })
              }
            >
              {tr("start_small.cta")}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ChecklistColumn({
  title,
  items,
  emphasized = false,
}: {
  title: string;
  items: string[];
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-5 sm:p-7",
        emphasized
          ? "bg-brand-ink/[0.03] md:border-l md:border-border/70"
          : "border-b border-border/70 md:border-b-0",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.18em]",
          emphasized ? "text-brand-ink" : "text-muted-foreground",
        )}
      >
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                emphasized ? "text-brand-gold" : "text-brand-ink/70",
              )}
              aria-hidden
            />
            <span className="text-brand-ink leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
