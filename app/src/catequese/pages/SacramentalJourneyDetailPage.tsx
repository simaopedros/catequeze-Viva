import { useParams, Link } from 'react-router';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, XCircle, FileText, User, Calendar, BookOpen, Cross, Pencil, Save, Upload, X } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getSacramentalJourney, updateMilestoneStatus, updateJourney } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-muted-foreground', label: 'Pendente' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-500', label: 'Em andamento' },
  WAITING_APPROVAL: { icon: AlertTriangle, color: 'text-amber-500', label: 'Aguardando aprovação' },
  APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'Aprovado' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'Rejeitado' },
  COMPLETED: { icon: CheckCircle, color: 'text-emerald-600', label: 'Concluído' },
};

export default function SacramentalJourneyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: journey, isLoading } = useQuery(getSacramentalJourney, { id: id! });
  const { userRole } = useUserContext();

  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isCatechist = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(userRole);
  const canManage = isCoordinator || isCatechist;

  // Local state for inline editing
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingTargetDate, setEditingTargetDate] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const handleUpdateStatus = async (milestoneId: string, status: string) => {
    try {
      await updateMilestoneStatus({ milestoneId, status });
      toast({ title: 'Marco atualizado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleSaveNotes = async (milestoneId: string) => {
    const notes = editingNotes[milestoneId];
    if (notes === undefined) return;
    try {
      await updateMilestoneStatus({ milestoneId, notes });
      toast({ title: 'Notas guardadas.' });
      setEditingNotes(prev => { const next = { ...prev }; delete next[milestoneId]; return next; });
    } catch (e: any) {
      toast({ title: 'Erro ao guardar notas', description: e.message, variant: 'destructive' });
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
      // Store as data URL for simplicity — in production this would upload to S3
      const evidenceUrl = `data:${file.type};base64,${base64}`;
      await updateMilestoneStatus({ milestoneId, evidenceUrl });
      toast({ title: 'Anexo enviado.' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar anexo', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSaveTargetDate = async () => {
    if (!id) return;
    try {
      await updateJourney({ id, targetDate: targetDateInput || null });
      toast({ title: 'Data do sacramento atualizada.' });
      setEditingTargetDate(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-64 bg-muted rounded"/><div className="grid gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  }

  if (!journey) {
    return <AppShell><div className="p-6 text-destructive">Jornada não encontrada.</div></AppShell>;
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
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/sacramental-journeys"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cross className="h-6 w-6 text-primary" />
              {journey.template?.sacrament?.name || journey.template?.name || 'Jornada Sacramental'}
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

        {/* Target date + progress */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Target sacrament date */}
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
                <Button size="sm" onClick={handleSaveTargetDate}><Save className="mr-1 h-3 w-3" />Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTargetDate(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">
                  {targetDate
                    ? `Data do sacramento: ${targetDate.toLocaleDateString('pt-BR')}`
                    : 'Data do sacramento não definida'}
                </span>
                {canManage && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setTargetDateInput(targetDate ? targetDate.toISOString().slice(0, 10) : ''); setEditingTargetDate(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm font-bold">{done}/{total} marcos · {pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              {blocked > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{blocked} rejeitado{blocked > 1 ? 's' : ''}</span>}
              {waitingApproval > 0 && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />{waitingApproval} aguardando aprovação</span>}
            </div>
          </div>
        </div>

        {/* Milestone timeline */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Marcos</h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum marco definido neste modelo.</p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m: any, idx: number) => {
                const config = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING;
                const Icon = config.icon;
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
                        <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                            {tm?.name}
                            {tm?.required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
                            {isEvidenceRequired && <Badge variant="outline" className="text-[10px]">Evidência</Badge>}
                            {isOverdue && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Atrasado</Badge>}
                          </p>
                          {tm?.description && <p className="text-xs text-muted-foreground mt-0.5">{tm.description}</p>}
                          {deadline && (
                            <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              Prazo: {deadline.toLocaleDateString('pt-BR')}
                              {isOverdue && ' — vencido'}
                            </p>
                          )}

                          {/* Notes — editable inline */}
                          {isEditingNotes ? (
                            <div className="mt-2 space-y-1">
                              <textarea
                                value={editingNotes[m.id] || ''}
                                onChange={e => setEditingNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1 min-h-[40px]"
                                placeholder="Adicionar notas..."
                                rows={2}
                              />
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleSaveNotes(m.id)}><Save className="mr-1 h-3 w-3" />Guardar</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingNotes(prev => { const next = { ...prev }; delete next[m.id]; return next; })}><X className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1">
                              {m.notes ? (
                                <p className="text-xs italic text-muted-foreground border-l-2 border-muted pl-2">{m.notes}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground/50 italic">Sem notas</p>
                              )}
                              {canManage && (
                                <Button size="sm" variant="ghost" className="h-5 text-[10px] mt-0.5" onClick={() => setEditingNotes(prev => ({ ...prev, [m.id]: m.notes || '' }))}>
                                  <Pencil className="mr-1 h-2.5 w-2.5" />Editar notas
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Evidence / attachment */}
                          {isEvidenceRequired && (
                            <div className="mt-2">
                              {m.evidenceUrl ? (
                                <div className="flex items-center gap-2">
                                  <a href={m.evidenceUrl} className="text-xs text-primary hover:underline flex items-center gap-1" target="_blank" rel="noreferrer">
                                    <FileText className="h-3 w-3" />Ver evidência
                                  </a>
                                  {canManage && (
                                    <label className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                                      <Upload className="h-3 w-3 inline mr-0.5" />Substituir
                                      <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(m.id, f); }} />
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <label className={`cursor-pointer text-xs flex items-center gap-1 ${uploadingFor === m.id ? 'text-muted-foreground' : 'text-primary hover:underline'}`}>
                                  {uploadingFor === m.id ? (
                                    <><Clock className="h-3 w-3 animate-spin" />A enviar...</>
                                  ) : (
                                    <><Upload className="h-3 w-3" />Enviar evidência</>
                                  )}
                                  <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(m.id, f); }} disabled={uploadingFor === m.id} />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status badge + actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${m.status === 'COMPLETED' || m.status === 'APPROVED' ? 'border-green-300 text-green-700' : m.status === 'REJECTED' ? 'border-red-300 text-red-700' : ''}`}>
                          {config.label}
                        </Badge>

                        {canManage && m.status !== 'COMPLETED' && m.status !== 'APPROVED' && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600" onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}>
                            ✓ Concluir
                          </Button>
                        )}
                        {isCoordinator && m.status === 'WAITING_APPROVAL' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600" onClick={() => handleUpdateStatus(m.id, 'APPROVED')}>
                              ✓ Aprovar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500" onClick={() => handleUpdateStatus(m.id, 'REJECTED')}>
                              ✗ Rejeitar
                            </Button>
                          </>
                        )}
                        {canManage && (m.status === 'COMPLETED' || m.status === 'APPROVED') && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleUpdateStatus(m.id, 'PENDING')}>
                            Desfazer
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

        {/* Template info */}
        {journey.template?.parish && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><BookOpen className="h-4 w-4" />Modelo</h3>
            <p className="text-sm">{journey.template.name}</p>
            <p className="text-xs text-muted-foreground">
              {journey.template.parish.type === 'PERSONAL' ? 'Modelo pessoal' :
               journey.template.parish.type === 'PARISH' ? `Paróquia: ${journey.template.parish.name}` :
               journey.template.parish.type === 'DIOCESE' ? `Diocese: ${journey.template.parish.name}` :
               'Modelo global'}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
