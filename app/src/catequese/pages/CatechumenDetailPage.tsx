import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Heart, BookOpen, FileText, CheckCircle, XCircle, Edit3, Gift, MessageCircle, FilePlus, Upload, Download, Link2, Copy, AlertTriangle, Cross, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { useQuery, getCatechumenProfile, listMeetings, getMeetingAttendance, createConversation, generateCatechumenUploadToken, getCatechumenAttendanceReport, justifyAbsence, deleteCatechumen } from 'wasp/client/operations';
import { fetchAuthenticatedDocument, uploadDocumentMultipart } from '../../client/utils/documentUpload';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { toast } from '../../client/hooks/use-toast';
import { calculatePoints } from '../../shared/gamification';
import { formatDateOnly, getAgeFromDate } from '../../i18n/format';

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border dark:border-blue-900/50',
    'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border dark:border-green-900/50',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border dark:border-amber-900/50',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 dark:border dark:border-purple-900/50',
    'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 dark:border dark:border-pink-900/50'
  ];

const DOC_TYPE_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'BAPTISM_CERTIFICATE',
  BIRTH_CERTIFICATE: 'BIRTH_CERTIFICATE',
  CONSENT_FORM: 'CONSENT_FORM',
  MARRIAGE_CERTIFICATE: 'MARRIAGE_CERTIFICATE',
  PASTORAL_LETTER: 'PASTORAL_LETTER',
  OTHER: 'OTHER',
};

const DOC_TYPE_SHORT_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'BAPTISM_SHORT',
  BIRTH_CERTIFICATE: 'BIRTH_SHORT',
  CONSENT_FORM: 'CONSENT_SHORT',
  MARRIAGE_CERTIFICATE: 'MARRIAGE_SHORT',
  PASTORAL_LETTER: 'PASTORAL_SHORT',
  OTHER: 'OTHER_SHORT',
};

export default function CatechumenDetailPage() {
  const { t } = useTranslation('common');
  const { t: tp } = useTranslation('parishes');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const { workspaceId } = useActiveWorkspace();
  const { data: profile, isLoading: loading, error: queryError } = useQuery(getCatechumenProfile, { id: id! });
  const canEdit = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'].includes(userRole);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docType, setDocType] = useState('BAPTISM_CERTIFICATE');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justifyNote, setJustifyNote] = useState('');
  const [savingJustify, setSavingJustify] = useState(false);
  const [tokenData, setTokenData] = useState<{ token: string; expires: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const docTypeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const [key, i18nKey] of Object.entries(DOC_TYPE_KEYS)) {
      labels[key] = t(`catechumens.doc_types.${i18nKey}`);
    }
    return labels;
  }, [t]);

  const handleDmGuardian = async (guardianUserId: string) => {
    const targetWorkspaceId = workspaceId || profile?.parish?.id;
    if (!targetWorkspaceId) {
      toast({ title: t('error'), description: t('try_again'), variant: 'destructive' });
      return;
    }
    try {
      const conv = await createConversation({
        type: 'DIRECT',
        parishId: targetWorkspaceId,
        participantUserIds: [guardianUserId],
      });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      toast({ title: t('catechumens.detail_chat_error', { message: e.message || t('try_again') }) });
    }
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      const blob = await fetchAuthenticatedDocument(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: t('catechumens.detail_download_error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleDocUpload = async () => {
    if (!docFile) return;
    setUploading(true);
    try {
      await uploadDocumentMultipart({
        file: docFile,
        name: docTypeLabels[docType] || docType,
        type: docType,
        catechumenProfileId: id!,
      });
      setDocFile(null);
      setShowDocUpload(false);
      toast({ title: t('catechumens.detail_document_sent') });
    } catch (e: any) {
      toast({ title: t('catechumens.detail_upload_error', { message: e.message || t('try_again') }) });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await generateCatechumenUploadToken({ catechumenProfileId: id! });
      setTokenData({ token: result.token, expires: new Date(result.expires).toLocaleDateString() });
      toast({ title: t('catechumens.detail_upload_link_success') });
    } catch (e: any) {
      toast({ title: `${t('error')}: ${e.message || t('try_again')}` });
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
      toast({ title: t('catechumens.detail_report_error', { message: e.message || t('try_again') }) });
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
      toast({ title: t('catechumens.detail_link_copied') });
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
  if(queryError) {
    const status = (queryError as any)?.status;
    const msg = (queryError as any)?.message || String(queryError);
    const isForbidden = status === 403 || msg?.includes('não tem acesso');
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <p className="text-lg font-semibold text-destructive">
              {isForbidden ? t('catechumens.detail_access_denied') : t('catechumens.detail_load_error')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{msg}</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/app/catechumens"><ArrowLeft className="mr-1 h-4 w-4"/>{t('catechumens.back_to_list')}</Link>
          </Button>
        </div>
    );
  }
  if(!profile)return <AppShell><div className="p-6 text-destructive">{t('not_found')}</div></AppShell>;

  const getAge=(bd:string)=>getAgeFromDate(bd);
  const age=getAge(profile.birthDate);
  const attendancePct=attendance.length?Math.round((attendance.filter((a:any)=>a.status==='PRESENT'||a.status==='JUSTIFIED').length/attendance.length)*100):null;

  const handleJustify = async () => {
    if (!justifyingId || !justifyNote.trim()) return;
    setSavingJustify(true);
    try {
      await justifyAbsence({ attendanceId: justifyingId, note: justifyNote.trim() });
      setAttendance(prev => prev.map((a: any) => a.id === justifyingId ? { ...a, status: 'JUSTIFIED' } : a));
      setJustifyingId(null);
      setJustifyNote('');
    } catch (e: any) {
      // Silently fail — attendance row stays the same
    } finally {
      setSavingJustify(false);
    }
  };

  const handleDeleteCatechumen = async () => {
    setDeleting(true);
    try {
      await deleteCatechumen({ id: id! });
      toast({ title: t('catechumens.deleted_success') });
      navigate('/app/catechumens');
    } catch (e: any) {
      toast({ title: t('error'), description: e?.message || t('try_again'), variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return(
    <>
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
            <p className="text-sm text-muted-foreground">{age && t('catechumens.years_old', { age })}{profile.birthDate && ` · ${formatDateOnly(profile.birthDate, 'pt-BR')}`}</p>
          </div>
          {canEdit && <Button size="sm" variant="outline" asChild><Link to={`/app/catechumens/${id}/edit`}><Edit3 className="mr-1 h-3 w-3"/>{t('edit')}</Link></Button>}
        </div>

        {attendancePct!==null&&(
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="text-center flex-1"><p className="text-2xl font-bold">{attendancePct}%</p><p className="text-xs text-muted-foreground">{t('catechumens.detail_presence')}</p></div>
            <div className="text-center flex-1"><p className="text-2xl font-bold">{profile.enrollments?.length||0}</p><p className="text-xs text-muted-foreground">{tp('classes')}</p></div>
            <div className="text-center flex-1"><p className="text-2xl font-bold">{profile.sacramentalJourneys?.length||0}</p><p className="text-xs text-muted-foreground">{t('catechumens.detail_journeys')}</p></div>
          </div>
        )}

        {attendance.length > 0 && (() => {
          const present = attendance.filter((a:any) => a.status === 'PRESENT' || a.status === 'LATE').length;
          const points = calculatePoints({ totalPresent: present, totalMeetings: attendance.length, quizzesCompleted: 0, quizzesPerfect: 0 });
          return (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Gift className="h-4 w-4 text-amber-500"/>{t('catechumens.detail_progress')}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-amber-500">{points}</span>
                <span className="text-xs text-muted-foreground">{t('catechumens.detail_points')}</span>
              </div>
              {attendancePct !== null && attendancePct >= 90 && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                  <span className="text-lg">🌟</span> {t('catechumens.detail_perfect_attendance')}
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2"><Heart className="h-4 w-4"/>{t('catechumens.detail_family')}</h3>
            <p className="font-medium">{profile.household?.name||t('catechumens.detail_not_linked')}</p>
            {profile.household?.guardians?.map((g:any)=>(
              <div key={g.id} className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{g.user?.firstName} {g.user?.lastName} {g.relationship&&`(${g.relationship})`}</p>
                <button onClick={() => handleDmGuardian(g.user?.id)} className="text-primary hover:text-primary/70 p-1" title={t('catechumens.detail_send_message')}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2"><BookOpen className="h-4 w-4"/>{tp('classes')}</h3>
            {profile.enrollments?.map((e:any)=><Link key={e.id} to={`/app/classes/${e.class?.id}`} className="block text-sm text-primary hover:underline py-0.5">{e.class?.name} {e.class?.stage?.name&&`· ${e.class.stage.name}`}</Link>)||<p className="text-sm text-muted-foreground">{t('catechumens.detail_none')}</p>}
          </div>
        </div>

        {attendance.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">{t('catechumens.detail_attendance_history')}</h3>
            <div className="space-y-1">
              {attendance.map((a:any)=>(
                <div key={a.id} className="flex items-center justify-between py-1 text-sm">
                  <div><span className="text-xs text-muted-foreground">{new Date(a.meetingDate).toLocaleDateString()}</span> <span className="font-medium">{a.meetingTitle||t('catechumens.detail_meeting')}</span><span className="text-overline text-muted-foreground ml-1">({a.className})</span></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status==='PRESENT'?'default':a.status==='ABSENT'?'destructive':'secondary'} className="text-overline">{a.status==='PRESENT'?t('catechumens.detail_present'):a.status==='ABSENT'?t('catechumens.detail_absent'):a.status}</Badge>
                    {(a.status === 'ABSENT' || a.status === 'LATE') && (
                      justifyingId === a.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleJustify(); }} className="flex items-center gap-1">
                          <input value={justifyNote} onChange={e => setJustifyNote(e.target.value)} placeholder={t('catechumens.detail_justify_reason')} className="h-7 w-28 rounded border px-2 text-xs" autoFocus />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs" disabled={savingJustify}>{savingJustify ? '...' : '✓'}</Button>
                          <button type="button" onClick={() => setJustifyingId(null)} className="text-xs text-muted-foreground">✕</button>
                        </form>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary" onClick={() => { setJustifyingId(a.id); setJustifyNote(''); }}>
                          {t('catechumens.detail_justify')}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              {!report ? (
                <Button size="sm" variant="outline" onClick={handleGenerateReport} disabled={loadingReport}>
                  <FileText className="mr-1 h-3 w-3"/>{loadingReport ? t('catechumens.detail_generating_report') : t('catechumens.detail_generate_report')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t('catechumens.detail_attendance_report')}</h4>
                    <Badge variant={report.riskLevel === 'ALTO' ? 'destructive' : report.riskLevel === 'MÉDIO' ? 'secondary' : 'default'} className="text-overline">
                      {t('catechumens.detail_risk', { level: report.riskLevel })}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalPresent}</p>
                      <p className="text-muted-foreground">{t('catechumens.detail_present_count')}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalAbsent}</p>
                      <p className="text-muted-foreground">{t('catechumens.detail_absent_count')}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-lg">{report.totalJustified}</p>
                      <p className="text-muted-foreground">{t('catechumens.detail_justified_count')}</p>
                    </div>
                  </div>
                  {report.maxConsecutiveAbsences >= 3 && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{t('catechumens.detail_consecutive_absences', { count: report.maxConsecutiveAbsences })}</p>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setReport(null)} className="text-xs">{t('catechumens.detail_close_report')}</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {profile.sacramentalJourneys?.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
              <Cross className="h-4 w-4 text-primary" />{t('catechumens.detail_sacramental_journeys')}
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
                    <Badge variant={pct===100?'default':'outline'} className="text-overline">{done}/{total}</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full transition-all ${pct===100?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-primary'}`} style={{width:`${pct}%`}}/>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {hasBlocked && <span className="text-overline text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3"/>{t('catechumens.detail_blocked')}</span>}
                    {hasWaiting && <span className="text-overline text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{t('catechumens.detail_waiting')}</span>}
                    {!hasBlocked && !hasWaiting && pct===100 && <span className="text-overline text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>{t('catechumens.detail_ready')}</span>}
                  </div>
                </Link>
              );
            })}
            </div>
          </div>
        )}

        {profile.documents?.length>0&&(
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4"/>{t('catechumens.detail_documents_count', { count: profile.documents.length })}</h3>
            <div className="space-y-1">
              {profile.documents.map((d:any)=>(
                <div key={d.id} className="flex items-center justify-between text-sm py-1">
                  <button onClick={() => handleDownloadDocument(d.id, d.name)} className="text-primary hover:underline flex items-center gap-1 text-left">
                    <Download className="h-3 w-3" />{d.name}
                  </button>
                  <Badge variant={d.verifiedAt?'default':'secondary'} className="text-overline">{d.verifiedAt?t('catechumens.detail_verified'):t('pending')}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><FilePlus className="h-4 w-4"/>{t('documents.title')}</h3>
          {!showDocUpload ? (
            <Button size="sm" variant="outline" onClick={() => setShowDocUpload(true)}>
              <FilePlus className="mr-1 h-3 w-3" />{t('catechumens.detail_new_document')}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1">
                  {Object.entries(DOC_TYPE_SHORT_KEYS).map(([value, i18nKey]) => (
                    <option key={value} value={value}>{t(`catechumens.doc_types.${i18nKey}`)}</option>
                  ))}
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
                  <Upload className="mr-1 h-3 w-3" />{uploading ? t('catechumens.detail_sending') : t('catechumens.detail_send')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowDocUpload(false); setDocFile(null); }}>{t('cancel')}</Button>
              </div>
            </div>
          )}
          {profile.documents?.length === 0 && !showDocUpload && (
            <p className="text-xs text-muted-foreground mt-2">{t('catechumens.detail_no_documents_hint')}</p>
          )}
        </div>

        {canEdit && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><Link2 className="h-4 w-4"/>{t('catechumens.detail_upload_link_title')}</h3>
          {!tokenData ? (
            <div>
              <p className="text-xs text-muted-foreground mb-3">{t('catechumens.detail_upload_link_desc')}</p>
              <Button size="sm" variant="outline" onClick={handleGenerateToken} disabled={generatingToken}>
                {generatingToken ? t('catechumens.detail_generating_link') : t('catechumens.detail_generate_link')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input value={getUploadLink()} readOnly className="flex-1 h-9 rounded-md border border-input bg-muted/30 px-3 text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopyLink}><Copy className="mr-1 h-3 w-3" />{t('catechumens.detail_copy')}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('catechumens.detail_link_valid_until', { date: tokenData.expires })}</p>
            </div>
          )}
        </div>
        )}

        {canEdit && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="font-semibold text-sm text-destructive mb-2">{t('catechumens.delete_title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('catechumens.delete_confirm_desc')}</p>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              {t('delete')}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteCatechumen}
        loading={deleting}
        variant="destructive"
        title={t('catechumens.delete_title')}
        description={t('catechumens.delete_confirm_desc')}
        confirmLabel={t('delete')}
      />
    </>
  );
}
