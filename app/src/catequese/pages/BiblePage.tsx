import { useState } from 'react';
import { Book, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { AppShell } from '../AppShell';
import { useQuery, listBibleBooks, getBibleBook, getBibleChapter, searchBible } from 'wasp/client/operations';

const TESTAMENTS = { OT: 'Antigo Testamento', NT: 'Novo Testamento' } as Record<string, string>;

export default function BiblePage() {
  const { data: books = [] } = useQuery(listBibleBooks);
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
      const book = await getBibleBook({ id: bookId });
      setSelectedBook(book);
      setSelectedChapter(null);
      setChapterData(null);
    } catch (e) { setError('Não foi possível carregar o livro. Verifique sua conexão.'); }
  };

  const loadChapter = async (bookId: string, chapter: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await getBibleChapter({ bookId, chapter });
      setChapterData(data);
      setSelectedChapter(chapter);
    } catch (e) { setError('Não foi possível carregar o capítulo. Verifique sua conexão.'); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    setError('');
    try {
      setSearchResults((await searchBible({ query: searchQuery })) || []);
      setView('search');
    } catch (e) { setError('Não foi possível realizar a busca. Verifique sua conexão.'); }
    setSearching(false);
  };

  const otBooks = books.filter((b: any) => b.testament === 'OT');
  const ntBooks = books.filter((b: any) => b.testament === 'NT');

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>Bíblia Sagrada</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Bíblia Sagrada</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('browse')}
              className={'px-3 py-1.5 text-sm rounded-md ' + (view === 'browse' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
              Livros
            </button>
            <button
              onClick={() => setView('search')}
              className={'px-3 py-1.5 text-sm rounded-md ' + (view === 'search' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Ex: Gênesis 1, Gn 1:3, João 3:16, amor, Deus, luz..."  
          />
          <Button size="sm" onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
            <Search className="mr-1 h-4 w-4" />Buscar
          </Button>
        </div>

        {/* Search results */}
        {view === 'search' && searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{searchResults.length} resultado(s)</p>
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
            <p>Busque por livro e capítulo (ex: "Gênesis 1"), livro capítulo:versículo (ex: "Gn 1:3"), ou palavra-chave (ex: "amor", "luz", "Deus").</p>        
          </div>
        )}

        {/* Browse view */}
        {view === 'browse' && !selectedBook && (
          <div className="space-y-6">
            {/* OT */}
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">Antigo Testamento</h2>
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
            {/* NT */}
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">Novo Testamento</h2>
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

        {/* Book detail -> chapter selection */}
        {view === 'browse' && selectedBook && !selectedChapter && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBook(null); setChapterData(null); }}>
                <ChevronLeft className="h-4 w-4" />Livros
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

        {/* Chapter content */}
        {view === 'browse' && chapterData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedChapter(null); setChapterData(null); }}>
                <ChevronLeft className="h-4 w-4" />Capítulos
              </Button>
              <h2 className="font-semibold">{chapterData.book?.name} {selectedChapter}</h2>
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={() => loadChapter(selectedBook.id, selectedChapter || 1)}>Tentar novamente</Button>
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
            {/* Chapter navigation */}
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost" size="sm"
                disabled={selectedChapter <= 1}
                onClick={() => loadChapter(chapterData.book.id, selectedChapter - 1)}
              >
                <ChevronLeft className="h-4 w-4" />Anterior
              </Button>
              <span className="text-sm text-muted-foreground">{chapterData.book?.name} {selectedChapter}</span>
              <Button
                variant="ghost" size="sm"
                disabled={!selectedBook || selectedChapter >= (selectedBook.chapters?.length || 1)}
                onClick={() => loadChapter(chapterData.book.id, selectedChapter + 1)}
              >
                Próximo<ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
