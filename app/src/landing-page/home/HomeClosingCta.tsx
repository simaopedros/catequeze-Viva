import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { useLandingText } from "../hooks/useLandingText";
import { HomeReveal } from "./HomeReveal";
import { SeedSprout } from "./SeedSprout";
import { useInViewOnce, useLiteMotion, usePauseOffscreen } from "./homeMotionEnv";

/** 12 on desktop; indexes ≥ 6 are hidden below `sm` to cap mobile at 6. */
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: `${6 + ((i * 37) % 88)}%`,
  delay: `${(i * 0.85) % 9}s`,
  duration: `${8 + (i % 4) * 1.5}s`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 6)}px`,
}));

export function HomeClosingCta({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const [searchParams] = useSearchParams();
  const lite = useLiteMotion();
  const { ref, paused } = usePauseOffscreen<HTMLElement>();
  const { ref: seedRef, inView: seedInView } = useInViewOnce<HTMLDivElement>();
  const campaign =
    searchParams.get("utm_campaign") || searchParams.get("campaign") || undefined;
  const eyebrow = String(tr("cta_eyebrow") || "").trim();
  const subtitle = String(tr("cta_subtitle") || "").trim();
  const helper = String(tr("cta_helper") || "").trim();

  return (
    <section
      ref={ref}
      id="contato"
      data-landing-closing-cta
      data-paused={paused ? "" : undefined}
      className="relative isolate scroll-mt-20 overflow-hidden bg-brand-ink text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-60%] -z-10 aspect-square w-[160%] -translate-x-1/2 sm:w-[120%]"
      >
        <div className="home-rays home-loop h-full w-full rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(211,154,43,0.10)_0deg_6deg,transparent_6deg_18deg)] [mask-image:radial-gradient(closest-side,black,transparent)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(241,199,107,0.28),transparent)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 home-grain opacity-[0.08]" />
      {lite ? null : (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className={cn("home-particle home-loop", i >= 6 && "max-sm:hidden")}
              style={
                {
                  left: p.left,
                  "--home-drift-delay": p.delay,
                  "--home-drift-duration": p.duration,
                  "--home-drift-x": p.drift,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="mx-auto max-w-[52rem] px-5 py-20 text-center sm:py-28">
        <div ref={seedRef} className="flex justify-center">
          {seedInView ? (
            <SeedSprout tone="light" className="h-16 w-16" />
          ) : (
            <span className="block h-16 w-16" aria-hidden />
          )}
        </div>
        <HomeReveal className="mt-6 space-y-4">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold">{eyebrow}</p>
          ) : null}
          <h2 className="font-brand-display text-[2.4rem] font-medium leading-[1.04] tracking-tight text-white text-balance sm:text-6xl">
            {tr("cta_title")}
          </h2>
          {subtitle ? (
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-[#bdcad5]">{subtitle}</p>
          ) : null}
        </HomeReveal>
        <HomeReveal delay={150} className="mt-9 flex flex-col items-center gap-3">
          <Button
            size="xl"
            asChild
            className="home-shimmer home-loop h-auto min-h-12 w-full rounded-md bg-brand-gold px-8 text-center leading-snug whitespace-normal text-brand-ink shadow-[0_18px_50px_-18px_rgba(211,154,43,0.8)] hover:bg-[#E0A93A] hover:text-brand-ink sm:w-auto sm:min-w-[260px]"
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
          {helper ? <p className="text-[12px] text-[#9fb0c0]">{helper}</p> : null}
        </HomeReveal>
      </div>
    </section>
  );
}
