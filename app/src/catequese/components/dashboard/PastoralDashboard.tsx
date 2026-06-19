import { useTranslation } from 'react-i18next';
import { Users, BookOpen, Cross } from 'lucide-react';
import { StatCard } from '../../../client/components/StatCard';
import { PageHeader } from '../../../client/components/PageHeader';

interface PastoralDashboardProps {
  stats: any;
}

export function PastoralDashboard({ stats }: PastoralDashboardProps) {
  const { t: tc } = useTranslation('common');
  const { t } = useTranslation('dashboard');

  const statItems = [
    {
      icon: Users,
      label: t('active_catechumens'),
      value: stats?.activeCatechumens ?? 0,
      color: 'primary' as const,
    },
    {
      icon: BookOpen,
      label: t('active_classes'),
      value: stats?.activeClasses ?? 0,
      color: 'info' as const,
    },
    {
      icon: Cross,
      label: t('pending_items'),
      value: stats?.pendingSacraments ?? 0,
      color: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={tc('pastoral_view')} compact />
      <div className="grid gap-4 md:grid-cols-3">
        {statItems.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
