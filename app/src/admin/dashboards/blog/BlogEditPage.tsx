import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getBlogPostAdmin,
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  archiveBlogPost,
} from "wasp/client/operations";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Textarea } from "../../../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Badge } from "../../../client/components/ui/badge";
import { BlogBodyEditor } from "./BlogBodyEditor";
import { uploadBlogImage } from "../../../client/utils/blogImageUpload";
import {
  BLOG_CATEGORIES,
  BLOG_EXCERPT_MAX,
  BLOG_TITLE_MAX,
  buildBlogImageUrl,
  buildBlogPostPath,
  slugifyBlogTitle,
  type BlogCategory,
  type BlogPostStatus,
} from "../../../shared/blog";

type AdminBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  coverImageKey: string | null;
  category: BlogCategory;
  tags: string[];
  locale: string;
  status: BlogPostStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | Date | null;
};

const BlogEditPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = params.id || "";
  const { data, isLoading, error, refetch } = useQuery(
    getBlogPostAdmin,
    { id },
    { enabled: Boolean(id) },
  );
  const post = data as AdminBlogPost | undefined;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [category, setCategory] = useState<BlogCategory>("FORMATION");
  const [tags, setTags] = useState("");
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || "");
    setBodyHtml(post.bodyHtml || "");
    setCategory(post.category);
    setTags((post.tags || []).join(", "));
    setCoverKey(post.coverImageKey);
    setSeoTitle(post.seoTitle || "");
    setSeoDescription(post.seoDescription || "");
    setSlugTouched(post.slug !== slugifyBlogTitle(post.title));
  }, [post]);

  const persist = async (extra?: { keepMessage?: boolean }) => {
    if (!id) return false;
    setSaving(true);
    setFormError("");
    if (!extra?.keepMessage) setMessage("");
    try {
      await updateBlogPost({
        id,
        title: title.trim() || t("pages.blog.untitled"),
        slug: slug.trim() || undefined,
        excerpt,
        bodyHtml,
        category,
        tags: tags.split(","),
        coverImageKey: coverKey,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      });
      await refetch();
      setMessage(t("pages.blog.saved"));
      return true;
    } catch (err: any) {
      setFormError(err?.message || t("pages.blog.save_error"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setFormError("");
    try {
      const saved = await persist({ keepMessage: true });
      if (!saved) return;
      await publishBlogPost({ id });
      await refetch();
      setMessage(t("pages.blog.published"));
    } catch (err: any) {
      setFormError(err?.message || t("pages.blog.publish_error"));
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    setFormError("");
    try {
      await unpublishBlogPost({ id });
      await refetch();
      setMessage(t("pages.blog.unpublished"));
    } catch (err: any) {
      setFormError(err?.message || t("pages.blog.save_error"));
    } finally {
      setPublishing(false);
    }
  };

  const handleArchive = async () => {
    setPublishing(true);
    try {
      await archiveBlogPost({ id });
      navigate("/admin/blog");
    } catch (err: any) {
      setFormError(err?.message || t("pages.blog.save_error"));
      setPublishing(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-fit gap-2 px-0"
            >
              <Link to="/admin/blog">
                <ArrowLeft className="h-4 w-4" />
                {t("pages.blog.back")}
              </Link>
            </Button>
            <AppPageHeader
              eyebrow={t("pages.admin")}
              title={t("pages.blog.edit_title")}
              subtitle={t("pages.blog.editor_subtitle")}
            />
          </div>
          {post && (
            <Badge
              variant={
                post.status === "PUBLISHED"
                  ? "success"
                  : post.status === "ARCHIVED"
                    ? "secondary"
                    : "warning"
              }
            >
              {t(`pages.blog.status.${post.status}`)}
            </Badge>
          )}
        </div>

        {error && !data ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : isLoading || !post ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-ink border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="blog-title">
                  {t("pages.blog.field_title")}
                </Label>
                <Input
                  id="blog-title"
                  value={title}
                  maxLength={BLOG_TITLE_MAX}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTitle(next);
                    if (!slugTouched) setSlug(slugifyBlogTitle(next));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-slug">{t("pages.blog.field_slug")}</Label>
                <Input
                  id="blog-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-excerpt">
                  {t("pages.blog.field_excerpt")}
                </Label>
                <Textarea
                  id="blog-excerpt"
                  value={excerpt}
                  maxLength={BLOG_EXCERPT_MAX}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("pages.blog.field_body")}</Label>
                <BlogBodyEditor
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  onImageUpload={async (file) => {
                    const uploaded = await uploadBlogImage(file, id);
                    return uploaded.url;
                  }}
                />
              </div>
            </div>

            <aside className="space-y-5">
              <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
                <div className="space-y-2">
                  <Label>{t("pages.blog.field_category")}</Label>
                  <Select
                    value={category}
                    onValueChange={(value) =>
                      setCategory(value as BlogCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {t(`pages.blog.categories.${item}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-tags">
                    {t("pages.blog.field_tags")}
                  </Label>
                  <Input
                    id="blog-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={t("pages.blog.tags_placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("pages.blog.field_cover")}</Label>
                  {coverKey && (
                    <img
                      src={buildBlogImageUrl(coverKey)}
                      alt=""
                      className="h-32 w-full rounded-sm object-cover"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      try {
                        const uploaded = await uploadBlogImage(file, id);
                        setCoverKey(uploaded.key);
                      } catch (err: any) {
                        setFormError(
                          err?.message || t("pages.blog.save_error"),
                        );
                      }
                    }}
                  />
                  {coverKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCoverKey(null)}
                    >
                      {t("pages.blog.remove_cover")}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-seo-title">
                    {t("pages.blog.field_seo_title")}
                  </Label>
                  <Input
                    id="blog-seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-seo-desc">
                    {t("pages.blog.field_seo_desc")}
                  </Label>
                  <Textarea
                    id="blog-seo-desc"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              {message && <p className="text-sm text-success">{message}</p>}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => void persist()}
                  disabled={saving || publishing}
                >
                  {saving ? t("pages.blog.saving") : t("pages.blog.save")}
                </Button>
                {post.status === "PUBLISHED" ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleUnpublish()}
                    disabled={saving || publishing}
                  >
                    {t("pages.blog.unpublish")}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => void handlePublish()}
                    disabled={saving || publishing}
                  >
                    {publishing
                      ? t("pages.blog.publishing")
                      : t("pages.blog.publish")}
                  </Button>
                )}
                {post.status === "PUBLISHED" && (
                  <Button asChild variant="ghost">
                    <a
                      href={buildBlogPostPath(post.slug)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("pages.blog.view_public")}
                    </a>
                  </Button>
                )}
                {post.status !== "ARCHIVED" && (
                  <Button
                    variant="ghost"
                    onClick={() => void handleArchive()}
                    disabled={saving || publishing}
                  >
                    {t("pages.blog.archive")}
                  </Button>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default BlogEditPage;
