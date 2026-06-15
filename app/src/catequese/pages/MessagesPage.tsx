import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { MessageSquareText, ArrowLeft, Users, Info, BellOff, LogOut, Settings2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { ConversationList } from '../components/messages/ConversationList';
import { ChatView } from '../components/messages/ChatView';
import { NewConversationDialog } from '../components/messages/NewConversationDialog';
import {
  listConversations,
  getConversation,
  sendMessage as sendMessageAction,
  markConversationRead,
  muteConversation as muteConversationAction,
  removeConversationParticipant,
} from 'wasp/client/operations';
import { useQuery } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { cn } from '../../client/utils';
import { toast } from '../../client/hooks/use-toast';

export default function MessagesPage() {
  const { t } = useTranslation('messages');
  const { t: tc } = useTranslation('common');
  const { data: user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get('c') || null
  );
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMobileChat, setIsMobileChat] = useState(false);

  // Conversations list
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = useQuery(
    listConversations,
    undefined,
    { refetchInterval: 8000 }
  );

  // Active conversation
  const [chatData, setChatData] = useState<any>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatCursor, setChatCursor] = useState<string | null>(null);

  const loadConversation = useCallback(async (convId: string, cursor?: string) => {
    setLoadingChat(true);
    try {
      const result = await getConversation({ conversationId: convId, cursor, take: 50 });
      if (cursor && chatData) {
        // Prepend older messages
        setChatData((prev: any) => ({
          ...result,
          messages: [...result.messages, ...(prev?.messages || [])],
        }));
      } else {
        setChatData(result);
      }
      setChatCursor(result.nextCursor);
    } catch (error) {
      // Silently handle - conversation might have been deleted
      setChatData(null);
    } finally {
      setLoadingChat(false);
    }
  }, [chatData]);

  // Load conversation when activeConversationId changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversation(activeConversationId);
    } else {
      setChatData(null);
      setChatCursor(null);
    }
  }, [activeConversationId]);

  // Keep latest loadConversation in a ref to avoid stale closures in the polling interval
  const loadConversationRef = useRef(loadConversation);
  loadConversationRef.current = loadConversation;

  // Polling for new messages in active conversation
  useEffect(() => {
    if (!activeConversationId) return;
    const interval = setInterval(() => {
      loadConversationRef.current(activeConversationId);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

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
      toast({ title: t('send_error'), description: error?.message || tc('try_again'), variant: 'destructive' });
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
    const participant = chatData.conversation.participants.find((p: any) => p.userId === user?.id);
    try {
      await muteConversationAction({
        conversationId: activeConversationId,
        mute: !participant?.mutedAt,
      });
      loadConversation(activeConversationId);
    } catch (e: any) {
      toast({ title: tc('error'), description: e?.message || tc('try_again'), variant: 'destructive' });
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
      toast({ title: t('leave_error'), description: e?.message || tc('try_again'), variant: 'destructive' });
    }
  };

  // Conversation metadata
  const activeConv = chatData?.conversation;
  const conversationName = activeConv?.title ||
    (activeConv?.type === 'DIRECT'
      ? activeConv.participants
          .filter((p: any) => p.userId !== user?.id)
          .map((p: any) => [p.user.firstName, p.user.lastName].filter(Boolean).join(' '))
          .join(', ') || t('default_conversation')
      : activeConv?.class?.name || t('default_group'));
  const myParticipant = activeConv?.participants?.find((p: any) => p.userId === user?.id);

  return (
    <AppShell>
      <div className="chat-height flex overflow-hidden rounded-xl border bg-card/30 backdrop-blur-sm shadow-sm mx-auto max-w-7xl">
        {/* Conversation list - hidden on mobile when chat is open */}
        <div className={cn(
          'w-80 flex-shrink-0 border-r transition-all',
          isMobileChat ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full md:w-80'
        )}>
          <ConversationList
            conversations={conversations || []}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNewConversation={() => setShowNewDialog(true)}
            currentUserId={user?.id || ''}
            isLoading={loadingConvs}
          />
        </div>

        {/* Chat area */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          !isMobileChat && !activeConversationId ? 'hidden md:flex' : 'flex'
        )}>
          {activeConversationId && (loadingChat || activeConv) ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
                <button
                  onClick={handleBackToList}
                  className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">{conversationName || t('default_conversation')}</h2>
                  <p className="text-overline text-muted-foreground">
                    {activeConv?.type === 'DIRECT' ? t('direct_chat') : (
                      t('participants_count', { count: activeConv?.participants?.length ?? 0 })
                    )}
                    {myParticipant?.mutedAt && ` · ${t('muted')}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMute}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    title={myParticipant?.mutedAt ? t('unmute') : t('mute')}
                  >
                    <BellOff className={cn('h-4 w-4', myParticipant?.mutedAt && 'text-primary')} />
                  </button>
                  {activeConv?.type !== 'DIRECT' && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className={cn(
                        'h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors',
                        showDetails && 'bg-muted'
                      )}
                      title={t('details')}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat body */}
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 relative">
                  <ChatView
                    messages={chatData?.messages || []}
                    currentUserId={user?.id || ''}
                    conversationTitle={conversationName || t('default_conversation')}
                    conversationType={activeConv?.type || 'DIRECT'}
                    hasMore={chatData?.hasMore || false}
                    isLoading={loadingChat}
                    onLoadMore={handleLoadMore}
                    onSendMessage={handleSendMessage}
                    isSending={isSending}
                  />
                </div>

                {/* Details sidebar */}
                {showDetails && activeConv.type !== 'DIRECT' && (
                  <div className="w-64 border-l bg-card/50 p-4 overflow-y-auto hidden lg:block animate-in slide-in-from-right-2 duration-200">
                    <h3 className="font-semibold text-sm mb-3">{t('participants')}</h3>
                    <div className="space-y-2">
                      {activeConv.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-white text-overline font-semibold flex-shrink-0">
                            {[p.user.firstName?.[0], p.user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {[p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || p.user.email}
                            </p>
                            <p className="text-overline text-muted-foreground capitalize">{p.role.toLowerCase()}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Leave group */}
                    {activeConv.type !== 'DIRECT' && (
                      <button
                        onClick={handleLeave}
                        className="mt-6 w-full flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 py-2 rounded-lg hover:bg-destructive/5 px-2 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {t('leave_group')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center mb-5 animate-in zoom-in-50 duration-500">
                <MessageSquareText className="h-9 w-9 text-primary/60" />
              </div>
              <h2 className="text-lg font-semibold mb-1.5">{t('hub_title')}</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">{t('hub_desc')}</p>
              <button
                onClick={() => setShowNewDialog(true)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                {t('start_conversation')}
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
    </AppShell>
  );
}
