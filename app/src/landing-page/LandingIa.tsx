import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { AiShowcaseSection } from './components/AiShowcaseSection';
import { CtaSection } from './components/CtaSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import { MissionSection } from './components/MissionSection';
import { PersonasSection } from './components/PersonasSection';
import { PricingPreviewSection } from './components/PricingPreviewSection';
import { StepsSection } from './components/StepsSection';
import { FaqSection } from './components/FaqSection';

const NS = 'landingIa';

export default function LandingIa() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} />
        <AiShowcaseSection ns={NS} />
        <FeaturesSection ns={NS} order={["ai-planner","library","attendance","family-portal","dashboard","sacraments"]} />
        <MissionSection ns={NS} />
        <PersonasSection ns={NS} />
        <StepsSection ns={NS} />
        <PricingPreviewSection ns={NS} />
        <FaqSection ns={NS} />
        <CtaSection ns={NS} />
      </main>
      <PublicFooter />
    </div>
  );
}
