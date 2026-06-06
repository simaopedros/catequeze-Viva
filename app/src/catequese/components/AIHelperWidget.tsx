import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
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
} from 'lucide-react';
import { getAiCreditsStatus, submitAiFeedback } from 'wasp/client/operations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  prompt?: string; // original prompt that generated this response
}

export function AIHelperWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o assistente teológico da Catequese Viva. Como posso ajudar você hoje? Pergunte-me sobre como explicar a fé para diferentes idades, dúvidas sobre sacramentos, sugestões de dinâmicas...',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      getAiCreditsStatus()
        .then(s => setHasAccess(s?.hasAiAccess ?? false))
        .catch(() => setHasAccess(false));
    }
  }, [open]);

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
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com a IA.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming não suportado.');

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
        throw new Error('Resposta vazia da IA.');
      }
    } catch (e: any) {
      const errorMsg = e?.message?.includes('402') || e?.message?.includes('Plano')
        ? 'Você precisa do plano Catequista IA ou Paróquia para usar o assistente teológico. Acesse /app/billing para fazer upgrade.'
        : 'Desculpe, ocorreu um erro. Tente novamente mais tarde.';

      // Remove placeholder if present, add error message
      setMessages(prev => {
        // If the last message is an empty assistant placeholder, replace it
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: errorMsg };
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
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          title="Assistente Teológico"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Assistente Teológico</h3>
                <p className="text-xs text-muted-foreground">IA Católica • Catequese Viva</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
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
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
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
                  {m.role === 'assistant' && m.content && !m.content.startsWith('Desculpe') && !m.content.startsWith('Você precisa') && (
                    <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border/50">
                      <button
                        onClick={() => submitAiFeedback({ prompt: m.prompt || '', response: m.content, rating: 'thumbs_up' })}
                        className="p-0.5 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors"
                        title="Resposta útil"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => submitAiFeedback({ prompt: m.prompt || '', response: m.content, rating: 'thumbs_down' })}
                        className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Resposta não foi útil"
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
                <div className="bg-muted rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Textarea
              placeholder="Tire sua dúvida teológica..."
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
