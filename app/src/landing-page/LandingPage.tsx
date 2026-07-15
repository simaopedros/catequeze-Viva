import { lazy, Suspense } from "react";
import { PublicFooter } from "../catequese/PublicFooter";
import { PublicNavbar } from "../catequese/PublicNavbar";
import { FaqSection } from "./components/FaqSection";
import { HeroSection } from "./components/HeroSection";
import { MobileStickyCta } from "./components/MobileStickyCta";
import { useRouteDocumentMeta } from "./hooks/useRouteDocumentMeta";

const OutcomesSection = lazy(() =>
  import("./components/OutcomesSection").then((m) => ({
    default: m.OutcomesSection,
  })),
);
const StepsSection = lazy(() =>
  import("./components/StepsSection").then((m) => ({ default: m.StepsSection })),
);
const ProofSection = lazy(() =>
  import("./components/ProofSection").then((m) => ({ default: m.ProofSection })),
);
const PricingPreviewSection = lazy(() =>
  import("./components/PricingPreviewSection").then((m) => ({
    default: m.PricingPreviewSection,
  })),
);
const CtaSection = lazy(() =>
  import("./components/CtaSection").then((m) => ({ default: m.CtaSection })),
);

const SectionFallback = () => (
  <div className="mx-4 h-20 animate-pulse rounded-sm bg-muted/30" aria-hidden />
);

/**
 * Main landing: trial-first hero → value → verifiable proof → pricing.
 * No fabricated testimonials; prices only after value is shown.
 */
export default function LandingPage() {
  useRouteDocumentMeta();

  return (
    <div className="min-h-screen flex flex-col bg-background text-[#071A2D]">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection responsiveCtas variant="editorial" />
        <Suspense fallback={<SectionFallback />}>
          <OutcomesSection />
          <StepsSection responsiveCtas />
          <ProofSection />
          <PricingPreviewSection />
          <FaqSection />
          <CtaSection responsiveCtas />
        </Suspense>
      </main>
      <PublicFooter />
      <MobileStickyCta />
    </div>
  );
}
