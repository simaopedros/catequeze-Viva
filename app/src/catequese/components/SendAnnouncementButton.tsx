import { useState } from 'react';
import { sendClassAnnouncementByEmail } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Mail, Loader2, CheckCircle, X } from 'lucide-react';

interface Props {
  classId: string;
  className: string;
}

export default function SendAnnouncementButton({ classId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true); setError(''); setResult(null);
    try {
      const r = await sendClassAnnouncementByEmail({ classId, subject: subject.trim(), body: body.trim() });
      setResult(r);
      setSubject('');
      setBody('');
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar comunicado.');
    }
    setSending(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="mr-1 h-3 w-3"/>Comunicado
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Mail className="h-4 w-4"/>Enviar comunicado por e-mail — {className}
        </h3>
        <button onClick={() => { setOpen(false); setError(''); setResult(null); }} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4"/>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        O e-mail será enviado para todos os responsáveis dos catequizandos inscritos nesta turma.
      </p>
      <div>
        <Label className="text-xs font-medium">Assunto</Label>
        <Input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Ex: Lembrete de encontro neste sábado"
          disabled={sending}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">Mensagem</Label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Escreva sua mensagem..."
          rows={4}
          disabled={sending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-y min-h-[80px]"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4"/>
          Enviado para {result.sent} responsáveis{result.failed > 0 ? ` (${result.failed} falhas)` : ''}.
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setError(''); setResult(null); }} disabled={sending}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
          {sending ? <><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Enviando...</> : 'Enviar'}
        </Button>
      </div>
    </div>
  );
}
