import { useTranslation } from "react-i18next";
import { cn } from "../../../client/utils";

export type SocialFeedMode =
  | "foryou"
  | "shorts"
  | "recent"
  | "trending"
  | "following";

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
    { id: "foryou", label: t("discovery.foryou") },
    { id: "shorts", label: t("discovery.shorts") },
    { id: "recent", label: t("discovery.recent") },
    { id: "trending", label: t("discovery.trending") },
    ...(showFollowing
      ? [
          {
            id: "following" as SocialFeedMode,
            label: t("discovery.followingFeed"),
          },
        ]
      : []),
  ];

  return (
    <div
      role="tablist"
      aria-label={t("title")}
      className="flex gap-0.5 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={mode === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative shrink-0 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
            mode === tab.id
              ? "font-bold text-brand-ink after:absolute after:bottom-[-1px] after:left-2.5 after:right-2.5 after:h-0.5 after:bg-brand-gold"
              : "text-[#63758c] hover:text-brand-ink",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
