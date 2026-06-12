import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X, BookOpen, Church, ChevronRight, Check, FileText } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { listBibleBooks, searchBible, searchCatechism, searchDirectory, getBibleChapter, getBibleBook, listCatechismByCategory, listDirectoryByPart } from 'wasp/client/operations';

interface VerseItem {
  id: string; number: number; text: string;
  chapter: { id: string; number: number; book: { id: string; name: string; abbreviation: string | null } };
}
interface CatechismItem {
  id: string; number: number; question: string; answer: string; category: string;
}

interface BibleRef { id?: string; verseId: string; label: string; text?: string; }
interface CatechismRef { id?: string; entryId: string; label: string; question?: string; answer?: string; }

interface DirectoryRef { id?: string; entryId: string; label: string; content?: string; }

interface Props {
  bibleRefs: BibleRef[];
  catechismRefs: CatechismRef[];
  directoryRefs: DirectoryRef[];
  onAddBible: (verseId: string, label: string, text: string) => void;
  onRemoveBible: (id: string) => void;
  onAddCatechism: (entryId: string, label: string, question: string) => void;   
  onRemoveCatechism: (id: string) => void;
  onAddDirectory: (entryId: string, label: string, content: string) => void;    
  onRemoveDirectory: (id: string) => void;
}


/** Group consecutive verses from the same chapter into ranges like "Gn 1:4-7" */
function groupBibleRefs(refs: BibleRef[]): { ids: string[]; label: string; text?: string }[] {
  const parsed = refs.map(r => {
    const m = r.label.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!m) return { ref: r, book: '', chapter: 0, verse: 0 };
    return { ref: r, book: m[1], chapter: parseInt(m[2]), verse: parseInt(m[3]) };
  });

  const groups: Map<string, typeof parsed> = new Map();
  for (const p of parsed) {
    const key = p.book + '|' + p.chapter;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result: { ids: string[]; label: string; text?: string }[] = [];
  for (const [, items] of groups) {
    items.sort((a, b) => a.verse - b.verse);
    let i = 0;
    while (i < items.length) {
      const start = items[i];
      let end = start;
      while (i + 1 < items.length && items[i + 1].verse === end.verse + 1) {    
        end = items[++i];
      }
      const ids = items.filter(x => x.verse >= start.verse && x.verse <= end.verse).map(x => x.ref.id || x.ref.verseId);
      if (start.verse === end.verse) {
        result.push({ ids: [start.ref.id || start.ref.verseId], label: start.ref.label, text: start.ref.text });
      } else {
        result.push({ ids, label: start.book + ' ' + start.chapter + ':' + start.verse + '-' + end.verse, text: start.ref.text });
      }
      i++;
    }
  }
  return result;
}

export function ReferencePicker({ bibleRefs, catechismRefs, directoryRefs, onAddBible, onRemoveBible, onAddCatechism, onRemoveCatechism, onAddDirectory, onRemoveDirectory }: Props) {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<'bible' | 'catechism' | 'directory'>('bible'); 
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Bible browse
  const [books, setBooks] = useState<any[]>([]);
  const [browseBook, setBrowseBook] = useState<any>(null);
  const [chapterVerses, setChapterVerses] = useState<any[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set()); 

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (tab === 'bible') {
      (async () => {
        try {
          setBooks((await listBibleBooks()) || []);
        } catch (e) { console.error(e); }
      })();
    }
  }, [tab]);

  // Autocomplete debounce
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setShowResults(false); return; }        
    setSearching(true);
    try {
      if (tab === 'bible') {
        const data = (await searchBible({ query: q, limit: 15 })) || [];
        setResults(data);
        setShowResults(data.length > 0);
      } else if (tab === 'catechism') {
        const data = (await searchCatechism({ query: q, limit: 15 })) || [];
        setResults(data);
        setShowResults(data.length > 0);
      } else {
        const data = (await searchDirectory({ query: q, limit: 15 })) || [];
        setResults(data);
        setShowResults(data.length > 0);
      }
    } catch (e) { console.error('Erro na busca:', e); }
    setSearching(false);
  }, [tab]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  };

  const handleBrowseChapter = async (bookId: string, chapterNum: number) => {   
    setSearching(true);
    try {
      const data = await getBibleChapter({ bookId, chapter: chapterNum });
      if (data?.verses) {
        const verses = data.verses.map((v: any) => ({ ...v, chapter: { id: data.id, number: data.number, book: data.book } }));
        setChapterVerses(verses);
        setResults(verses);
        setSelectedVerses(new Set());
        setSearched(true);
        setShowResults(true);
      }
    } catch (e) { console.error('Erro ao carregar capítulo:', e); }
    setSearching(false);
  };

  const loadBook = async (book: any) => {
    try {
      setBrowseBook(await getBibleBook({ id: book.id }));
    } catch (e) { console.error('Erro ao carregar livro:', e); }
  };

  const toggleVerseSelection = (verseId: string) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseId)) next.delete(verseId); else next.add(verseId);      
      return next;
    });
  };

  const selectAllVerses = () => {
    if (selectedVerses.size === chapterVerses.length) {
      setSelectedVerses(new Set());
    } else {
      setSelectedVerses(new Set(chapterVerses.map((v: any) => v.id)));
    }
  };

  const addSelectedVerses = () => {
    for (const v of chapterVerses) {
      if (selectedVerses.has(v.id) && !bibleRefs.some(r => r.verseId === v.id)) {
        const label = (v.chapter?.book?.abbreviation || v.chapter?.book?.name || '') + ' ' + v.chapter?.number + ':' + v.number;
        onAddBible(v.id, label, v.text);
      }
    }
    setSelectedVerses(new Set());
  };

  const isBibleAdded = (verseId: string) => bibleRefs.some(r => r.verseId === verseId);
  const isCatechismAdded = (entryId: string) => catechismRefs.some(r => r.entryId === entryId);

  const handleAddBibleSingle = (v: any) => {
    const label = (v.chapter?.book?.abbreviation || v.chapter?.book?.name || '') + ' ' + v.chapter?.number + ':' + v.number;
    onAddBible(v.id, label, v.text);
  };

  const handleAddCatechismSingle = (e: any) => {
    onAddCatechism(e.id, '§' + e.number, e.question);
  };

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ x: rect.left, y: rect.top - 8, text });
  };
  const hideTooltip = () => setTooltip(null);

  const otBooks = books.filter((b: any) => b.testament === 'OT');
  const ntBooks = books.filter((b: any) => b.testament === 'NT');
  const hasSelected = selectedVerses.size > 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-medium text-sm">{t('references.title')}</h3>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button onClick={() => { setTab('bible'); setQuery(''); setResults([]); setSearched(false); setShowResults(false); setBrowseBook(null); setChapterVerses([]); }}
          className={'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ' + (tab === 'bible' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <BookOpen className="h-3.5 w-3.5" />{t('bible.title')}
        </button>
        <button onClick={() => { setTab('catechism'); setQuery(''); setResults([]); setSearched(false); setShowResults(false); }}
          className={'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ' + (tab === 'catechism' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>      
          <Church className="h-3.5 w-3.5" />{t('catechism.title')}
        </button>
        <button onClick={() => { setTab('directory'); setQuery(''); setResults([]); setSearched(false); setShowResults(false); }}
          className={'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ' + (tab === 'directory' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>      
          <FileText className="h-3.5 w-3.5" />{t('directory.title')}
        </button>
      </div>

      {/* Search with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}   
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
            placeholder={tab === 'bible' ? t('bible.searchPlaceholder') : tab === 'catechism' ? t('catechism.searchPlaceholder') : t('directory.searchPlaceholder')}
          />
          {searching && <div className="absolute right-10 top-1.5"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
        </div>

        {/* Autocomplete dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto border rounded-md bg-background shadow-lg">
            {tab === 'bible' && (
              <>
                {chapterVerses.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-muted/30 border-b">
                    <button onClick={selectAllVerses} className="text-[10px] text-primary hover:underline">
                      {selectedVerses.size === chapterVerses.length ? t('references.deselect_all') : t('references.select_all')}
                    </button>
                    {hasSelected && (
                      <Button size="sm" className="h-6 text-[10px]" onClick={addSelectedVerses}>
                        <Plus className="h-3 w-3 mr-0.5" />{selectedVerses.size} {t('references.verses')}
                      </Button>
                    )}
                  </div>
                )}
                {results.map((v: VerseItem) => (
                  <div key={v.id}
                    className="flex items-start gap-2 px-2 py-1.5 hover:bg-muted/50 text-xs cursor-pointer"
                    onClick={() => {
                      if (chapterVerses.length > 0) toggleVerseSelection(v.id); 
                      else if (!isBibleAdded(v.id)) handleAddBibleSingle(v);    
                    }}>
                    {chapterVerses.length > 0 && (
                      <div className={'mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ' + (selectedVerses.has(v.id) ? 'bg-primary border-primary' : 'border-input')}
                        onClick={e => { e.stopPropagation(); toggleVerseSelection(v.id); }}>
                        {selectedVerses.has(v.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-primary">{v.chapter?.book?.abbreviation || v.chapter?.book?.name} {v.chapter?.number}:{v.number}</span> 
                      <span className="text-muted-foreground ml-1 line-clamp-1 break-all">— {v.text}</span>
                    </div>
                    {chapterVerses.length === 0 && !isBibleAdded(v.id) && (     
                      <Plus className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    {isBibleAdded(v.id) && <span className="text-green-600 text-[10px] flex-shrink-0 mt-0.5">✓</span>}
                  </div>
                ))}
              </>
            )}
            {(tab === 'catechism' || tab === 'directory') && results.map((e: any) => (
              tab === 'directory' ? (
                <div key={e.id} className="flex items-start justify-between gap-2 px-2 py-1.5 hover:bg-muted/50 rounded text-xs"
                  onClick={() => { if (!directoryRefs.some(r => r.entryId === e.id)) onAddDirectory(e.id, '§'+e.number, e.content); }}>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-primary">§{e.number}</span>
                    {e.title && <span className="text-muted-foreground ml-1 truncate">— {e.title}</span>}
                  </div>
                  {directoryRefs.some(r => r.entryId === e.id) ? (
                    <span className="text-green-600 text-[10px] font-medium flex-shrink-0">✓</span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-primary flex-shrink-0" /> 
                  )}
                </div>
              ) : null
            ))}
            {tab === 'catechism' && results.map((e: CatechismItem) => (
              <div key={e.id} className="flex items-start justify-between gap-2 px-2 py-1.5 hover:bg-muted/50 rounded text-xs"
                onClick={() => { if (!isCatechismAdded(e.id)) handleAddCatechismSingle(e); }}>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-primary">§{e.number}</span> 
                  <span className="text-muted-foreground ml-1 truncate">— {e.question}</span>
                </div>
                {isCatechismAdded(e.id) ? (
                  <span className="text-green-600 text-[10px] font-medium flex-shrink-0">✓</span>
                ) : (
                  <Plus className="h-3.5 w-3.5 text-primary flex-shrink-0" />   
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bible browse tree */}
      {tab === 'bible' && !searched && !browseBook && (
        <div className="max-h-48 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-1 mb-1">{t('bible.browse_hint')}</p>
          <div className="text-[10px] font-semibold text-muted-foreground px-1 pt-1">{t('bible.old_testament')}</div>
          {otBooks.map((b: any) => (
            <button key={b.id} onClick={() => loadBook(b)}
              className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted/50 flex justify-between items-center">
              <span>{b.name} <span className="text-muted-foreground">({b.abbreviation})</span></span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />        
            </button>
          ))}
          <div className="text-[10px] font-semibold text-muted-foreground px-1 pt-2">{t('bible.new_testament')}</div>
          {ntBooks.map((b: any) => (
            <button key={b.id} onClick={() => loadBook(b)}
              className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted/50 flex justify-between items-center">
              <span>{b.name} <span className="text-muted-foreground">({b.abbreviation})</span></span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />        
            </button>
          ))}
        </div>
      )}

      {/* Bible chapter picker */}
      {tab === 'bible' && browseBook && !searched && (
        <div className="max-h-48 overflow-y-auto">
          <button onClick={() => setBrowseBook(null)} className="text-xs text-primary hover:underline mb-1">{t('bible.back_to_books')}</button>
          <p className="text-[10px] font-semibold text-muted-foreground">{browseBook.name} — {t('bible.chapters')}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {browseBook.chapters?.map((ch: any) => (
              <button key={ch.id} onClick={() => handleBrowseChapter(browseBook.id, ch.number)}
                className="px-2 py-1 text-xs rounded border hover:bg-primary/10 transition-colors">
                {ch.number}
            </button>
            )
          )}
        </div>
        </div>
      )}

      {/* Catechism browse */}
      {tab === 'catechism' && !searched && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground px-1">{t('catechism.explore_by_category')}</p>
          {[
            { cat: 'creed', label: t('catechism.category_creed') },
            { cat: 'sacraments', label: t('catechism.category_sacraments') },
            { cat: 'commandments', label: t('catechism.category_commandments') },
            { cat: 'prayer', label: t('catechism.category_prayer') },
          ].map(({ cat, label }) => (
            <button key={cat}
              onClick={async () => {
                setSearching(true); setSearched(true);
                try {
                  const data = (await listCatechismByCategory({ category: cat })) || [];
                  setResults(data); setShowResults(true);
                } catch (e) { console.error(e); }
                setSearching(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50">
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Directory browse */}
      {tab === 'directory' && !searched && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground px-1">{t('references.explore_by_part')}</p>
          {[
            { part: 'I' },
            { part: 'II' },
            { part: 'III' },
            { part: 'IV' },
            { part: 'V' },
          ].map(({ part }) => {
            const label = t('directory.parts.' + part);
            return (
            <button key={part}
              onClick={async () => {
                setSearching(true); setSearched(true);
                try {
                  const data = (await listDirectoryByPart({ part })) || [];
                  setResults(data); setShowResults(true);
                } catch (e) { console.error(e); }
                setSearching(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50">
              {label}
            </button>
            );
          })}
        </div>
      )}

      {/* Selected references */}
      {(bibleRefs.length > 0 || catechismRefs.length > 0 || directoryRefs.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          {groupBibleRefs(bibleRefs).map((g, i) => (
            <span key={i}
              onMouseEnter={e => showTooltip(e, g.text || g.label)}
              onMouseLeave={hideTooltip}
              className="relative inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] pl-2 pr-1 py-1 rounded-full cursor-default group">
              {g.label}
              <button onClick={() => g.ids.forEach(id => onRemoveBible(id))}
                className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {catechismRefs.map((r, i) => (
            <span key={r.id || i}
              onMouseEnter={e => showTooltip(e, (r.question || '') + '\n\n' + (r.answer || ''))}
              onMouseLeave={hideTooltip}
              className="relative inline-flex items-center gap-1 bg-secondary/10 text-secondary text-[11px] pl-2 pr-1 py-1 rounded-full cursor-default group">
              {r.label}
              <button onClick={() => onRemoveCatechism(r.id || r.entryId)}
                className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {directoryRefs.map((r, i) => (
            <span key={r.id || i}
              onMouseEnter={e => showTooltip(e, r.content || r.label)}
              onMouseLeave={hideTooltip}
              className="relative inline-flex items-center gap-1 bg-green-50 text-green-700 text-[11px] pl-2 pr-1 py-1 rounded-full cursor-default group">      
              📋 {r.label}
              <button onClick={() => onRemoveDirectory(r.id || r.entryId)}      
                className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-[100] max-w-xs p-2 bg-foreground text-background text-[11px] rounded-md shadow-lg pointer-events-none whitespace-pre-wrap leading-relaxed"
          style={{ left: tooltip.x + 'px', bottom: (window.innerHeight - tooltip.y) + 'px' }}>
          {tooltip.text.slice(0, 300)}{tooltip.text.length > 300 ? '...' : ''}  
        </div>
      )}
    </div>
  );
}
