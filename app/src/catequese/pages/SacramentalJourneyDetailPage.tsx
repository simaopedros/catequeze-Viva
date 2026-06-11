import { useParams, Link } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, XCircle, FileText, User, Calendar, BookOpen, Cross, Pencil, Save, Upload, X } from 'lucide-react';
import { AppShell } from '../AppShell';
import { EmptyState } from '../../client/components/EmptyState';
import { useQuery, getSacramentalJourney, updateMilestoneStatus, updateJourney } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';
import { useSacramentMilestoneStatusMap } from '../../i18n/useLabels';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  PENDING: Clock,
  IN_PROGRESS: Clock,
  WAITING_APPROVAL: AlertTriangle,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  COMPLETED: CheckCircle,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-muted-foreground',
  IN_PROGRESS: 'text-blue-500',
  WAITING_APPROVAL: 'text-amber-500',
  APPROVED: 'text-green-500',
  REJECTED: 'text-red-500',
  COMPLETED: 'text-emerald-600',
};

export default function SacramentalJourneyDetailPage() {
  const { t } = useTranslation('sacraments');
  const { t: tc } = useTranslation('common');
  const statusMap = useSacramentMilestoneStatusMap();
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { data: journey, isLoading } = useQuery(getSacramentalJourney, { id: id! });
  const { userRole } = useUserContext();

  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isCatechist = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(userRole);
  const canManage = isCoordinator || isCatechist;

  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingTargetDate, setEditingTargetDate] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const handleUpdateStatus = async (milestoneId: string, status: string) => {
    try {
      await updateMilestoneStatus({ milestoneId, status });
      toast({ title: t('detail.milestone_updated') });
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message || tc('error_generic'), variant: 'destructive' });
    }
  };

  const handleSaveNotes = async (milestoneId: string) => {
    const notes = editingNotes[milestoneId];
    if (notes === undefined) return;
    try {
      await updateMilestoneStatus({ milestoneId, notes });
      toast({ title: t('detail.notes_saved') });
      setEditingNotes(prev => { const next = { ...prev }; delete next[milestoneId]; return next; });
    } catch (e: any) {
      toast({ title: t('detail.notes_error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (milestoneId: string, file: File) => {
    setUploadingFor(milestoneId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const evidenceUrl = `data:${file.type};base64,${base64}`;
      await updateMilestoneStatus({ milestoneId, evidenceUrl });
      toast({ title: t('detail.attachment_sent') });
    } catch (e: any) {
      toast({ title: t('detail.attachment_error'), description: e.message, variant: 'destructive' });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSaveTargetDate = async () => {
    if (!id) return;
    try {
      await updateJourney({ id, targetDate: targetDateInput || null });
      toast({ title: t('detail.sacrament_date_updated') });
      setEditingTargetDate(false);
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-64 bg-muted rounded"/><div className="grid gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  }

  if (!journey) {
    return <AppShell><div className="p-6 text-destructive">{t('detail.not_found')}</div></AppShell>;
  }

  const milestones = journey.milestones || [];
  const total = milestones.length;
  const done = milestones.filter((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const blocked = milestones.filter((m: any) => m.status === 'REJECTED').length;
  const waitingApproval = milestones.filter((m: any) => m.status === 'WAITING_APPROVAL').length;
  const targetDate = journey.targetDate ? new Date(journey.targetDate) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/sacramental-journeys"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cross className="h-6 w-6 text-primary" />
              {journey.template?.sacrament?.name || journey.template?.name || t('detail.journey_default')}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Link to={`/app/catechumens/${journey.catechumenProfile?.id}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <User className="h-3 w-3" />
                {journey.catechumenProfile?.firstName} {journey.catechumenProfile?.lastName}
              </Link>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{journey.template?.name}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {editingTargetDate ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={targetDateInput}
                  onChange={e => setTargetDateInput(e.target.value)}
                  className="flex h-8 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button size="sm" onClick={handleSaveTargetDate}><Save className="mr-1 h-3 w-3" />{tc('save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTargetDate(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">
                  {targetDate
                    ? t('detail.sacrament_date', { date: formatDate(targetDate, currentLocale) })
                    : t('detail.sacrament_date_undefined')}
                </span>
                {canManage && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setTargetDateInput(targetDate ? targetDate.toISOString().slice(0, 10) : ''); setEditingTargetDate(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('detail.progress')}</span>
              <span className="text-sm font-bold">{t('detail.progress_count', { done, total, pct })}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              {blocked > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{blocked > 1 ? t('detail.rejected_count_plural', { count: blocked }) : t('detail.rejected_count', { count: blocked })}</span>}
              {waitingApproval > 0 && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />{t('detail.waiting_approval_count', { count: waitingApproval })}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('milestones')}</h2>
          {milestones.length === 0 ? (
            <EmptyState icon={CheckCircle} title={t('detail.no_milestones')} compact />
          ) : (
            <div className="space-y-2">
              {milestones.map((m: any) => {
                const Icon = STATUS_ICONS[m.status] || STATUS_ICONS.PENDING;
                const color = STATUS_COLORS[m.status] || STATUS_COLORS.PENDING;
                const statusLabel = statusMap[m.status as keyof typeof statusMap]?.label || m.status;
                const tm = m.templateMilestone;
                const isEvidenceRequired = tm?.evidenceRequired;
                const daysBefore = tm?.daysBeforeSacrament;
                const isEditingNotes = editingNotes[m.id] !== undefined;
                const deadline = targetDate && daysBefore
                  ? new Date(targetDate.getTime() - daysBefore * 24 * 60 * 60 * 1000)
                  : null;
                const isOverdue = deadline && deadline < new Date() && m.status !== 'COMPLETED' && m.status !== 'APPROVED';

                return (
                  <div key={m.id} className={`rounded-lg border p-4 ${m.status === 'REJECTED' ? 'border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10' : m.status === 'APPROVED' || m.status === 'COMPLETED' ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10' : isOverdue ? 'border-amber-300 bg-amber-50/30' : 'bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                            {tm?.name}
                            {tm?.required && <Badge variant="outline" className="text-[10px]">{t('required')}</Badge>}
                            {isEvidenceRequired && <Badge variant="outline" className="text-[10px]">{t('evidence')}</Badge>}
                            {isOverdue && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">{t('detail.overdue')}</Badge>}
                          </p>
                          {tm?.description && <p className="text-xs text-muted-foreground mt-0.5">{tm.description}</p>}
                          {deadline && (
                            <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {t('detail.deadline', { date: formatDate(deadline, currentLocale) })}
                              {isOverdue && t('detail.deadline_overdue')}
                            </p>
                          )}

                          {isEditingNotes ? (
                            <div className="mt-2 space-y-1">
                              <textarea
                                value={editingNotes[m.id] || ''}
                                onChange={e => setEditingNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1 min-h-[40px]"
                                placeholder={t('detail.add_notes')}
                                rows={2}
                              />
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleSaveNotes(m.id)}><Save className="mr-1 h-3 w-3" />{tc('save')}</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingNotes(prev => { const next = { ...prev }; delete next[m.id]; return next; })}><X className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1">
                              {m.notes ? (
                                <p className="text-xs italic text-muted-foreground border-l-2 border-muted pl-2">{m.notes}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground/50 italic">{t('detail.no_notes')}</p>
                              )}
                              {canManage && (
                                <Button size="sm" variant="ghost" className="h-5 text-[10px] mt-0.5" onClick={() => setEditingNotes(prev => ({ ...prev, [m.id]: m.notes || '' }))}>
                                  <Pencil className="mr-1 h-2.5 w-2.5" />{t('detail.edit_notes')}
                                </Button>
                              )}
                            </div>
                          )}

                          {isEvidenceRequired && (
                            <div className="mt-2">
                              {m.evidenceUrl ? (
                                <div className="flex items-center gap-2">
                                  <a href={m.evidenceUrl} className="text-xs text-primary hover:underline flex items-center gap-1" target="_blank" rel="noreferrer">
                                    <FileText className="h-3 w-3" />{t('detail.view_evidence')}
                                  </a>
                                  {canManage && (
                                    <label className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                                      <Upload className="h-3 w-3 inline mr-0.5" />{t('detail.replace')}
                                      <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(m.id, f); }} />
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <label className={`cursor-pointer text-xs flex items-center gap-1 ${uploadingFor === m.id ? 'text-muted-foreground' : 'text-primary hover:underline'}`}>
                                  {uploadingFor === m.id ? (
                                    <><Clock className="h-3 w-3 animate-spin" />{t('detail.uploading')}</>
                                  ) : (
                                    <><Upload className="h-3 w-3" />{t('detail.upload_evidence')}</>
                                  )}
                                  <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(m.id, f); }} disabled={uploadingFor === m.id} />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${m.status === 'COMPLETED' || m.status === 'APPROVED' ? 'border-green-300 text-green-700' : m.status === 'REJECTED' ? 'border-red-300 text-red-700' : ''}`}>
                          {statusLabel}
                        </Badge>

                        {isCatechist && m.status !== 'COMPLETED' && m.status !== 'APPROVED' && m.status !== 'WAITING_APPROVAL' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600" onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}>
                              ✓ {t('detail.complete')}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-amber-600" onClick={() => handleUpdateStatus(m.id, 'WAITING_APPROVAL')}>
                              {t('detail.send_for_approval')}
                            </Button>
                          </>
                        )}

                        {isCoordinator && m.status !== 'COMPLETED' && m.status !== 'APPROVED' && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600" onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}>
                            ✓ {t('detail.complete')}
                          </Button>
                        )}

                        {isCoordinator && m.status === 'WAITING_APPROVAL' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600" onClick={() => handleUpdateStatus(m.id, 'APPROVED')}>
                              ✓ {t('detail.status.approved')}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500" onClick={() => handleUpdateStatus(m.id, 'REJECTED')}>
                              ✗ {t('detail.reject')}
                            </Button>
                          </>
                        )}

                        {(isCoordinator || isCatechist) && (m.status === 'COMPLETED' || (isCoordinator && m.status === 'APPROVED')) && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleUpdateStatus(m.id, 'PENDING')}>
                            {t('detail.undo')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {journey.template?.parish && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><BookOpen className="h-4 w-4" />{t('detail.template')}</h3>
            <p className="text-sm">{journey.template.name}</p>
            <p className="text-xs text-muted-foreground">
              {journey.template.parish.type === 'PERSONAL' ? t('detail.template_personal') :
               journey.template.parish.type === 'PARISH' ? t('detail.template_parish', { name: journey.template.parish.name }) :
               journey.template.parish.type === 'DIOCESE' ? t('detail.template_diocese', { name: journey.template.parish.name }) :
               t('detail.template_global')}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
