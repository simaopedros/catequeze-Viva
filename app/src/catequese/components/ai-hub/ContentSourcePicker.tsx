import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, listContentItems } from 'wasp/client/operations';
import { Card } from '../../../client/components/ui/card';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';
import { Sparkles, Search, FileText, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router';

interface ContentSourcePickerProps {
  mode: string;
  onSelect: (contentId: string, contentTitle: string, contentTheme?: string) => void;
}

export function ContentSourcePicker({ mode, onSelect }: ContentSourcePickerProps) {
  const { t } = useTranslation('ai');
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading } = useQuery(listContentItems);

  const filtered = search.trim()
    ? items.filter((item: any) =>
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.theme?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const modeLabelKey =
    mode === 'generate-activity' ? 'hub.existing_activity' :
    mode === 'generate-whatsapp' ? 'hub.existing_whatsapp' :
    'hub.existing_improve';

  return (
    <div className="flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{t(modeLabelKey)}</h1>
          <p className="text-muted-foreground">{t('hub.pick_content')}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('hub.search_content_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('hub.no_content_found')}</p>
            <Button variant="outline" size="sm" asChild className="mt-3 gap-2">
              <Link to="/app/ai-hub?mode=create-meeting">
                <Sparkles className="h-4 w-4" />
                {t('hub.create_new')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map((item: any) => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id, item.title || '', item.theme || '')}
                className="w-full text-left"
              >
                <Card className="p-4 transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{item.title || t('planner.untitled')}</h3>
                      {item.theme && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.theme}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {item.updatedAt && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                        {item.isAiGenerated && (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <Sparkles className="h-3 w-3" /> IA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
