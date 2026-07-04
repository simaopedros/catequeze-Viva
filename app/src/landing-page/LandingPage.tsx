import { lazy, Suspense } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { TrustSection } from "./components/TrustSection";

const AiShowcaseSection = lazy(() => import("./components/AiShowcaseSection").then((m) => ({ default: m.AiShowcaseSection })));
const CtaSection = lazy(() => import("./components/CtaSection").then((m) => ({ default: m.CtaSection })));
const FeaturesSection = lazy(() => import("./components/FeaturesSection").then((m) => ({ default: m.FeaturesSection })));
const PainPointsSection = lazy(() => import("./components/PainPointsSection").then((m) => ({ default: m.PainPointsSection })));
const PricingPreviewSection = lazy(() => import("./components/PricingPreviewSection").then((m) => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import("./components/StepsSection").then((m) => ({ default: m.StepsSection })));
const TestimonialsSection = lazy(() => import("./components/TestimonialsSection").then((m) => ({ default: m.TestimonialsSection })));

const SectionFallback = () => (<div className="h-40 animate-pulse bg-muted/20 rounded-lg" />);

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection responsiveCtas />
        <Suspense fallback={<SectionFallback />}>
          <PainPointsSection />
          <AiShowcaseSection responsiveCtas />
          <TestimonialsSection />
          <PricingPreviewSection />
          <TrustSection />
          <FeaturesSection order={["ai-planner", "attendance", "family-portal"]} />
          <StepsSection responsiveCtas />
          <FaqSection />
          <CtaSection responsiveCtas />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
