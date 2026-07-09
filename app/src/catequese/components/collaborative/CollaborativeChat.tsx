import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollaborative } from './CollaborativeContext';
import { Button } from '../../../client/components/ui/button';
import { Textarea } from '../../../client/components/ui/textarea';
import { Send, Loader2, Sparkles, UserRound } from 'lucide-react';

export function CollaborativeChat() {
  const { t } = useTranslation('collaborative');
  const { messages, sendMessage } = useCollaborative();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const visibleMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="rounded-lg border border-dashed bg-card-subtle/40 px-4 py-5 text-sm text-muted-foreground">
            <div className="mb-3 flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-secondary" />
              <p className="font-semibold">{t('title')}</p>
            </div>
            <p className="leading-relaxed">{t('chat.empty')}</p>
            <div className="mt-4 grid gap-1.5 text-xs">
              <p className="font-semibold text-foreground">{t('chat.tips')}</p>
              <p className="rounded bg-background px-2 py-1">{t('chat.tip_refine')}</p>
              <p className="rounded bg-background px-2 py-1">{t('chat.tip_catechism')}</p>
              <p className="rounded bg-background px-2 py-1">{t('chat.tip_dynamic')}</p>
            </div>
          </div>
        )}

        {visibleMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-sm px-3 py-2.5 text-sm whitespace-pre-wrap ${
    msg.role === 'user'
     ? 'bg-primary text-primary-foreground'
     : 'border border-border/70 bg-white text-foreground'
    }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-overline font-semibold uppercase tracking-wide opacity-70">
                {msg.role === 'user' ? <UserRound className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {msg.role === 'user' ? t('chat.you') : t('chat.ai')}
              </div>
              {msg.content || (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('chat.thinking')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/70 bg-white p-3 shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={sending}
            aria-label={t('chat.placeholder')}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0"
            aria-label={t('chat.send')}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
