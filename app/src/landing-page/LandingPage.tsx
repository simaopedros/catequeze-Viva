import { lazy } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { LazySection } from "./components/LazySection";
import { MobileStickyCta } from "./components/MobileStickyCta";
import { PricingPreviewSection } from "./components/PricingPreviewSection";
import { ProofSection } from "./components/ProofSection";

const CtaSection = lazy(() => import("./components/CtaSection").then((m) => ({ default: m.CtaSection })));
const FeaturesSection = lazy(() => import("./components/FeaturesSection").then((m) => ({ default: m.FeaturesSection })));

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 pb-24 md:pb-0">
        <HeroSection responsiveCtas />
        <ProofSection />
        <PricingPreviewSection />
        <LazySection>
          <FeaturesSection order={["attendance", "ai-planner", "family-portal"]} showSecondaryGrid={false} />
        </LazySection>
        <LazySection>
          <FaqSection />
        </LazySection>
        <LazySection>
          <CtaSection responsiveCtas />
        </LazySection>
      </main>
      <PublicFooter />
      <MobileStickyCta />
    </div>
  );
}
