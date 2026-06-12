import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STUDENTS = [
  { name: 'Ana Silva', status: 'present' },
  { name: 'Bruno Costa', status: 'present' },
  { name: 'Carla Mendes', status: 'late' },
  { name: 'Diego Souza', status: 'absent' },
  { name: 'Elena Ferreira', status: 'present' },
];

export function AttendanceMock({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">{t('mockup_attendance.title')}</p>
          <p className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t('mockup_attendance.meeting')}
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium flex items-center gap-1">
          <Users className="h-3 w-3" /> 18
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { l: t('mockup_attendance.present'), v: '14', c: 'bg-success/10 text-success' },
          { l: t('mockup_attendance.absent'), v: '2', c: 'bg-destructive/10 text-destructive' },
          { l: t('mockup_attendance.late'), v: '1', c: 'bg-warning/10 text-warning' },
          { l: t('mockup_attendance.justified'), v: '1', c: 'bg-muted text-muted-foreground' },
        ].map((s) => (
          <div key={s.l} className={`rounded-lg p-2 text-center ${s.c}`}>
            <p className="font-bold text-sm">{s.v}</p>
            <p className="text-[9px]">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {STUDENTS.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-3 py-2">
            <span className="font-medium">{s.name}</span>
            <div className="flex gap-1">
              <button
                type="button"
                className={`rounded-md p-1 ${s.status === 'present' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={`rounded-md p-1 ${s.status === 'absent' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={`rounded-md p-1 ${s.status === 'late' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'}`}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
