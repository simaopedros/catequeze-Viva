import { useState, useRef, useEffect, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Send, Reply, CornerDownRight, ChevronDown } from "lucide-react";
import { cn } from "../../../client/utils";
import {
  clearMessageDraft,
  getMessageDraft,
  saveMessageDraft,
} from "../../../client/offline/db";

interface MessageItem {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  parent?: {
    id: string;
    content: string;
    sender: { firstName: string | null; lastName: string | null };
  } | null;
  reactions?: {
    emoji: string;
    user: { id: string; firstName: string | null };
  }[];
  /** Local-only pending draft shown as not sent */
  _pending?: boolean;
}

interface ChatViewProps {
  messages: MessageItem[];
  currentUserId: string;
  conversationTitle: string;
  conversationType: string;
  conversationId?: string;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onSendMessage: (content: string, parentId?: string) => Promise<void> | void;
  isSending: boolean;
}

function formatMessageTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeader(
  dateStr: string,
  t: (k: string) => string,
  locale: string,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getSenderInitials(sender: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [sender.firstName?.[0], sender.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?"
  );
}

function groupMessagesByDate(
  messages: MessageItem[],
): { date: string; messages: MessageItem[] }[] {
  const groups: { date: string; messages: MessageItem[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: msg.createdAt, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

export function ChatView({
  messages,
  currentUserId,
  conversationTitle,
  conversationType,
  conversationId,
  hasMore,
  isLoading,
  onLoadMore,
  onSendMessage,
  isSending,
}: ChatViewProps) {
  const { t, i18n } = useTranslation("messages");
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingLocal, setPendingLocal] = useState<MessageItem | null>(null);
  const [draftHint, setDraftHint] = useState(false);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  /** Extra bottom inset when virtual keyboard is open (visualViewport) */
  const [keyboardInset, setKeyboardInset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Keep composer above the virtual keyboard on mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 40 ? inset : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Restore draft when opening conversation
  useEffect(() => {
    let cancelled = false;
    setPendingLocal(null);
    setDraftHint(false);
    if (!conversationId) {
      setInput("");
      return;
    }
    getMessageDraft(conversationId).then((d) => {
      if (cancelled || !d) return;
      setInput(d.content || "");
      setDraftHint(Boolean(d.content));
      if (d.pendingSend && d.content) {
        setPendingLocal({
          id: `pending-${conversationId}`,
          content: d.content,
          contentType: "TEXT",
          createdAt: d.updatedAt,
          sender: {
            id: currentUserId,
            firstName: null,
            lastName: null,
            avatarUrl: null,
          },
          _pending: true,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId]);

  // Debounced draft persist
  useEffect(() => {
    if (!conversationId) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const text = input.trim();
      if (!text) {
        void clearMessageDraft(conversationId);
        setDraftHint(false);
        return;
      }
      void saveMessageDraft({
        conversationId,
        content: input,
        parentId: replyTo?.id,
        pendingSend: Boolean(pendingLocal),
      });
      setDraftHint(true);
    }, 400);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [input, conversationId, replyTo?.id, pendingLocal]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, pendingLocal?.id]);

  // Track scroll position
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    // Offline: keep as pending draft — never show as sent
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (conversationId) {
        await saveMessageDraft({
          conversationId,
          content: text,
          parentId: replyTo?.id,
          pendingSend: true,
        });
      }
      setPendingLocal({
        id: `pending-${conversationId || "local"}`,
        content: text,
        contentType: "TEXT",
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUserId,
          firstName: null,
          lastName: null,
          avatarUrl: null,
        },
        _pending: true,
      });
      setDraftHint(true);
      return;
    }

    try {
      await onSendMessage(text, replyTo?.id);
      setInput("");
      setReplyTo(null);
      setPendingLocal(null);
      if (conversationId) await clearMessageDraft(conversationId);
      setDraftHint(false);
      inputRef.current?.focus();
    } catch {
      // Parent shows toast; keep text for retry
      if (conversationId) {
        await saveMessageDraft({
          conversationId,
          content: text,
          parentId: replyTo?.id,
          pendingSend: true,
        });
      }
      setPendingLocal({
        id: `pending-${conversationId || "local"}`,
        content: text,
        contentType: "TEXT",
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUserId,
          firstName: null,
          lastName: null,
          avatarUrl: null,
        },
        _pending: true,
      });
    }
  };

  const retryPending = () => {
    if (!pendingLocal) return;
    setInput(pendingLocal.content);
    setPendingLocal(null);
    void handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  const displayMessages = pendingLocal ? [...messages, pendingLocal] : messages;
  const dateGroups = groupMessagesByDate(displayMessages);

  return (
    <div
      className="flex h-full flex-col bg-background"
      style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
    >
      {isOffline && (
        <div
          role="status"
          className="border-b border-warning/30 bg-warning/10 px-3 py-2 text-center text-xs font-medium text-brand-ink"
        >
          {t("offline_banner")}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-1 overflow-y-auto scroll-touch px-4 py-3 scrollbar-thin"
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="text-xs text-brand-ink hover:underline disabled:opacity-50"
            >
              {isLoading ? t("new_dialog.loading_contacts") : t("load_older")}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
              <Send className="h-7 w-7 text-brand-ink" />
            </div>
            <h3 className="font-brand-display mb-1 text-sm font-semibold tracking-tight text-brand-ink">
              {t("chat_start_title")}
            </h3>
            <div className="mx-auto mb-2 h-px w-8 bg-brand-gold" aria-hidden />
            <p className="max-w-[240px] text-xs text-muted-foreground">
              {t("chat_start_desc")}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {messages.length === 0 && isLoading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`skel-${i}`}
                className={`flex gap-2 ${
                  i % 2 === 0 ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {i % 2 !== 0 ? (
                  <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-sm bg-muted" />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div
                  className={`rounded-sm px-3.5 py-2 animate-pulse ${
                    i % 2 === 0 ? "bg-muted" : "bg-muted/60"
                  }`}
                  style={{
                    width: `${30 + Math.random() * 35}%`,
                    minWidth: "80px",
                    height: `${40 + i * 8}px`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Message groups by date */}
        {dateGroups.map((group, gi) => (
          <Fragment key={gi}>
            {/* Date separator */}
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-overline font-medium text-muted-foreground rounded-sm border border-border/70 bg-white px-2 py-0.5">
                {formatDateHeader(group.date, t, i18n.language)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, mi) => {
              const isMe = msg.sender.id === currentUserId;
              const isSystem = msg.contentType === "SYSTEM";
              const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
              const isConsecutive =
                prevMsg?.sender.id === msg.sender.id &&
                new Date(msg.createdAt).getTime() -
                  new Date(prevMsg.createdAt).getTime() <
                  120000;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="text-overline text-muted-foreground italic rounded-sm border border-border/70 bg-muted/30 px-3 py-1">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 group",
                    isMe ? "flex-row-reverse" : "flex-row",
                    isConsecutive ? "mt-0.5" : "mt-3",
                  )}
                >
                  {/* Avatar */}
                  {!isMe && !isConsecutive ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-ink text-overline font-semibold text-white">
                      {getSenderInitials(msg.sender)}
                    </div>
                  ) : !isMe ? (
                    <div className="w-8 flex-shrink-0" />
                  ) : null}

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[82%] min-w-[60px] sm:max-w-[70%]",
                      isMe && "items-end",
                    )}
                  >
                    {/* Sender name */}
                    {!isMe &&
                      !isConsecutive &&
                      conversationType !== "DIRECT" && (
                        <p className="text-overline font-semibold text-muted-foreground mb-0.5 ml-1">
                          {[msg.sender.firstName, msg.sender.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}

                    {/* Reply context */}
                    {msg.parent && (
                      <div
                        className={cn(
                          "mb-1 ml-1 flex items-center gap-1.5 rounded-sm border-l-2 px-2 py-1 text-overline",
                          isMe
                            ? "border-l-brand-ink/40 bg-muted/30 text-muted-foreground"
                            : "bg-muted/40 border-l-muted-foreground/30 text-muted-foreground",
                        )}
                      >
                        <CornerDownRight className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="font-semibold tracking-tight text-brand-ink">
                          {msg.parent.sender.firstName}
                        </span>
                        <span className="truncate">{msg.parent.content}</span>
                      </div>
                    )}

                    {/* Message body */}
                    <div
                      className={cn(
                        "relative rounded-sm px-3.5 py-2 text-sm",
                        isMe
                          ? "rounded-br-sm bg-brand-ink text-white"
                          : "rounded-bl-sm border border-border/70 bg-white",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                      <span
                        className={cn(
                          "text-overline float-right mt-1 ml-2 flex items-center gap-0.5",
                          isMe ? "text-white/60" : "text-muted-foreground/60",
                        )}
                      >
                        {msg._pending
                          ? t("pending_send", { defaultValue: "Pendente" })
                          : formatMessageTime(msg.createdAt, i18n.language)}
                      </span>
                    </div>

                    {msg._pending ? (
                      <div
                        className={cn(
                          "flex gap-1 mt-0.5",
                          isMe ? "justify-end mr-1" : "ml-1",
                        )}
                      >
                        <button
                          type="button"
                          onClick={retryPending}
                          className="inline-flex min-h-11 items-center rounded-sm px-2 text-xs font-medium text-brand-ink hover:bg-muted/50"
                        >
                          {t("retry_send", { defaultValue: "Reenviar" })}
                        </button>
                      </div>
                    ) : (
                      /* Reply — always visible on touch (never hover-only) */
                      <div
                        className={cn(
                          "flex gap-1 mt-0.5",
                          isMe ? "justify-end mr-1" : "ml-1",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setReplyTo(msg)}
                          className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={t("reply")}
                        >
                          <Reply className="h-4 w-4 shrink-0" />
                          <span>{t("reply")}</span>
                        </button>
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 ml-1 flex-wrap">
                        {Object.entries(
                          msg.reactions.reduce(
                            (acc: Record<string, number>, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            },
                            {},
                          ),
                        ).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="rounded-sm border border-border/70 bg-muted/50 px-1.5 py-0.5 text-overline"
                          >
                            {emoji} {count > 1 && count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}

        {/* Typing indicator placeholder */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <div className="absolute bottom-24 right-6 z-10">
          <button
            onClick={scrollToBottom}
            className="flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-white hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("scroll_to_bottom", {
              defaultValue: "Ir para o final",
            })}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="mx-4 mb-0 flex items-center gap-2 rounded-t-sm border border-b-0 border-border/70 bg-muted/50 px-3 py-2">
          <Reply className="h-3.5 w-3.5 text-brand-ink flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-overline font-semibold text-brand-ink">
              {[replyTo.sender.firstName, replyTo.sender.lastName]
                .filter(Boolean)
                .join(" ")}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="flex h-11 w-11 items-center justify-center rounded-sm text-xs text-muted-foreground hover:bg-muted hover:text-brand-ink"
            aria-label={t("cancel_reply", {
              defaultValue: "Cancelar resposta",
            })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Composer — sits above keyboard via visualViewport inset on parent */}
      <div
        className={cn(
          "sticky bottom-0 z-10 border-t border-border/70 bg-surface-elevated p-3",
          replyTo && "pt-0",
        )}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {draftHint && input.trim() && (
          <p className="mb-1.5 text-overline text-muted-foreground">
            {t("draft_saved", {
              defaultValue: "Rascunho guardado neste dispositivo",
            })}
          </p>
        )}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("message_placeholder")}
              aria-label={t("message_placeholder")}
              rows={1}
              enterKeyHint="send"
              className="max-h-[120px] min-h-11 w-full resize-none rounded-sm border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            className={cn(
              "flex h-11 w-11 min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-sm transition-all",
              input.trim()
                ? "bg-brand-ink text-white hover:bg-brand-ink-soft"
                : "bg-muted text-muted-foreground",
            )}
            aria-label={t("send", { defaultValue: "Enviar" })}
          >
            <Send className={cn("h-4.5 w-4.5", isSending && "animate-pulse")} />
          </button>
        </div>
      </div>
    </div>
  );
}
