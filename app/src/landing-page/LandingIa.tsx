import { lazy } from 'react';
import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { FaqSection } from './components/FaqSection';
import { HeroSection } from './components/HeroSection';
import { LazySection } from './components/LazySection';
import { MobileStickyCta } from './components/MobileStickyCta';

const AiShowcaseSection = lazy(() => import('./components/AiShowcaseSection').then(m => ({ default: m.AiShowcaseSection })));
const CtaSection = lazy(() => import('./components/CtaSection').then(m => ({ default: m.CtaSection })));
const FeaturesSection = lazy(() => import('./components/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const MissionSection = lazy(() => import('./components/MissionSection').then(m => ({ default: m.MissionSection })));
const PersonasSection = lazy(() => import('./components/PersonasSection').then(m => ({ default: m.PersonasSection })));
const PricingPreviewSection = lazy(() => import('./components/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })));
const StepsSection = lazy(() => import('./components/StepsSection').then(m => ({ default: m.StepsSection })));

const NS = 'landingIa';

export default function LandingIa() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} />
        <LazySection>
          <PricingPreviewSection ns={NS} />
        </LazySection>
        <LazySection>
          <AiShowcaseSection ns={NS} />
        </LazySection>
        <LazySection>
          <FeaturesSection ns={NS} order={["ai-planner","library","attendance","family-portal","dashboard","sacraments"]} />
        </LazySection>
        <LazySection>
          <MissionSection ns={NS} />
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
