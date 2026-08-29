import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import { useQuery, getSocialFeed } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { EmptyState } from "../../../client/components/EmptyState";
import { SocialPostCard, type SocialPostItem } from "./SocialPostCard";

/**
 * Infinite feed shared by the authenticated page and the public pages.
 * The query works for anonymous visitors — `canInteract` only gates writes.
 */
export function SocialFeed({
  topicSlug,
  authorId,
  canInteract,
  onRequireAccess,
  reloadToken = 0,
}: {
  topicSlug?: string | null;
  authorId?: string | null;
  canInteract: boolean;
  onRequireAccess?: () => void;
  /** Bump to reload the feed from the first page (e.g. after publishing). */
  reloadToken?: number;
}) {
  const { t } = useTranslation("social");
  const [pages, setPages] = useState<SocialPostItem[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);

  const { data, isLoading, isFetching } = useQuery(getSocialFeed, {
    cursor,
    topicSlug: topicSlug ?? null,
    authorId: authorId ?? null,
  });

  useEffect(() => {
    setPages([]);
    setCursor(null);
    setNextCursor(null);
    setRemoved([]);
  }, [topicSlug, authorId, reloadToken]);

  useEffect(() => {
    if (!data) return;
    setPages((current) => {
      // First page replaces the list; later pages append.
      if (!cursor) return [data.items as SocialPostItem[]];
      return [...current, data.items as SocialPostItem[]];
    });
    setNextCursor(data.nextCursor ?? null);
  }, [data, cursor]);

  const posts = pages
    .flat()
    .filter((post, index, all) => all.findIndex((item) => item.id === post.id) === index)
    .filter((post) => !removed.includes(post.id));

  if (isLoading && posts.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("feed.loading")}
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={topicSlug ? t("feed.emptyTopic") : t("feed.empty")}
        description={t("feed.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <SocialPostCard
          key={post.id}
          post={post}
          canInteract={canInteract}
          onRequireAccess={onRequireAccess}
          onDeleted={(postId) => setRemoved((current) => [...current, postId])}
        />
      ))}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setCursor(nextCursor)}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("feed.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
