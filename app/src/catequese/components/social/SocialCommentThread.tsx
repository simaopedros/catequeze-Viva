import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Trash2 } from "lucide-react";
import {
  useQuery,
  getSocialComments,
  createSocialComment,
  deleteSocialComment,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";
import { formatRelativeTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

export function SocialCommentThread({
  postId,
  canComment,
  onRequireAccess,
  onCountChange,
}: {
  postId: string;
  canComment: boolean;
  onRequireAccess?: () => void;
  onCountChange?: (count: number) => void;
}) {
  const { t } = useTranslation("social");
  const { currentLocale } = useLocale();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, refetch } = useQuery(getSocialComments, { postId });
  const comments = data?.items ?? [];

  useEffect(() => {
    if (data) onCountChange?.(comments.length);
  }, [data, comments.length, onCountChange]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canComment) {
      onRequireAccess?.();
      return;
    }
    if (!body.trim()) return;

    setSending(true);
    try {
      const result = await createSocialComment({ postId, body });
      setBody("");
      if (result?.held) {
        toast({ title: t("comments.held") });
      }
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || t("comments.send"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await deleteSocialComment({ commentId });
      toast({ title: t("comments.deleted") });
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || t("comments.delete"), variant: "destructive" });
    }
  };

  return (
    <section className="mt-3 border-t border-border pt-3">
      <h3 className="text-sm font-semibold">{t("comments.title")}</h3>

      {isLoading ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("feed.loading")}
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("comments.empty")}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {comments.map((comment: any) => (
            <li key={comment.id} className="flex gap-2">
              <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2">
                <p className="text-xs font-semibold">
                  {comment.author.displayName}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {formatRelativeTime(
                      new Date(comment.createdAt).toISOString(),
                      currentLocale,
                    )}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
              </div>
              {comment.isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(comment.id)}
                  aria-label={t("comments.delete")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={submit} className="mt-3 flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("comments.placeholder")}
            rows={2}
            maxLength={1000}
            className="min-h-[2.5rem] resize-none"
          />
          <Button type="submit" size="icon" disabled={sending || !body.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">{t("comments.send")}</span>
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onRequireAccess?.()}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("comments.loginToComment")}
        </button>
      )}
    </section>
  );
}
