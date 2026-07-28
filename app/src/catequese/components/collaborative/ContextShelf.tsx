import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollaborative } from "./CollaborativeContext";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Badge } from "../../../client/components/ui/badge";
import { Card } from "../../../client/components/ui/card";
import {
  AppEyebrow,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Search, X, BookOpen, Church, ScrollText, Loader2 } from "lucide-react";
import { searchBible, searchCatechism } from "wasp/client/operations";

const TYPE_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof BookOpen; color: string }
> = {
  BIBLE_REF: {
    labelKey: "context.bible",
    icon: BookOpen,
    color: "bg-[#D39A2B]/15 text-[#8A6418]",
  },
  CATECHISM_REF: {
    labelKey: "context.catechism",
    icon: Church,
    color: "bg-[#071A2D]/08 text-[#071A2D]",
  },
  DIRECTORY_REF: {
    labelKey: "context.directory",
    icon: ScrollText,
    color: "bg-muted/40 text-[#071A2D]",
  },
  TEXT: {
    labelKey: "context.text",
    icon: ScrollText,
    color: "bg-muted/40 text-[#071A2D]",
  },
};

export function ContextShelf() {
  const { t } = useTranslation("collaborative");
  const { attachments, addAttachment, removeAttachment, contentItem } =
    useCollaborative();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<"bible" | "catechism">("bible");

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    try {
      if (searchType === "bible") {
        const res = await searchBible({ query: query.trim() });
        setResults((res as any[]) || []);
      } else {
        const res = await searchCatechism({ query: query.trim() });
        setResults((res as any[]) || []);
      }
    } catch {
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (result: any) => {
    if (searchType === "bible") {
      const title = `${result.book?.name || ""} ${
        result.chapter?.number || ""
      }:${result.number || ""}`;
      await addAttachment("BIBLE_REF", title, result.text || "", undefined);
    } else {
      await addAttachment(
        "CATECHISM_REF",
        `CIC §${result.number}`,
        `${result.question || ""}\n${result.answer || ""}`,
        undefined,
      );
    }
    setResults([]);
    setQuery("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border/70 bg-muted/20 p-3">
        <div className="space-y-1.5">
          <AppEyebrow>
            {t("context.title", { defaultValue: "Referências" })}
          </AppEyebrow>
          <AppGoldRule className="w-6" />
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={searchType === "bible" ? "default" : "outline"}
            onClick={() => setSearchType("bible")}
            className="text-xs h-7"
          >
            <BookOpen className="h-3 w-3 mr-1" /> {t("context.bible")}
          </Button>
          <Button
            size="sm"
            variant={searchType === "catechism" ? "default" : "outline"}
            onClick={() => setSearchType("catechism")}
            className="text-xs h-7"
          >
            <Church className="h-3 w-3 mr-1" /> {t("context.catechism")}
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder={
              searchType === "bible"
                ? t("context.search_bible")
                : t("context.search_catechism")
            }
            aria-label={
              searchType === "bible"
                ? t("context.search_bible")
                : t("context.search_catechism")
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 text-xs"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSearch}
            disabled={searching}
            className="h-8 w-8"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="border-b max-h-[200px] overflow-y-auto">
          {results.slice(0, 10).map((r: any, i: number) => (
            <button
              key={i}
              onClick={() => handleAdd(r)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b last:border-b-0 transition-colors"
            >
              {searchType === "bible" ? (
                <>
                  <span className="font-semibold tracking-tight text-[#071A2D]">
                    {r.book?.name} {r.chapter?.number}:{r.number}
                  </span>{" "}
                  —{" "}
                  <span className="text-muted-foreground line-clamp-2">
                    {r.text?.slice(0, 120)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold tracking-tight text-[#071A2D]">
                    CIC §{r.number}
                  </span>{" "}
                  —{" "}
                  <span className="text-muted-foreground line-clamp-2">
                    {r.question?.slice(0, 120)}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {attachments.length === 0 && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {t("context.empty")}
          </p>
        )}

        {attachments.map((att) => {
          const config = TYPE_CONFIG[att.type] || TYPE_CONFIG.TEXT;
          return (
            <Card
              key={att.id}
              className="rounded-sm border-border/70 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge
                      className={`text-overline px-1.5 py-0 h-5 ${config.color}`}
                    >
                      <config.icon className="h-3 w-3 mr-0.5" />
                      {t(config.labelKey)}
                    </Badge>
                  </div>
                  <p
                    className="truncate text-xs font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {att.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3 whitespace-pre-wrap">
                    {att.payload?.slice(0, 200)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeAttachment(att.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
