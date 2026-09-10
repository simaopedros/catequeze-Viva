import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Feather,
  FileText,
  Landmark,
  Library,
} from "lucide-react";
import { cn } from "../../../client/utils";
import type { SocialShareKind } from "../../../shared/socialShare";
import { shareKindLabelKey } from "../../../shared/socialShare";

export interface SocialShareCard {
  kind: SocialShareKind;
  title: string;
  subtitle?: string | null;
  excerpt: string;
  href: string;
  sourceLabel?: string | null;
}

const KIND_ICON = {
  VERSE: BookOpen,
  CATECHISM: Landmark,
  DOCUMENT: FileText,
  AI_ARTIFACT: Feather,
  DIRECTORY: Library,
} as const;

export function SocialShareEmbed({
  share,
  compact = false,
}: {
  share: SocialShareCard;
  compact?: boolean;
}) {
  const { t } = useTranslation("social");
  const Icon = KIND_ICON[share.kind] ?? FileText;
  const label = t(shareKindLabelKey(share.kind), {
    defaultValue: share.sourceLabel || share.kind,
  });

  return (
    <Link
      to={share.href}
      className={cn(
        "mt-3 block min-w-0 overflow-hidden rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-brand-ink/30 hover:bg-muted/60",
        compact && "mt-0",
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 truncate font-semibold leading-tight text-brand-ink">
        {share.title}
      </p>
      {share.subtitle && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {share.subtitle}
        </p>
      )}
      {share.excerpt && (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed text-brand-ink/90",
            compact ? "line-clamp-3" : "line-clamp-5",
          )}
        >
          {share.excerpt}
        </p>
      )}
    </Link>
  );
}
