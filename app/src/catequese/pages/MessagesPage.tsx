import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import {
  MessageSquareText,
  ArrowLeft,
  Info,
  BellOff,
  LogOut,
} from "lucide-react";
import { ConversationList } from "../components/messages/ConversationList";
import { ChatView } from "../components/messages/ChatView";
import { NewConversationDialog } from "../components/messages/NewConversationDialog";
import {
  listConversations,
  getConversation,
  sendMessage as sendMessageAction,
  markConversationRead,
  muteConversation as muteConversationAction,
  removeConversationParticipant,
} from "wasp/client/operations";
import { useQuery } from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { cn } from "../../client/utils";
import { toast } from "../../client/hooks/use-toast";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { setActiveWorkspaceId } from "../../client/hooks/workspaceStore";
import { usePageVisibility } from "../../client/hooks/usePageVisibility";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function MessagesPage() {
  const { t } = useTranslation("messages");
  const { t: tc } = useTranslation("common");
  const { data: user } = useAuth();
  const { workspaceId } = useActiveWorkspace();
  const isVisible = usePageVisibility();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(searchParams.get("c") || null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMobileChat, setIsMobileChat] = useState(false);

  // Conversations list
  const {
    data: conversations,
    isLoading: loadingConvs,
    refetch: refetchConvs,
  } = useQuery(
    listConversations,
    workspaceId ? ({ workspaceId } as any) : undefined,
    {
      enabled: !!workspaceId && isVisible,
      refetchInterval: isVisible ? 30000 : false,
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  );

  // Active conversation
  const [chatData, setChatData] = useState<any>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatCursor, setChatCursor] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const requestVersionRef = useRef(0);
  const chatDataRef = useRef<any>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    chatDataRef.current = chatData;
  }, [chatData]);

  const loadConversation = useCallback(
    async (
      convId: string,
      opts?: { cursor?: string; since?: string; quiet?: boolean },
    ) => {
      const requestVersion = ++requestVersionRef.current;
      const cursor = opts?.cursor;
      const since = opts?.since;
      if (!opts?.quiet) {
        setLoadingChat(true);
      }
      if (!cursor && !since) {
        setConversationError(null);
      }
      try {
        const result = await getConversation({
          conversationId: convId,
          workspaceId: workspaceId || undefined,
          cursor,
          since,
          take: 50,
        } as any);
        if (
          requestVersion !== requestVersionRef.current ||
          activeConversationIdRef.current !== convId
        ) {
          return;
        }

        if (since) {
          // Merge incremental newer messages by id
          setChatData((prev: any) => {
            if (!prev) return { ...result, messages: result.messages };
            const existingIds = new Set(
              (prev.messages || []).map((m: any) => m.id),
            );
            const added = (result.messages || []).filter(
              (m: any) => !existingIds.has(m.id),
            );
            if (added.length === 0) {
              return {
                ...prev,
                conversation: result.conversation ?? prev.conversation,
              };
            }
            return {
              ...prev,
              conversation: result.conversation ?? prev.conversation,
              messages: [...(prev.messages || []), ...added],
            };
          });
        } else if (cursor) {
          // Prepend older messages
          setChatData((prev: any) => ({
            ...result,
            messages: [...result.messages, ...(prev?.messages || [])],
          }));
          setChatCursor(result.nextCursor);
        } else {
          setChatData(result);
          setChatCursor(result.nextCursor);
        }
        setConversationError(null);
        if (!cursor) {
          markConversationRead({ conversationId: convId })
            .then(() => refetchConvs())
            .catch(() => {});
        }
      } catch (error: any) {
        if (
          requestVersion !== requestVersionRef.current ||
          activeConversationIdRef.current !== convId
        ) {
          return;
        }
        if (!since) {
          setChatData(null);
          setChatCursor(null);
          setConversationError(error?.message || tc("try_again"));
        }
      } finally {
        if (
          requestVersion === requestVersionRef.current &&
          activeConversationIdRef.current === convId &&
          !opts?.quiet
        ) {
          setLoadingChat(false);
        }
      }
    },
    [refetchConvs, tc, workspaceId],
  );

  // Notification deep-links may include ?w=workspaceId — align active workspace
  useEffect(() => {
    const w = searchParams.get("w");
    if (w && w !== workspaceId) {
      setActiveWorkspaceId(w);
    }
  }, [searchParams, workspaceId]);

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get("c") || null;
    setActiveConversationId((prev) =>
      prev === conversationIdFromUrl ? prev : conversationIdFromUrl,
    );
    if (conversationIdFromUrl) {
      setIsMobileChat(true);
    }
  }, [searchParams]);

  // Load conversation when activeConversationId or workspace changes
  useEffect(() => {
    if (activeConversationId && workspaceId) {
      loadConversation(activeConversationId);
    } else {
      setChatData(null);
      setChatCursor(null);
      setConversationError(null);
    }
  }, [activeConversationId, workspaceId, loadConversation]);

  // Keep latest loadConversation in a ref to avoid stale closures in the polling interval
  const loadConversationRef = useRef(loadConversation);
  loadConversationRef.current = loadConversation;

  // Poll only for *new* messages (since last known createdAt) — not full reload
  useEffect(() => {
    if (!activeConversationId || !isVisible) return;
    const interval = setInterval(() => {
      const msgs = chatDataRef.current?.messages as any[] | undefined;
      const last = msgs?.length ? msgs[msgs.length - 1] : null;
      const since = last?.createdAt
        ? new Date(last.createdAt).toISOString()
        : undefined;
      if (since) {
        loadConversationRef.current(activeConversationId, {
          since,
          quiet: true,
        });
      } else {
        loadConversationRef.current(activeConversationId, { quiet: true });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeConversationId, isVisible]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setSearchParams({ c: id });
    setIsMobileChat(true);
    setShowDetails(false);
  };

  const handleBackToList = () => {
    setIsMobileChat(false);
    setActiveConversationId(null);
    setSearchParams({});
  };

  const handleNewConversationCreated = (id: string) => {
    handleSelectConversation(id);
    refetchConvs();
  };

  const handleSendMessage = async (content: string, parentId?: string) => {
    if (!activeConversationId) return;
    setIsSending(true);
    try {
      const newMsg = await sendMessageAction({
        conversationId: activeConversationId,
        content,
        parentId,
      });
      // Optimistically add to local state
      setChatData((prev: any) => ({
        ...prev,
        messages: [...(prev?.messages || []), newMsg],
      }));
      refetchConvs();
    } catch (error: any) {
      toast({
        title: t("send_error"),
        description: error?.message || tc("try_again"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMore = () => {
    if (activeConversationId && chatCursor) {
      loadConversation(activeConversationId, { cursor: chatCursor });
    }
  };

  const handleMute = async () => {
    if (!activeConversationId || !chatData) return;
    const participant = chatData.conversation.participants.find(
      (p: any) => p.userId === user?.id,
    );
    try {
      await muteConversationAction({
        conversationId: activeConversationId,
        mute: !participant?.mutedAt,
      });
      void loadConversation(activeConversationId);
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e?.message || tc("try_again"),
        variant: "destructive",
      });
    }
  };

  const handleLeave = async () => {
    if (!activeConversationId || !user) return;
    try {
      await removeConversationParticipant({
        conversationId: activeConversationId,
        userId: user.id,
      });
      setActiveConversationId(null);
      setSearchParams({});
      refetchConvs();
    } catch (e: any) {
      toast({
        title: t("leave_error"),
        description: e?.message || tc("try_again"),
        variant: "destructive",
      });
    }
  };

  // Conversation metadata
  const activeConv = chatData?.conversation;
  const conversationName =
    activeConv?.title ||
    (activeConv?.type === "DIRECT"
      ? activeConv.participants
          .filter((p: any) => p.userId !== user?.id)
          .map((p: any) =>
            [p.user.firstName, p.user.lastName].filter(Boolean).join(" "),
          )
          .join(", ") || t("default_conversation")
      : activeConv?.class?.name || t("default_group"));
  const myParticipant = activeConv?.participants?.find(
    (p: any) => p.userId === user?.id,
  );

  return (
    <>
      {/* Mobile: list OR chat as distinct full screens; desktop: split pane */}
      <div className="chat-height mx-auto flex max-w-7xl overflow-hidden rounded-sm border border-border/70 bg-surface-elevated">
        {/* Conversation list - hidden on mobile when chat is open */}
        <div
          className={cn(
            "w-80 flex-shrink-0 border-r border-border/70 transition-all",
            isMobileChat
              ? "hidden md:flex md:flex-col"
              : "flex w-full flex-col md:w-80",
          )}
        >
          <ConversationList
            conversations={conversations || []}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNewConversation={() => setShowNewDialog(true)}
            currentUserId={user?.id || ""}
            isLoading={loadingConvs}
          />
        </div>

        {/* Chat area — exclusive screen on mobile when open */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            !isMobileChat && !activeConversationId ? "hidden md:flex" : "flex",
          )}
        >
          {activeConversationId &&
          (loadingChat || activeConv || conversationError) ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-2 border-b border-border/70 bg-surface-elevated px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                  aria-label={t("back_to_list")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2
                    className="truncate text-sm font-semibold tracking-tight text-brand-ink"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {conversationName || t("default_conversation")}
                  </h2>
                  <div className="h-px w-6 bg-brand-gold" aria-hidden />
                  <p className="text-overline text-muted-foreground">
                    {activeConv?.type === "DIRECT"
                      ? t("direct_chat")
                      : t("participants_count", {
                          count: activeConv?.participants?.length ?? 0,
                        })}
                    {myParticipant?.mutedAt && ` · ${t("muted")}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleMute}
                    className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-sm transition-colors hover:bg-muted"
                    title={myParticipant?.mutedAt ? t("unmute") : t("mute")}
                    aria-label={myParticipant?.mutedAt ? t("unmute") : t("mute")}
                  >
                    <BellOff
                      className={cn(
                        "h-4 w-4",
                        myParticipant?.mutedAt && "text-brand-ink",
                      )}
                    />
                  </button>
                  {activeConv?.type !== "DIRECT" && (
                    <button
                      type="button"
                      onClick={() => setShowDetails(!showDetails)}
                      className={cn(
                        "flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-sm transition-colors hover:bg-muted",
                        showDetails && "bg-muted",
                      )}
                      title={t("details")}
                      aria-label={t("details")}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat body */}
              <div className="flex-1 flex min-h-0">
                {activeConv ? (
                  <div className="flex-1 relative">
                    <ChatView
                      messages={chatData?.messages || []}
                      currentUserId={user?.id || ""}
                      conversationId={activeConversationId || undefined}
                      conversationTitle={
                        conversationName || t("default_conversation")
                      }
                      conversationType={activeConv?.type || "DIRECT"}
                      hasMore={chatData?.hasMore || false}
                      isLoading={loadingChat}
                      onLoadMore={handleLoadMore}
                      onSendMessage={handleSendMessage}
                      isSending={isSending}
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-sm border border-destructive/20 bg-destructive/10">
                      <MessageSquareText className="h-7 w-7 text-destructive" />
                    </div>
                    <h3
                      className="mb-1 text-base font-semibold tracking-tight text-brand-ink"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {t("load_error_title")}
                    </h3>
                    <div
                      className="mx-auto mb-2 h-px w-8 bg-brand-gold"
                      aria-hidden
                    />
                    <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                      {conversationError || t("network_error")}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        activeConversationId &&
                        loadConversation(activeConversationId)
                      }
                      className="h-11 min-h-11 rounded-sm bg-brand-ink px-4 text-sm font-medium text-white hover:bg-brand-ink-soft"
                    >
                      {tc("try_again")}
                    </button>
                  </div>
                )}

                {/* Details sidebar (desktop); sheet-like panel on large mobile */}
                {showDetails && activeConv?.type !== "DIRECT" && (
                  <div className="hidden w-64 animate-in slide-in-from-right-2 overflow-y-auto border-l border-border/70 bg-surface-elevated p-4 duration-200 lg:block">
                    <div className="mb-3 space-y-1.5">
                      <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground">
                        {t("participants")}
                      </h3>
                      <div className="h-px w-8 bg-brand-gold" aria-hidden />
                    </div>
                    <div className="space-y-2">
                      {activeConv.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-brand-ink text-overline font-semibold text-white">
                            {[p.user.firstName?.[0], p.user.lastName?.[0]]
                              .filter(Boolean)
                              .join("")
                              .toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-xs font-semibold tracking-tight text-brand-ink"
                              style={{
                                fontFamily: "var(--font-brand-display)",
                              }}
                            >
                              {[p.user.firstName, p.user.lastName]
                                .filter(Boolean)
                                .join(" ") || p.user.email}
                            </p>
                            <p className="text-overline capitalize text-muted-foreground">
                              {p.role.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {activeConv.type !== "DIRECT" && (
                      <button
                        type="button"
                        onClick={handleLeave}
                        className="mt-6 flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-2 text-xs text-destructive transition-colors hover:bg-destructive/5 hover:text-destructive/80"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {t("leave_group")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state — desktop hub only */
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
                <MessageSquareText className="h-7 w-7 text-brand-ink" />
              </div>
              <div className="space-y-2.5">
                <AppEyebrow className="text-center">{t("title")}</AppEyebrow>
                <AppDisplayTitle as="h2" className="text-xl sm:text-xl">
                  {t("hub_title")}
                </AppDisplayTitle>
                <AppGoldRule className="mx-auto" />
              </div>
              <p className="mb-5 mt-3 max-w-sm text-sm text-muted-foreground">
                {t("hub_desc")}
              </p>

              <div className="mb-5 grid w-full max-w-xs gap-2">
                <div className="rounded-sm border border-border/70 bg-surface-elevated p-2.5 text-left text-xs">
                  <span
                    className="font-semibold tracking-tight text-brand-ink"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {t("use_case_class")}
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    {t("use_case_class_desc")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-surface-elevated p-2.5 text-left text-xs">
                  <span
                    className="font-semibold tracking-tight text-brand-ink"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {t("use_case_notice")}
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    {t("use_case_notice_desc")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-surface-elevated p-2.5 text-left text-xs">
                  <span
                    className="font-semibold tracking-tight text-brand-ink"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {t("use_case_direct")}
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    {t("use_case_direct_desc")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDialog(true)}
                className="h-11 min-h-11 rounded-sm bg-brand-ink px-5 text-sm font-medium text-white transition-colors hover:bg-brand-ink-soft"
              >
                {t("start_conversation")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={handleNewConversationCreated}
      />
    </>
  );
}
