import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { GraduationCap, Clock, CheckCircle, FileText } from 'lucide-react';

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  const pendingCount = stats?.pendingSacraments || 0;
  const meetingCount = stats?.upcomingMeetings?.length || 0;
  const avgAttendance = stats?.avgAttendance || 0;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Minha Jornada</h1><p className="text-muted-foreground">Acompanhe seu progresso na catequese.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3" />marcos pendentes</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-primary">{meetingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">próximos encontros</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{avgAttendance}%</p>
          <p className="text-xs text-muted-foreground mt-1">presença</p>
        </div>
      </div>
      {stats?.upcomingMeetings?.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Próximos encontros</h3>
          {stats.upcomingMeetings.map((m: any) => (
            <div key={m.id} className="flex justify-between text-sm py-1">
              <span>{m.class?.name || 'Encontro'}</span>
              <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/app/sacramental-journeys">
            <GraduationCap className="mr-2 h-4 w-4" />Minha jornada sacramental
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />Meus documentos
          </Link>
        </Button>
      </div>
    </div>
  );
}
