import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { CalendarDays, GraduationCap, Check } from 'lucide-react';

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
  const [step, setStep] = useState<'year' | 'class'>('year');
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

  const handleYearNext = () => {
    if (yearStart && yearEnd && yearEnd <= yearStart) {
      setDateError(t('coordinator.date_error'));
      return;
    }
    setDateError('');
    setStep('class');
  };

  const handleFinish = () => {
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
      {step === 'year' && (
        <>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />{t('coordinator.year_title')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('coordinator.year_name')}</label>
              <input value={yearName} onChange={e => setYearName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder={t('coordinator.year_name_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">{t('coordinator.start')}</label><input type="date" value={yearStart} onChange={e => setYearStart(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">{t('coordinator.end')}</label><input type="date" value={yearEnd} onChange={e => setYearEnd(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" /></div>
            </div>
          </div>
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
          <div className="flex justify-end">
            <Button onClick={handleYearNext} disabled={!yearName}>{t('coordinator.next')}</Button>
          </div>
        </>
      )}

      {step === 'class' && (
        <>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />{t('coordinator.class_title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('coordinator.class_desc')}</p>

          <div>
            <label className="text-sm font-medium">{t('coordinator.class_name')}</label>
            <input value={className} onChange={e => setClassName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              placeholder={t('coordinator.class_name_placeholder')} disabled={skipClass} />
          </div>

          {!skipClass && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">{t('coordinator.day_of_week')}</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  {DAY_VALUES.map(d => <option key={d} value={d}>{t(`coordinator.days.${d}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('coordinator.start_time')}</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">{t('coordinator.end_time')}</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
            </div>
          )}

          {!skipClass && (
            <div>
              <label className="text-sm font-medium">{t('coordinator.location')}</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder={parishName} />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={skipClass}
              onChange={e => { setSkipClass(e.target.checked); if (e.target.checked) setClassName(''); }} />
            {t('coordinator.skip_class')}
          </label>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('year')}>{t('coordinator.back')}</Button>
            <Button onClick={handleFinish}>
              <Check className="mr-2 h-4 w-4" />{t('coordinator.finish')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
