import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../client/utils';
import type { FeatureShowcaseItem } from '../content/landingContent';
import { SHOWCASE_ICONS } from '../content/landingContent';
import { useParallax } from '../hooks/useParallax';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { BrowserFrame } from './BrowserFrame';
import { FeatureScreenshot } from './FeatureScreenshot';

interface FeatureShowcaseProps {
  showcase: FeatureShowcaseItem;
}

export function FeatureShowcase({ showcase }: FeatureShowcaseProps) {
  const { ref: revealRef, className: revealClass } = useScrollReveal();
  const imageRef = useParallax<HTMLDivElement>({ factor: 0.04 });
  const Icon = SHOWCASE_ICONS[showcase.id];
  const isReverse = showcase.direction === 'row-reverse';

  return (
    <div ref={revealRef} className={cn('py-10 md:py-14', revealClass)}>
      <div
        className={cn(
          'mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 md:gap-16',
          isReverse ? 'md:flex-row-reverse' : 'md:flex-row',
        )}
      >
        <div className="flex-1 space-y-5">
          <div className="inline-flex rounded-xl bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold">{showcase.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{showcase.desc}</p>
          <ul className="space-y-2.5">
            {showcase.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div ref={imageRef} className="parallax-layer w-full flex-1 max-w-xl">
          <BrowserFrame url={`app.catequese.viva/${showcase.id}`}>
            <FeatureScreenshot id={showcase.id} alt={showcase.title} />
          </BrowserFrame>
        </div>
      </div>
    </div>
  );
}
