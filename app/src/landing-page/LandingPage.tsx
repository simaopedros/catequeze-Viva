import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { AiShowcaseSection } from './components/AiShowcaseSection';
import { CtaSection } from './components/CtaSection';
import { FaqSection } from './components/FaqSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import { MissionSection } from './components/MissionSection';
import { PainPointsSection } from './components/PainPointsSection';
import { PersonasSection } from './components/PersonasSection';
import { PricingPreviewSection } from './components/PricingPreviewSection';
import { StepsSection } from './components/StepsSection';
import { TestimonialsSection } from './components/TestimonialsSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        <HeroSection />
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
      </main>

      <PublicFooter />
    </div>
  );
}
