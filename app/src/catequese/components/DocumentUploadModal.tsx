import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { FilePlus, Loader2, X } from 'lucide-react';
import { uploadDocument } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';

interface DocumentUploadModalProps {
  catechumenProfileId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DocumentUploadModal({
  catechumenProfileId,
  open,
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('PDF');
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const handleUpload = async () => {
    if (!name.trim()) return;
    setUploading(true);
    try {
      await uploadDocument({
        name: name.trim(),
        type: type as any,
        catechumenProfileId,
      });
      toast({ title: 'Documento enviado com sucesso.' });
      setName('');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha no upload.') });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FilePlus className="h-5 w-5" /> Novo Documento
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Nome do documento</label>
          <input
            placeholder="Ex: Certidão de Batismo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="PDF">PDF</option>
            <option value="IMAGE">Imagem</option>
            <option value="DOCX">Documento Word</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={uploading || !name.trim()}>
            {uploading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...</> : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
