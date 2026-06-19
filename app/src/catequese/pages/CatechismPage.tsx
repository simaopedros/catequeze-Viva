import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Search, BookOpen, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { listCatechismByCategory, searchCatechism, getCatechismEntry } from 'wasp/client/operations';
import { useLocale } from '../../i18n/useLocale';

const CATEGORY_KEYS = ['creed', 'sacraments', 'commandments', 'prayer', 'virtues', 'sin'] as const;

export default function CatechismPage() {
  const { t } = useTranslation('catechism');
  const { t: tCommon } = useTranslation('common');
  const { currentLocale } = useLocale();
  const [searchParams] = useSearchParams();

  const [entries, setEntries] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // URL-driven entry loading
  const urlEntryLoaded = useRef<string | null>(null);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const entryParam = searchParams.get('entry');
    if (!entryParam || entryParam === urlEntryLoaded.current) return;

    const entryNum = parseInt(entryParam);
    if (isNaN(entryNum)) return;

    urlEntryLoaded.current = entryParam;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const entry = await getCatechismEntry({ number: entryNum, locale: currentLocale });
        // Show it as a single result
        setEntries([]);
        setCategory('');
        setSearchResults([entry]);
        setExpanded({ [entry.id]: true });
        // Scroll into view after render
        setTimeout(() => {
          const el = entryRefs.current.get(entry.id);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } catch {
        setError(t('loadError'));
      }
      setLoading(false);
    })();
  }, [searchParams, currentLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategory = async (cat: string) => {
    setLoading(true);
    setCategory(cat);
    setSearchResults([]);
    setError('');
    urlEntryLoaded.current = null;
    try {
      setEntries((await listCatechismByCategory({ category: cat, locale: currentLocale })) || []);
    } catch (e) { setError(`${t('loadError')} ${tCommon('connection_error')}`); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setLoading(true);
    setCategory('');
    setEntries([]);
    setError('');
    urlEntryLoaded.current = null;
    try {
      setSearchResults((await searchCatechism({ query: searchQuery, locale: currentLocale })) || []);
    } catch (e) { setError(`${tCommon('search_error')} ${tCommon('connection_error')}`); }
    setLoading(false);
  };

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const displayEntries = searchResults.length > 0 ? searchResults : entries;

  return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{t('title')}</span>
        </div>

        <h1 className="text-2xl font-bold">{t('heading')}</h1>

        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder={t('searchPlaceholder')}
          />
          <Button size="sm" onClick={handleSearch} disabled={loading || searchQuery.length < 2}>
            <Search className="mr-1 h-4 w-4" />{t('searchButton')}
          </Button>
        </div>

        {searchResults.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => loadCategory(key)}
                className={'px-3 py-1.5 text-sm rounded-md transition-colors ' + (category === key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70')}
              >
                {t(`categories.${key}`)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => category ? loadCategory(category) : handleSearch()}>{tCommon('try_again')}</Button>
          </div>
        )}

        {!error && loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('resultsCount', { count: searchResults.length })}</p>
            {displayEntries.map((entry: any) => (
              <div
                key={entry.id}
                ref={(el) => {
                  if (el) entryRefs.current.set(entry.id, el);
                  else entryRefs.current.delete(entry.id);
                }}
                className="rounded-lg border"
              >
                <button
                  onClick={() => toggle(entry.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{entry.number}</span>
                      <p className="font-medium text-sm">{entry.question}</p>
                    </div>
                    {expanded[entry.id] && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{entry.answer}</p>
                    )}
                  </div>
                  {expanded[entry.id] ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('entriesInCategory', { count: entries.length, category: t(`categories.${category}`) })}</p>
            {entries.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border">
                <button
                  onClick={() => toggle(entry.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{entry.number}</span>
                      <p className="font-medium text-sm">{entry.question}</p>
                    </div>
                    {expanded[entry.id] && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{entry.answer}</p>
                    )}
                  </div>
                  {expanded[entry.id] ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        ) : category ? (
          <div className="text-center text-muted-foreground py-12">{t('noCategory')}</div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3"><BookOpen className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">{t('emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {t('emptyDesc')}
            </p>
          </div>
        )}
      </div>
  );
}
