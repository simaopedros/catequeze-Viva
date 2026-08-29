import { useTranslation } from "react-i18next";
import { Badge } from "../../../client/components/ui/badge";
import { cn } from "../../../client/utils";

export function SocialTopicPills({
  topics,
  activeSlug,
  onSelect,
}: {
  topics: { slug: string; name: string }[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const { t } = useTranslation("social");
  if (topics.length === 0) return null;

  return (
    <nav aria-label={t("composer.topics")} className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex gap-1.5">
        <li>
          <button type="button" onClick={() => onSelect(null)}>
            <Badge
              variant={activeSlug === null ? "default" : "outline"}
              className={cn("cursor-pointer whitespace-nowrap", activeSlug !== null && "hover:bg-muted")}
            >
              {t("feed.allTopics")}
            </Badge>
          </button>
        </li>
        {topics.map((topic) => (
          <li key={topic.slug}>
            <button type="button" onClick={() => onSelect(topic.slug)}>
              <Badge
                variant={activeSlug === topic.slug ? "default" : "outline"}
                className={cn(
                  "cursor-pointer whitespace-nowrap",
                  activeSlug !== topic.slug && "hover:bg-muted",
                )}
              >
                {topic.name}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
