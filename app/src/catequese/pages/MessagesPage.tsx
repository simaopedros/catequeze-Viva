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

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const loadConversation = useCallback(
    async (convId: string, cursor?: string) => {
      const requestVersion = ++requestVersionRef.current;
      setLoadingChat(true);
      if (!cursor) {
        setConversationError(null);
      }
      try {
        const result = await getConversation({
          conversationId: convId,
          cursor,
          take: 50,
        });
        if (
          requestVersion !== requestVersionRef.current ||
          activeConversationIdRef.current !== convId
        ) {
          return;
        }

        if (cursor) {
          // Prepend older messages
          setChatData((prev: any) => ({
            ...result,
            messages: [...result.messages, ...(prev?.messages || [])],
          }));
        } else {
          setChatData(result);
        }
        setChatCursor(result.nextCursor);
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
        setChatData(null);
        setChatCursor(null);
        setConversationError(error?.message || tc("try_again"));
      } finally {
        if (
          requestVersion === requestVersionRef.current &&
          activeConversationIdRef.current === convId
        ) {
          setLoadingChat(false);
        }
      }
    },
    [refetchConvs, tc],
  );

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

  // Polling for new messages in active conversation
  useEffect(() => {
    if (!activeConversationId || !isVisible) return;
    const interval = setInterval(() => {
      loadConversationRef.current(activeConversationId);
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
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMore = () => {
    if (activeConversationId && chatCursor) {
      loadConversation(activeConversationId, chatCursor);
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
      loadConversation(activeConversationId);
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
      <div className="chat-height mx-auto flex max-w-7xl overflow-hidden rounded-sm border border-border/70 bg-white">
        {/* Conversation list - hidden on mobile when chat is open */}
        <div
          className={cn(
            "w-80 flex-shrink-0 border-r transition-all",
            isMobileChat
              ? "hidden md:flex md:flex-col"
              : "flex flex-col w-full md:w-80",
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

        {/* Chat area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            !isMobileChat && !activeConversationId ? "hidden md:flex" : "flex",
          )}
        >
          {activeConversationId &&
          (loadingChat || activeConv || conversationError) ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-border/70 bg-white px-4 py-3">
                <button
                  onClick={handleBackToList}
                  className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-muted md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2
                    className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {conversationName || t("default_conversation")}
                  </h2>
                  <div className="h-px w-6 bg-[#D39A2B]" aria-hidden />
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
                    onClick={handleMute}
                    className="flex h-8 w-8 items-center justify-center rounded-sm transition-colors hover:bg-muted"
                    title={myParticipant?.mutedAt ? t("unmute") : t("mute")}
                  >
                    <BellOff
                      className={cn(
                        "h-4 w-4",
                        myParticipant?.mutedAt && "text-[#071A2D]",
                      )}
                    />
                  </button>
                  {activeConv?.type !== "DIRECT" && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-sm transition-colors hover:bg-muted",
                        showDetails && "bg-muted",
                      )}
                      title={t("details")}
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <div className="h-16 w-16 rounded-sm bg-destructive/10 flex items-center justify-center mb-4">
                      <MessageSquareText className="h-7 w-7 text-destructive/70" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">
                      {t("title")}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      {conversationError || tc("try_again")}
                    </p>
                    <button
                      onClick={() =>
                        activeConversationId &&
                        loadConversation(activeConversationId)
                      }
                      className="rounded-sm bg-[#071A2D] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a2540]"
                    >
                      {tc("try_again")}
                    </button>
                  </div>
                )}

                {/* Details sidebar */}
                {showDetails && activeConv?.type !== "DIRECT" && (
                  <div className="hidden w-64 overflow-y-auto border-l border-border/70 bg-white p-4 animate-in slide-in-from-right-2 duration-200 lg:block">
                    <div className="mb-3 space-y-1.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("participants")}
                      </h3>
                      <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                    </div>
                    <div className="space-y-2">
                      {activeConv.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-sm bg-[#071A2D] flex items-center justify-center text-white text-overline font-semibold flex-shrink-0">
                            {[p.user.firstName?.[0], p.user.lastName?.[0]]
                              .filter(Boolean)
                              .join("")
                              .toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {[p.user.firstName, p.user.lastName]
                                .filter(Boolean)
                                .join(" ") || p.user.email}
                            </p>
                            <p className="text-overline text-muted-foreground capitalize">
                              {p.role.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Leave group */}
                    {activeConv.type !== "DIRECT" && (
                      <button
                        onClick={handleLeave}
                        className="mt-6 flex w-full items-center gap-2 rounded-sm px-2 py-2 text-xs text-destructive transition-colors hover:bg-destructive/5 hover:text-destructive/80"
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
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
                <MessageSquareText className="h-7 w-7 text-[#071A2D]" />
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

              {/* Use case examples */}
              <div className="grid gap-2 w-full max-w-xs mb-5">
                <div className="rounded-sm border border-border/70 bg-white p-2.5 text-left text-xs">
                  <span className="font-semibold text-foreground">
                    {t("use_case_class")}
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    {t("use_case_class_desc")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white p-2.5 text-left text-xs">
                  <span className="font-semibold text-foreground">
                    {t("use_case_notice")}
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    {t("use_case_notice_desc")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white p-2.5 text-left text-xs">
                  <span className="font-semibold text-foreground">
                    {t("use_case_direct")}
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    {t("use_case_direct_desc")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNewDialog(true)}
                className="rounded-sm bg-[#071A2D] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2540]"
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
