import { useTranslation } from 'react-i18next';
import { Heart, User, Church, ArrowRight, Check } from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../../client/components/ui/button';

interface WelcomeStepProps {
  onPersonal: () => void;
  onManager: () => void;
}

export function WelcomeStep({ onPersonal, onManager }: WelcomeStepProps) {
  const { t } = useTranslation('onboarding');
  const { data: user } = useAuth();
  const firstName = user?.firstName || '';
  const personalFeatures = t('welcome.personal_features', { returnObjects: true }) as string[];
  const managerFeatures = t('welcome.manager_features', { returnObjects: true }) as string[];

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-4">
        <Heart className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-1 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">
          {firstName ? t('welcome.hello', { name: firstName }) : t('welcome.hello_default')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('welcome.question')}</p>
      </div>

      <div className="grid gap-3 w-full max-w-sm">
        <button
          onClick={onPersonal}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPersonal(); } }}
          role="button"
          tabIndex={0}
          aria-pressed={false}
          className="flex items-start gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 p-5 text-left transition-all group"
        >
          <div className="rounded-xl bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors shrink-0">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">{t('welcome.personal_title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('welcome.personal_desc')}</p>
            <ul className="mt-2 space-y-0.5">
              {personalFeatures.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-primary shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <ArrowRight className="h-5 w-5 text-primary/60 group-hover:translate-x-1 transition-transform shrink-0 mt-2" />
        </button>

        <button
          onClick={onManager}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onManager(); } }}
          role="button"
          tabIndex={0}
          aria-pressed={false}
          className="flex items-start gap-4 rounded-2xl border-2 border-border hover:border-primary/30 hover:bg-muted/50 p-5 text-left transition-all group"
        >
          <div className="rounded-xl bg-muted p-2.5 group-hover:bg-primary/10 transition-colors shrink-0">
            <Church className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">{t('welcome.manager_title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('welcome.manager_desc')}</p>
            <ul className="mt-2 space-y-0.5">
              {managerFeatures.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-primary shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0 mt-2" />
        </button>
      </div>
    </div>
  );
}
