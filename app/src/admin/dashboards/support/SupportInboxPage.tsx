import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getContactMessages,
  markContactMessageRead,
  replyToContactMessage,
} from "wasp/client/operations";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { Bell, Mail, CheckCircle, Send } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { Textarea } from "../../../client/components/ui/textarea";
import { formatDateTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

const SupportInboxPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data: messages = [], isLoading, refetch } = useQuery(getContactMessages);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleMarkRead = async (id: string) => {
    await markContactMessageRead({ id });
    refetch();
  };

  const handleReply = async (id: string) => {
    if (!replyBody.trim()) return;
    setSending(true);
    setError("");
    try {
      const result = await replyToContactMessage({ id, body: replyBody });
      setReplyFor(null);
      setReplyBody("");
      await refetch();
      if (result && (result as any).emailSent === false) {
        setError(t("pages.support.email_failed"));
      }
    } catch (err: any) {
      setError(err?.message || t("pages.support.reply_error"));
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter((m: any) => !m.isRead).length;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.support.title")}
          subtitle={
            unreadCount > 0
              ? t("pages.support.subtitle_unread", { count: unreadCount })
              : t("pages.support.subtitle")
          }
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-ink border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              {t("pages.support.empty_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              {t("pages.support.empty_desc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`rounded-sm border border-border/70 p-5 ${
                  !msg.isRead ? "border-brand-ink/20 bg-muted/30" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold tracking-tight text-brand-ink">
                        {msg.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.email}
                      </span>
                      {!msg.isRead && (
                        <span className="rounded-sm bg-brand-ink px-1.5 py-0.5 text-overline text-white">
                          {t("pages.support.new")}
                        </span>
                      )}
                      {msg.repliedAt && (
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t("pages.support.replied")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.replyBody && (
                      <div className="mt-3 rounded-sm border-l-[3px] border-brand-gold bg-muted/40 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {t("pages.support.sent_reply")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-brand-ink">
                          {msg.replyBody}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {formatDateTime(msg.createdAt, currentLocale)}
                    </p>
                    {replyFor === msg.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          rows={4}
                          placeholder={t("pages.support.reply_placeholder")}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={sending || !replyBody.trim()}
                            onClick={() => handleReply(msg.id)}
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            {sending
                              ? t("pages.support.sending")
                              : t("pages.support.send")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyFor(null);
                              setReplyBody("");
                            }}
                          >
                            {t("pages.plans.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!msg.isRead && (
                      <button
                        onClick={() => handleMarkRead(msg.id)}
                        className="flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {t("pages.support.mark_read")}
                      </button>
                    )}
                    {msg.email && (
                      <button
                        onClick={() => {
                          setReplyFor(msg.id);
                          setReplyBody("");
                        }}
                        className="flex items-center gap-1 rounded-sm bg-brand-ink px-2 py-1 text-xs text-white hover:bg-brand-ink-soft"
                      >
                        {t("pages.support.reply")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default SupportInboxPage;
