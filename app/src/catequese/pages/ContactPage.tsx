import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Textarea } from '../../client/components/ui/textarea';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { sendMessageEmail } from 'wasp/client/operations';

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
    } catch (err: any) {
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
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem *</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-y" />
            </div>

            {feedback && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'
              }`}>
                {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {feedback.text}
              </div>
            )}

            <button type="submit" disabled={sending || !name || !email || !message}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Send className="h-4 w-4" />
              {sending ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
