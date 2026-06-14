import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Sparkles, ArrowRight, Loader2, Clock, MapPin } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';
import { useAuth } from 'wasp/client/auth';

interface PersonalSetupProps {
  onComplete: (details: { className?: string; dayOfWeek?: string; startTime?: string; endTime?: string; location?: string }) => void;
  loading: boolean;
}

const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'];

export function PersonalSetup({ onComplete, loading }: PersonalSetupProps) {
  const { t } = useTranslation('onboarding');
  const { data: user } = useAuth();
  const [className, setClassName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      className: className.trim() || undefined,
      dayOfWeek: dayOfWeek || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: location.trim() || undefined,
    });
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
          <label htmlFor="ps-class-name" className="text-sm font-medium">{t('personal_setup.first_class_label')}</label>
          <Input
            id="ps-class-name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder={t('personal_setup.first_class_placeholder')}
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t('personal_setup.first_class_hint')}</p>
        </div>

        <div className="text-left">
          <label htmlFor="ps-day" className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {t('personal_setup.schedule_label')}</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <select id="ps-day" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">{t('personal_setup.day')}</option>
              {DAY_KEYS.map(d => <option key={d} value={d}>{t(`personal_setup.days.${d}`)}</option>)}
            </select>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9" />
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="text-left">
          <label htmlFor="ps-location" className="text-sm font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> {t('personal_setup.location_label')}</label>
          <Input id="ps-location" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('personal_setup.location_placeholder')} className="mt-1" />
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
