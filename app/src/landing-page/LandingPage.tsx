import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";

const loadProblem = () =>
  import("./components/ProblemSection").then((m) => ({
    default: m.ProblemSection,
  }));
const loadTransform = () =>
  import("./components/TransformSection").then((m) => ({
    default: m.TransformSection,
  }));
const loadDemo = () =>
  import("./components/InteractiveDemoSection").then((m) => ({
    default: m.InteractiveDemoSection,
  }));
const loadSteps = () =>
  import("./components/StepsSection").then((m) => ({
    default: function Steps() {
      return <m.StepsSection responsiveCtas ctaAfterSteps />;
    },
  }));
const loadPresence = () =>
  import("./components/PresenceSection").then((m) => ({
    default: m.PresenceSection,
  }));
const loadStartSmall = () =>
  import("./components/StartSmallSection").then((m) => ({
    default: function StartSmall() {
      return <m.StartSmallSection responsiveCtas />;
    },
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
 * Main landing: presence story → trial.
 * Problem, transformation, AI, workflow, growth ladder — not a feature catalog.
 */
export default function LandingPage() {
  return (
    <LandingShell ns="landing">
      <HeroSection responsiveCtas variant="editorial" />
      <LazySection loader={loadProblem} />
      <LazySection loader={loadTransform} />
      <LazySection loader={loadDemo} />
      <LazySection loader={loadSteps} />
      <LazySection loader={loadPresence} />
      <LazySection loader={loadStartSmall} />
      <LazySection>
        <GrowthPricingSection ns="landing" />
      </LazySection>
      <FaqSection showCta />
      <LazySection loader={loadCta} />
    </LandingShell>
  );
}
