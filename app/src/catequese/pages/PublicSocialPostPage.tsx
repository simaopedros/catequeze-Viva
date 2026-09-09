import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import {
  useQuery,
  getSocialPost,
  getSocialPublishAccess,
} from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { EmptyState } from "../../client/components/EmptyState";
import { SocialPostCard } from "../components/social/SocialPostCard";
import {
  SocialAccessNotice,
  type SocialAccessReason,
} from "../components/social/SocialAccessNotice";

/**
 * Public permalink for a shared post. Crawlers hitting /c/:slug get
 * server-rendered Open Graph tags and are redirected here.
 */
export default function PublicSocialPostPage() {
  const { t } = useTranslation("social");
  const params = useParams<{ slug: string }>();
  const { data: user } = useAuth();
  const [showNotice, setShowNotice] = useState(false);

  const {
    data: post,
    isLoading,
    error,
  } = useQuery(getSocialPost, {
    slug: params.slug || "",
  });
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!post) return;
    const excerpt = post.body.replace(/\s+/g, " ").slice(0, 70);
    document.title = excerpt
      ? `${excerpt} · ${t("title")}`
      : `${t("title")} · Catequese Viva`;
  }, [post, t]);

  const canInteract = Boolean(
    access?.authenticated &&
      !access?.banned &&
      access?.plan !== "catechist_free",
  );

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
        <Link to="/comunidade">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("post.backToFeed")}
        </Link>
      </Button>

      {isLoading ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("feed.loading")}
        </p>
      ) : error || !post ? (
        <EmptyState
          title={t("post.notFound")}
          description={t("post.notFoundDescription")}
        />
      ) : (
        <>
          {showNotice && (
            <div className="mb-5">
              <SocialAccessNotice
                reason={
                  (user
                    ? access?.reason ?? "subscription"
                    : "anonymous") as SocialAccessReason
                }
              />
            </div>
          )}

          <SocialPostCard
            post={post as any}
            canInteract={canInteract}
            onRequireAccess={() => setShowNotice(true)}
            expandComments
            linkToDetail={false}
          />
        </>
      )}
    </main>
  );
}
