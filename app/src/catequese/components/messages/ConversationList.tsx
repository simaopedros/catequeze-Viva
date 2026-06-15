import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, MessageSquareText, Megaphone, Filter, Hash } from 'lucide-react';
import { cn } from '../../../client/utils';

interface Participant {
  id: string;
  user: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; email: string | null };
  role: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  type: string;
  participants: Participant[];
  lastMessage: { content: string; sender: { firstName: string | null; lastName: string | null }; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
  class?: { name: string } | null;
  community?: { name: string } | null;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  currentUserId: string;
  isLoading?: boolean;
}

const TYPE_ICONS: Record<string, typeof MessageSquareText> = {
  DIRECT: MessageSquareText,
  GROUP: Users,
  CLASS_CHAT: Hash,
  ANNOUNCEMENT: Megaphone,
};

function getConversationName(conv: ConversationItem, currentUserId: string, t: (k: string) => string): string {
  if (conv.title) return conv.title;
  if (conv.class?.name) return conv.class.name;
  if (conv.community?.name) return conv.community.name;
  if (conv.type === 'DIRECT') {
    const other = conv.participants.find(p => p.user.id !== currentUserId);
    if (other) return [other.user.firstName, other.user.lastName].filter(Boolean).join(' ') || other.user.email || t('default_user');
  }
  return t('default_conversation');
}

function getAvatarInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(type: string): string {
  switch (type) {
    case 'DIRECT': return 'from-blue-500 to-blue-600';
    case 'GROUP': return 'from-emerald-500 to-emerald-600';
    case 'CLASS_CHAT': return 'from-amber-500 to-amber-600';
    case 'ANNOUNCEMENT': return 'from-purple-500 to-purple-600';
    default: return 'from-slate-500 to-slate-600';
  }
}

function formatTime(dateStr: string, t: (k: string) => string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-24 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-3 w-8 rounded bg-muted" />
    </div>
  );
}

export function ConversationList({ conversations, activeId, onSelect, onNewConversation, currentUserId, isLoading }: ConversationListProps) {
  const { t, i18n } = useTranslation('messages');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const FILTER_OPTIONS = useMemo(() => [
    { value: 'all', label: t('filters.all') },
    { value: 'DIRECT', label: t('filters.direct') },
    { value: 'GROUP', label: t('filters.groups') },
    { value: 'CLASS_CHAT', label: t('filters.classes') },
    { value: 'ANNOUNCEMENT', label: t('filters.announcements') },
  ], [t]);

  const filtered = conversations.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    if (search) {
      const name = getConversationName(c, currentUserId, t).toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t('conversations')}</h2>
          <button
            onClick={onNewConversation}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            title={t('new_conversation')}
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search_conversations')}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-overline font-medium whitespace-nowrap transition-all',
                filter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <ConversationSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <MessageSquareText className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? t('no_conversation_found') : t('no_conversations_yet')}
            </p>
            {!search && (
              <button
                onClick={onNewConversation}
                className="mt-2 text-xs text-primary hover:underline"
              >
                {t('start_conversation')}
              </button>
            )}
          </div>
        ) : (
          filtered.map(conv => {
            const name = getConversationName(conv, currentUserId, t);
            const TypeIcon = TYPE_ICONS[conv.type] || MessageSquareText;
            const isActive = conv.id === activeId;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all',
                  isActive
                    ? 'bg-primary/8 border-l-2 border-l-primary'
                    : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-gradient-to-br shadow-sm',
                  getAvatarColor(conv.type)
                )}>
                  {conv.type === 'DIRECT' ? (
                    getAvatarInitials(name)
                  ) : (
                    <TypeIcon className="h-4.5 w-4.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      'text-sm truncate',
                      conv.unreadCount > 0 ? 'font-semibold' : 'font-medium'
                    )}>
                      {name}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-overline text-muted-foreground flex-shrink-0">
                        {formatTime(conv.lastMessage.createdAt, t, i18n.language)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={cn(
                      'text-xs truncate',
                      conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.sender.firstName && conv.type !== 'DIRECT' && (
                            <span className="font-medium">{conv.lastMessage.sender.firstName}: </span>
                          )}
                          {conv.lastMessage.content}
                        </>
                      ) : (
                        <span className="italic">{t('no_messages')}</span>
                      )}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-overline font-bold px-1 animate-in zoom-in-50">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
