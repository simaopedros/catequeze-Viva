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
      return <m.StepsSection responsiveCtas />;
    },
  }));
const loadProof = () =>
  import("./components/ProofSection").then((m) => ({
    default: m.ProofSection,
  }));
const PricingPreviewSection = lazy(() =>
  import("./components/PricingPreviewSection").then((m) => ({
    default: m.PricingPreviewSection,
  })),
);
const loadCta = () =>
  import("./components/CtaSection").then((m) => ({
    default: function Cta() {
      return <m.CtaSection responsiveCtas />;
    },
  }));

/**
 * Main landing: promise → value → proof → pricing → CTA.
 * Plan cards come from the live public catalog (Admin isPublic + isActive),
 * same source as /pricing and ads landings.
 * Below-fold sections mount near viewport with independent Suspense boundaries.
 */
export default function LandingPage() {
  return (
    <LandingShell ns="landing">
      <HeroSection responsiveCtas variant="editorial" />
      <LazySection loader={loadOutcomes} />
      <LazySection loader={loadSteps} />
      <LazySection loader={loadProof} />
      <LazySection>
        <PricingPreviewSection ns="landing" />
      </LazySection>
      <FaqSection />
      <LazySection loader={loadCta} />
    </LandingShell>
  );
}
