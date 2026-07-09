import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";

export function CtaSection({ ns = "landing", responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const tr = useLandingText(ns);
  const ctaClassName = responsiveCtas
    ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-8"
    : undefined;

  return (
    <section className="px-4 pb-28 pt-4 md:pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-sm bg-[#071A2D] text-white">
        <div className="relative px-6 py-12 sm:px-12 sm:py-14 md:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #F4CF7A 0%, transparent 40%), radial-gradient(circle at 80% 80%, #D39A2B 0%, transparent 35%)",
            }}
            aria-hidden
          />
          <div className="relative max-w-xl space-y-5">
            <h2
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {tr("cta_title")}
            </h2>
            <p className="text-white/80 leading-relaxed text-base sm:text-lg">
              {tr("cta_subtitle")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-1">
              <Button
                size="xl"
                asChild
                className={`rounded-sm bg-[#FFF7E7] text-[#071A2D] shadow-none hover:bg-white hover:text-[#071A2D] ${ctaClassName ?? ""}`}
              >
                <Link
                  to="/signup"
                  onClick={() =>
                    trackMarketingEvent("primary_cta_clicked", {
                      landing: ns,
                      placement: "closing_cta",
                      destination: "/signup",
                    })
                  }
                >
                  {tr("cta_button")}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
              <p className="text-sm text-white/65">{tr("cta_helper")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
