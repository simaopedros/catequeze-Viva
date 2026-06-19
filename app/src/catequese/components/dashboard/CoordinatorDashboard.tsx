import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Badge } from '../../../client/components/ui/badge';
import { PageHeader } from '../../../client/components/PageHeader';
import { StatCard } from '../../../client/components/StatCard';
import { EmptyState } from '../../../client/components/EmptyState';
import { useQuery, getClassComparison } from 'wasp/client/operations';
import { useActiveParish } from '../../../client/hooks/useActiveParish';
import { formatDate, formatDateOnly } from '../../../i18n/format';
import { useLocale } from '../../../i18n/useLocale';
import {
  Users, BookOpen, TrendingUp, Cross, AlertCircle,
  Gift, Calendar, Clock, ChevronRight, ArrowUpDown,
  Search,
} from 'lucide-react';

interface CoordinatorDashboardProps {
  stats: any;
}

function getRiskBadge(riskLevel: string, t: (key: string) => string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
    BAIXO: { variant: 'success', label: t('risk_low') },
    MÉDIO: { variant: 'warning', label: t('risk_medium') },
    ALTO: { variant: 'destructive', label: t('risk_high') },
  };
  return map[riskLevel] ?? { variant: 'outline' as const, label: riskLevel };
}

export function CoordinatorDashboard({ stats }: CoordinatorDashboardProps) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { t: tcl } = useTranslation('classes');
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const { data: comparison } = useQuery(
    getClassComparison,
    { parishId: activeParishId || '' },
    { enabled: !!activeParishId },
  );

  const dateOpts = { weekday: 'short' as const, day: '2-digit' as const, month: '2-digit' as const };
  const hasClasses = (stats?.activeClasses || 0) > 0;
  const hasCatechumens = (stats?.activeCatechumens || 0) > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        compact
      />

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div data-tour="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t('active_catechumens')}
          value={stats?.activeCatechumens ?? 0}
          color="primary"
        />
        <StatCard
          icon={BookOpen}
          label={t('active_classes')}
          value={stats?.activeClasses ?? 0}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label={t('avg_attendance')}
          value={`${stats?.avgAttendance ?? 0}%`}
          color="warning"
        />
        <StatCard
          icon={Cross}
          label={t('pending_sacraments')}
          value={stats?.pendingSacraments ?? 0}
          color="secondary"
        />
      </div>

      {/* ── Quick tip ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
          <Search className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{tc('quick_tip')}</p>
          <p className="text-xs text-muted-foreground">{tc('quick_tip_search')}</p>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-overline font-mono text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* ── Two-column operational blocks ───────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          {stats?.todayMeetings?.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-primary flex items-center gap-1.5 mb-3">
                <Clock className="h-4 w-4" />
                {tc('today')}
              </h3>
              <div className="divide-y divide-primary/10">
                {stats.todayMeetings.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/app/classes/${m.class?.id}/attendance`}
                    className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-primary/10 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {m.class?.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m._count?.attendance || 0} {tc('records')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {stats?.upcomingMeetings?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
                <Calendar className="h-4 w-4" />
                {tc('upcoming_meetings')}
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
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {stats?.myClasses?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                {tc('my_classes')}
              </h3>
              <div className="divide-y">
                {stats.myClasses.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/app/classes/${c.id}`}
                    className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors group"
                  >
                    <span className="font-medium truncate mr-2">{c.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 group-hover:text-foreground/70">
                      {c._count?.enrollments || 0} {tc('enrolled')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {stats?.aniversariantes?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
                <Gift className="h-4 w-4 text-secondary" />
                {tc('birthdays_month')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.aniversariantes.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-full bg-secondary/5 border border-secondary/20 px-3 py-1 text-xs"
                  >
                    <span className="font-bold text-secondary-foreground/80">
                      {formatDateOnly(c.birthDate, currentLocale, { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-foreground/80">{c.firstName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pastoral alerts ──────────────────────────────────────────── */}
      {stats?.recentAlerts?.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
            <AlertCircle className="h-4 w-4" />
            {t('pastoral_alerts')}
          </h3>
          <div className="space-y-2">
            {stats.recentAlerts.map((a: any, i: number) => (
              <div key={i} className="rounded-lg bg-muted/40 p-3 text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-foreground/80">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Class comparison table ────────────────────────────────────── */}
      {comparison && comparison.length > 1 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4" />
              {t('table_class_comparison')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/10">
                  <th className="py-2.5 px-4 font-semibold">{t('table_class')}</th>
                  <th className="py-2.5 px-4 font-semibold">{tcl('stage')}</th>
                  <th className="py-2.5 px-4 font-semibold text-center">{tcl('enrolled')}</th>
                  <th className="py-2.5 px-4 font-semibold text-center">{t('table_meetings')}</th>
                  <th className="py-2.5 px-4 font-semibold text-center">{t('table_attendance')}</th>
                  <th className="py-2.5 px-4 font-semibold text-center">{t('table_risk')}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c: any) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium">
                      <Link to={`/app/classes/${c.id}`} className="hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">{c.stage}</td>
                    <td className="py-2.5 px-4 text-center">{c.enrolled}</td>
                    <td className="py-2.5 px-4 text-center">{c.totalMeetings}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`font-bold text-sm ${
                          c.attendanceRate >= 75
                            ? 'text-success'
                            : c.attendanceRate >= 50
                              ? 'text-warning'
                              : 'text-destructive'
                        }`}
                      >
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {(() => {
                        const badge = getRiskBadge(c.riskLevel, t);
                        return (
                          <Badge variant={badge.variant} size="sm">
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Primary CTAs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/app/classes/new">{t('create_class')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/catechumens/new">{tc('create_catechumen')}</Link>
        </Button>
      </div>

      {/* ── Empty state: no classes ───────────────────────────────────── */}
      {!hasClasses && (
        <EmptyState
          icon={BookOpen}
          title={t('no_classes_yet')}
          description={t('no_classes_description')}
        >
          <Button asChild size="lg" className="mt-2">
            <Link to="/app/classes/new">{t('create_class')}</Link>
          </Button>
        </EmptyState>
      )}

      {/* ── Empty state: no catechumens ───────────────────────────────── */}
      {!hasCatechumens && hasClasses && (
        <EmptyState
          icon={Users}
          title={t('no_catechumens_registered')}
          description={t('no_catechumens_description')}
          compact
        >
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/app/catechumens/new">{t('register_first_catechumen')}</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
