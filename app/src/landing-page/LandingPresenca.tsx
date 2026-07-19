import { lazy } from "react";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LandingShell } from "./components/LandingShell";
import { LazySection } from "./components/LazySection";
import { landingCampaigns } from "./landingCampaigns";

const CtaSection = lazy(() =>
  import("./components/CtaSection").then((m) => ({ default: m.CtaSection })),
);
const FeaturesSection = lazy(() =>
  import("./components/FeaturesSection").then((m) => ({
    default: m.FeaturesSection,
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

const campaign = landingCampaigns.attendance;

/**
 * Google Ads: presença / chamada.
 * Attendance-first demo before pricing.
 */
export default function LandingPresenca() {
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
        <FeaturesSection
          ns={campaign.namespace}
          order={[
            "attendance",
            "family-portal",
            "dashboard",
            "ai-planner",
            "library",
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
