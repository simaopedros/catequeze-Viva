import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";
import { landingCampaigns } from "./landingCampaigns";

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
  import("./components/ProofSection").then((m) => ({
    default: m.ProofSection,
  })),
);
const PricingPreviewSection = lazy(() =>
  import("./components/PricingPreviewSection").then((m) => ({
    default: m.PricingPreviewSection,
  })),
);
const StepsSection = lazy(() =>
  import("./components/StepsSection").then((m) => ({
    default: m.StepsSection,
  })),
);

const campaign = landingCampaigns.ai;

/**
 * Google Ads: IA / assistência editorial.
 * Demo first, then proof, then pricing (no price-first).
 */
export default function LandingIa() {
  return (
    <LandingShell ns={campaign.namespace}>
      <HeroSection
        ns={campaign.namespace}
        campaign={campaign.campaign}
        visual={campaign.heroVisual}
        variant="centered"
        responsiveCtas
      />
      <LazySection>
        <AiShowcaseSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <FeaturesSection
          ns={campaign.namespace}
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
        <ProofSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <PricingPreviewSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <MissionSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <PersonasSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <StepsSection ns={campaign.namespace} responsiveCtas />
      </LazySection>
      <LazySection>
        <FaqSection ns={campaign.namespace} />
      </LazySection>
      <LazySection>
        <CtaSection ns={campaign.namespace} responsiveCtas />
      </LazySection>
    </LandingShell>
  );
}
