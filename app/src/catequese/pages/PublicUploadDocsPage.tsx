import { useParams } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { FileText, Upload, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery, getCatechumenByUploadToken } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';

const TYPE_LABELS: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'Cert. Batismo',
  BIRTH_CERTIFICATE: 'Cert. Nascimento',
  CONSENT_FORM: 'Autorização',
  MARRIAGE_CERTIFICATE: 'Cert. Matrimônio',
  PASTORAL_LETTER: 'Carta Pastoral',
  OTHER: 'Outro',
};

export default function PublicUploadDocsPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery(getCatechumenByUploadToken, token ? { token } : { token: '' });

  const [docType, setDocType] = useState('BAPTISM_CERTIFICATE');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleUpload = async () => {
    if (!docFile || !token) return;
    setSending(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(docFile);
      });

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          type: docType,
          fileBase64: base64,
          mimeType: docFile.type,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao enviar.');
      }
      setSent(true);
      setDocFile(null);
      toast({ title: 'Documento enviado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Tente novamente.'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center space-y-4 shadow-lg">
          <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto">
            <Clock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Link Expirado ou Inválido</h1>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Este link de upload não é mais válido. Peça ao catequista um novo link.'}
          </p>
        </div>
      </div>
    );
  }

  const catechumen = data as any;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 mb-2">
            <FileText className="h-4 w-4" />
            Catequese Viva
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá! Envie os documentos de{' '}
            <span className="text-primary">{catechumen.firstName} {catechumen.lastName}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Use o formulário abaixo para enviar documentos. Não é necessário login.
          </p>
        </div>

        {/* Existing documents */}
        {catechumen.documents?.length > 0 && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-sm mb-3">Documentos já enviados</h2>
            <div className="space-y-2">
              {catechumen.documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[d.type] || d.type}</p>
                    </div>
                  </div>
                  <Badge variant={d.verifiedAt ? 'default' : 'secondary'} className="text-[10px] gap-1">
                    {d.verifiedAt ? (
                      <><CheckCircle className="h-3 w-3" /> Verificado</>
                    ) : (
                      <><Clock className="h-3 w-3" /> Pendente</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload form */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">Enviar novo documento</h2>

          {sent && (
            <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-sm text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Documento enviado com sucesso! Pode enviar outro se necessário.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Tipo de documento</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Arquivo</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => setDocFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary/10 file:text-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Formatos aceites: JPG, PNG, PDF. Máx 5MB.</p>
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={sending || !docFile}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {sending ? 'Enviando...' : 'Enviar Documento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
