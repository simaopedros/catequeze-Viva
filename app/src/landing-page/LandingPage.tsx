import { lazy, Suspense } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";

const OutcomesSection = lazy(() =>
  import("./components/OutcomesSection").then((m) => ({
    default: m.OutcomesSection,
  })),
);
const StepsSection = lazy(() =>
  import("./components/StepsSection").then((m) => ({ default: m.StepsSection })),
);
const ProofSection = lazy(() =>
  import("./components/ProofSection").then((m) => ({ default: m.ProofSection })),
);
const PricingPreviewSection = lazy(() =>
  import("./components/PricingPreviewSection").then((m) => ({
    default: m.PricingPreviewSection,
  })),
);
const CtaSection = lazy(() =>
  import("./components/CtaSection").then((m) => ({ default: m.CtaSection })),
);

const SectionFallback = () => (
  <div className="mx-4 h-20 animate-pulse rounded-sm bg-muted/30" aria-hidden />
);

/**
 * Main landing: promise → value → proof → price → CTA.
 * Preserves editorial composition; shared shell prevents chrome drift.
 */
export default function LandingPage() {
  return (
    <LandingShell ns="landing">
      <HeroSection responsiveCtas variant="editorial" />
      <Suspense fallback={<SectionFallback />}>
        <OutcomesSection />
        <StepsSection responsiveCtas />
        <ProofSection />
        <PricingPreviewSection />
        <FaqSection />
        <CtaSection responsiveCtas />
      </Suspense>
    </LandingShell>
  );
}
