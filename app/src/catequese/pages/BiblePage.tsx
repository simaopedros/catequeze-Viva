import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { FilterPills } from '../../client/components/FilterPills';
import { AppShell } from '../AppShell';
import { useQuery, listBibleBooks, getBibleBook, getBibleChapter, searchBible } from 'wasp/client/operations';
import { useLocale } from '../../i18n/useLocale';

export default function BiblePage() {
  const { t } = useTranslation('bible');
  const { t: tc } = useTranslation('common');
  const { currentLocale } = useLocale();
  const { data: books = [] } = useQuery(listBibleBooks, { locale: currentLocale });
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<'browse' | 'search'>('browse');
  const [error, setError] = useState('');

  const loadBook = async (bookId: string) => {
    setError('');
    try {
      const book = await getBibleBook({ id: bookId, locale: currentLocale });
      setSelectedBook(book);
      setSelectedChapter(null);
      setChapterData(null);
    } catch { setError(t('load_book_error')); }
  };

  const loadChapter = async (bookId: string, chapter: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await getBibleChapter({ bookId, chapter, locale: currentLocale });
      setChapterData(data);
      setSelectedChapter(chapter);
    } catch { setError(t('load_chapter_error')); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    setError('');
    try {
      setSearchResults((await searchBible({ query: searchQuery, locale: currentLocale })) || []);
      setView('search');
    } catch { setError(t('search_error')); }
    setSearching(false);
  };

  const otBooks = books.filter((b: any) => b.testament === 'OT');
  const ntBooks = books.filter((b: any) => b.testament === 'NT');

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{t('title')}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <FilterPills
            options={[
              { value: 'browse', label: t('books') },
              { value: 'search', label: t('search') },
            ]}
            value={view}
            onChange={v => setView(v as 'browse' | 'search')}
          />
        </div>

        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder={t('search_placeholder')}
          />
          <Button size="sm" onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
            <Search className="mr-1 h-4 w-4" />{t('search')}
          </Button>
        </div>

        {view === 'search' && searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('results_count', { count: searchResults.length })}</p>
            {searchResults.map((v: any) => (
              <div key={v.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium text-xs text-primary mb-1">
                  {v.chapter?.book?.name} {v.chapter?.number}:{v.number}
                </p>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        )}

        {view === 'search' && searchResults.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Search className="mx-auto h-8 w-8 mb-2" />
            <p>{t('empty_search_hint')}</p>
          </div>
        )}

        {view === 'browse' && !selectedBook && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">{t('old_testament')}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                {otBooks.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => loadBook(b.id)}
                    className="text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors truncate"
                  >
                    {b.abbreviation || b.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">{t('new_testament')}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                {ntBooks.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => loadBook(b.id)}
                    className="text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors truncate"
                  >
                    {b.abbreviation || b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'browse' && selectedBook && !selectedChapter && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBook(null); setChapterData(null); }}>
                <ChevronLeft className="h-4 w-4" />{t('books')}
              </Button>
              <h2 className="font-semibold">{selectedBook.name}</h2>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1">
              {selectedBook.chapters?.map((ch: any) => (
                <button
                  key={ch.id}
                  onClick={() => loadChapter(selectedBook.id, ch.number)}
                  className="px-2 py-1.5 text-sm rounded border hover:bg-primary/10 transition-colors text-center"
                >
                  {ch.number}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'browse' && chapterData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedChapter(null); setChapterData(null); }}>
                <ChevronLeft className="h-4 w-4" />{t('chapters')}
              </Button>
              <h2 className="font-semibold">{chapterData.book?.name} {selectedChapter}</h2>
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={() => loadChapter(selectedBook.id, selectedChapter || 1)}>{tc('try_again')}</Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                {chapterData.verses?.map((v: any) => (
                  <div key={v.id} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-primary font-medium text-xs w-6 text-right flex-shrink-0">{v.number}</span>
                    <p>{v.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost" size="sm"
                disabled={selectedChapter <= 1}
                onClick={() => loadChapter(chapterData.book.id, selectedChapter - 1)}
              >
                <ChevronLeft className="h-4 w-4" />{t('previous')}
              </Button>
              <span className="text-sm text-muted-foreground">{chapterData.book?.name} {selectedChapter}</span>
              <Button
                variant="ghost" size="sm"
                disabled={!selectedBook || selectedChapter >= (selectedBook.chapters?.length || 1)}
                onClick={() => loadChapter(chapterData.book.id, selectedChapter + 1)}
              >
                {t('next')}<ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
