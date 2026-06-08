import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonList } from '../../client/components/Skeletons';
import { useQuery } from 'wasp/client/operations';
import { listMyAiGenerations } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Input } from '../../client/components/ui/input';
import { Sparkles, Search, FileText, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useContentStatusMap } from '../../i18n/useLabels';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-success/10 text-success',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

export default function MyAiGenerationsPage() {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('content');
  const STATUS_MAP = useContentStatusMap();
  const { currentLocale } = useLocale();
  const { data: items, isLoading } = useQuery(listMyAiGenerations);
  const [search, setSearch] = useState('');

  const filtered = (items || []).filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.theme?.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title={t('generations.title')} subtitle={t('generations.subtitle')}>
          <Link to="/app/ai-planner">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1 h-4 w-4" />
              {t('generations.new_meeting')}
            </Button>
          </Link>
        </PageHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('generations.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <SkeletonList items={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('generations.empty_title')}
            description={items?.length ? t('generations.empty_search') : t('generations.empty_desc')}
          >
            {!items?.length && (
              <Link to="/app/ai-planner" className="inline-block mt-4">
                <Button>
                  <Sparkles className="mr-1 h-4 w-4" />
                  {t('generations.create_meeting')}
                </Button>
              </Link>
            )}
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any) => (
              <Link
                key={item.id}
                to={`/app/content-library/${item.id}`}
                className="block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{item.title}</h3>
                      <Badge className={`text-[10px] ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>
                        {STATUS_MAP[item.status as keyof typeof STATUS_MAP]?.label || item.status}
                      </Badge>
                    </div>
                    {item.theme && <p className="text-sm text-muted-foreground truncate">{item.theme}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.createdAt, currentLocale)}
                      </span>
                      {item.estimatedTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tc('library.minutes', { count: item.estimatedTime })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
