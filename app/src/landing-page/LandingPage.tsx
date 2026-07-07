import { lazy, Suspense } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";

const PainPointsSection = lazy(() => import("./components/PainPointsSection").then((m) => ({ default: m.PainPointsSection })));
const SimpleFeaturesSection = lazy(() => import("./components/SimpleFeaturesSection").then((m) => ({ default: m.SimpleFeaturesSection })));
const PricingPreviewSection = lazy(() => import("./components/PricingPreviewSection").then((m) => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import("./components/StepsSection").then((m) => ({ default: m.StepsSection })));
const CtaSection = lazy(() => import("./components/CtaSection").then((m) => ({ default: m.CtaSection })));

const SectionFallback = () => (<div className="h-40 animate-pulse bg-muted/20 rounded-lg" />);

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection responsiveCtas />
        <Suspense fallback={<SectionFallback />}>
          <PainPointsSection />
          <SimpleFeaturesSection />
          <PricingPreviewSection />
          <StepsSection responsiveCtas />
          <FaqSection />
          <CtaSection responsiveCtas />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
