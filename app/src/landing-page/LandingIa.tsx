import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";

const AiShowcaseSection = lazy(() =>
  import("./components/AiShowcaseSection").then((m) => ({
    default: m.AiShowcaseSection,
  })),
);
const CtaSection = lazy(() =>
  import("./components/CtaSection").then((m) => ({ default: m.CtaSection })),
);
const FeaturesSection = lazy(() =>
  import("./components/FeaturesSection").then((m) => ({
    default: m.FeaturesSection,
  })),
);
const MissionSection = lazy(() =>
  import("./components/MissionSection").then((m) => ({
    default: m.MissionSection,
  })),
);
const PersonasSection = lazy(() =>
  import("./components/PersonasSection").then((m) => ({
    default: m.PersonasSection,
  })),
);
const ProofSection = lazy(() =>
  import("./components/ProofSection").then((m) => ({ default: m.ProofSection })),
);
const PricingPreviewSection = lazy(() =>
  import("./components/PricingPreviewSection").then((m) => ({
    default: m.PricingPreviewSection,
  })),
);
const StepsSection = lazy(() =>
  import("./components/StepsSection").then((m) => ({ default: m.StepsSection })),
);

const NS = "landingIa";

/**
 * Google Ads: IA / assistência editorial.
 * Demo first, then proof, then pricing (no price-first).
 */
export default function LandingIa() {
  return (
    <LandingShell ns={NS}>
      <HeroSection ns={NS} variant="centered" responsiveCtas />
      <LazySection>
        <AiShowcaseSection ns={NS} />
      </LazySection>
      <LazySection>
        <FeaturesSection
          ns={NS}
          order={[
            "ai-planner",
            "library",
            "attendance",
            "family-portal",
            "dashboard",
            "sacraments",
          ]}
        />
      </LazySection>
      <LazySection>
        <ProofSection ns={NS} />
      </LazySection>
      <LazySection>
        <PricingPreviewSection ns={NS} />
      </LazySection>
      <LazySection>
        <MissionSection ns={NS} />
      </LazySection>
      <LazySection>
        <PersonasSection ns={NS} />
      </LazySection>
      <LazySection>
        <StepsSection ns={NS} responsiveCtas />
      </LazySection>
      <LazySection>
        <FaqSection ns={NS} />
      </LazySection>
      <LazySection>
        <CtaSection ns={NS} responsiveCtas />
      </LazySection>
    </LandingShell>
  );
}
