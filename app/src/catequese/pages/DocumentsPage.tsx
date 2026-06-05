import { useState, useMemo } from 'react';
import { FileText, CheckCircle, Clock, Upload, User, Trash2, XCircle, Loader2, X } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { AppShell } from '../AppShell';
import { useQuery, listDocuments, listCatechumens, uploadDocument, verifyDocument, rejectDocument, deleteDocument } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';

const DOC_TYPES: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'Cert. Batismo',
  BIRTH_CERTIFICATE: 'Cert. Nascimento',
  CONSENT_FORM: 'Autorização',
  MARRIAGE_CERTIFICATE: 'Cert. Matrimônio',
  PASTORAL_LETTER: 'Carta Pastoral',
  OTHER: 'Outro',
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  VERIFIED: { icon: CheckCircle, color: 'text-green-500', label: 'Verificado' },
  PENDING: { icon: Clock, color: 'text-amber-500', label: 'Pendente' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'Rejeitado' },
};

const COORDINATOR_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];

export default function DocumentsPage() {
  const { userRole } = useUserContext();
  const isCoordinator = COORDINATOR_ROLES.includes(userRole);
  const canUpload = isCoordinator || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN'].includes(userRole);

  const { data: docs = [], isLoading: loading } = useQuery(listDocuments);
  const { data: catechumens = [] } = useQuery(listCatechumens);

  const [uploadingFor, setUploadingFor] = useState<{ catechumenId: string; docType: string } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');

  // Build a map: catechumenId → { docType → document }
  const docMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const d of docs) {
      if (!d.catechumenProfileId) continue;
      if (!map[d.catechumenProfileId]) map[d.catechumenProfileId] = {};
      map[d.catechumenProfileId][d.type] = d;
    }
    return map;
  }, [docs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadingFor || !fileBase64) return;
    try {
      await uploadDocument({
        name: fileName || DOC_TYPES[uploadingFor.docType],
        type: uploadingFor.docType,
        catechumenProfileId: uploadingFor.catechumenId,
        fileBase64,
        mimeType: fileName.split('.').pop() || 'bin',
      });
      toast({ title: 'Documento enviado!' });
      setUploadingFor(null);
      setFileBase64('');
      setFileName('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleVerify = async (id: string) => {
    try { await verifyDocument({ id }); toast({ title: 'Documento verificado!' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try { await rejectDocument({ id: rejectingId }); toast({ title: 'Documento rejeitado' }); setRejectingId(null); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDocument({ id }); toast({ title: 'Documento removido' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground text-sm">Gerir documentos dos catequizandos</p>
        </div>

        {/* Upload modal */}
        {uploadingFor && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Enviar {DOC_TYPES[uploadingFor.docType]} — {
                  catechumens.find((c: any) => c.id === uploadingFor.catechumenId)?.firstName
                } {
                  catechumens.find((c: any) => c.id === uploadingFor.catechumenId)?.lastName
                }
              </h3>
              <button onClick={() => { setUploadingFor(null); setFileBase64(''); setFileName(''); }} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
            </div>
            <input type="file" onChange={handleFileChange} className="text-sm" />
            {fileName && <p className="text-xs text-muted-foreground">Ficheiro: {fileName}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpload} disabled={!fileBase64}>
                <Upload className="mr-1 h-3 w-3" />Enviar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setUploadingFor(null); setFileBase64(''); setFileName(''); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Catechumens with doc checklist */}
        <div className="space-y-4">
          {catechumens.map((c: any) => {
            const catechumenDocs = docMap[c.id] || {};
            const pending = Object.values(catechumenDocs).filter((d: any) => d.status === 'PENDING').length;
            const verified = Object.values(catechumenDocs).filter((d: any) => d.status === 'VERIFIED').length;

            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                    {c.firstName?.[0]}{c.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {verified}/{Object.keys(DOC_TYPES).length} verificados
                      {pending > 0 && <span className="text-amber-500"> · {pending} pendentes</span>}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(DOC_TYPES).map(([type, label]) => {
                    const doc = catechumenDocs[type];
                    const status = doc?.status || 'MISSING';
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

                    return (
                      <div key={type} className={`flex items-center justify-between rounded-lg border p-2.5 ${status === 'MISSING' ? 'border-dashed bg-muted/20' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <config.icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{label}</p>
                            {status !== 'MISSING' && (
                              <p className="text-[10px] text-muted-foreground">{config.label}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {status === 'MISSING' && canUpload && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setUploadingFor({ catechumenId: c.id, docType: type })}>
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          {status === 'PENDING' && isCoordinator && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600"
                                onClick={() => handleVerify(doc.id)}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500"
                                onClick={() => setRejectingId(doc.id)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {status === 'REJECTED' && isCoordinator && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600"
                              onClick={() => handleVerify(doc.id)}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {(status === 'VERIFIED' || status === 'REJECTED') && canUpload && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setUploadingFor({ catechumenId: c.id, docType: type })}>
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          {doc && canUpload && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {catechumens.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum catequizando encontrado.</p>
          </div>
        )}

        {/* Reject confirmation */}
        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-3">
              <h3 className="font-semibold">Rejeitar documento</h3>
              <p className="text-sm text-muted-foreground">Confirmas que queres rejeitar este documento?</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={handleReject}>Rejeitar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
