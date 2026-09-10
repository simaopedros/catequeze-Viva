import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  BookOpen,
  List,
  Bookmark,
  Copy,
  Type,
  BookOpenCheck,
  Clock,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { FilterPills } from "../../client/components/FilterPills";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { SearchInput } from "../../client/components/SearchInput";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../client/components/ui/sheet";
import {
  useQuery,
  listBibleBooks,
  getBibleBook,
  getBibleChapter,
  searchBible,
} from "wasp/client/operations";
import { useLocale } from "../../i18n/useLocale";
import { toast } from "../../client/hooks/use-toast";

// ── localStorage helpers ──

interface RecentEntry {
  bookId: string;
  bookName: string;
  chapter: number;
  timestamp: number;
}

const RECENTS_KEY = "cv-bible-recents";
const FAVORITES_KEY = "cv-bible-favorites";
const FONT_SIZE_KEY = "cv-bible-font-size";

function loadRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecents(entries: RecentEntry[]) {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(entries.slice(0, 10)));
}

function addRecent(entry: RecentEntry) {
  const recents = loadRecents().filter(
    (r) => !(r.bookId === entry.bookId && r.chapter === entry.chapter),
  );
  recents.unshift(entry);
  saveRecents(recents);
}

function loadFavorites(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function toggleFavoriteKey(key: string, label: string): boolean {
  const favs = loadFavorites();
  if (favs[key]) {
    delete favs[key];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return false;
  } else {
    favs[key] = label;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return true;
  }
}

function loadFontSize(): "sm" | "md" | "lg" {
  const v = localStorage.getItem(FONT_SIZE_KEY);
  if (v === "sm" || v === "md" || v === "lg") return v;
  return "md";
}

function saveFontSize(size: "sm" | "md" | "lg") {
  localStorage.setItem(FONT_SIZE_KEY, size);
}

const FONT_SIZE_CLASS: Record<string, string> = {
  sm: "text-sm leading-relaxed",
  md: "text-base leading-relaxed",
  lg: "text-lg leading-relaxed",
};

const FONT_SIZE_NEXT: Record<string, "sm" | "md" | "lg"> = {
  sm: "md",
  md: "lg",
  lg: "sm",
};

const SEARCH_SUGGESTIONS: Record<string, string[]> = {
  "pt-BR": ["Jo 3:16", "Gn 1", "amor", "fé"],
  en: ["Jn 3:16", "Gn 1", "love", "faith"],
  es: ["Jn 3:16", "Gn 1", "amor", "fe"],
};

export default function BiblePage() {
  const { t } = useTranslation("bible");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const {
    data: books = [],
    error: booksError,
    refetch: refetchBooks,
  } = useQuery(listBibleBooks, {
    locale: currentLocale,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState<"read" | "search">("read");
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Highlighted verse
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Book filter + mobile sheet
  const [bookFilter, setBookFilter] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Font size
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">(loadFontSize);

  // Favorites (reactive)
  const [favorites, setFavorites] =
    useState<Record<string, string>>(loadFavorites);

  // Recents (reactive)
  const [recents, setRecents] = useState<RecentEntry[]>(loadRecents);

  // Track last processed URL state to avoid re-processing same params
  const lastProcessed = useRef<{
    book?: string | null;
    chapter?: string | null;
    verse?: string | null;
    ref?: string | null;
  }>({});

  const otBooks = books.filter((b: any) => b.testament === "OT");
  const ntBooks = books.filter((b: any) => b.testament === "NT");

  const filterBooks = (list: any[]) => {
    if (!bookFilter.trim()) return list;
    const q = bookFilter.toLowerCase();
    return list.filter(
      (b: any) =>
        b.name.toLowerCase().includes(q) ||
        (b.abbreviation && b.abbreviation.toLowerCase().includes(q)),
    );
  };

  const filteredOt = filterBooks(otBooks);
  const filteredNt = filterBooks(ntBooks);

  // ── URL sync helpers ──

  const updateUrl = useCallback(
    (bookId?: string, chapter?: number, verse?: number | null) => {
      const next = new URLSearchParams(searchParams);
      if (bookId) {
        next.set("book", bookId);
      } else {
        next.delete("book");
        next.delete("chapter");
        next.delete("verse");
      }
      if (chapter !== undefined && chapter !== null) {
        next.set("chapter", String(chapter));
      } else {
        next.delete("chapter");
        next.delete("verse");
      }
      if (verse !== undefined && verse !== null) {
        next.set("verse", String(verse));
      } else if (chapter === undefined || chapter === null) {
        next.delete("verse");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Scroll to highlighted verse
  useEffect(() => {
    if (highlightedVerse !== null && verseRefs.current.has(highlightedVerse)) {
      const timer = setTimeout(() => {
        const el = verseRefs.current.get(highlightedVerse);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [highlightedVerse, chapterData]);

  // ── URL-driven navigation: react to searchParams changes ──
  useEffect(() => {
    if (books.length === 0) return;

    const bookId = searchParams.get("book");
    const chapterStr = searchParams.get("chapter");
    const verseStr = searchParams.get("verse");
    const refParam = searchParams.get("ref");

    // Skip if params haven't changed since last processing
    if (
      lastProcessed.current.book === bookId &&
      lastProcessed.current.chapter === chapterStr &&
      lastProcessed.current.verse === verseStr &&
      lastProcessed.current.ref === refParam
    ) {
      return;
    }

    lastProcessed.current = {
      book: bookId,
      chapter: chapterStr,
      verse: verseStr,
      ref: refParam,
    };

    // Handle ref param (legacy: "João 3:16") — parse and redirect to canonical params
    if (refParam && !bookId) {
      const refMatch = refParam.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if (refMatch) {
        const [, bookPart, refChapter, refVerse] = refMatch;
        const matchingBook = books.find(
          (b: any) =>
            b.name.toLowerCase() === bookPart.toLowerCase() ||
            b.abbreviation?.toLowerCase() === bookPart.toLowerCase(),
        );
        if (matchingBook) {
          const next = new URLSearchParams();
          next.set("book", matchingBook.id);
          next.set("chapter", refChapter);
          if (refVerse) next.set("verse", refVerse);
          setSearchParams(next, { replace: true });
          return;
        }
      }
      // Can't parse ref — clear it
      const next = new URLSearchParams(searchParams);
      next.delete("ref");
      setSearchParams(next, { replace: true });
      return;
    }

    if (!bookId) return;

    const chapter = chapterStr ? parseInt(chapterStr) : null;
    const verse = verseStr ? parseInt(verseStr) : null;

    // Skip if already showing this book/chapter/verse
    if (
      selectedBook?.id === bookId &&
      selectedChapter === chapter &&
      highlightedVerse === verse
    ) {
      return;
    }

    (async () => {
      try {
        const book = await getBibleBook({ id: bookId, locale: currentLocale });
        setSelectedBook(book);
        if (
          chapter &&
          book.chapters?.some((ch: any) => ch.number === chapter)
        ) {
          const data = await getBibleChapter({
            bookId,
            chapter,
            locale: currentLocale,
          });
          setChapterData(data);
          setSelectedChapter(chapter);
          if (verse) {
            setHighlightedVerse(verse);
          } else {
            setHighlightedVerse(null);
          }
        } else {
          setSelectedChapter(null);
          setChapterData(null);
          setHighlightedVerse(null);
        }
      } catch {
        updateUrl();
      }
    })();
  }, [searchParams, books]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Font size cycle ──

  const cycleFontSize = () => {
    const next = FONT_SIZE_NEXT[fontSize];
    setFontSize(next);
    saveFontSize(next);
  };

  // ── Copy reference ──

  const copyReference = () => {
    const bookName = chapterData?.book?.name || selectedBook?.name;
    if (!bookName || selectedChapter === null) return;
    const ref = `${bookName} ${selectedChapter}`;
    navigator.clipboard.writeText(ref).then(() => {
      toast({ description: t("reference_copied") });
    });
  };

  // ── Toggle favorite ──

  const toggleVerseFavorite = (verseNum: number) => {
    const bookName = chapterData?.book?.name || selectedBook?.name;
    if (!bookName || selectedChapter === null) return;
    const key = `${chapterData?.book?.id}:${selectedChapter}:${verseNum}`;
    const label = `${bookName} ${selectedChapter}:${verseNum}`;
    const added = toggleFavoriteKey(key, label);
    setFavorites(loadFavorites());
    toast({
      description: added ? "Favorito adicionado" : "Favorito removido",
    });
  };

  // ── Actions ──

  const loadBook = async (bookId: string) => {
    setError("");
    setHighlightedVerse(null);
    try {
      const book = await getBibleBook({ id: bookId, locale: currentLocale });
      setSelectedBook(book);
      setSelectedChapter(null);
      setChapterData(null);
      updateUrl(bookId);
      setMobileNavOpen(false);
    } catch {
      setError(t("load_book_error"));
    }
  };

  const loadChapter = async (bookId: string, chapter: number) => {
    setLoading(true);
    setError("");
    setHighlightedVerse(null);
    try {
      const data = await getBibleChapter({
        bookId,
        chapter,
        locale: currentLocale,
      });
      setChapterData(data);
      setSelectedChapter(chapter);
      updateUrl(bookId, chapter);

      // Add to recents
      const entry: RecentEntry = {
        bookId,
        bookName: data.book?.name || selectedBook?.name || "",
        chapter,
        timestamp: Date.now(),
      };
      addRecent(entry);
      setRecents(loadRecents());
    } catch {
      setError(t("load_chapter_error"));
    }
    setLoading(false);
  };

  const goToBooks = () => {
    setSelectedBook(null);
    setChapterData(null);
    setSelectedChapter(null);
    setHighlightedVerse(null);
    updateUrl();
  };

  const goToChapters = () => {
    setSelectedChapter(null);
    setChapterData(null);
    setHighlightedVerse(null);
    if (selectedBook) {
      updateUrl(selectedBook.id);
    }
  };

  const handleSearch = async (query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (!q || q.length < 2) return;
    setSearching(true);
    setError("");
    setHasSearched(true);
    try {
      const results =
        (await searchBible({ query: q, locale: currentLocale })) || [];
      setSearchResults(results);
    } catch {
      setError(t("search_error"));
    }
    setSearching(false);
  };

  const openSearchResult = async (result: any) => {
    const bookId = result.chapter?.book?.id;
    const chapterNum = result.chapter?.number;
    const verseNum = result.number;
    if (!bookId || !chapterNum) return;

    setMode("read");
    setSearchQuery("");

    try {
      const book = await getBibleBook({ id: bookId, locale: currentLocale });
      setSelectedBook(book);
      const data = await getBibleChapter({
        bookId,
        chapter: chapterNum,
        locale: currentLocale,
      });
      setChapterData(data);
      setSelectedChapter(chapterNum);
      setHighlightedVerse(verseNum);
      updateUrl(bookId, chapterNum, verseNum);

      // Add to recents
      addRecent({
        bookId,
        bookName: data.book?.name || book.name,
        chapter: chapterNum,
        timestamp: Date.now(),
      });
      setRecents(loadRecents());
    } catch {
      setError(t("load_chapter_error"));
    }
  };

  const suggestions =
    SEARCH_SUGGESTIONS[currentLocale] || SEARCH_SUGGESTIONS["pt-BR"];

  const breadcrumbTrail = [t("title")];
  if (selectedBook) {
    breadcrumbTrail.push(selectedBook.name);
    if (selectedChapter !== null) {
      breadcrumbTrail.push(`${t("chapter")} ${selectedChapter}`);
    }
  }

  // Group favorites for display
  const favoriteEntries = useMemo(() => {
    return Object.entries(favorites).map(([key, label]) => {
      const parts = key.split(":");
      const bookId = parts[0];
      const chapter = parseInt(parts[1]);
      const verse = parts[2] ? parseInt(parts[2]) : null;
      return { key, label, bookId, chapter, verse };
    });
  }, [favorites]);

  // ── Sidebar sections (recents + favorites) when no book selected ──
  const userSections = (
    <>
      {recents.length > 0 && (
        <div>
          <h2 className="font-semibold text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {t("recent")}
          </h2>
          <div className="space-y-0.5">
            {recents.slice(0, 5).map((r) => (
              <button
                key={`${r.bookId}-${r.chapter}`}
                onClick={() => {
                  loadBook(r.bookId).then(() =>
                    loadChapter(r.bookId, r.chapter),
                  );
                }}
                className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted transition-colors flex items-center gap-2"
              >
                <BookOpenCheck className="h-3.5 w-3.5 text-brand-ink flex-shrink-0" />
                <span className="truncate">
                  {r.bookName} {r.chapter}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {favoriteEntries.length > 0 && (
        <div>
          <h2 className="font-semibold text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="h-3 w-3" />
            {t("favorites")}
          </h2>
          <div className="space-y-0.5">
            {favoriteEntries.slice(0, 10).map((f) => (
              <button
                key={f.key}
                onClick={async () => {
                  await loadBook(f.bookId);
                  await loadChapter(f.bookId, f.chapter);
                  if (f.verse) setHighlightedVerse(f.verse);
                }}
                className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Bookmark className="h-3.5 w-3.5 text-brand-gold flex-shrink-0 fill-brand-gold" />
                <span className="truncate">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recents.length === 0 && favoriteEntries.length === 0 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={bookFilter}
              onChange={(e) => setBookFilter(e.target.value)}
              placeholder={t("book_filter")}
              aria-label={t("book_filter")}
              className="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs"
            />
          </div>
        </div>
      )}
    </>
  );

  // ── Shared sidebar content ──
  const sidebarContent = (
    <>
      {!selectedBook && booksError && books.length === 0 && (
        <QueryErrorState compact error={booksError} onRetry={refetchBooks} />
      )}

      {/* No book selected: recents + favorites + testament grids */}
      {!selectedBook && (
        <div className="space-y-5">
          {userSections}

          {(recents.length > 0 || favoriteEntries.length > 0) && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                placeholder={t("book_filter")}
                aria-label={t("book_filter")}
                className="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs"
              />
            </div>
          )}

          {filteredOt.length > 0 && (
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("old_testament")}
              </h2>
              <div className="grid grid-cols-2 gap-1">
                {filteredOt.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => loadBook(b.id)}
                    className="truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    title={b.name}
                  >
                    <span className="font-semibold tracking-tight text-brand-ink">
                      {b.name}
                    </span>
                    {b.abbreviation && b.abbreviation !== b.name && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {b.abbreviation}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNt.length > 0 && (
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("new_testament")}
              </h2>
              <div className="grid grid-cols-2 gap-1">
                {filteredNt.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => loadBook(b.id)}
                    className="truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    title={b.name}
                  >
                    <span className="font-semibold tracking-tight text-brand-ink">
                      {b.name}
                    </span>
                    {b.abbreviation && b.abbreviation !== b.name && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        {b.abbreviation}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredOt.length === 0 && filteredNt.length === 0 && bookFilter && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {tc("no_results")}
            </p>
          )}
        </div>
      )}

      {/* Book selected, no chapter */}
      {selectedBook && selectedChapter === null && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={goToBooks}>
            <ChevronLeft className="h-4 w-4" />
            {t("books")}
          </Button>
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {selectedBook.name}
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
            {selectedBook.chapters?.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => loadChapter(selectedBook.id, ch.number)}
                className="rounded-sm border border-border/70 px-2 py-2 text-center text-sm transition-colors hover:border-brand-ink/30 hover:bg-muted/20"
              >
                {ch.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chapter loaded: show chapter navigation */}
      {selectedBook && selectedChapter !== null && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={goToChapters}>
            <ChevronLeft className="h-4 w-4" />
            {t("chapters")}
          </Button>
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {chapterData?.book?.name || selectedBook.name}
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
            {selectedBook.chapters?.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => loadChapter(selectedBook.id, ch.number)}
                className={`rounded-sm border px-2 py-2 text-center text-sm transition-colors ${
                  ch.number === selectedChapter
                    ? "border-brand-ink bg-muted/30 font-semibold tracking-tight text-brand-ink"
                    : "text-muted-foreground hover:border-brand-ink/30 hover:bg-muted/20 hover:text-brand-ink"
                }`}
              >
                {ch.number}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={
          breadcrumbTrail.length > 1 ? breadcrumbTrail.join(" · ") : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-sm"
              onClick={cycleFontSize}
              title={`${t("font_size")}: ${fontSize}`}
            >
              <Type className="h-4 w-4" />
            </Button>

            {selectedChapter !== null && chapterData && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-sm"
                onClick={copyReference}
                title={t("copy_reference")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}

            {mode === "read" && selectedChapter !== null && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-sm lg:hidden"
                  >
                    <List className="h-4 w-4" />
                    <span className="ml-1.5">{t("chapters")}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("title")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{sidebarContent}</div>
                </SheetContent>
              </Sheet>
            )}

            <FilterPills
              options={[
                { value: "read", label: t("read") },
                { value: "search", label: t("search") },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v as "read" | "search");
                setError("");
              }}
            />
          </div>
        }
      />

      {/* ── SEARCH MODE ── */}
      {mode === "search" && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("search_placeholder")}
              containerClassName="max-w-none flex-1"
            />
            <Button
              onClick={() => handleSearch()}
              disabled={searching || searchQuery.trim().length < 2}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">{t("search")}</span>
            </Button>
          </div>

          {!hasSearched && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSearchQuery(s);
                    handleSearch(s);
                  }}
                  className="rounded-sm border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand-ink/30 hover:text-brand-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSearch()}
              >
                {tc("try_again")}
              </Button>
            </div>
          )}

          {hasSearched && !error && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("results_count", { count: searchResults.length })}
              </p>
              {searchResults.map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => openSearchResult(v)}
                  className="group w-full rounded-sm border border-border/70 p-3 text-left text-sm transition-colors hover:border-brand-ink/30 hover:bg-muted/20"
                >
                  <p className="mb-1 text-xs font-semibold tracking-tight text-brand-ink group-hover:underline">
                    {v.chapter?.book?.name} {v.chapter?.number}:{v.number}
                  </p>
                  <p className="line-clamp-3">{v.text}</p>
                </button>
              ))}
            </div>
          )}

          {hasSearched &&
            !error &&
            !searching &&
            searchResults.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Search className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p>{t("no_search_results", { query: searchQuery })}</p>
              </div>
            )}

          {!hasSearched && (
            <div className="text-center text-muted-foreground py-12">
              <Search className="mx-auto h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm max-w-sm mx-auto">
                {t("empty_search_hint")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── READ MODE ── */}
      {mode === "read" && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              {sidebarContent}
            </div>
          </div>

          {/* Mobile: inline navigation when no chapter loaded */}
          <div className="lg:hidden">{!selectedChapter && sidebarContent}</div>

          {/* Main content */}
          <div className="flex-1 min-w-0 lg:border-l lg:pl-6">
            {/* No book selected */}
            {!selectedBook && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-4">
                <BookOpen className="h-12 w-12 opacity-20" />
                <p className="text-sm font-semibold tracking-tight text-brand-ink">
                  {t("choose_book")}
                </p>
                <p className="text-xs max-w-xs">{t("choose_book_hint")}</p>

                {/* Continue reading CTA */}
                {recents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const last = recents[0];
                      loadBook(last.bookId).then(() =>
                        loadChapter(last.bookId, last.chapter),
                      );
                    }}
                  >
                    <BookOpenCheck className="h-4 w-4" />
                    <span className="ml-1.5">
                      {t("continue_reading")}: {recents[0].bookName}{" "}
                      {recents[0].chapter}
                    </span>
                  </Button>
                )}

                {/* Quick start suggestions */}
                {recents.length === 0 && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {["Gênesis", "Salmos", "Mateus", "João", "Atos"].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() =>
                            loadBook(
                              books.find((b: any) => b.name === suggestion)
                                ?.id || "",
                            )
                          }
                          className="rounded-sm border border-border/70 bg-muted/30 px-3 py-1 text-xs transition-colors hover:border-brand-ink/30 hover:text-brand-ink"
                        >
                          {suggestion}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Book selected, no chapter */}
            {selectedBook && selectedChapter === null && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-semibold tracking-tight text-brand-ink">
                  {t("choose_chapter", { book: selectedBook.name })}
                </p>
              </div>
            )}

            {/* Chapter loading */}
            {selectedChapter !== null && loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
              </div>
            )}

            {/* Chapter error */}
            {selectedChapter !== null && !loading && error && (
              <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadChapter(selectedBook.id, selectedChapter!)}
                >
                  {tc("try_again")}
                </Button>
              </div>
            )}

            {/* Chapter content */}
            {selectedChapter !== null && !loading && !error && chapterData && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {chapterData.verses?.map((v: any) => {
                    const favKey = `${chapterData.book?.id}:${selectedChapter}:${v.number}`;
                    const isFav = !!favorites[favKey];

                    return (
                      <div
                        key={v.id}
                        ref={(el) => {
                          if (el) verseRefs.current.set(v.number, el);
                          else verseRefs.current.delete(v.number);
                        }}
                        className={`group flex gap-3 py-1 px-2 -mx-2 rounded transition-colors ${
                          highlightedVerse === v.number
                            ? "bg-brand-gold/15 ring-1 ring-brand-gold/40"
                            : ""
                        }`}
                      >
                        <span className="text-brand-ink font-medium text-xs w-6 text-right flex-shrink-0 mt-0.5">
                          {v.number}
                        </span>
                        <p className={`flex-1 ${FONT_SIZE_CLASS[fontSize]}`}>
                          {v.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleVerseFavorite(v.number)}
                          className={`flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isFav ? "opacity-100" : ""
                          }`}
                          title={
                            isFav ? "Remover favorito" : "Adicionar favorito"
                          }
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              isFav
                                ? "text-brand-gold fill-brand-gold"
                                : "text-muted-foreground hover:text-brand-gold"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selectedChapter <= 1}
                    onClick={() =>
                      loadChapter(chapterData.book.id, selectedChapter - 1)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("previous")}
                  </Button>
                  <span
                    className={`text-muted-foreground self-center ${FONT_SIZE_CLASS[fontSize]}`}
                  >
                    {chapterData.book?.name} {selectedChapter}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      !selectedBook ||
                      selectedChapter >= (selectedBook.chapters?.length || 1)
                    }
                    onClick={() =>
                      loadChapter(chapterData.book.id, selectedChapter + 1)
                    }
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
