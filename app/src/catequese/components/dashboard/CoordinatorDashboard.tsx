import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Users, BookOpen, TrendingUp, Cross, AlertCircle, Gift, Calendar, Clock, ChevronRight } from 'lucide-react';

interface CoordinatorDashboardProps {
  stats: any;
}

export function CoordinatorDashboard({ stats }: CoordinatorDashboardProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('title')}</h1><p className="text-muted-foreground">{t('subtitle')}</p></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{l:t('active_catechumens'),v:stats?.activeCatechumens??0,i:Users,c:'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40'},{l:t('active_classes'),v:stats?.activeClasses??0,i:BookOpen,c:'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/40'},{l:t('avg_attendance'),v:`${stats?.avgAttendance??0}%`,i:TrendingUp,c:'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40'},{l:t('pending_sacraments'),v:stats?.pendingSacraments??0,i:Cross,c:'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40'}].map(k=>(
          <div key={k.l} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"><div className="flex items-center gap-4"><div className={`rounded-xl p-2.5 ${k.c}`}><k.i className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground uppercase tracking-wider">{k.l}</p><p className="text-2xl font-bold mt-0.5">{k.v}</p></div></div></div>
        ))}
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
          {stats.recentAlerts.map((a:any,i:number)=><div key={i} className="rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2"><span>ℹ️</span>{a.message}</div>)}
        </div>
      )}

      <div className="flex gap-3"><Button asChild><Link to="/app/classes/new">{t('create_class')}</Link></Button><Button variant="outline" asChild><Link to="/app/catechumens/new">Cadastrar catequizando</Link></Button></div>
    </div>
  );
}
