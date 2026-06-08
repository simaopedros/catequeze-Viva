import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, Upload, Trash2, XCircle, Loader2, X } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { EmptyState } from '../../client/components/EmptyState';
import { useQuery, listDocuments, listCatechumens, uploadDocument, verifyDocument, rejectDocument, deleteDocument } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';
import { useDocumentTypeLabels } from '../../i18n/useLabels';

const DOC_TYPE_KEYS = ['BAPTISM_CERTIFICATE', 'BIRTH_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER'] as const;

const COORDINATOR_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];

export default function DocumentsPage() {
  const { t: tc } = useTranslation('common');
  const docTypes = useDocumentTypeLabels(true);
  const { userRole } = useUserContext();
  const isCoordinator = COORDINATOR_ROLES.includes(userRole);
  const canUpload = isCoordinator || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN'].includes(userRole);

  const { data: docs = [], isLoading: loading } = useQuery(listDocuments);
  const { data: catechumens = [] } = useQuery(listCatechumens);

  const [uploadingFor, setUploadingFor] = useState<{ catechumenId: string; docType: string } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');

  const statusConfig = useMemo(() => ({
    VERIFIED: { icon: CheckCircle, color: 'text-success', label: tc('documents.verifiedLabel') },
    PENDING: { icon: Clock, color: 'text-warning', label: tc('documents.status_pending') },
    REJECTED: { icon: XCircle, color: 'text-destructive', label: tc('documents.status_rejected') },
  }), [tc]);

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
        name: fileName || docTypes[uploadingFor.docType as keyof typeof docTypes],
        type: uploadingFor.docType,
        catechumenProfileId: uploadingFor.catechumenId,
        fileBase64,
        mimeType: fileName.split('.').pop() || 'bin',
      });
      toast({ title: tc('documents.sent_success') });
      setUploadingFor(null);
      setFileBase64('');
      setFileName('');
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleVerify = async (id: string) => {
    try { await verifyDocument({ id }); toast({ title: tc('documents.verified_success') }); }
    catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try { await rejectDocument({ id: rejectingId }); toast({ title: tc('documents.rejected_success') }); setRejectingId(null); }
    catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDocument({ id }); toast({ title: tc('documents.removed_success') }); }
    catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppShell>;

  const uploadingCatechumen = uploadingFor
    ? catechumens.find((c: any) => c.id === uploadingFor.catechumenId)
    : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={tc('documents.title')} subtitle={tc('documents.page_subtitle')} />

        {uploadingFor && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {tc('documents.upload_title', {
                  type: docTypes[uploadingFor.docType as keyof typeof docTypes],
                  name: `${uploadingCatechumen?.firstName || ''} ${uploadingCatechumen?.lastName || ''}`.trim(),
                })}
              </h3>
              <button onClick={() => { setUploadingFor(null); setFileBase64(''); setFileName(''); }} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
            </div>
            <input type="file" onChange={handleFileChange} className="text-sm" />
            {fileName && <p className="text-xs text-muted-foreground">{tc('documents.file_label', { name: fileName })}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpload} disabled={!fileBase64}>
                <Upload className="mr-1 h-3 w-3" />{tc('upload')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setUploadingFor(null); setFileBase64(''); setFileName(''); }}>{tc('cancel')}</Button>
            </div>
          </div>
        )}

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
                      {tc('documents.verified_of', { verified, total: DOC_TYPE_KEYS.length })}
                      {pending > 0 && tc('documents.pending_count', { count: pending })}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DOC_TYPE_KEYS.map(type => {
                    const label = docTypes[type];
                    const doc = catechumenDocs[type];
                    const status = doc?.status || 'MISSING';
                    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
                    const StatusIcon = config.icon;

                    return (
                      <div key={type} className={`flex items-center justify-between rounded-lg border p-2.5 ${status === 'MISSING' ? 'border-dashed bg-muted/20' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusIcon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
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
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-success"
                                onClick={() => handleVerify(doc.id)}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                                onClick={() => setRejectingId(doc.id)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {status === 'REJECTED' && isCoordinator && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-success"
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
          <EmptyState
            icon={FileText}
            title={tc('documents.no_catechumen_found')}
            description={tc('documents.empty_register_hint')}
          />
        )}

        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-3">
              <h3 className="font-semibold">{tc('documents.reject_title')}</h3>
              <p className="text-sm text-muted-foreground">{tc('documents.reject_confirm')}</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>{tc('cancel')}</Button>
                <Button size="sm" variant="destructive" onClick={handleReject}>{tc('documents.reject_btn')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
