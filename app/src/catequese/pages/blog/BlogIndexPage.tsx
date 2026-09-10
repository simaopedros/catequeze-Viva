import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, listPublishedBlogPosts } from "wasp/client/operations";
import { Newspaper } from "lucide-react";
import { PublicNavbar } from "../../PublicNavbar";
import { PublicFooter } from "../../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { EmptyState } from "../../../client/components/EmptyState";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { Badge } from "../../../client/components/ui/badge";
import { useLocale } from "../../../i18n/useLocale";
import { formatDate } from "../../../i18n/format";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_SLUGS,
  buildBlogImageUrl,
  buildBlogPostPath,
  categoryFromPublicSlug,
  type BlogCategory,
} from "../../../shared/blog";
import { useRouteDocumentMeta } from "../../../landing-page/hooks/useRouteDocumentMeta";

type PublicBlogListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageKey: string | null;
  category: BlogCategory;
  publishedAt: string | Date | null;
  author: { name: string };
};

export default function BlogIndexPage() {
  const { t } = useTranslation("blog");
  const { currentLocale } = useLocale();
  const [params, setParams] = useSearchParams();
  useRouteDocumentMeta();

  const category = categoryFromPublicSlug(params.get("categoria"));
  const { data, isLoading, error, refetch } = useQuery(listPublishedBlogPosts, {
    category,
  });
  const items = ((data as any)?.items ?? []) as PublicBlogListItem[];

  const filters = useMemo(
    () =>
      BLOG_CATEGORIES.map((item) => ({
        id: item,
        slug: BLOG_CATEGORY_SLUGS[item],
        label: t(`categories.${item}`),
      })),
    [t],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold">
            {t("kicker")}
          </p>
          <AppDisplayTitle className="text-4xl text-brand-ink sm:text-4xl">
            {t("title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-lg text-muted-foreground">{t("intro")}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParams({})}
            className={`rounded-full border px-3 py-1 text-sm ${
              !category
                ? "border-brand-ink bg-brand-ink text-white"
                : "border-border text-muted-foreground hover:text-brand-ink"
            }`}
          >
            {t("all_categories")}
          </button>
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setParams({ categoria: filter.slug })}
              className={`rounded-full border px-3 py-1 text-sm ${
                category === filter.id
                  ? "border-brand-ink bg-brand-ink text-white"
                  : "border-border text-muted-foreground hover:text-brand-ink"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && !data ? (
          <div className="mt-10">
            <QueryErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-16">
            <EmptyState
              icon={Newspaper}
              title={t("empty_title")}
              description={t("empty_desc")}
            />
          </div>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {items.map((post) => (
              <li key={post.id}>
                <Link
                  to={buildBlogPostPath(post.slug)}
                  className="group flex h-full flex-col overflow-hidden rounded-sm border border-border/70 bg-white transition-colors hover:border-brand-ink/30"
                >
                  {post.coverImageKey && (
                    <img
                      src={buildBlogImageUrl(post.coverImageKey)}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <Badge variant="brand" size="sm" className="w-fit">
                      {t(`categories.${post.category}`)}
                    </Badge>
                    <h2 className="text-xl font-semibold text-brand-ink group-hover:underline">
                      {post.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">
                      {post.publishedAt
                        ? formatDate(post.publishedAt, currentLocale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : null}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
