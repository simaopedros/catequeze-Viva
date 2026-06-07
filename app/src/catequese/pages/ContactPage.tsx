import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Textarea } from '../../client/components/ui/textarea';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Button } from '../../client/components/ui/button';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { sendMessageEmail } from 'wasp/client/operations';
import { cn } from '../../client/utils';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSending(true);
    setFeedback(null);
    try {
      await sendMessageEmail({
        to: 'contato@catequeseviva.com.br',
        subject: `[Contato] ${subject || 'Mensagem do site'} — ${name}`,
        body: `Nome: ${name}\nEmail: ${email}\n\n${message}`,
      });
      setFeedback({ type: 'success', text: 'Mensagem enviada com sucesso!' });
      setName(''); setEmail(''); setSubject(''); setMessage('');
    } catch {
      setFeedback({ type: 'error', text: 'Erro ao enviar. Tente novamente.' });
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-4">Contato</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Entre em contato com a equipe da Catequese Viva.
        </p>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="h-5 w-5 text-primary" />
              <span>contato@catequeseviva.com.br</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-5 w-5 text-primary" />
              <span>+55 (11) 0000-0000</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              <span>São Paulo, Brasil</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Nome *</Label>
                <Input id="contact-name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email *</Label>
                <Input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Assunto</Label>
              <Input id="contact-subject" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Mensagem *</Label>
              <Textarea id="contact-message" value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="resize-y" />
            </div>

            {feedback && (
              <div className={cn(
                'flex items-center gap-2 text-sm p-3 rounded-lg',
                feedback.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}>
                {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {feedback.text}
              </div>
            )}

            <Button type="submit" disabled={sending || !name || !email || !message} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? 'Enviando...' : 'Enviar mensagem'}
            </Button>
          </form>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
