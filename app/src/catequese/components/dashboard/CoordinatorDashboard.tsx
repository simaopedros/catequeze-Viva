import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { useQuery, getClassComparison } from 'wasp/client/operations';
import { useActiveParish } from '../../../client/hooks/useActiveParish';
import { Users, BookOpen, TrendingUp, Cross, AlertCircle, Gift, Calendar, Clock, ChevronRight, ArrowUpDown, Info } from 'lucide-react';

interface CoordinatorDashboardProps {
  stats: any;
}

export function CoordinatorDashboard({ stats }: CoordinatorDashboardProps) {
  const { t } = useTranslation('dashboard');
  const { activeParishId } = useActiveParish();
  const { data: comparison } = useQuery(getClassComparison, { parishId: activeParishId || '' }, { enabled: !!activeParishId });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('title')}</h1><p className="text-muted-foreground">{t('subtitle')}</p></div>

      {/* KPIs */}
      <div data-tour="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{l:t('active_catechumens'),v:stats?.activeCatechumens??0,i:Users,c:'text-primary bg-primary/10'},{l:t('active_classes'),v:stats?.activeClasses??0,i:BookOpen,c:'text-success bg-success/10'},{l:t('avg_attendance'),v:`${stats?.avgAttendance??0}%`,i:TrendingUp,c:'text-warning bg-warning/10'},{l:t('pending_sacraments'),v:stats?.pendingSacraments??0,i:Cross,c:'text-secondary-foreground bg-secondary'}].map(k=>(
          <div key={k.l} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"><div className="flex items-center gap-4"><div className={`rounded-xl p-2.5 ${k.c}`}><k.i className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground uppercase tracking-wider">{k.l}</p><p className="text-2xl font-bold mt-0.5">{k.v}</p></div></div></div>
        ))}
      </div>

      {/* Quick tip: Ctrl+K shortcut */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
          <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Dica rápida</p>
          <p className="text-xs text-muted-foreground">
            Pressione <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono bg-muted">Ctrl</kbd> + <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono bg-muted">K</kbd> para buscar em catequizandos, turmas, Bíblia, Catecismo e mais.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {stats?.todayMeetings?.length > 0 && (
            <div className="rounded-xl border bg-card p-4 border-primary/30 bg-primary/5">
              <h3 className="font-semibold text-sm uppercase text-primary flex items-center gap-1 mb-3"><Clock className="h-4 w-4"/>Hoje</h3>
              {stats.todayMeetings.map((m: any) => (
                <Link key={m.id} to={`/app/classes/${m.class?.id}/attendance`} className="flex items-center justify-between py-2 hover:bg-muted/30 rounded px-2 -mx-2">
                  <div><p className="font-medium text-sm">{m.class?.name}</p><p className="text-xs text-muted-foreground">{m._count?.attendance || 0} registros</p></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                </Link>
              ))}
            </div>
          )}
          {stats?.upcomingMeetings?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-1"><Calendar className="h-4 w-4"/>Próximos encontros</h3>
              {stats.upcomingMeetings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 text-sm"><span className="font-medium">{m.class?.name}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</span></div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {stats?.myClasses?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Minhas turmas</h3>
              {stats.myClasses.map((c: any) => (
                <Link key={c.id} to={`/app/classes/${c.id}`} className="flex items-center justify-between py-1.5 text-sm hover:text-primary">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c._count?.enrollments || 0} inscritos</span>
                </Link>
              ))}
            </div>
          )}
          {stats?.aniversariantes?.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-1"><Gift className="h-4 w-4 text-pink-500"/>Aniversariantes do mês</h3>
              <div className="flex flex-wrap gap-2">
                {stats.aniversariantes.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-1.5 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 px-3 py-1 text-xs">
                    <span className="font-bold text-pink-600 dark:text-pink-400">{new Date(c.birthDate).getDate()}/{new Date(c.birthDate).getMonth()+1}</span>
                    <span>{c.firstName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {stats?.recentAlerts?.length > 0 && (
        <div className="rounded-xl border bg-card p-4"><h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground flex items-center gap-1"><AlertCircle className="h-4 w-4"/>{t('pastoral_alerts')}</h3>
          {stats.recentAlerts.map((a:any,i:number)=><div key={i} className="rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground shrink-0" />{a.message}</div>)}
        </div>
      )}

      {/* Class Comparison Table */}
      {comparison && comparison.length > 1 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4" /> Comparativo de Turmas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                  <th className="pb-2 pr-3">Turma</th>
                  <th className="pb-2 pr-3">Etapa</th>
                  <th className="pb-2 pr-3 text-center">Inscritos</th>
                  <th className="pb-2 pr-3 text-center">Encontros</th>
                  <th className="pb-2 pr-3 text-center">Presença</th>
                  <th className="pb-2 text-center">Risco</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-3 font-medium">
                      <Link to={`/app/classes/${c.id}`} className="hover:text-primary">{c.name}</Link>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{c.stage}</td>
                    <td className="py-2 pr-3 text-center">{c.enrolled}</td>
                    <td className="py-2 pr-3 text-center">{c.totalMeetings}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`font-bold ${c.attendanceRate >= 75 ? 'text-success' : c.attendanceRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.riskLevel === 'BAIXO' ? 'bg-success/10 text-success' :
                        c.riskLevel === 'MÉDIO' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {c.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3"><Button asChild><Link to="/app/classes/new">{t('create_class')}</Link></Button><Button variant="outline" asChild><Link to="/app/catechumens/new">Cadastrar catequizando</Link></Button></div>

      {/* Empty state when no classes exist */}
      {(!stats?.activeClasses || stats.activeClasses === 0) && (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold mb-1">{t('no_classes_yet')}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{t('no_classes_description')}</p>
          <Button asChild size="lg">
            <Link to="/app/classes/new">{t('create_class')}</Link>
          </Button>
        </div>
      )}

      {/* Empty state when no catechumens */}
      {(!stats?.activeCatechumens || stats.activeCatechumens === 0) && (stats?.activeClasses > 0) && (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold mb-1">Nenhum catequizando cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-3">Cadastre catequizandos e matricule-os nas suas turmas.</p>
          <Button asChild variant="outline">
            <Link to="/app/catechumens/new">Cadastrar primeiro catequizando</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
