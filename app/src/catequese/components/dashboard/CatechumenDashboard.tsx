import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { PageHeader } from '../../../client/components/PageHeader';
import { StatCard } from '../../../client/components/StatCard';
import { formatDate } from '../../../i18n/format';
import { useLocale } from '../../../i18n/useLocale';
import { Clock, GraduationCap, FileText, TrendingUp } from 'lucide-react';

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  const { t } = useTranslation('common');
  const { t: td } = useTranslation('dashboard');
  const { currentLocale } = useLocale();

  const dateOpts = { weekday: 'short' as const, day: 'numeric' as const, month: 'short' as const };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('catechumen_journey')}
        subtitle={t('catechumen_subtitle')}
        compact
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Clock}
          label={td('pending_milestones')}
          value={stats?.pendingSacraments || 0}
          color="warning"
        />
        <StatCard
          icon={GraduationCap}
          label={t('upcoming_meetings')}
          value={stats?.upcomingMeetings?.length || 0}
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          label={td('attendance_label')}
          value={`${stats?.avgAttendance || 0}%`}
          color="success"
        />
      </div>

      {/* Upcoming meetings */}
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            {t('upcoming_meetings')}
          </h3>
          <div className="divide-y">
            {stats.upcomingMeetings.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium truncate mr-2">
                  {m.class?.name || td('meeting_default')}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(m.date, currentLocale, dateOpts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/app/sacramental-journeys">
            <GraduationCap className="mr-2 h-4 w-4" />
            {td('my_sacramental_journey')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />
            {td('my_documents')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
