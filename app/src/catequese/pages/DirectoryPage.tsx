import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import {
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppPageHeader,
} from "../../client/components/brand/AppChrome";
import { SearchInput } from "../../client/components/SearchInput";
import {
  listDirectoryByPart,
  searchDirectory,
  getDirectoryEntry,
} from "wasp/client/operations";
import { useLocale } from "../../i18n/useLocale";
import { PastoralCompanion } from "../components/social/PastoralCompanion";
import { DirectoryEntryCard } from "../components/DirectoryEntryCard";

const PART_KEYS = ["I", "II", "III"] as const;

export default function DirectoryPage() {
  const { t } = useTranslation("common");
  const { currentLocale } = useLocale();
  const [searchParams] = useSearchParams();

  const [entries, setEntries] = useState<any[]>([]);
  const [part, setPart] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // URL-driven entry loading
  const urlEntryLoaded = useRef<string | null>(null);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const entryParam = searchParams.get("entry");
    if (!entryParam || entryParam === urlEntryLoaded.current) return;

    const entryNum = parseInt(entryParam);
    if (isNaN(entryNum)) return;

    urlEntryLoaded.current = entryParam;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const entry = await getDirectoryEntry({
          number: entryNum,
          locale: currentLocale,
        });
        setEntries([]);
        setPart("");
        setSearchResults([entry]);
        setExpanded({ [entry.id]: true });
        setTimeout(() => {
          const el = entryRefs.current.get(entry.id);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } catch {
        setError(t("directory.loadError"));
      }
      setLoading(false);
    })();
  }, [searchParams, currentLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPart = async (p: string) => {
    setLoading(true);
    setPart(p);
    setSearchResults([]);
    setError("");
    urlEntryLoaded.current = null;
    try {
      setEntries(
        (await listDirectoryByPart({ part: p, locale: currentLocale })) || [],
      );
    } catch (e) {
      setError(t("directory.loadError"));
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setLoading(true);
    setPart("");
    setEntries([]);
    setError("");
    urlEntryLoaded.current = null;
    try {
      setSearchResults(
        (await searchDirectory({
          query: searchQuery,
          locale: currentLocale,
        })) || [],
      );
    } catch (e) {
      setError(t("search_error"));
    }
    setLoading(false);
  };

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const displayEntries = searchResults.length > 0 ? searchResults : entries;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("directory.title")}
        title={t("directory.title")}
        subtitle={t("directory.subtitle")}
      />
      <PastoralCompanion surface="directory" />
      <div className="flex gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
          placeholder={t("directory.searchPlaceholder")}
          aria-label={t("directory.searchPlaceholder")}
        />
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={loading || searchQuery.length < 2}
        >
          <Search className="mr-1 h-4 w-4" />
          {t("directory.searchButton")}
        </Button>
      </div>

      {searchResults.length === 0 && entries.length === 0 && !part && (
        <div className="flex flex-wrap gap-2 pb-2">
          <p className="w-full text-overline text-muted-foreground mb-1">
            {t("directory.suggested_searches")}
          </p>
          {["Sacramentos", "Vocação", "Oração", "Moral", "Liturgia"].map(
            (topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSearchQuery(topic);
                  handleSearch();
                }}
                className="rounded-sm border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand-ink/30 hover:text-brand-ink"
              >
                {topic}
              </button>
            ),
          )}
        </div>
      )}

      {searchResults.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {PART_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => loadPart(key)}
              className={
                "px-3 py-1.5 text-sm rounded-sm transition-colors " +
                (part === key
                  ? "bg-brand-ink text-white"
                  : "bg-muted hover:bg-muted/70")
              }
            >
              {t(`directory.parts.${key}`)}
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
            onClick={() => (part ? loadPart(part) : handleSearch())}
          >
            {t("try_again")}
          </Button>
        </div>
      )}

      {!error && loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
        </div>
      ) : displayEntries.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {displayEntries.length} {t("directory.paragraphs")}
          </p>
          {displayEntries.map((entry: any) => (
            <DirectoryEntryCard
              key={entry.id}
              entry={entry}
              expanded={Boolean(expanded[entry.id])}
              onToggle={() => toggle(entry.id)}
              registerRef={(el) => {
                if (el) entryRefs.current.set(entry.id, el);
                else entryRefs.current.delete(entry.id);
              }}
            />
          ))}
        </div>
      ) : part ? (
        <div className="text-center text-muted-foreground py-12">
          {t("directory.noPart")}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
          <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-3">
            <BookOpen className="h-8 w-8 text-brand-ink" />
          </div>
          <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
            {t("directory.emptyTitle")}
          </AppDisplayTitle>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("directory.emptyDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
