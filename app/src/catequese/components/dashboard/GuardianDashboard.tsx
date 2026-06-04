import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Heart, Calendar } from 'lucide-react';

interface GuardianDashboardProps {
  stats: any;
}

export function GuardianDashboard({ stats }: GuardianDashboardProps) {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Portal da Família</h1><p className="text-muted-foreground">Acompanhe seus dependentes.</p></div>
      {stats?.dependents?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">{stats.dependents.map((d: any) => (
          <div key={d.id} className="rounded-xl border bg-card p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold">{d.firstName?.[0]}{d.lastName?.[0]}</div><div><Link to={`/app/catechumens/${d.id}`} className="font-semibold hover:text-primary">{d.firstName} {d.lastName}</Link><div className="text-xs text-muted-foreground">{d.enrollments?.map((e: any) => e.class.name).join(', ') || 'Nenhuma turma'}</div></div></div></div>
        ))}</div>
      ) : <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground"><Heart className="mx-auto h-8 w-8 mb-2" />Nenhum dependente vinculado.</div>}
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4"><h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4"/>Próximos encontros</h3>{stats.upcomingMeetings.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between py-1.5 text-sm"><span className="font-medium">{m.class?.name}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</span></div>
        ))}</div>
      )}
      <div className="flex gap-3"><Button asChild variant="outline"><Link to="/app/catechumens">Catequizandos</Link></Button><Button asChild variant="outline"><Link to="/app/calendar">Calendário</Link></Button></div>
    </div>
  );
}
