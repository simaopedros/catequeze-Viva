import { lazy } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LazySection } from "./components/LazySection";
import { MobileStickyCta } from "./components/MobileStickyCta";
import { useRouteDocumentMeta } from "./hooks/useRouteDocumentMeta";

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

const NS = "landingSistema";

/**
 * Google Ads landing: gestão / sistema.
 * Product demo (gestão features) before pricing.
 */
export default function LandingSistema() {
  useRouteDocumentMeta();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} variant="centered" />
        <LazySection>
          <FeaturesSection
            ns={NS}
            order={[
              "attendance",
              "dashboard",
              "family-portal",
              "sacraments",
              "library",
              "ai-planner",
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
          <PersonasSection ns={NS} />
        </LazySection>
        <LazySection>
          <StepsSection ns={NS} />
        </LazySection>
        <LazySection>
          <FaqSection ns={NS} />
        </LazySection>
        <LazySection>
          <CtaSection ns={NS} />
        </LazySection>
      </main>
      <PublicFooter />
      <MobileStickyCta ns={NS} />
    </div>
  );
}
