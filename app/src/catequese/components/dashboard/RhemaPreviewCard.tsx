import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useQuery, getSocialFeed } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import { SocialAvatar } from "../social/SocialAvatar";
import { splitSocialHeadline } from "../social/socialAppearance";

export function RhemaPreviewCard() {
  const { t } = useTranslation("dashboard");
  const { t: ts } = useTranslation("social");
  const { data } = useQuery(
    getSocialFeed,
    { limit: 3, sort: "recent" },
    { enabled: SOCIAL_FEATURES_ENABLED },
  );

  if (!SOCIAL_FEATURES_ENABLED) return null;

  const posts = data?.items ?? [];

  return (
    <section
      className="overflow-hidden rounded-[14px] border border-brand-ink/10 shadow-[0_3px_16px_rgba(18,46,76,0.07)]"
      data-testid="rhema-preview-card"
    >
      <div
        className="flex items-start justify-between gap-3 px-4 py-4 text-white sm:px-5"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,26,45,0.98) 0%, rgba(7,26,45,0.88) 55%, rgba(32,50,70,0.92) 100%)",
        }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-[0.09em] text-brand-gold">
            {ts("eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            {t("rhema.title")}
          </h2>
          <p className="mt-1 text-sm text-white/80">{t("rhema.subtitle")}</p>
        </div>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="shrink-0 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <Link to="/app/comunidade">
            {t("rhema.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="bg-white px-4 py-3 sm:px-5">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("rhema.empty")}</p>
        ) : (
          <ul className="space-y-1">
            {posts.map((post: any) => {
              const headline = splitSocialHeadline(post.body || "");
              return (
                <li key={post.id}>
                  <Link
                    to={`/comunidade/p/${post.slug}`}
                    className="flex items-start gap-3 rounded-md px-1 py-2 hover:bg-muted/40"
                  >
                    <SocialAvatar
                      name={post.author?.displayName || ts("title")}
                      url={post.author?.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-brand-ink">
                        {headline.title ||
                          post.author?.displayName ||
                          ts("title")}
                      </span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {headline.rest || ts("discovery.shorts")}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
