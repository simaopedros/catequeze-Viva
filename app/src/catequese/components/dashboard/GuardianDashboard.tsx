import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { PageHeader } from '../../../client/components/PageHeader';
import { EmptyState } from '../../../client/components/EmptyState';
import { formatDate } from '../../../i18n/format';
import { useLocale } from '../../../i18n/useLocale';
import { Heart, Calendar, Users } from 'lucide-react';

interface GuardianDashboardProps {
  stats: any;
}

export function GuardianDashboard({ stats }: GuardianDashboardProps) {
  const { t } = useTranslation('common');
  const { t: tn } = useTranslation('navigation');
  const { currentLocale } = useLocale();

  const dateOpts = { weekday: 'short' as const, day: '2-digit' as const, month: '2-digit' as const };
  const hasDependents = stats?.dependents?.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('guardian_portal')}
        subtitle={t('guardian_subtitle')}
        compact
      />

      {/* Dependents cards */}
      {hasDependents ? (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.dependents.map((d: any) => (
            <Link
              key={d.id}
              to={`/app/catechumens/${d.id}`}
              className="rounded-xl border bg-card p-5 shadow-elevation-sm hover:shadow-elevation-md transition-all hover:border-primary/20 group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                  {d.firstName?.[0]}{d.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold group-hover:text-primary transition-colors truncate">
                    {d.firstName} {d.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {d.enrollments?.map((e: any) => e.class.name).join(', ') || t('no_class')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title={t('no_dependents')}
          compact
        />
      )}

      {/* Upcoming meetings */}
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
            <Calendar className="h-4 w-4" />
            {t('upcoming_meetings')}
          </h3>
          <div className="divide-y">
            {stats.upcomingMeetings.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium truncate mr-2">{m.class?.name}</span>
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
          <Link to="/app/catechumens">
            <Users className="mr-2 h-4 w-4" />
            {tn('catechumens')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {t('calendar')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
