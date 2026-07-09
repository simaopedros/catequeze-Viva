import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, ArrowRight, Loader2, Clock, MapPin, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';

interface PersonalSetupProps {
  onComplete: (details: { className?: string; dayOfWeek?: string; startTime?: string; endTime?: string; location?: string }) => void;
  loading: boolean;
}

const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'];

export function PersonalSetup({ onComplete, loading }: PersonalSetupProps) {
  const { t } = useTranslation('onboarding');
  const [className, setClassName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

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

  return (
    <div className="animate-in fade-in duration-500 flex flex-col items-center space-y-5 py-4 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <User className="h-10 w-10 text-primary" />
      </div>

      <div className="max-w-md space-y-1">
        <h2 className="text-2xl font-bold">{t('personal_setup.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('personal_setup.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-3 rounded-sm border border-border/70 bg-slate-50/80 p-4 text-left">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>{t('personal_setup.progress_title')}</span>
            <span>{t('personal_setup.progress_status')}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 w-[38%] rounded-full bg-primary" />
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <span>{t('personal_setup.progress_copy')}</span>
          </div>
          <div className="space-y-2 rounded-sm border border-primary/15 bg-primary/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
              {t('personal_setup.value_title')}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• {t('personal_setup.first_value')}</li>
              <li>• {t('personal_setup.ai_generator')}</li>
              <li>• {t('personal_setup.liturgical_calendar')}</li>
            </ul>
          </div>
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
          <p className="mt-1 text-caption text-muted-foreground">{t('personal_setup.first_class_hint')}</p>
        </div>

        <div className="rounded-sm border border-dashed border-border/80 bg-white/70 text-left">
          <button
            type="button"
            onClick={() => setShowOptionalDetails((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
          >
            <span>{showOptionalDetails ? t('personal_setup.optional_details_hide') : t('personal_setup.optional_details_toggle')}</span>
            {showOptionalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showOptionalDetails && (
            <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-3">
              <p className="text-xs text-muted-foreground">{t('personal_setup.optional_details_hint')}</p>

              <div>
                <label htmlFor="ps-day" className="flex items-center gap-1 text-sm font-medium"><Clock className="h-3 w-3" /> {t('personal_setup.schedule_label')}</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <select id="ps-day" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">{t('personal_setup.day')}</option>
                    {DAY_KEYS.map(d => <option key={d} value={d}>{t(`personal_setup.days.${d}`)}</option>)}
                  </select>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9" />
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9" />
                </div>
              </div>

              <div>
                <label htmlFor="ps-location" className="flex items-center gap-1 text-sm font-medium"><MapPin className="h-3 w-3" /> {t('personal_setup.location_label')}</label>
                <Input id="ps-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('personal_setup.location_placeholder')} className="mt-1" />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t('personal_setup.creating')}</>
          ) : (
            <>
              {className.trim() ? t('personal_setup.enter_with_class') : t('personal_setup.enter_and_create_later')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
