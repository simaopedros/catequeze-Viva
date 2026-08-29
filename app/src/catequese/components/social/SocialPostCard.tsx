import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { HandHeart, MessageCircle, MoreHorizontal, Trash2, Flag } from "lucide-react";
import { deleteSocialPost, toggleSocialReaction } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { toast } from "../../../client/hooks/use-toast";
import { cn } from "../../../client/utils";
import { formatRelativeTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { SocialMediaGallery, type SocialMediaItem } from "./SocialMediaGallery";
import { SocialShareButton } from "./SocialShareButton";
import { SocialCommentThread } from "./SocialCommentThread";
import { SocialReportDialog } from "./SocialReportDialog";

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
  author: { id: string; displayName: string; avatarUrl: string | null };
  parish: { id: string; name: string } | null;
  media: SocialMediaItem[];
  topics: { slug: string; name: string }[];
  viewerReaction: "AMEM" | "REZO" | "ALELUIA" | null;
  isOwn: boolean;
}

function AuthorAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function SocialPostCard({
  post,
  canInteract,
  onRequireAccess,
  onDeleted,
  expandComments = false,
  linkToDetail = true,
}: {
  post: SocialPostItem;
  /** Viewer may react and comment (active subscription). */
  canInteract: boolean;
  onRequireAccess?: () => void;
  onDeleted?: (postId: string) => void;
  expandComments?: boolean;
  linkToDetail?: boolean;
}) {
  const { t } = useTranslation("social");
  const { currentLocale } = useLocale();
  const [reaction, setReaction] = useState(post.viewerReaction);
  const [reactionCount, setReactionCount] = useState(post.reactionCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(expandComments);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  const react = async () => {
    if (!canInteract) {
      onRequireAccess?.();
      return;
    }
    setBusy(true);
    try {
      const result = await toggleSocialReaction({ postId: post.id, type: "AMEM" });
      setReaction(result.reaction);
      setReactionCount(result.reactionCount);
    } catch (error: any) {
      toast({ title: error?.message || t("upsell.title"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("post.deleteConfirm"))) return;
    setBusy(true);
    try {
      await deleteSocialPost({ postId: post.id });
      toast({ title: t("post.deleted") });
      onDeleted?.(post.id);
    } catch (error: any) {
      toast({ title: error?.message || t("post.delete"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const timestamp = post.publishedAt || post.createdAt;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <AuthorAvatar name={post.author.displayName} url={post.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{post.author.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(timestamp).toISOString(), currentLocale)}
            {post.parish ? ` · ${t("feed.postedIn", { parish: post.parish.name })}` : ""}
          </p>
        </div>

        {post.status === "PENDING_REVIEW" && (
          <Badge variant="outline" className="shrink-0">
            {t("post.pendingReview")}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" disabled={busy}>
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
              <DropdownMenuItem onClick={() => setReporting(true)}>
                <Flag className="mr-2 h-4 w-4" aria-hidden />
                {t("post.report")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.body && (
        <p className="mt-3 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
          {post.body}
        </p>
      )}

      <SocialMediaGallery media={post.media} />

      {post.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {post.topics.map((topic) => (
            <li key={topic.slug}>
              <Link to={`/comunidade/t/${topic.slug}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {topic.name}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={react}
          disabled={busy}
          className={cn("gap-2", reaction && "text-primary")}
        >
          <HandHeart className={cn("h-4 w-4", reaction && "fill-current")} aria-hidden />
          <span>{reactionCount > 0 ? reactionCount : t("reactions.AMEM")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((value) => !value)}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span>{commentCount > 0 ? commentCount : t("comments.title")}</span>
        </Button>

        <SocialShareButton
          postId={post.id}
          slug={post.slug}
          body={post.body}
          shareCount={post.shareCount}
        />

        {linkToDetail && (
          <Link
            to={`/comunidade/p/${post.slug}`}
            className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
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
    </article>
  );
}
