import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { CtaSection } from './components/CtaSection';
import { FaqSection } from './components/FaqSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import { PersonasSection } from './components/PersonasSection';
import { PricingPreviewSection } from './components/PricingPreviewSection';
import { StepsSection } from './components/StepsSection';

const NS = 'landingPresenca';

export default function LandingPresenca() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection ns={NS} />
        <FeaturesSection ns={NS} order={["attendance","family","dashboard","ai","library","sacraments"]} />
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
