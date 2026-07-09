import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquareText,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { getAiCreditsStatus, submitAiFeedback } from 'wasp/client/operations';
import { getSessionId } from 'wasp/client/api';
import { BuyCreditsButton } from './BuyCreditsButton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  prompt?: string; // original prompt that generated this response
}

export function AIHelperWidget() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('ai');
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: ta('widget.greeting'),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      getAiCreditsStatus()
        .then(s => {
          setHasAccess(s?.hasAiAccess ?? false);
          setCreditsLeft(s?.creditsLeft ?? null);
        })
        .catch(() => setHasAccess(false));
    }
  }, [open]);

  // Listen for external open event (e.g. from HubHome)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-widget', handler);
    return () => window.removeEventListener('open-ai-widget', handler);
  }, []);

  // Reliable open signal for lazy-loaded mounts and route transitions.
  useEffect(() => {
    const shouldOpen = new URLSearchParams(window.location.search).get('assistant') === 'open';
    if (!shouldOpen) return;
    setOpen(true);
    const next = new URLSearchParams(window.location.search);
    next.delete('assistant');
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sessionId = getSessionId();
      if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) {
        let backendError = '';
        try {
          const payload = await response.json();
          backendError = payload?.error || '';
        } catch {}
        throw new Error(backendError || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error(ta('widget.error_streaming'));

      const decoder = new TextDecoder();
      let buffer = '';
      let fullReply = '';
      let assistantMsgIndex = -1;

      // Add placeholder for streaming
      setMessages(prev => {
        assistantMsgIndex = prev.length;
        return [...prev, { role: 'assistant', content: '', prompt: userMsg }];
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.done) continue;
            if (data.chunk) {
              fullReply += data.chunk;
              // Update the streaming message in place
              setMessages(prev => {
                const updated = [...prev];
                if (assistantMsgIndex >= 0 && assistantMsgIndex < updated.length) {
                  updated[assistantMsgIndex] = { role: 'assistant', content: fullReply };
                }
                return updated;
              });
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }

      if (!fullReply) {
        throw new Error(ta('widget.empty_response'));
      }
    } catch (e: any) {
      const isCreditError = e?.message?.includes('402') || e?.message?.includes('Créditos');
      const isTwoFactorError = e?.message?.includes('duas etapas') || e?.message?.includes('2FA');
      const isConfigError = e?.message?.includes('IA não configurado');
      const errorMsg = isCreditError
        ? (creditsLeft != null && creditsLeft <= 0
            ? ta('widget.no_credits')
            : ta('widget.low_credits'))
        : isTwoFactorError
          ? e.message
        : isConfigError
          ? e.message
        : e?.message?.includes('Plano')
          ? e.message.includes('/app/billing')
            ? e.message
            : ta('widget.upgrade_required')
          : ta('widget.generic_error');

      // Show contextual notice instead of raw error
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: isCreditError
              ? ta('widget.credits_cta')
              : errorMsg,
          };
          return updated;
        }
        return [...prev, { role: 'assistant', content: errorMsg }];
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess && !open) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 max-lg:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 lg:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          title={t("ai_helper_title")}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-modal lg:inset-auto lg:bottom-6 lg:right-6 lg:w-96 lg:h-[500px] bg-card border lg:rounded-sm shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary/5" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{ta('widget.theological_assistant')}</h3>
                <p className="text-xs text-muted-foreground">{ta('widget.catholic_ai')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/app/ai-hub" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={ta('widget.open_copilot')}>
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link to="/app/messages" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={ta('widget.view_history')}>
                <MessageSquareText className="h-4 w-4" />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-sm px-3 py-2 text-sm ${
     m.role === 'user'
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted'
     }`}
                >
                  <div className="whitespace-pre-line">
                    {m.content.includes('/app/billing') ? (
                      <>
                        {m.content.split('/app/billing')[0]}
                        <Link to="/app/billing" className="underline font-semibold text-primary hover:underline">/app/billing</Link>
                        {m.content.split('/app/billing').slice(1).join('/app/billing')}
                      </>
                    ) : (
                      m.content
                    )}
                  </div>
                  {/* Show inline Buy Credits CTA for credit-related errors */}
                  {(m.content.includes(ta('widget.no_credits')) || m.content.includes(ta('widget.credits_cta'))) && (
                    <div className="mt-2 flex gap-2">
                      <BuyCreditsButton pack="20" size="sm" variant="default" />
                      <BuyCreditsButton pack="50" size="sm" variant="outline" />
                    </div>
                  )}
                  {m.role === 'assistant' && m.content && !m.content.startsWith('Desculpe') && !m.content.startsWith('Você precisa') && (
                    <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border/50">
                      <button
                        onClick={() => submitAiFeedback({ prompt: m.prompt || '', response: m.content, rating: 'thumbs_up' })}
                        className="p-0.5 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors"
                        title={t("ai_helper_useful")}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => submitAiFeedback({ prompt: m.prompt || '', response: m.content, rating: 'thumbs_down' })}
                        className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        title={t("ai_helper_not_useful")}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted rounded-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <Textarea
              placeholder={t("ai_helper_placeholder")}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              className="min-h-0 resize-none"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
