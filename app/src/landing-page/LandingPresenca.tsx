import { lazy, Suspense } from 'react';
import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { HeroSection } from './components/HeroSection';

const CtaSection = lazy(() => import('./components/CtaSection').then(m => ({ default: m.CtaSection })));
const FaqSection = lazy(() => import('./components/FaqSection').then(m => ({ default: m.FaqSection })));
const FeaturesSection = lazy(() => import('./components/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const PersonasSection = lazy(() => import('./components/PersonasSection').then(m => ({ default: m.PersonasSection })));
const PricingPreviewSection = lazy(() => import('./components/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import('./components/StepsSection').then(m => ({ default: m.StepsSection })));

const SectionFallback = () => <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />;

const NS = 'landingPresenca';

export default function LandingPresenca() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} />

        <Suspense fallback={<SectionFallback />}>
          <FeaturesSection ns={NS} order={["attendance","family-portal","dashboard","ai-planner","library","sacraments"]} />
          <PersonasSection ns={NS} />
          <StepsSection ns={NS} />
          <PricingPreviewSection ns={NS} />
          <FaqSection ns={NS} />
          <CtaSection ns={NS} />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
