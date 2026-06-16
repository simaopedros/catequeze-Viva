import { lazy, Suspense } from 'react';
import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { FaqSection } from './components/FaqSection';
import { HeroSection } from './components/HeroSection';

const AiShowcaseSection = lazy(() => import('./components/AiShowcaseSection').then(m => ({ default: m.AiShowcaseSection })));
const CtaSection = lazy(() => import('./components/CtaSection').then(m => ({ default: m.CtaSection })));
const FeaturesSection = lazy(() => import('./components/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const MissionSection = lazy(() => import('./components/MissionSection').then(m => ({ default: m.MissionSection })));
const PersonasSection = lazy(() => import('./components/PersonasSection').then(m => ({ default: m.PersonasSection })));
const PricingPreviewSection = lazy(() => import('./components/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import('./components/StepsSection').then(m => ({ default: m.StepsSection })));
const SectionFallback = () => <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />;

const NS = 'landingIa';

export default function LandingIa() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} />

        <Suspense fallback={<SectionFallback />}>
          <AiShowcaseSection ns={NS} />
          <FeaturesSection ns={NS} order={["ai-planner","library","attendance","family-portal","dashboard","sacraments"]} />
          <MissionSection ns={NS} />
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
