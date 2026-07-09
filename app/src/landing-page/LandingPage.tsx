import { lazy, Suspense } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { MobileStickyCta } from "./components/MobileStickyCta";

const OutcomesSection = lazy(() =>
  import("./components/OutcomesSection").then((m) => ({ default: m.OutcomesSection }))
);
const StepsSection = lazy(() =>
  import("./components/StepsSection").then((m) => ({ default: m.StepsSection }))
);
const CtaSection = lazy(() =>
  import("./components/CtaSection").then((m) => ({ default: m.CtaSection }))
);

const SectionFallback = () => (
  <div className="mx-4 h-20 animate-pulse rounded-sm bg-muted/30" aria-hidden />
);

/**
 * Professional conversion landing: trial-first, no prices.
 * Editorial brand layout for credibility.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-[#071A2D]">
      <PublicNavbar hidePricing />
      <main className="flex-1">
        <HeroSection responsiveCtas variant="editorial" />
        <Suspense fallback={<SectionFallback />}>
          <OutcomesSection />
          <StepsSection responsiveCtas />
          <FaqSection />
          <CtaSection responsiveCtas />
        </Suspense>
      </main>
      <PublicFooter hidePricing />
      <MobileStickyCta />
    </div>
  );
}
