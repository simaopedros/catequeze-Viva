import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { GraduationCap } from 'lucide-react';

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Minha Jornada</h1><p className="text-muted-foreground">Acompanhe seu progresso na catequese.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 text-center"><p className="text-3xl font-bold text-primary">{stats?.upcomingMeetings?.length || 0}</p><p className="text-xs text-muted-foreground mt-1">próximos encontros</p></div>
        <div className="rounded-xl border bg-card p-5 text-center"><p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats?.pendingSacraments || 0}</p><p className="text-xs text-muted-foreground mt-1">marcos pendentes</p></div>
        <div className="rounded-xl border bg-card p-5 text-center"><p className="text-3xl font-bold text-green-600 dark:text-green-400">—</p><p className="text-xs text-muted-foreground mt-1">presença</p></div>
      </div>
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4"><h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Próximos encontros</h3>
          {stats.upcomingMeetings.map((m: any) => <div key={m.id} className="flex justify-between text-sm py-1"><span>{m.class?.name}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span></div>)}
        </div>
      )}
      <Button asChild variant="outline"><Link to="/app/sacramental-journeys"><GraduationCap className="mr-2 h-4 w-4"/>Ver sacramentos</Link></Button>
    </div>
  );
}
