import { lazy, Suspense } from 'react';
import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { FaqSection } from './components/FaqSection';
import { HeroSection } from './components/HeroSection';

const AiShowcaseSection = lazy(() => import('./components/AiShowcaseSection').then(m => ({ default: m.AiShowcaseSection })));
const CtaSection = lazy(() => import('./components/CtaSection').then(m => ({ default: m.CtaSection })));
const FeaturesSection = lazy(() => import('./components/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const MissionSection = lazy(() => import('./components/MissionSection').then(m => ({ default: m.MissionSection })));
const PainPointsSection = lazy(() => import('./components/PainPointsSection').then(m => ({ default: m.PainPointsSection })));
const PersonasSection = lazy(() => import('./components/PersonasSection').then(m => ({ default: m.PersonasSection })));
const PricingPreviewSection = lazy(() => import('./components/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import('./components/StepsSection').then(m => ({ default: m.StepsSection })));
const TestimonialsSection = lazy(() => import('./components/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));

const SectionFallback = () => <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />;

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        <HeroSection />

        <Suspense fallback={<SectionFallback />}>
          <PainPointsSection />
          <AiShowcaseSection />
          <FeaturesSection />
          <MissionSection />
          <PersonasSection />
          <StepsSection />
          <TestimonialsSection />
          <PricingPreviewSection />
          <FaqSection />
          <CtaSection />
        </Suspense>
      </main>

      <PublicFooter />
    </div>
  );
}
