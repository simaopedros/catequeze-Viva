import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { GraduationCap, Check } from 'lucide-react';

const DAY_VALUES = ['0', '1', '2', '3', '4', '5', '6'];

interface CatechistDetailsProps {
  parishName: string;
  onComplete: (data: { className?: string; dayOfWeek?: string; startTime?: string; endTime?: string; location?: string }) => void;
}

export function CatechistDetails({ parishName, onComplete }: CatechistDetailsProps) {
  const { t } = useTranslation('onboarding');
  const { t: tc } = useTranslation('common');
  const [className, setClassName] = useState('');
  const [skipClass, setSkipClass] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('6');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState(parishName || '');

  const handleFinish = () => {
    onComplete({
      className: skipClass ? undefined : className.trim() || undefined,
      dayOfWeek: skipClass ? undefined : dayOfWeek,
      startTime: skipClass ? undefined : startTime,
      endTime: skipClass ? undefined : endTime,
      location: skipClass ? undefined : location || undefined,
    });
  };

  return (
    <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />{t('catechist.class_title')}
      </h2>

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

      <div className="flex justify-end">
        <Button onClick={handleFinish}>
          <Check className="mr-2 h-4 w-4" />{tc('finish')}
        </Button>
      </div>
    </div>
  );
}
