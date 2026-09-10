import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  HandHeart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Flag,
  Ban,
} from "lucide-react";
import { deleteSocialPost, toggleSocialReaction, toggleSocialBlock } from "wasp/client/operations";
import { SocialShareEmbed, type SocialShareCard } from "./SocialShareEmbed";
import { profilePath } from "../../../shared/socialProfile";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { toast } from "../../../client/hooks/use-toast";
import { useConfirm } from "../../../client/hooks/useConfirm";
import { cn } from "../../../client/utils";
import { formatRelativeTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { SocialMediaGallery, type SocialMediaItem } from "./SocialMediaGallery";
import { SocialShareButton } from "./SocialShareButton";
import { SocialCommentThread } from "./SocialCommentThread";
import { SocialReportDialog } from "./SocialReportDialog";
import { SocialFollowButton } from "./SocialFollowButton";
import { SocialAvatar } from "./SocialAvatar";
import { socialTopicChipClass, splitSocialHeadline } from "./socialAppearance";

export interface SocialPostItem {
  id: string;
  slug: string;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  status: "PUBLISHED" | "PENDING_REVIEW" | "REMOVED";
  body: string;
  createdAt: string | Date;
  publishedAt: string | Date | null;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    socialHandle?: string | null;
    handle?: string | null;
  };
  parish: { id: string; name: string } | null;
  share?: SocialShareCard | null;
  media: SocialMediaItem[];
  topics: { slug: string; name: string }[];
  viewerReaction: "AMEM" | "REZO" | "ALELUIA" | null;
  isOwn: boolean;
  videoFormat?: "SHORT" | "LONG" | null;
}

function AuthorAvatar({ name, url }: { name: string; url: string | null }) {
  return <SocialAvatar name={name} url={url} />;
}

export function SocialPostCard({
  post,
  canInteract,
  onRequireAccess,
  onDeleted,
  expandComments = false,
  linkToDetail = true,
  showFollow = false,
  isFollowing = false,
}: {
  post: SocialPostItem;
  /** Viewer may react and comment (active subscription). */
  canInteract: boolean;
  onRequireAccess?: () => void;
  onDeleted?: (postId: string) => void;
  expandComments?: boolean;
  linkToDetail?: boolean;
  /** Following only shows for signed-in visitors on other people's posts. */
  showFollow?: boolean;
  isFollowing?: boolean;
}) {
  const { t } = useTranslation("social");
  const { currentLocale } = useLocale();
  const [reaction, setReaction] = useState(post.viewerReaction);
  const [reactionCount, setReactionCount] = useState(post.reactionCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(expandComments);
  const [reporting, setReporting] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const [busy, setBusy] = useState(false);

  const react = async () => {
    if (!canInteract) {
      onRequireAccess?.();
      return;
    }
    setBusy(true);
    try {
      const result = await toggleSocialReaction({
        postId: post.id,
        type: "AMEM",
      });
      setReaction(result.reaction);
      setReactionCount(result.reactionCount);
    } catch (error: any) {
      toast({
        title: error?.message || t("upsell.title"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("post.delete"),
      description: t("post.deleteConfirm"),
      confirmLabel: t("post.delete"),
      variant: "destructive",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteSocialPost({ postId: post.id });
      toast({ title: t("post.deleted") });
      onDeleted?.(post.id);
    } catch (error: any) {
      toast({
        title: error?.message || t("post.delete"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const timestamp = post.publishedAt || post.createdAt;
  const { title, rest } = splitSocialHeadline(post.body);

  return (
    <article className="mb-3 min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
      <header className="flex items-center gap-2.5">
        <AuthorAvatar
          name={post.author.displayName}
          url={post.author.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          {post.author.socialHandle ? (
            <Link
              to={`/comunidade/u/${post.author.socialHandle}`}
              className="block truncate text-[13px] font-extrabold leading-tight hover:underline"
            >
              {post.author.displayName}
            </Link>
          ) : (
            <p className="truncate text-[13px] font-extrabold leading-tight">
              {post.author.displayName}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {post.author.socialHandle ? `@${post.author.socialHandle} · ` : ""}
            {formatRelativeTime(
              new Date(timestamp).toISOString(),
              currentLocale,
            )}
            {post.parish
              ? ` · ${t("feed.postedIn", { parish: post.parish.name })}`
              : ""}
          </p>
        </div>

        {showFollow && !post.isOwn && (
          <SocialFollowButton
            authorId={post.author.id}
            authorName={post.author.displayName}
            initiallyFollowing={isFollowing}
          />
        )}

        {post.status === "PENDING_REVIEW" && (
          <Badge variant="outline" className="shrink-0">
            {t("post.pendingReview")}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-[#53667e]"
              disabled={busy}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("feed.openPost")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {post.isOwn ? (
              <DropdownMenuItem onClick={remove} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                {t("post.delete")}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setReporting(true)}>
                  <Flag className="mr-2 h-4 w-4" aria-hidden />
                  {t("post.report")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const result = await toggleSocialBlock({ userId: post.author.id });
                      toast({
                        title: result.blocked
                          ? t("discovery.blockSuccess", { name: post.author.displayName })
                          : t("discovery.unblockSuccess", { name: post.author.displayName }),
                      });
                      if (result.blocked) onDeleted?.(post.id);
                    } catch (error: any) {
                      toast({
                        title: error?.message || t("discovery.block"),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" aria-hidden />
                  {t("discovery.block")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="pt-3">
        {post.topics[0] ? (
          <Link
            to={`/comunidade/t/${post.topics[0].slug}`}
            className={cn(
              "mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold",
              socialTopicChipClass(post.topics[0].slug),
            )}
          >
            {post.topics[0].name}
          </Link>
        ) : null}

        {title ? (
          <h3 className="mb-1.5 text-base font-semibold tracking-[-0.01em] text-brand-ink">
            {title}
          </h3>
        ) : null}

        {rest ? (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-[#5f7085]">
            {rest}
          </p>
        ) : null}

        {post.share && <SocialShareEmbed share={post.share} />}

        <SocialMediaGallery media={post.media} />

        {post.topics.length > 1 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {post.topics.slice(1).map((topic) => (
              <li key={topic.slug}>
                <Link
                  to={`/comunidade/t/${topic.slug}`}
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold",
                    socialTopicChipClass(topic.slug),
                  )}
                >
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#edf0f3] pt-3 text-[11px] text-[#5c7088]">
        <Button
          variant="ghost"
          size="sm"
          onClick={react}
          disabled={busy}
          className={cn(
            "h-auto gap-1.5 px-0 text-[11px] hover:bg-transparent hover:text-brand-ink",
            reaction && "font-bold text-[#1f6ed4]",
          )}
        >
          <HandHeart
            className={cn("h-4 w-4", reaction && "fill-current")}
            aria-hidden
          />
          <span>{reactionCount > 0 ? reactionCount : t("reactions.AMEM")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((value) => !value)}
          className="h-auto gap-1.5 px-0 text-[11px] hover:bg-transparent hover:text-brand-ink"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span>{commentCount > 0 ? commentCount : t("comments.title")}</span>
        </Button>

        <SocialShareButton
          postId={post.id}
          slug={post.slug}
          body={post.body}
          shareCount={post.shareCount}
          className="h-auto gap-1.5 px-0 text-[11px] hover:bg-transparent hover:text-brand-ink"
        />

        {linkToDetail && (
          <Link
            to={`/comunidade/p/${post.slug}`}
            className="ml-auto text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("feed.openPost")}
          </Link>
        )}
      </footer>

      {showComments && (
        <SocialCommentThread
          postId={post.id}
          canComment={canInteract}
          onRequireAccess={onRequireAccess}
          onCountChange={setCommentCount}
        />
      )}

      <SocialReportDialog
        open={reporting}
        onOpenChange={setReporting}
        targetType="POST"
        targetId={post.id}
      />
      {confirmDialog}
    </article>
  );
}
