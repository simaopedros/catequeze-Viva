import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Badge } from '../../../client/components/ui/badge';
import { PageHeader } from '../../../client/components/PageHeader';
import { EmptyState } from '../../../client/components/EmptyState';
import { Eye, Library } from 'lucide-react';

interface ReviewerDashboardProps {
  stats: any;
}

export function ReviewerDashboard({ stats }: ReviewerDashboardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reviewer_title')}
        subtitle={t('reviewer_subtitle')}
        compact
      />

      {/* Review queue */}
      {stats?.reviewQueue?.length > 0 ? (
        <div className="space-y-2">
          {stats.reviewQueue.map((c: any) => (
            <Link
              key={c.id}
              to={`/app/content-library/${c.id}`}
              className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/20 transition-colors shadow-elevation-xs hover:shadow-elevation-sm group"
            >
              <div className="min-w-0 flex-1 mr-3">
                <p className="font-medium truncate group-hover:text-primary transition-colors">
                  {c.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.theme} · {t('by')} {c.createdBy?.firstName}
                </p>
              </div>
              <Badge variant="secondary" className="flex-shrink-0">
                {t('pending_review')}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={Eye}
          title={t('no_pending_review')}
          description={t('no_pending_review_desc')}
        />
      )}

      {/* CTA */}
      <Button asChild>
        <Link to="/app/content-library">
          <Library className="mr-2 h-4 w-4" />
          {t('go_to_library')}
        </Link>
      </Button>
    </div>
  );
}
