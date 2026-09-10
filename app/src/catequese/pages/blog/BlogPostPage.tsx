import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, getPublishedBlogPost } from "wasp/client/operations";
import { ArrowLeft } from "lucide-react";
import { PublicNavbar } from "../../PublicNavbar";
import { PublicFooter } from "../../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { EmptyState } from "../../../client/components/EmptyState";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { useLocale } from "../../../i18n/useLocale";
import { formatDate } from "../../../i18n/format";
import { buildBlogImageUrl, type BlogCategory } from "../../../shared/blog";
import { buildBlogJsonLd, sanitizeBlogHtml } from "../../../shared/blogHtml";
import { applyBlogPostDocumentMeta } from "../../../shared/blogMeta";
import { SITE_ORIGIN } from "../../../shared/landingMeta";

type PublicBlogPost = {
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  coverImageKey: string | null;
  category: BlogCategory;
  publishedAt: string | Date | null;
  updatedAt: string | Date;
  seoTitle: string | null;
  seoDescription: string | null;
  locale: string;
  author: { name: string };
};

function origin(): string {
  return String(SITE_ORIGIN || "https://catechis.app").replace(/\/$/, "");
}

export default function BlogPostPage() {
  const { t } = useTranslation("blog");
  const { t: tNav } = useTranslation("publicNav");
  const { currentLocale } = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { data, isLoading, error } = useQuery(
    getPublishedBlogPost,
    { slug },
    { enabled: Boolean(slug) },
  );
  const post = data as PublicBlogPost | undefined;

  useEffect(() => {
    if (!post) return;
    applyBlogPostDocumentMeta({
      title: post.seoTitle || `${post.title} | Catequese Viva`,
      description: post.seoDescription || post.excerpt,
      path: `/blog/${post.slug}`,
      imageKey: post.coverImageKey,
    });
  }, [post]);

  const jsonLd = post
    ? buildBlogJsonLd({
        title: post.title,
        excerpt: post.excerpt,
        bodyHtml: post.bodyHtml,
        url: `${origin()}/blog/${post.slug}`,
        canonicalUrl: `${origin()}/blog/${post.slug}`,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        authorName: post.author?.name || "Catequese Viva",
        imageUrl: post.coverImageKey
          ? `${origin()}${buildBlogImageUrl(post.coverImageKey)}`
          : undefined,
        locale: post.locale,
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2 px-0">
          <Link to="/blog">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
          </div>
        ) : error || !post ? (
          <EmptyState
            title={t("not_found")}
            description={t("not_found_desc")}
          />
        ) : (
          <article>
            {jsonLd && (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd }}
              />
            )}
            <Badge variant="brand" size="sm">
              {t(`categories.${post.category}`)}
            </Badge>
            <AppDisplayTitle className="mt-4 text-4xl text-brand-ink sm:text-4xl">
              {post.title}
            </AppDisplayTitle>
            <AppGoldRule className="mt-4" />
            <p className="mt-4 text-sm text-muted-foreground">
              {post.author?.name}
              {post.publishedAt
                ? ` · ${formatDate(post.publishedAt, currentLocale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : ""}
            </p>
            {post.coverImageKey && (
              <img
                src={buildBlogImageUrl(post.coverImageKey)}
                alt=""
                className="mt-8 w-full rounded-sm object-cover"
              />
            )}
            <div
              className="prose prose-neutral mt-8 max-w-none prose-headings:text-brand-ink prose-a:text-brand-ink"
              dangerouslySetInnerHTML={{
                __html: sanitizeBlogHtml(post.bodyHtml),
              }}
            />
            <div className="mt-12 rounded-sm border border-brand-ink/10 bg-brand-paper p-6">
              <p className="font-semibold text-brand-ink">{t("cta_title")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("cta_text")}
              </p>
              <Button asChild className="mt-4">
                <Link to="/signup">{tNav("cta")}</Link>
              </Button>
            </div>
          </article>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
