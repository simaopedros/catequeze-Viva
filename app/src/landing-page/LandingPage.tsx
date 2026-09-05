import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";

const loadOutcomes = () =>
  import("./components/OutcomesSection").then((m) => ({
    default: m.OutcomesSection,
  }));
const loadSteps = () =>
  import("./components/StepsSection").then((m) => ({
    default: function Steps() {
      return <m.StepsSection responsiveCtas ctaAfterSteps />;
    },
  }));
const LeanPricingSection = lazy(() =>
  import("./components/LeanPricingSection").then((m) => ({
    default: m.LeanPricingSection,
  })),
);
const loadCta = () =>
  import("./components/CtaSection").then((m) => ({
    default: function Cta() {
      return <m.CtaSection responsiveCtas />;
    },
  }));

/**
 * Main landing: concrete job → outcomes → steps → single-plan pricing → FAQ → CTA.
 * Lean funnel focused on individual catequista trial activation.
 */
export default function LandingPage() {
  return (
    <LandingShell ns="landing">
      <HeroSection responsiveCtas variant="editorial" />
      <LazySection loader={loadOutcomes} />
      <LazySection loader={loadSteps} />
      <LazySection>
        <LeanPricingSection ns="landing" singlePlanOnly />
      </LazySection>
      <FaqSection showCta={false} />
      <LazySection loader={loadCta} />
    </LandingShell>
  );
}
