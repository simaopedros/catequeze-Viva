import { useState, useRef, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Reply, CornerDownRight, ChevronDown } from 'lucide-react';
import { cn } from '../../../client/utils';

interface MessageItem {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  sender: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null };
  parent?: { id: string; content: string; sender: { firstName: string | null; lastName: string | null } } | null;
  reactions?: { emoji: string; user: { id: string; firstName: string | null } }[];
}

interface ChatViewProps {
  messages: MessageItem[];
  currentUserId: string;
  conversationTitle: string;
  conversationType: string;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onSendMessage: (content: string, parentId?: string) => void;
  isSending: boolean;
}

function formatMessageTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr: string, t: (k: string) => string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function getSenderInitials(sender: { firstName: string | null; lastName: string | null }): string {
  return [sender.firstName?.[0], sender.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
}

function groupMessagesByDate(messages: MessageItem[]): { date: string; messages: MessageItem[] }[] {
  const groups: { date: string; messages: MessageItem[] }[] = [];
  let currentDate = '';

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
  hasMore,
  isLoading,
  onLoadMore,
  onSendMessage,
  isSending,
}: ChatViewProps) {
  const { t, i18n } = useTranslation('messages');
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Track scroll position
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text, replyTo?.id);
    setInput('');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const dateGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin relative"
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="text-xs text-[#071A2D] hover:underline disabled:opacity-50"
            >
              {isLoading ? t('new_dialog.loading_contacts') : t('load_older')}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-16 w-16 rounded-sm bg-muted/40 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t('chat_start_title')}</h3>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              {t('chat_start_desc')}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {messages.length === 0 && isLoading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`skel-${i}`}
                className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {i % 2 !== 0 ? (
                  <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-sm bg-muted" />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div
                  className={`rounded-sm px-3.5 py-2 animate-pulse ${i % 2 === 0 ? 'bg-muted' : 'bg-muted/60'}`}
                  style={{
                    width: `${30 + Math.random() * 35}%`,
                    minWidth: '80px',
                    height: `${40 + (i * 8)}px`,
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
              const isSystem = msg.contentType === 'SYSTEM';
              const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
              const isConsecutive = prevMsg?.sender.id === msg.sender.id &&
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000;

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
                    'flex gap-2 group',
                    isMe ? 'flex-row-reverse' : 'flex-row',
                    isConsecutive ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {/* Avatar */}
                  {!isMe && !isConsecutive ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#071A2D] text-overline font-semibold text-white">
                      {getSenderInitials(msg.sender)}
                    </div>
                  ) : !isMe ? (
                    <div className="w-8 flex-shrink-0" />
                  ) : null}

                  {/* Bubble */}
                  <div className={cn('max-w-[70%] min-w-[60px]', isMe && 'items-end')}>
                    {/* Sender name */}
                    {!isMe && !isConsecutive && conversationType !== 'DIRECT' && (
                      <p className="text-overline font-semibold text-muted-foreground mb-0.5 ml-1">
                        {[msg.sender.firstName, msg.sender.lastName].filter(Boolean).join(' ')}
                      </p>
                    )}

                    {/* Reply context */}
                    {msg.parent && (
                      <div className={cn(
                        'mb-1 ml-1 flex items-center gap-1.5 rounded-sm border-l-2 px-2 py-1 text-overline',
                        isMe
                          ? 'border-l-[#071A2D]/40 bg-muted/30 text-muted-foreground'
                          : 'bg-muted/40 border-l-muted-foreground/30 text-muted-foreground'
                      )}>
                        <CornerDownRight className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="font-medium">{msg.parent.sender.firstName}</span>
                        <span className="truncate">{msg.parent.content}</span>
                      </div>
                    )}

                    {/* Message body */}
                    <div
                      className={cn(
                        'relative rounded-sm px-3.5 py-2 text-sm',
                        isMe
                          ? 'rounded-br-sm bg-[#071A2D] text-white'
                          : 'rounded-bl-md border border-border/70 bg-white',
                        'animate-in slide-in-from-bottom-1 duration-200'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      <span className={cn(
                        'text-overline float-right mt-1 ml-2 flex items-center gap-0.5',
                        isMe ? 'text-white/60' : 'text-muted-foreground/60'
                      )}>
                        {formatMessageTime(msg.createdAt, i18n.language)}
                      </span>
                    </div>

                    {/* Reply button */}
                    <div className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-0.5',
                      isMe ? 'justify-end mr-1' : 'ml-1'
                    )}>
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="text-overline text-muted-foreground hover:text-[#071A2D] flex items-center gap-0.5"
                      >
                        <Reply className="h-3 w-3" />
                        {t('reply')}
                      </button>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 ml-1 flex-wrap">
                        {Object.entries(
                          msg.reactions.reduce((acc: Record<string, number>, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <span key={emoji} className="rounded-sm border border-border/70 bg-muted/50 px-1.5 py-0.5 text-overline">
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
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border/70 bg-white hover:bg-muted"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="mx-4 mb-0 px-3 py-2 bg-muted/50 rounded-t-lg border border-b-0 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Reply className="h-3.5 w-3.5 text-[#071A2D] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-overline font-semibold text-[#071A2D]">
              {[replyTo.sender.firstName, replyTo.sender.lastName].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className={cn('p-3 border-t bg-white -sm', replyTo && 'pt-0')}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('message_placeholder')}
              rows={1}
              className="w-full resize-none rounded-sm border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={cn(
              'h-10 w-10 rounded-sm flex items-center justify-center transition-all flex-shrink-0',
              input.trim()
                ? 'bg-[#071A2D] text-white hover:bg-[#0a2540]'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Send className={cn('h-4.5 w-4.5', isSending && 'animate-pulse')} />
          </button>
        </div>
      </div>
    </div>
  );
}
