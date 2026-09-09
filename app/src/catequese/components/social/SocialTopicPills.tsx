import { useTranslation } from "react-i18next";
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
    <nav
      aria-label={t("composer.topics")}
      className="-mx-1 overflow-x-auto px-1"
    >
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              activeSlug === null
                ? "border-brand-ink bg-brand-ink text-white"
                : "border-[#e1e7ee] bg-white text-[#51657e] hover:border-[#bdcad7]",
            )}
          >
            {t("feed.allTopics")}
          </button>
        </li>
        {topics.map((topic) => {
          const active = activeSlug === topic.slug;
          return (
            <li key={topic.slug}>
              <button
                type="button"
                onClick={() => onSelect(topic.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-[#e1e7ee] bg-white text-[#51657e] hover:border-[#bdcad7]",
                )}
              >
                {topic.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
