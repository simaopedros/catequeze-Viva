import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { CalendarDays, GraduationCap, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';

const DAY_VALUES = ['0', '1', '2', '3', '4', '5', '6'];

interface CoordinatorDetailsProps {
  parishName: string;
  onComplete: (data: {
    yearName: string; yearStart: string; yearEnd: string;
    className?: string; dayOfWeek?: string; startTime?: string; endTime?: string; location?: string;
  }) => void;
}

export function CoordinatorDetails({ parishName, onComplete }: CoordinatorDetailsProps) {
  const { t } = useTranslation('onboarding');
  const [step, setStep] = useState<'class' | 'year'>('class');
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [className, setClassName] = useState('');
  const [skipClass, setSkipClass] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('6');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState(parishName || '');
  const [dateError, setDateError] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  const handleYearFinish = () => {
    if (yearStart && yearEnd && yearEnd <= yearStart) {
      setDateError(t('coordinator.date_error'));
      return;
    }
    setDateError('');
    onComplete({
      yearName,
      yearStart,
      yearEnd,
      className: skipClass ? undefined : className.trim() || undefined,
      dayOfWeek: skipClass ? undefined : dayOfWeek,
      startTime: skipClass ? undefined : startTime,
      endTime: skipClass ? undefined : endTime,
      location: skipClass ? undefined : location || undefined,
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {step === 'class' && (
        <>
          <div className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>{t('coordinator.progress_title')}</span>
              <span>{t('coordinator.progress_status_class')}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 w-[42%] rounded-full bg-primary" />
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>{t('coordinator.progress_copy_class')}</span>
            </div>
          </div>

          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />{t('coordinator.class_title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('coordinator.class_desc')}</p>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('coordinator.class_name')}</label>
              <input
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t('coordinator.class_name_placeholder')}
                disabled={skipClass}
              />
            </div>

            {!skipClass && (
              <div className="rounded-xl border border-dashed border-border/80 bg-white/70">
                <button
                  type="button"
                  onClick={() => setShowOptionalDetails((current) => !current)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <span>{showOptionalDetails ? t('coordinator.optional_details_hide') : t('coordinator.optional_details_toggle')}</span>
                  {showOptionalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showOptionalDetails && (
                  <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-3">
                    <p className="text-xs text-muted-foreground">{t('coordinator.optional_details_hint')}</p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label htmlFor="coord-day" className="flex items-center gap-1 text-sm font-medium"><Clock className="h-3 w-3" /> {t('coordinator.day_of_week')}</label>
                        <select
                          id="coord-day"
                          value={dayOfWeek}
                          onChange={e => setDayOfWeek(e.target.value)}
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {DAY_VALUES.map(d => <option key={d} value={d}>{t(`coordinator.days.${d}`)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="coord-start" className="text-sm font-medium">{t('coordinator.start_time')}</label>
                        <input
                          id="coord-start"
                          type="time"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="coord-end" className="text-sm font-medium">{t('coordinator.end_time')}</label>
                        <input
                          id="coord-end"
                          type="time"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium"><MapPin className="h-3 w-3" /> {t('coordinator.location')}</label>
                      <input
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder={parishName}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={skipClass}
              onChange={e => { setSkipClass(e.target.checked); if (e.target.checked) setClassName(''); }} />
            {t('coordinator.skip_class')}
          </label>
          <div className="flex justify-end">
            <Button onClick={() => setStep('year')}>
              {t('coordinator.next')}
            </Button>
          </div>
        </>
      )}

      {step === 'year' && (
        <>
          <div className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>{t('coordinator.progress_title')}</span>
              <span>{t('coordinator.progress_status_year')}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 w-[78%] rounded-full bg-primary" />
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>{t('coordinator.progress_copy_year')}</span>
            </div>
          </div>

          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-primary" />{t('coordinator.year_title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('coordinator.year_desc')}</p>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('coordinator.year_name')}</label>
              <input value={yearName} onChange={e => setYearName(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t('coordinator.year_name_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="year-start" className="text-sm font-medium">{t('coordinator.start')}</label>
                <input id="year-start" type="date" value={yearStart} onChange={e => setYearStart(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="year-end" className="text-sm font-medium">{t('coordinator.end')}</label>
                <input id="year-end" type="date" value={yearEnd} onChange={e => setYearEnd(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('class')}>{t('coordinator.back')}</Button>
            <Button onClick={handleYearFinish} disabled={!yearName}>
              <Check className="mr-2 h-4 w-4" />{t('coordinator.finish')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
