import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Badge } from '../../../client/components/ui/badge';
import { Eye } from 'lucide-react';

interface ReviewerDashboardProps {
  stats: any;
}

export function ReviewerDashboard({ stats }: ReviewerDashboardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t('reviewer_title')}</h1><p className="text-muted-foreground">{t('reviewer_subtitle')}</p></div>
      {stats?.reviewQueue?.length > 0 ? (
        <div className="space-y-2">{stats.reviewQueue.map((c: any) => (
          <Link key={c.id} to={`/app/content-library/${c.id}`} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30">
            <div><p className="font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.theme} · {t('by')} {c.createdBy?.firstName}</p></div>
            <Badge variant="secondary">{t('pending_review')}</Badge>
          </Link>
        ))}</div>
      ) : <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground"><Eye className="mx-auto h-8 w-8 mb-2"/>{t('no_pending_review')}</div>}
      <Button asChild><Link to="/app/content-library">{t('go_to_library')}</Link></Button>
    </div>
  );
}
