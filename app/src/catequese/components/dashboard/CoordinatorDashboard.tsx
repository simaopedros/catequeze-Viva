import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Badge } from '../../../client/components/ui/badge';
import { EmptyState } from '../../../client/components/EmptyState';
import { useQuery, getClassComparison } from 'wasp/client/operations';
import { useActiveParish } from '../../../client/hooks/useActiveParish';
import { formatDate, formatDateOnly } from '../../../i18n/format';
import { useLocale } from '../../../i18n/useLocale';
import { cn } from '../../../client/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Users, BookOpen, TrendingUp, Cross, AlertCircle,
  Gift, Calendar, Clock, ChevronRight, ArrowUpDown,
  Search, Sparkles, ArrowRight, CheckCircle2,
} from 'lucide-react';

interface CoordinatorDashboardProps {
  stats: any;
}

function getRiskBadge(riskLevel: string, t: (key: string) => string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
    BAIXO: { variant: 'success', label: t('risk_low') },
    'MÉDIO': { variant: 'warning', label: t('risk_medium') },
    ALTO: { variant: 'destructive', label: t('risk_high') },
  };
  return map[riskLevel] ?? { variant: 'outline' as const, label: riskLevel };
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm shadow-slate-200/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={cn('rounded-2xl p-2.5', accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  title,
  description,
  accent,
  featured = false,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  featured?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        featured
          ? 'border-primary/20 bg-gradient-to-br from-primary/[0.08] via-white to-amber-50/80 shadow-sm shadow-primary/10 hover:border-primary/35 hover:shadow-primary/15'
          : 'border-border/70 bg-white/85 shadow-sm shadow-slate-200/60 hover:border-primary/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-2xl p-2.5 transition-transform group-hover:scale-105', accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">{title}</p>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
  tone = 'default',
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'soft';
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border p-5 shadow-sm shadow-slate-200/60',
        tone === 'soft'
          ? 'border-primary/15 bg-gradient-to-br from-white via-slate-50 to-primary/[0.04]'
          : 'border-border/70 bg-white/90',
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(17,60,107,0.10),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,0.96))] p-6 shadow-sm shadow-slate-200/70 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary">
                Painel pastoral
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {t('title')}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            <div data-tour="dashboard-stats" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Users} label={t('active_catechumens')} value={stats?.activeCatechumens ?? 0} accent="bg-primary/10 text-primary" />
              <MetricCard icon={BookOpen} label={t('active_classes')} value={stats?.activeClasses ?? 0} accent="bg-emerald-100 text-emerald-700" />
              <MetricCard icon={TrendingUp} label={t('avg_attendance')} value={`${stats?.avgAttendance ?? 0}%`} accent="bg-amber-100 text-amber-700" />
              <MetricCard icon={Cross} label={t('pending_sacraments')} value={stats?.pendingSacraments ?? 0} accent="bg-orange-100 text-orange-700" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl px-5">
                <Link to="/app/classes/new">{t('create_class')}</Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="h-11 rounded-xl px-5 bg-white/80">
                <Link to="/app/catechumens/new">{tc('create_catechumen')}</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <ActionCard
              to="/app/classes/new"
              icon={BookOpen}
              title={t('create_class')}
              description={t('quick_new_class')}
              accent="bg-primary/10 text-primary"
            />
            <ActionCard
              to="/app/catechumens/new"
              icon={Users}
              title={tc('create_catechumen')}
              description={t('quick_new_catechumen')}
              accent="bg-emerald-100 text-emerald-700"
            />
            <ActionCard
              to="/app/ai-hub"
              icon={Sparkles}
              title={t('quick_ai')}
              description={t('quick_ai_desc')}
              accent="bg-amber-100 text-amber-700"
              featured
            />
            <div className="rounded-2xl border border-dashed border-border/80 bg-white/75 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Busca rapida</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{tc('quick_tip_search')}</p>
                </div>
                <kbd className="hidden shrink-0 rounded-lg border bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-500 sm:inline-flex">
                  Ctrl + K
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasClasses ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Primeiros passos" icon={CheckCircle2} tone="soft" className="p-6 lg:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('no_classes_yet')}</h2>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600">{t('no_classes_description')}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionCard
                  to="/app/classes/new"
                  icon={BookOpen}
                  title={t('create_class')}
                  description="Crie sua primeira turma para organizar encontros, presença e acompanhamento."
                  accent="bg-primary/10 text-primary"
                  featured
                />
                <ActionCard
                  to="/app/catechumens/new"
                  icon={Users}
                  title={tc('create_catechumen')}
                  description="Depois da turma, cadastre os catequizandos para começar a jornada pastoral."
                  accent="bg-emerald-100 text-emerald-700"
                />
              </div>
            </div>
          </SectionCard>

          <div className="space-y-6">
            {stats?.recentAlerts?.length > 0 && (
              <SectionCard title={t('pastoral_alerts')} icon={AlertCircle}>
                <div className="space-y-2">
                  {stats.recentAlerts.map((a: any, i: number) => (
                    <div key={i} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200/70">
                      {a.message}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Como comecar" icon={ArrowRight}>
              <div className="space-y-3 text-sm leading-relaxed text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                  1. Crie a turma com etapa, dias de encontro e responsaveis.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                  2. Cadastre os catequizandos e distribua nas turmas.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                  3. Use o Copiloto para montar os primeiros encontros com mais qualidade.
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title={tc('today')} icon={Clock} tone="soft">
              {stats?.todayMeetings?.length > 0 ? (
                <div className="space-y-2">
                  {stats.todayMeetings.map((m: any) => (
                    <Link
                      key={m.id}
                      to={`/app/classes/${m.class?.id}/attendance`}
                      className="group flex items-center justify-between rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 transition-colors hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-primary">{m.class?.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{m._count?.attendance || 0} {tc('records')}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-white/70 px-4 py-5 text-sm text-slate-500">
                  {t('no_meetings_today')}
                </div>
              )}
            </SectionCard>

            {stats?.recentAlerts?.length > 0 && (
              <SectionCard title={t('pastoral_alerts')} icon={AlertCircle}>
                <div className="space-y-2">
                  {stats.recentAlerts.map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <p className="text-sm leading-relaxed text-slate-700">{a.message}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {comparison && comparison.length > 1 && (
              <section className="overflow-hidden rounded-3xl border border-border/70 bg-white/90 shadow-sm shadow-slate-200/60">
                <div className="border-b border-border/70 bg-slate-50/80 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <ArrowUpDown className="h-4 w-4" />
                    {t('table_class_comparison')}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-5 py-3">{t('table_class')}</th>
                        <th className="px-5 py-3">{tcl('stage')}</th>
                        <th className="px-5 py-3 text-center">{tcl('enrolled')}</th>
                        <th className="px-5 py-3 text-center">{t('table_meetings')}</th>
                        <th className="px-5 py-3 text-center">{t('table_attendance')}</th>
                        <th className="px-5 py-3 text-center">{t('table_risk')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((c: any) => (
                        <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 font-medium">
                            <Link to={`/app/classes/${c.id}`} className="hover:text-primary transition-colors">{c.name}</Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">{c.stage}</td>
                          <td className="px-5 py-3 text-center">{c.enrolled}</td>
                          <td className="px-5 py-3 text-center">{c.totalMeetings}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={cn(
                              'font-bold',
                              c.attendanceRate >= 75 ? 'text-emerald-700' : c.attendanceRate >= 50 ? 'text-amber-700' : 'text-rose-700'
                            )}>
                              {c.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {(() => {
                              const badge = getRiskBadge(c.riskLevel, t);
                              return <Badge variant={badge.variant} size="sm">{badge.label}</Badge>;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {stats?.upcomingMeetings?.length > 0 && (
              <SectionCard title={tc('upcoming_meetings')} icon={Calendar}>
                <div className="space-y-2">
                  {stats.upcomingMeetings.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                      <span className="mr-3 truncate text-sm font-medium text-slate-900">{m.class?.name}</span>
                      <span className="shrink-0 text-xs font-medium text-slate-500">
                        {formatDate(m.date, currentLocale, dateOpts)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {stats?.myClasses?.length > 0 && (
              <SectionCard title={tc('my_classes')} icon={BookOpen}>
                <div className="space-y-2">
                  {stats.myClasses.map((c: any) => (
                    <Link
                      key={c.id}
                      to={`/app/classes/${c.id}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 transition-colors hover:bg-slate-100"
                    >
                      <span className="mr-3 truncate text-sm font-medium text-slate-900">{c.name}</span>
                      <span className="shrink-0 text-xs font-medium text-slate-500">{c._count?.enrollments || 0} {tc('enrolled')}</span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            )}

            {stats?.aniversariantes?.length > 0 && (
              <SectionCard title={tc('birthdays_month')} icon={Gift}>
                <div className="flex flex-wrap gap-2">
                  {stats.aniversariantes.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-900">
                      <span className="font-bold">{formatDateOnly(c.birthDate, currentLocale, { day: '2-digit', month: '2-digit' })}</span>
                      <span>{c.firstName}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {!hasCatechumens && hasClasses && (
              <SectionCard title="Cadastro" icon={Users}>
                <EmptyState
                  icon={Users}
                  title={t('no_catechumens_registered')}
                  description={t('no_catechumens_description')}
                  compact
                >
                  <Button asChild variant="outline" size="sm" className="mt-2 rounded-xl bg-white">
                    <Link to="/app/catechumens/new">{t('register_first_catechumen')}</Link>
                  </Button>
                </EmptyState>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

