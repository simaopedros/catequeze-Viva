import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Play } from "lucide-react";
import { useQuery, getSocialFeed } from "wasp/client/operations";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { Button } from "../../../client/components/ui/button";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";

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
    <AppPanel className="space-y-4" data-testid="rhema-preview-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <AppEyebrow>{ts("eyebrow")}</AppEyebrow>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-brand-ink">
            {t("rhema.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("rhema.subtitle")}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/app/comunidade">
            {t("rhema.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rhema.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post: any) => (
            <li key={post.id}>
              <Link
                to={`/comunidade/p/${post.slug}`}
                className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-2 hover:bg-muted/40"
              >
                <Play className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-brand-ink">
                    {post.author?.displayName}
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {post.body || ts("discovery.shorts")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppPanel>
  );
}
