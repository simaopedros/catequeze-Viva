import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Church, Heart, User } from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { cn } from '../../../client/utils';

interface WelcomeStepProps {
  onPersonal: () => void;
  onManager: () => void;
}

export function WelcomeStep({ onPersonal, onManager }: WelcomeStepProps) {
  const { t } = useTranslation('onboarding');
  const { data: user } = useAuth();
  const firstName = user?.firstName || '';
  const personalFeaturesValue = t('welcome.personal_features', { returnObjects: true });
  const managerFeaturesValue = t('welcome.manager_features', { returnObjects: true });
  const personalFeatures = Array.isArray(personalFeaturesValue) ? personalFeaturesValue : [];
  const managerFeatures = Array.isArray(managerFeaturesValue) ? managerFeaturesValue : [];

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-xl flex-col items-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10 text-primary ring-1 ring-primary/10">
          <Heart className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {firstName ? t('welcome.hello', { name: firstName }) : t('welcome.hello_default')}
          </h2>
          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('welcome.question')}
          </p>
          <p className="text-sm text-slate-500">
            {t('welcome.helper')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChoiceCard
          title={t('welcome.personal_title')}
          description={t('welcome.personal_desc')}
          features={personalFeatures}
          icon={User}
          accent="primary"
          onClick={onPersonal}
        />

        <ChoiceCard
          title={t('welcome.manager_title')}
          description={t('welcome.manager_desc')}
          features={managerFeatures}
          icon={Church}
          accent="secondary"
          onClick={onManager}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  title,
  description,
  features,
  icon: Icon,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  features: string[];
  icon: typeof User;
  accent: 'primary' | 'secondary';
  onClick: () => void;
}) {
  const accentClasses = accent === 'primary'
    ? {
        card: 'border-primary/20 bg-primary/[0.04] hover:border-primary/35 hover:bg-primary/[0.06]',
        icon: 'bg-primary/10 text-primary',
        arrow: 'text-primary/70',
      }
    : {
        card: 'border-border/70 bg-white/90 hover:border-slate-300 hover:bg-slate-50/70',
        icon: 'bg-slate-100 text-slate-700',
        arrow: 'text-slate-400',
      };

  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      type="button"
      className={cn(
        'group w-full rounded-3xl border p-6 text-left shadow-sm shadow-slate-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        accentClasses.card
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[20px]', accentClasses.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <ArrowRight className={cn('mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1', accentClasses.arrow)} />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </div>

      <div className="mt-5 space-y-2">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </button>
  );
}
