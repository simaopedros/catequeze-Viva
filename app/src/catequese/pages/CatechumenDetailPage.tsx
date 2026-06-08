import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Calendar, Heart, BookOpen, FileText, CheckCircle, XCircle, Clock, Edit3, Gift, MessageCircle, FilePlus, Upload, Download, Link2, Copy, AlertTriangle, Cross } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getCatechumenProfile, listMeetings, getMeetingAttendance, createConversation, uploadDocument, generateCatechumenUploadToken, getCatechumenAttendanceReport } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';
import { calculatePoints } from '../../shared/gamification';

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border dark:border-blue-900/50',
    'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border dark:border-green-900/50',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border dark:border-amber-900/50',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 dark:border dark:border-purple-900/50',
    'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 dark:border dark:border-pink-900/50'
  ];

export default function CatechumenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const { data: profile, isLoading: loading } = useQuery(getCatechumenProfile, { id: id! });
  const canEdit = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'].includes(userRole);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docType, setDocType] = useState('BAPTISM_CERTIFICATE');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenData, setTokenData] = useState<{ token: string; expires: string } | null>(null);

  const handleDmGuardian = async (guardianUserId: string) => {
    try {
      const conv = await createConversation({ type: 'DIRECT', participantUserIds: [guardianUserId] });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      toast({ title: 'Erro ao abrir chat: ' + (e.message || 'Tente novamente.') });
    }
  };

  const DOC_TYPE_LABELS: Record<string, string> = {
    BAPTISM_CERTIFICATE: 'Certidão de Batismo',
    BIRTH_CERTIFICATE: 'Certidão de Nascimento',
    CONSENT_FORM: 'Termo de Consentimento',
    MARRIAGE_CERTIFICATE: 'Certidão de Matrimônio',
    PASTORAL_LETTER: 'Carta Pastoral',
    OTHER: 'Documento',
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      const raw = localStorage.getItem('wasp:sessionId');
      const token = raw ? JSON.parse(raw) : '';
      const res = await fetch(`/api/documents/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao baixar' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'Erro ao baixar documento', description: e.message, variant: 'destructive' });
    }
  };

  const handleDocUpload = async () => {
    if (!docFile) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(docFile);
      });

      await uploadDocument({
        name: DOC_TYPE_LABELS[docType] || docType,
        type: docType,
        catechumenProfileId: id!,
        fileBase64: base64,
        mimeType: docFile.type,
      });
      setDocFile(null);
      setShowDocUpload(false);
      toast({ title: 'Documento enviado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar documento: ' + (e.message || 'Tente novamente.') });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await generateCatechumenUploadToken({ catechumenProfileId: id! });
      setTokenData({ token: result.token, expires: new Date(result.expires).toLocaleDateString('pt-BR') });
      toast({ title: 'Link de upload gerado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Tente novamente.') });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const result = await getCatechumenAttendanceReport({ catechumenId: id! });
      setReport(result);
    } catch (e: any) {
      toast({ title: 'Erro ao gerar relatório: ' + (e.message || 'Tente novamente.') });
    }
    setLoadingReport(false);
  };

  const getUploadLink = () => tokenData?.token
    ? `${window.location.origin}/upload-docs/${tokenData.token}`
    : '';
  const handleCopyLink = () => {
    const link = getUploadLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: 'Link copiado!' });
    }
  };

  useEffect(()=>{
    if(!profile?.enrollments?.length) return;
    (async()=>{
      const all: any[] = [];
      for(const e of profile.enrollments){
        const mts = await listMeetings({ classId: e.class?.id }) || [];
        for(const m of mts){
          const records = await getMeetingAttendance({ meetingId: m.id }) || [];
          const mine = records.find((r:any)=>r.catechumenProfileId===id);     
          if(mine) all.push({...mine, meetingTitle:m.title, meetingDate:m.date, className:e.class?.name});
        }
      }
      setAttendance(all.slice(-10).reverse());
    })();
  },[profile]);

  if(loading)return <AppShell><div className="space-y-6 max-w-2xl mx-auto animate-pulse"><div className="flex items-center gap-4"><div className="h-16 w-16 rounded-full bg-muted"/><div className="h-8 w-40 bg-muted rounded"/></div><div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-32 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  if(!profile)return <AppShell><div className="p-6 text-destructive">Não encontrado.</div></AppShell>;

  const getAge=(bd:string)=>{if(!bd)return null;const b=new Date(bd),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a;};
  const age=getAge(profile.birthDate);
  const attendancePct=attendance.length?Math.round((attendance.filter((a:any)=>a.status==='PRESENT'||a.status==='JUSTIFIED').length/attendance.length)*100):null;

  return(
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/catechumens"><ArrowLeft className="h-5 w-5"/></Link></Button>
          <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold overflow-hidden ${!profile.photoUrl ? AVATAR_COLORS[Math.abs(profile.firstName?.charCodeAt(0)||0)%AVATAR_COLORS.length] : ''}`}>
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.firstName} className="w-full h-full object-cover" />
            ) : (
              `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`   
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
            <p className="text-sm text-muted-foreground">{age&&`${age} anos`}{profile.birthDate&&` · ${new Date(profile.birthDate).toLocaleDateString()}`}</p>  
          </div>
          {canEdit && <Button size="sm" variant="outline" asChild><Link to={`/app/catechumens/${id}/edit`}><Edit3 className="mr-1 h-3 w-3"/>Editar</Link></Button>}
        </div>

        {attendancePct!==null&&(
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="text-center flex-1"><p className="text-2xl font-bold">{attendancePct}%</p><p className="text-xs text-muted-foreground">Presença</p></div>
            <div className="text-center flex-1"><p className="text-2xl font-bold">{profile.enrollments?.length||0}</p><p className="text-xs text-muted-foreground">Turmas</p></div>
            <div className="text-center flex-1"><p className="text-2xl font-bold">{profile.sacramentalJourneys?.length||0}</p><p className="text-xs text-muted-foreground">Jornadas</p></div>
          </div>
        )}

        {/* Gamification */}
        {attendance.length > 0 && (() => {
          const present = attendance.filter((a:any) => a.status === 'PRESENT' || a.status === 'LATE').length;
          const points = calculatePoints({ totalPresent: present, totalMeetings: attendance.length, quizzesCompleted: 0, quizzesPerfect: 0 });
          return (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Gift className="h-4 w-4 text-amber-500"/>Progresso</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-amber-500">{points}</span>
                <span className="text-xs text-muted-foreground">pontos</span>
              </div>
              {attendancePct !== null && attendancePct >= 90 && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                  <span className="text-lg">🌟</span> Presença Perfeita — mais de 90% de frequência!
                </div>
              )}
            </div>
          );
        })()}

        {/* Attendance Report */}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2"><Heart className="h-4 w-4"/>Família</h3>
            <p className="font-medium">{profile.household?.name||'Não vinculado'}</p>
            {profile.household?.guardians?.map((g:any)=>(
              <div key={g.id} className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{g.user?.firstName} {g.user?.lastName} {g.relationship&&`(${g.relationship})`}</p>
                <button onClick={() => handleDmGuardian(g.user?.id)} className="text-primary hover:text-primary/70 p-1" title="Enviar mensagem">
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2"><BookOpen className="h-4 w-4"/>Turmas</h3>
            {profile.enrollments?.map((e:any)=><Link key={e.id} to={`/app/classes/${e.class?.id}`} className="block text-sm text-primary hover:underline py-0.5">{e.class?.name} {e.class?.stage?.name&&`· ${e.class.stage.name}`}</Link>)||<p className="text-sm text-muted-foreground">Nenhuma</p>}
          </div>
        </div>

        {attendance.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Histórico de presença</h3>
            <div className="space-y-1">
              {attendance.map((a:any)=>(
                <div key={a.id} className="flex items-center justify-between py-1 text-sm">
                  <div><span className="text-xs text-muted-foreground">{new Date(a.meetingDate).toLocaleDateString()}</span> <span className="font-medium">{a.meetingTitle||'Encontro'}</span><span className="text-[10px] text-muted-foreground ml-1">({a.className})</span></div>
                  <Badge variant={a.status==='PRESENT'?'default':a.status==='ABSENT'?'destructive':'secondary'} className="text-[10px]">{a.status==='PRESENT'?'✓ Presente':a.status==='ABSENT'?'✗ Faltou':a.status}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              {!report ? (
                <Button size="sm" variant="outline" onClick={handleGenerateReport} disabled={loadingReport}>
                  <FileText className="mr-1 h-3 w-3"/>{loadingReport ? 'Gerando...' : 'Gerar Relatório de Presenças'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Relatório de Presenças</h4>
                    <Badge variant={report.riskLevel === 'ALTO' ? 'destructive' : report.riskLevel === 'MÉDIO' ? 'secondary' : 'default'} className="text-[10px]">
                      Risco {report.riskLevel}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalPresent}</p>
                      <p className="text-muted-foreground">Presentes</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalAbsent}</p>
                      <p className="text-muted-foreground">Faltas</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalJustified}</p>
                      <p className="text-muted-foreground">Justificadas</p>
                    </div>
                  </div>
                  {report.maxConsecutiveAbsences >= 3 && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{report.maxConsecutiveAbsences} faltas consecutivas detectadas.</p>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setReport(null)} className="text-xs">Fechar relatório</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {profile.sacramentalJourneys?.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
              <Cross className="h-4 w-4 text-primary" />Jornadas Sacramentais
            </h3>
            <div className="space-y-2">
            {profile.sacramentalJourneys.map((j:any)=>{
              const total=j.milestones?.length||0;
              const done=j.milestones?.filter((m:any)=>m.status==='COMPLETED'||m.status==='APPROVED').length||0;
              const pct=total>0?Math.round((done/total)*100):0;
              const hasBlocked = j.milestones?.some((m:any)=>m.status==='REJECTED');
              const hasWaiting = j.milestones?.some((m:any)=>m.status==='WAITING_APPROVAL');
              return(
                <Link key={j.id} to={`/app/sacramental-journeys/${j.id}`} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{j.template?.name}</span>
                    <Badge variant={pct===100?'default':'outline'} className="text-[10px]">{done}/{total}</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full transition-all ${pct===100?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-primary'}`} style={{width:`${pct}%`}}/>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {hasBlocked && <span className="text-[10px] text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3"/>Bloqueado</span>}
                    {hasWaiting && <span className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>Aguardando</span>}
                    {!hasBlocked && !hasWaiting && pct===100 && <span className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>Pronto</span>}
                  </div>
                </Link>
              );
            })}
            </div>
          </div>
        )}

        {profile.documents?.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4"/>Documentos ({profile.documents.length})</h3>
            <div className="space-y-1">
              {profile.documents.map((d:any)=>(
                <div key={d.id} className="flex items-center justify-between text-sm py-1">
                  <button onClick={() => handleDownloadDocument(d.id, d.name)} className="text-primary hover:underline flex items-center gap-1 text-left">
                    <Download className="h-3 w-3" />{d.name}
                  </button>
                  <Badge variant={d.verifiedAt?'default':'secondary'} className="text-[10px]">{d.verifiedAt?'✓ Verificado':'Pendente'}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document upload section */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><FilePlus className="h-4 w-4"/>Documentos</h3>
          {!showDocUpload ? (
            <Button size="sm" variant="outline" onClick={() => setShowDocUpload(true)}>
              <FilePlus className="mr-1 h-3 w-3" />Novo documento
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1">
                  <option value="BAPTISM_CERTIFICATE">Cert. Batismo</option>
                  <option value="BIRTH_CERTIFICATE">Cert. Nascimento</option>
                  <option value="CONSENT_FORM">Autorização</option>
                  <option value="MARRIAGE_CERTIFICATE">Cert. Matrimônio</option>
                  <option value="PASTORAL_LETTER">Carta Pastoral</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={handleDocUpload} disabled={uploading || !docFile}>
                  <Upload className="mr-1 h-3 w-3" />{uploading ? 'Enviando...' : 'Enviar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowDocUpload(false); setDocFile(null); }}>Cancelar</Button>
              </div>
            </div>
          )}
          {profile.documents?.length === 0 && !showDocUpload && (
            <p className="text-xs text-muted-foreground mt-2">Nenhum documento. Envie certidões, formulários, etc.</p>
          )}
        </div>

        {/* Upload link for parents — only for coordinators/catechists */}
        {canEdit && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><Link2 className="h-4 w-4"/>Link de Envio para Responsáveis</h3>
          {!tokenData ? (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Gere um link temporário para que os pais/responsáveis possam enviar documentos sem precisar de login.</p>
              <Button size="sm" variant="outline" onClick={handleGenerateToken} disabled={generatingToken}>
                {generatingToken ? 'Gerando...' : 'Gerar Link de Envio'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input value={getUploadLink()} readOnly className="flex-1 h-9 rounded-md border border-input bg-muted/30 px-3 text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopyLink}><Copy className="mr-1 h-3 w-3" />Copiar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Válido até {tokenData.expires}. Compartilhe este link com o responsável.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </AppShell>
  );
}
