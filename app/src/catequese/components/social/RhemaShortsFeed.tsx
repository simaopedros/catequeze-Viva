import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  HandHeart,
  HeartHandshake,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  useQuery,
  getSocialFeed,
  getSocialFollowState,
  recordSocialWatch,
  toggleSocialReaction,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { EmptyState } from "../../../client/components/EmptyState";
import { toast } from "../../../client/hooks/use-toast";
import { cn } from "../../../client/utils";
import {
  SOCIAL_REACTION_TYPES,
  type SocialReactionType,
} from "../../../shared/socialConstants";
import { SocialFollowButton } from "./SocialFollowButton";
import { SocialShareButton } from "./SocialShareButton";
import { SocialCommentThread } from "./SocialCommentThread";
import type { SocialPostItem } from "./SocialPostCard";
import { isPlayableSocialVideo } from "./SocialMediaGallery";

const REACTION_ICONS: Record<SocialReactionType, typeof HandHeart> = {
  AMEM: HandHeart,
  REZO: HeartHandshake,
  ALELUIA: Sparkles,
};

function autoplayEmbed(
  url: string | null | undefined,
  active: boolean,
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("autoplay", active ? "true" : "false");
    parsed.searchParams.set("preload", "true");
    parsed.searchParams.set("muted", "true");
    return parsed.toString();
  } catch {
    return url;
  }
}

function StoredShortVideo({ src, active }: { src: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      loop
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export function RhemaShortsFeed({
  topicSlug,
  canInteract,
  onRequireAccess,
  reloadToken = 0,
  showFollow = false,
}: {
  topicSlug?: string | null;
  canInteract: boolean;
  onRequireAccess?: () => void;
  reloadToken?: number;
  showFollow?: boolean;
}) {
  const { t } = useTranslation("social");
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<SocialPostItem[][]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const startedAt = useRef<Record<string, number>>({});
  const activeIdRef = useRef<string | null>(null);

  const { data, isLoading, isFetching } = useQuery(getSocialFeed, {
    cursor,
    topicSlug: topicSlug ?? null,
    sort: "recent",
    videoFormat: "SHORT",
    limit: 10,
  });

  useEffect(() => {
    setPages([]);
    setCursor(null);
    setActiveId(null);
  }, [topicSlug, reloadToken]);

  useEffect(() => {
    if (!data) return;
    setPages((current) => {
      if (!cursor) return [data.items as SocialPostItem[]];
      return [...current, data.items as SocialPostItem[]];
    });
  }, [data, cursor]);

  const posts = pages
    .flat()
    .filter(
      (post, index, all) =>
        all.findIndex((item) => item.id === post.id) === index,
    )
    .filter((post) => post.media.some(isPlayableSocialVideo));

  const authorIds = [...new Set(posts.map((post) => post.author.id))];
  const { data: followState } = useQuery(
    getSocialFollowState,
    { authorIds },
    { enabled: showFollow && authorIds.length > 0 },
  );
  const followedAuthors: string[] = followState?.following ?? [];

  useEffect(() => {
    if (!activeId && posts[0]) setActiveId(posts[0].id);
  }, [posts, activeId]);

  useEffect(() => {
    activeIdRef.current = activeId;
    if (!activeId) return;
    startedAt.current[activeId] = Date.now();
    void recordSocialWatch({ postId: activeId, watchSeconds: 1 }).catch(
      () => {},
    );
  }, [activeId]);

  const markElapsed = (postId: string) => {
    const started = startedAt.current[postId];
    if (!started) return;
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    void recordSocialWatch({
      postId,
      watchSeconds: seconds,
      completionRate: seconds > 12 ? 0.8 : 0.2,
    }).catch(() => {});
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root || posts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = [...entries]
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextId = visible?.target.getAttribute("data-post-id");
        if (!nextId || nextId === activeIdRef.current) return;
        if (activeIdRef.current) markElapsed(activeIdRef.current);
        setActiveId(nextId);
      },
      { root, threshold: [0.55, 0.75] },
    );

    for (const post of posts) {
      const node = articleRefs.current.get(post.id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [posts]);

  const react = async (post: SocialPostItem, type: SocialReactionType) => {
    if (!canInteract) {
      onRequireAccess?.();
      return;
    }
    try {
      await toggleSocialReaction({ postId: post.id, type });
    } catch (error: any) {
      toast({
        title: error?.message || t("upsell.title"),
        variant: "destructive",
      });
    }
  };

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
        title={t("shorts.empty")}
        description={t("shorts.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[min(80vh,720px)] snap-y snap-mandatory overflow-y-auto rounded-2xl bg-black"
        data-testid="rhema-shorts-feed"
      >
        {posts.map((post) => {
          const video = post.media.find(isPlayableSocialVideo);
          const active = post.id === activeId;
          return (
            <article
              key={post.id}
              data-post-id={post.id}
              ref={(node) => {
                if (node) articleRefs.current.set(post.id, node);
                else articleRefs.current.delete(post.id);
              }}
              className="relative h-full snap-start"
            >
              {video?.embedUrl ? (
                <iframe
                  src={autoplayEmbed(video.embedUrl, active) ?? undefined}
                  title={post.body || t("discovery.shorts")}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : video?.videoUrl ? (
                <StoredShortVideo src={video.videoUrl ?? ""} active={active} />
              ) : null}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                {post.author.socialHandle ? (
                  <Link
                    to={`/comunidade/u/${post.author.socialHandle}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    @{post.author.socialHandle}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">
                    {post.author.displayName}
                  </p>
                )}
                {post.body ? (
                  <p className="mt-1 line-clamp-3 text-sm text-white/90">
                    {post.body}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {SOCIAL_REACTION_TYPES.map((type) => {
                    const Icon = REACTION_ICONS[type];
                    const selected = post.viewerReaction === type;
                    return (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "gap-1.5 text-white hover:bg-white/10",
                          selected && "text-primary",
                        )}
                        onClick={() => void react(post, type)}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {t(`reactions.${type}`)}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-white hover:bg-white/10"
                    onClick={() =>
                      setOpenComments(openComments === post.id ? null : post.id)
                    }
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {t("comments.title")}
                  </Button>
                  <SocialShareButton
                    postId={post.id}
                    slug={post.slug}
                    body={post.body}
                    shareCount={post.shareCount}
                  />
                  {showFollow && !post.isOwn && (
                    <SocialFollowButton
                      authorId={post.author.id}
                      authorName={post.author.displayName}
                      initiallyFollowing={followedAuthors.includes(
                        post.author.id,
                      )}
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {data?.nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCursor(data.nextCursor)}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {t("feed.loadMore")}
          </Button>
        </div>
      )}

      {openComments && (
        <SocialCommentThread
          postId={openComments}
          canComment={canInteract}
          onRequireAccess={onRequireAccess}
        />
      )}
    </div>
  );
}
