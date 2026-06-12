import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, BookOpen, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { AppShell } from '../AppShell';
import { listDirectoryByPart, searchDirectory } from 'wasp/client/operations';

const PART_KEYS = ['I', 'II', 'III'] as const;

export default function DirectoryPage() {
  const { t } = useTranslation('common');
  const [entries, setEntries] = useState<any[]>([]);
  const [part, setPart] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadPart = async (p: string) => {
    setLoading(true);
    setPart(p);
    setSearchResults([]);
    setError('');
    try {
      setEntries((await listDirectoryByPart({ part: p })) || []);
    } catch (e) { setError(t('directory.loadError')); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setLoading(true);
    setPart('');
    setEntries([]);
    setError('');
    try {
      setSearchResults((await searchDirectory({ query: searchQuery })) || []);
    } catch (e) { setError(t('search_error')); }
    setLoading(false);
  };

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const displayEntries = searchResults.length > 0 ? searchResults : entries;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{t('directory.title')}</span>
        </div>
        <h1 className="text-2xl font-bold">{t('directory.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('directory.subtitle')}</p>

        {/* Search */}
        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder={t('directory.searchPlaceholder')}
          />
          <Button size="sm" onClick={handleSearch} disabled={loading || searchQuery.length < 2}>
            <Search className="mr-1 h-4 w-4" />{t('directory.searchButton')}
          </Button>
        </div>

        {/* Parts */}
        {searchResults.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {PART_KEYS.map((key) => (
              <button key={key} onClick={() => loadPart(key)}
                className={'px-3 py-1.5 text-sm rounded-md transition-colors ' + (part === key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70')}>
                {t(`directory.parts.${key}`)}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => part ? loadPart(part) : handleSearch()}>{t('try_again')}</Button>
          </div>
        )}

        {/* Results */}
        {!error && loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : displayEntries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{displayEntries.length} {t('directory.paragraphs')}</p>
            {displayEntries.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border">
                <button onClick={() => toggle(entry.id)} className="w-full text-left p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">§{entry.number}</span>
                      {entry.title && <span className="font-medium text-sm">{entry.title}</span>}
                      {entry.chapter && <span className="text-xs text-muted-foreground">({entry.chapter})</span>}
                    </div>
                    {expanded[entry.id] && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{entry.content}</p>
                    )}
                  </div>
                  {expanded[entry.id] ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        ) : part ? (
          <div className="text-center text-muted-foreground py-12">{t('directory.noPart')}</div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3"><BookOpen className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">{t('directory.emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {t('directory.emptyDesc')}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
