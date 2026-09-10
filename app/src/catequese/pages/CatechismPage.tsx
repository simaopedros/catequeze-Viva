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
import {
  listCatechismByCategory,
  searchCatechism,
  getCatechismEntry,
} from "wasp/client/operations";
import { useLocale } from "../../i18n/useLocale";
import { PastoralCompanion } from "../components/social/PastoralCompanion";
import { CatechismEntryCard } from "../components/CatechismEntryCard";

const CATEGORY_KEYS = [
  "creed",
  "sacraments",
  "commandments",
  "prayer",
  "virtues",
  "sin",
] as const;

export default function CatechismPage() {
  const { t } = useTranslation("catechism");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLocale();
  const [searchParams] = useSearchParams();

  const [entries, setEntries] = useState<any[]>([]);
  const [category, setCategory] = useState("");
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
        const entry = await getCatechismEntry({
          number: entryNum,
          locale: currentLocale,
        });
        // Show it as a single result
        setEntries([]);
        setCategory("");
        setSearchResults([entry]);
        setExpanded({ [entry.id]: true });
        // Scroll into view after render
        setTimeout(() => {
          const el = entryRefs.current.get(entry.id);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } catch {
        setError(t("loadError"));
      }
      setLoading(false);
    })();
  }, [searchParams, currentLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategory = async (cat: string) => {
    setLoading(true);
    setCategory(cat);
    setSearchResults([]);
    setError("");
    urlEntryLoaded.current = null;
    try {
      setEntries(
        (await listCatechismByCategory({
          category: cat,
          locale: currentLocale,
        })) || [],
      );
    } catch (e) {
      setError(`${t("loadError")} ${tCommon("connection_error")}`);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setLoading(true);
    setCategory("");
    setEntries([]);
    setError("");
    urlEntryLoaded.current = null;
    try {
      setSearchResults(
        (await searchCatechism({
          query: searchQuery,
          locale: currentLocale,
        })) || [],
      );
    } catch (e) {
      setError(`${tCommon("search_error")} ${tCommon("connection_error")}`);
    }
    setLoading(false);
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const displayEntries = searchResults.length > 0 ? searchResults : entries;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("heading")}
        subtitle={t("subtitle", {
          defaultValue:
            "Consulte o Catecismo da Igreja Católica por categoria ou pesquisa.",
        })}
        actions={
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex h-10 w-48 rounded-sm border border-input bg-background px-3 text-sm sm:w-64"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
            />
            <Button
              size="sm"
              className="h-10 rounded-sm"
              onClick={handleSearch}
              disabled={loading || searchQuery.length < 2}
            >
              <Search className="mr-1 h-4 w-4" />
              {t("searchButton")}
            </Button>
          </div>
        }
      />

      <PastoralCompanion surface="catechism" />

      {searchResults.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => loadCategory(key)}
              className={
                "px-3 py-1.5 text-sm rounded-sm transition-colors " +
                (category === key
                  ? "bg-brand-ink text-white"
                  : "bg-muted hover:bg-muted/70")
              }
            >
              {t(`categories.${key}`)}
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
            onClick={() => (category ? loadCategory(category) : handleSearch())}
          >
            {tCommon("try_again")}
          </Button>
        </div>
      )}

      {!error && loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("resultsCount", { count: searchResults.length })}
          </p>
          {displayEntries.map((entry: any) => (
            <CatechismEntryCard
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
      ) : entries.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("entriesInCategory", {
              count: entries.length,
              category: t(`categories.${category}`),
            })}
          </p>
          {entries.map((entry: any) => (
            <CatechismEntryCard
              key={entry.id}
              entry={entry}
              expanded={Boolean(expanded[entry.id])}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </div>
      ) : category ? (
        <div className="text-center text-muted-foreground py-12">
          {t("noCategory")}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
          <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-3">
            <BookOpen className="h-8 w-8 text-brand-ink" />
          </div>
          <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
            {t("emptyTitle")}
          </AppDisplayTitle>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("emptyDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
