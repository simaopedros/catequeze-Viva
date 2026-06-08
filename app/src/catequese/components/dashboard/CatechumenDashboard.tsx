import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { formatDate } from '../../../i18n/format';
import { useLocale } from '../../../i18n/useLocale';
import { GraduationCap, Clock, FileText } from 'lucide-react';

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  const { t } = useTranslation('common');
  const { t: td } = useTranslation('dashboard');
  const { currentLocale } = useLocale();

  const pendingCount = stats?.pendingSacraments || 0;
  const meetingCount = stats?.upcomingMeetings?.length || 0;
  const avgAttendance = stats?.avgAttendance || 0;

  const dateOpts = { weekday: 'short' as const, day: 'numeric' as const, month: 'short' as const };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('catechumen_journey')}</h1><p className="text-muted-foreground">{t('catechumen_subtitle')}</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3" />{td('pending_milestones')}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-primary">{meetingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('upcoming_meetings')}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{avgAttendance}%</p>
          <p className="text-xs text-muted-foreground mt-1">{td('attendance_label')}</p>
        </div>
      </div>
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">{t('upcoming_meetings')}</h3>
          {stats.upcomingMeetings.map((m: any) => (
            <div key={m.id} className="flex justify-between text-sm py-1">
              <span>{m.class?.name || td('meeting_default')}</span>
              <span className="text-xs text-muted-foreground">{formatDate(m.date, currentLocale, dateOpts)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/app/sacramental-journeys">
            <GraduationCap className="mr-2 h-4 w-4" />{td('my_sacramental_journey')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />{td('my_documents')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
