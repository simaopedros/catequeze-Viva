import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ShareToCommunityButton } from "./social/ShareToCommunityButton";

export function DirectoryEntryCard({
  entry,
  expanded,
  onToggle,
  registerRef,
}: {
  entry: {
    id: string;
    number: number;
    title?: string | null;
    chapter?: string | null;
    content: string;
  };
  expanded: boolean;
  onToggle: () => void;
  registerRef?: (el: HTMLDivElement | null) => void;
}) {
  const { t: ts } = useTranslation("social");

  return (
    <div
      ref={registerRef}
      className="rounded-sm border border-border/70 bg-white"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-border/70 bg-muted/30 px-1.5 py-0.5 text-xs font-semibold tracking-tight text-brand-ink">
              §{entry.number}
            </span>
            {entry.title && (
              <span className="text-sm font-semibold tracking-tight text-brand-ink">
                {entry.title}
              </span>
            )}
            {entry.chapter && (
              <span className="text-xs text-muted-foreground">
                ({entry.chapter})
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded ? (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.content}
          </p>
          <ShareToCommunityButton
            draft={{ kind: "DIRECTORY", sourceId: entry.id }}
            body={ts("share.directoryBody", {
              number: entry.number,
              titleSuffix: entry.title ? ` — ${entry.title}` : "",
              content: entry.content,
            })}
            topic="formacao"
            source="directory"
          />
        </div>
      ) : null}
    </div>
  );
}
