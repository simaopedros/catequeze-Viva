import { Link } from "react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

export function FaqSection({ ns = "landing", showCta = true }: { ns?: string; showCta?: boolean }) {
  const tr = useLandingText(ns);
  const faqs = tr("faqs", { returnObjects: true }) as any[];
  const list = Array.isArray(faqs) ? faqs : [];

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tr("faq_eyebrow")}
            </p>
            <h2
              className="text-3xl font-semibold tracking-tight text-[#071A2D] sm:text-4xl"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {tr("faq_title")}
            </h2>
            <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
            <p className="text-muted-foreground leading-relaxed max-w-sm">{tr("faq_subtitle")}</p>

            {showCta && (
              <div className="pt-4">
                <Button size="lg" variant="default" asChild className="rounded-sm shadow-none">
                  <Link
                    to="/signup"
                    onClick={() =>
                      trackMarketingEvent("primary_cta_clicked", {
                        landing: ns,
                        placement: "faq_cta",
                        destination: "/signup",
                      })
                    }
                  >
                    {tr("faq_cta")}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">{tr("faq_cta_helper")}</p>
              </div>
            )}
          </div>

          <div className="divide-y divide-border/70 border-y border-border/70">
            {list.map((item: any) => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left font-semibold tracking-tight text-[#071A2D] marker:content-none [&::-webkit-details-marker]:hidden" style={{ fontFamily: "var(--font-brand-display)" }}>
                  <span className="text-[15px] leading-snug pr-2">{item.q}</span>
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
