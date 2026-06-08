import { useTranslation } from 'react-i18next';
import { Users, BookOpen, Cross } from 'lucide-react';

interface PastoralDashboardProps {
  stats: any;
}

export function PastoralDashboard({ stats }: PastoralDashboardProps) {
  const { t: tc } = useTranslation('common');
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-6"><div><h1 className="text-2xl font-bold">{tc('pastoral_view')}</h1></div>
      <div className="grid gap-4 md:grid-cols-3">{[{l:t('active_catechumens'),v:stats?.activeCatechumens??0,i:Users},{l:t('active_classes'),v:stats?.activeClasses??0,i:BookOpen},{l:t('pending_items'),v:stats?.pendingSacraments??0,i:Cross}].map(k=>(
        <div key={k.l} className="rounded-xl border bg-card p-5"><div className="flex items-center gap-3"><k.i className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground uppercase">{k.l}</p><p className="text-2xl font-bold">{k.v}</p></div></div></div>
      ))}</div>
    </div>
  );
}
