import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";

const loadProblem = () =>
  import("./components/ProblemSection").then((m) => ({
    default: m.ProblemSection,
  }));
const loadHow = () =>
  import("./components/HowItWorksSection").then((m) => ({
    default: m.HowItWorksSection,
  }));
const loadDemo = () =>
  import("./components/InteractiveDemoSection").then((m) => ({
    default: m.InteractiveDemoSection,
  }));
const GrowthPricingSection = lazy(() =>
  import("./components/GrowthPricingSection").then((m) => ({
    default: m.GrowthPricingSection,
  })),
);
const loadCta = () =>
  import("./components/CtaSection").then((m) => ({
    default: function Cta() {
      return <m.CtaSection responsiveCtas />;
    },
  }));

/**
 * Home: editorial SaaS story, not a feature catalog.
 * Promise → pain → how it works → IA demo → pricing → FAQ → CTA.
 */
export default function LandingPage() {
  return (
    <LandingShell ns="landing">
      <HeroSection responsiveCtas variant="centered" />
      <LazySection loader={loadProblem} />
      <LazySection loader={loadHow} />
      <LazySection loader={loadDemo} />
      <LazySection>
        <GrowthPricingSection ns="landing" />
      </LazySection>
      <FaqSection showCta />
      <LazySection loader={loadCta} />
    </LandingShell>
  );
}
