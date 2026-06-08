import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';
import { useAuth } from 'wasp/client/auth';

interface PersonalSetupProps {
  onComplete: (details: { className?: string }) => void;
  loading: boolean;
}

export function PersonalSetup({ onComplete, loading }: PersonalSetupProps) {
  const { t } = useTranslation('onboarding');
  const { data: user } = useAuth();
  const [className, setClassName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ className: className.trim() || undefined });
  };

  const limitsLabel = user?.subscriptionPlan === 'catechist_free'
    ? t('personal_setup.limits_free')
    : t('personal_setup.limits_unlimited');

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-4">
        <User className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-1 max-w-md">
        <h2 className="text-2xl font-bold">{t('personal_setup.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('personal_setup.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-left space-y-2">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> {t('personal_setup.included')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• {t('personal_setup.isolated_space')}</li>
            <li>• {limitsLabel}</li>
            <li>• {t('personal_setup.ai_generator')}</li>
            <li>• {t('personal_setup.liturgical_calendar')}</li>
          </ul>
        </div>

        <div className="text-left">
          <label className="text-sm font-medium">{t('personal_setup.first_class_label')}</label>
          <Input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder={t('personal_setup.first_class_placeholder')}
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t('personal_setup.first_class_hint')}</p>
        </div>

        <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t('personal_setup.creating')}</>
          ) : (
            <>{t('personal_setup.enter_space')} <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </form>
    </div>
  );
}
