import { PublicFooter } from '../catequese/PublicFooter';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { CtaSection } from './components/CtaSection';
import { FaqSection } from './components/FaqSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
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
        <PersonasSection />
        <FeaturesSection />
        <StepsSection />
        <PricingPreviewSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>

      <PublicFooter />
    </div>
  );
}
