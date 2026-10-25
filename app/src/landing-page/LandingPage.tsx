import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { LandingShell } from "./components/LandingShell";
import {
  HomeDeferredSection,
  useHomeAnchorNavigation,
} from "./home/HomeDeferredSection";
import { HomeHero } from "./home/HomeHero";
import { HomeReveal } from "./home/HomeReveal";
import { ScrollProgress } from "./home/ScrollProgress";
import { useHomeMotionRoot } from "./home/homeMotionEnv";

const loadBeforeAfter = () =>
  import("./home/HomeBeforeAfter").then((m) => ({
    default: m.HomeBeforeAfter,
  }));
const loadHow = () =>
  import("./home/HomeHowItWorks").then((m) => ({
    default: m.HomeHowItWorks,
  }));
const loadDemo = () =>
  import("./home/HomeAiDemo").then((m) => ({
    default: m.HomeAiDemo,
  }));
const GrowthPricingSection = lazy(() =>
  import("./components/GrowthPricingSection").then((m) => ({
    default: m.GrowthPricingSection,
  })),
);
const loadClosingCta = () =>
  import("./home/HomeClosingCta").then((m) => ({
    default: m.HomeClosingCta,
  }));

/**
 * Home: promise → pain resolved → how it works → IA demo → pricing → FAQ → CTA.
 * Hero motion is CSS-only; sections below the fold load `motion` lazily.
 */
export default function LandingPage() {
  const rootRef = useHomeMotionRoot();
  useHomeAnchorNavigation(rootRef);
  return (
    <LandingShell ns="landing">
      <div ref={rootRef} className="home-root">
        <ScrollProgress />
        <HomeHero />
        <HomeDeferredSection loader={loadBeforeAfter} />
        <HomeDeferredSection loader={loadHow} />
        <HomeDeferredSection loader={loadDemo} />
        <HomeReveal>
          <HomeDeferredSection>
            <GrowthPricingSection ns="landing" />
          </HomeDeferredSection>
        </HomeReveal>
        <HomeReveal>
          <FaqSection showCta />
        </HomeReveal>
        <HomeDeferredSection loader={loadClosingCta} />
      </div>
    </LandingShell>
  );
}
