import { useTranslation } from "react-i18next";
import { cn } from "../../../client/utils";

export type SocialFeedMode = "recent" | "trending" | "following";

export function SocialFeedTabs({
  mode,
  onChange,
  showFollowing,
}: {
  mode: SocialFeedMode;
  onChange: (mode: SocialFeedMode) => void;
  /** The "following" tab only makes sense for signed-in visitors. */
  showFollowing: boolean;
}) {
  const { t } = useTranslation("social");

  const tabs: { id: SocialFeedMode; label: string }[] = [
    { id: "recent", label: t("discovery.recent") },
    { id: "trending", label: t("discovery.trending") },
    ...(showFollowing
      ? [{ id: "following" as SocialFeedMode, label: t("discovery.followingFeed") }]
      : []),
  ];

  return (
    <div
      role="tablist"
      aria-label={t("title")}
      className="inline-flex rounded-full border border-border bg-muted/50 p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={mode === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            mode === tab.id
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
