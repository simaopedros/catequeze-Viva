import { Link, useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";
import { cn } from "../../client/utils";

export function CtaSection({
  ns = "landing",
  responsiveCtas = false,
}: {
  ns?: string;
  responsiveCtas?: boolean;
}) {
  const tr = useLandingText(ns);
  const [searchParams] = useSearchParams();
  const campaign =
    searchParams.get("utm_campaign") ||
    searchParams.get("campaign") ||
    undefined;
  const ctaClassName = responsiveCtas
    ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-8"
    : undefined;
  const ctaHelper = String(tr("cta_helper") || "").trim();
  const eyebrow = String(tr("cta_eyebrow") || "").trim();

  return (
    <section
      className="relative overflow-hidden bg-brand-ink text-white"
      data-landing-closing-cta
      id="contato"
    >
      <div className="pointer-events-none absolute inset-0 liturgical-halo" aria-hidden />
      <div className="relative mx-auto max-w-[70rem] px-5 py-16 sm:py-[4.5rem]">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center lg:gap-12">
          <div className="max-w-[42rem] space-y-3.5">
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold/90">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-white sm:text-5xl text-balance">
              {tr("cta_title")}
            </h2>
            <CtaBody tr={tr} />
          </div>
          <div className="shrink-0">
            <Button
              size="xl"
              asChild
              className={cn(
                "rounded-md bg-brand-paper text-brand-ink shadow-none hover:bg-white hover:text-brand-ink",
                ctaClassName,
              )}
            >
              <Link
                to="/signup"
                onClick={() =>
                  trackMarketingEvent("primary_cta_clicked", {
                    landing: ns,
                    placement: "closing_cta",
                    destination: "/signup",
                    campaign: campaign || null,
                  })
                }
              >
                {tr("cta_button")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            {ctaHelper ? (
              <p className="mt-2.5 text-[11px] text-brand-ink-muted">{ctaHelper}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBody({
  tr,
}: {
  tr: (key: string, options?: Record<string, unknown>) => any;
}) {
  const linesRaw = tr("cta_lines", { returnObjects: true });
  const lines = Array.isArray(linesRaw)
    ? (linesRaw as string[]).filter((line) => String(line).trim())
    : [];
  const subtitle = String(tr("cta_subtitle") || "").trim();

  if (lines.length === 0 && !subtitle) return null;

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-brand-ink-muted">
      {subtitle ? <p>{subtitle}</p> : null}
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
