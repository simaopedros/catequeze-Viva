import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { FileText, CheckCircle, Clock, Upload, User, Trash2, Search, XCircle, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listDocuments, listCatechumens, uploadDocument, verifyDocument, deleteDocument } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';

const TYPE_LABEL: Record<string,string>={BAPTISM_CERTIFICATE:'Cert. Batismo',BIRTH_CERTIFICATE:'Cert. Nascimento',CONSENT_FORM:'Autorização',MARRIAGE_CERTIFICATE:'Cert. Matrimônio',PASTORAL_LETTER:'Carta Pastoral',OTHER:'Outro'};
const TYPE_COLORS: Record<string,string>={BAPTISM_CERTIFICATE:'text-blue-600 bg-blue-50',BIRTH_CERTIFICATE:'text-green-600 bg-green-50',CONSENT_FORM:'text-amber-600 bg-amber-50',MARRIAGE_CERTIFICATE:'text-purple-600 bg-purple-50',PASTORAL_LETTER:'text-indigo-600 bg-indigo-50',OTHER:'text-gray-600 bg-gray-50'};

export default function DocumentsPage() {
  const { t } = useTranslation('common');
  const { activeParishId } = useActiveParish();
  const { data: docs = [], isLoading: loading } = useQuery(listDocuments);
  const { data: catechumens = [] } = useQuery(listCatechumens);
  const [showForm,setShowForm]=useState(false);
  const [docName,setDocName]=useState(''); const [docType,setDocType]=useState('OTHER');
  const [docCatechumenId,setDocCatechumenId]=useState('');
  const [search,setSearch]=useState('');
  const [typeFilter,setTypeFilter]=useState('');

  // Filter catechumens by active parish for the dropdown
  const filteredCatechumens = useMemo(() => {
    if (!activeParishId) return catechumens;
    return catechumens.filter((c:any) =>
      c.enrollments?.some((e:any) => e.class?.parishId === activeParishId)
    );
  }, [catechumens, activeParishId]);

  // Build set of catechumen IDs in the active parish
  const parishCatechumenIds = useMemo(() => {
    if (!activeParishId) return null;
    return new Set(filteredCatechumens.map((c:any) => c.id));
  }, [filteredCatechumens, activeParishId]);

  const filtered=useMemo(()=>{
    let r=[...docs];
    if (parishCatechumenIds) r = r.filter((d:any) => !d.catechumenProfileId || parishCatechumenIds.has(d.catechumenProfileId));
    if(search)r=r.filter((d:any)=>d.name.toLowerCase().includes(search.toLowerCase())||d.catechumenProfile?.firstName?.toLowerCase().includes(search.toLowerCase()));
    if(typeFilter)r=r.filter((d:any)=>d.type===typeFilter);
    return r;
  },[docs,search,typeFilter,parishCatechumenIds]);

  const verified=docs.filter((d:any)=>d.verifiedAt).length;
  const pending=docs.length-verified;

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleUpload=async()=>{
    if(!docName)return;
    try {
      await uploadDocument({name:docName,type:docType,catechumenProfileId:docCatechumenId||undefined});
      setDocName('');setShowForm(false);
      toast({ title: 'Documento enviado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar documento', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleVerify=async(id:string)=>{
    try {
      await verifyDocument({id});
      toast({ title: 'Documento verificado.' });
    } catch (e: any) {
      toast({ title: 'Erro ao verificar documento', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDelete=async(id:string)=>{
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeleting(id);
    try {
      await deleteDocument({ id });
      toast({ title: 'Documento excluído.' });
    } catch (e: any) {
      toast({ title: 'Erro ao excluir documento', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  if(loading)return<AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-40 bg-muted rounded"/><div className="grid gap-3">{[1,2,3,4].map(i=><div key={i} className="h-16 rounded-xl bg-muted"/>)}</div></div></AppShell>;

  const pendingDocs=filtered.filter((d:any)=>!d.verifiedAt);
  const verifiedDocs=filtered.filter((d:any)=>d.verifiedAt);

  return(
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('documents.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('documents.summary', { verified, pending })}</p>
          </div>
          <Button onClick={()=>setShowForm(!showForm)}><Upload className="mr-2 h-4 w-4"/>{t('documents.new')}</Button>
        </div>

        {showForm&&(
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold">{t('documents.register')}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input placeholder={t('documents.name')} value={docName} onChange={e=>setDocName(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"/>
              <select value={docType} onChange={e=>setDocType(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.entries(TYPE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
              <select value={docCatechumenId} onChange={e=>setDocCatechumenId(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">{t('documents.noCatechumen')}</option>{filteredCatechumens.map((c:any)=><option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
            </div>
            <div className="flex gap-2"><Button size="sm" onClick={handleUpload} disabled={!docName}>{t('documents.registerBtn')}</Button><Button size="sm" variant="outline" onClick={()=>setShowForm(false)}>{t('cancel')}</Button></div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><input placeholder={t('documents.searchPlaceholder')} value={search} onChange={e=>setSearch(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"/></div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={()=>setTypeFilter('')} className={`rounded-full px-3 py-1.5 text-xs font-medium ${!typeFilter?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{t('documents.all')}</button>
            {Object.entries(TYPE_LABEL).slice(0,5).map(([k,v])=><button key={k} onClick={()=>setTypeFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${typeFilter===k?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{v}</button>)}
          </div>
        </div>

        {filtered.length===0?(
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center"><div className="mb-4 rounded-full bg-primary/10 p-4"><FileText className="h-8 w-8 text-primary"/></div><h3 className="text-lg font-semibold">{t('documents.emptyTitle')}</h3><p className="text-sm text-muted-foreground mt-1">{t('documents.emptyDesc')}</p></div>
        ):(
          <div className="space-y-6">
            {pendingDocs.length>0&&(
              <div>
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2 flex items-center gap-2"><XCircle className="h-4 w-4 text-amber-500"/>{t('documents.pending')} ({pendingDocs.length})</h3>
                <div className="rounded-xl border bg-card divide-y">{pendingDocs.map((doc:any)=>(
                  <div key={doc.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${TYPE_COLORS[doc.type]||'text-gray-600 bg-gray-50'}`}><FileText className="h-5 w-5"/></div>
                      <div><a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium text-sm text-primary hover:underline">{doc.name}</a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[doc.type]}</Badge>
                          {doc.catechumenProfile&&<span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/>{doc.catechumenProfile.firstName}</span>}
                          {doc.uploadedBy&&<span className="text-[10px] text-muted-foreground">{t('documents.uploadedBy')} {doc.uploadedBy.firstName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>handleVerify(doc.id)}><CheckCircle className="mr-1 h-3 w-3"/>{t('documents.verify')}</Button></div>
                  </div>
                ))}</div>
              </div>
            )}
            {verifiedDocs.length>0&&(
              <div>
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>{t('documents.verified')} ({verifiedDocs.length})</h3>
                <div className="rounded-xl border bg-card divide-y">{verifiedDocs.map((doc:any)=>(
                  <div key={doc.id} className="flex items-center justify-between p-4 opacity-75">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${TYPE_COLORS[doc.type]||'text-gray-600 bg-gray-50'}`}><FileText className="h-5 w-5"/></div>
                      <div><a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium text-sm text-primary hover:underline">{doc.name}</a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[doc.type]}</Badge>
                          {doc.catechumenProfile&&<span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/>{doc.catechumenProfile.firstName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle className="h-3 w-3"/>{t('documents.verifiedLabel')}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(doc.verifiedAt).toLocaleDateString()}</span>
                      <button onClick={()=>handleDelete(doc.id)} disabled={deleting === doc.id} className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-50">{deleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}</button>
                    </div>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Excluir documento"
        description="Tens a certeza que queres excluir este documento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
