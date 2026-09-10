import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  listBlogPostsAdmin,
  createBlogPost,
  archiveBlogPost,
} from "wasp/client/operations";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Newspaper, Plus } from "lucide-react";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { EmptyState } from "../../../client/components/EmptyState";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { formatDateTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import type { BlogPostStatus } from "../../../shared/blog";

type AdminBlogPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: BlogPostStatus;
  updatedAt: string | Date;
  publishedAt: string | Date | null;
};

function statusVariant(
  status: BlogPostStatus,
): "secondary" | "success" | "warning" {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "secondary";
  return "warning";
}

const BlogListPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(listBlogPostsAdmin);
  const posts = (data ?? []) as AdminBlogPost[];
  const [creating, setCreating] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleNew = async () => {
    setCreating(true);
    try {
      const post = await createBlogPost({ title: t("pages.blog.untitled") });
      navigate(`/admin/blog/${post.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    setArchiving(true);
    try {
      await archiveBlogPost({ id: archiveId });
      setArchiveId(null);
      await refetch();
    } finally {
      setArchiving(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <AppPageHeader
            eyebrow={t("pages.admin")}
            title={t("pages.blog.title")}
            subtitle={t("pages.blog.subtitle")}
          />
          <Button onClick={handleNew} disabled={creating} className="gap-2">
            <Plus className="h-4 w-4" />
            {creating ? t("pages.blog.creating") : t("pages.blog.new")}
          </Button>
        </div>

        {error && !data ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={t("pages.blog.empty_title")}
            description={t("pages.blog.empty_desc")}
          >
            <Button onClick={handleNew} disabled={creating} className="mt-4">
              {t("pages.blog.new")}
            </Button>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border/70 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {t("pages.blog.col_title")}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                    {t("pages.blog.col_category")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("pages.blog.col_status")}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    {t("pages.blog.col_updated")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("pages.blog.col_actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/blog/${post.id}`}
                        className="font-medium text-brand-ink hover:underline"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        /{post.slug}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {t(`pages.blog.categories.${post.category}`)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(post.status)} size="sm">
                        {t(`pages.blog.status.${post.status}`)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {formatDateTime(post.updatedAt, currentLocale)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/blog/${post.id}`}>
                            {t("pages.blog.edit")}
                          </Link>
                        </Button>
                        {post.status !== "ARCHIVED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setArchiveId(post.id)}
                          >
                            {t("pages.blog.archive")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(archiveId)}
        onOpenChange={(open) => {
          if (!open) setArchiveId(null);
        }}
        title={t("pages.blog.archive_title")}
        description={t("pages.blog.archive_desc")}
        confirmLabel={t("pages.blog.archive")}
        onConfirm={handleArchive}
        loading={archiving}
        variant="destructive"
      />
    </DefaultLayout>
  );
};

export default BlogListPage;
