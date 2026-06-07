import { useParams, Link } from 'react-router';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Clock, Tag, Target, Send, CheckCircle, Archive, Eye, Plus, Puzzle, Edit3, Calendar, FileText, Trash2, Sparkles, Loader2, Printer, BookOpen, BookMarked } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getContentItem, listActivitiesByContent, updateContentStatus, createActivity, updateActivity, deleteActivity } from 'wasp/client/operations';
import { generateActivityForMeeting } from 'wasp/client/operations';
import { ActivityForm, ACTIVITY_TYPES, type ActivityType } from '../components/ActivityForm';

const statusVariant: Record<string,any>={DRAFT:'secondary',IN_REVIEW:'outline',APPROVED:'default',PUBLISHED:'default',ARCHIVED:'destructive'};
const statusLabel: Record<string,string>={DRAFT:'Rascunho',IN_REVIEW:'Em revisão',APPROVED:'Aprovado',PUBLISHED:'Publicado',ARCHIVED:'Arquivado'};

// ─── Helpers: parse/resume activity data ──────────────────────────────────

function parseData(data: string | null): any {
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}

function activityPreview(type: string, data: any): string {
  switch (type) {
    case 'QUIZ': return `${data?.questions?.length || 0} perguntas`;
    case 'OPEN_QUESTION': return data?.question ? 'Pergunta aberta' : 'Sem pergunta';
    case 'PARTICIPATION_CHECKLIST': return `${data?.items?.length || 0} itens`;
    case 'GUIDED_REFLECTION': return `${data?.prompts?.length || 0} perguntas p/ reflexão`;
    case 'GROUP_DYNAMIC': return `${data?.steps?.length || 0} passos`;
    case 'FAMILY_ACTIVITY': return data?.task ? 'Atividade descrita' : 'Sem descrição';
    case 'BIBLE_READING': return data?.reference || 'Leitura bíblica';
    case 'MATCHING': return `${data?.pairs?.length || 0} pares`;
    case 'TASK_WITH_ATTACHMENT': return data?.requiresUpload ? 'Requer upload' : 'Sem upload';
    case 'RITE_CELEBRATION': return data?.rite ? 'Rito descrito' : 'Sem descrição';
    default: return '';
  }
}

export default function ContentDetailPage(){
  const {id}=useParams<{id:string}>();
  const { data: item, isLoading: loading } = useQuery(getContentItem, { id: id! });
  const { data: activities = [] } = useQuery(listActivitiesByContent, { contentId: id! });
  const [tab, setTab] = useState<'meeting'|'activities'>('meeting');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  const changeStatus = async (status: string) => {
    await updateContentStatus({ id: id!, status });
  };

  const handleCreate = async (formData: { title: string; type: ActivityType; description: string; points: number; data: any }) => {
    await createActivity({
      contentId: id!,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      data: formData.data,
      points: formData.points,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleUpdate = async (formData: { title: string; type: ActivityType; description: string; points: number; data: any }) => {
    if (!editingId) return;
    await updateActivity({
      id: editingId,
      title: formData.title,
      description: formData.description,
      data: formData.data,
      points: formData.points,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Remover esta atividade?')) return;
    await deleteActivity({ id: activityId });
  };

  const handleGenerateAiActivity = async () => {
    setGeneratingAi(true);
    try {
      await generateActivityForMeeting({ contentId: id! });
      // The list will auto-refresh via Wasp's query cache
    } catch (e: any) {
      alert(e?.message || 'Erro ao gerar atividade.');
    } finally {
      setGeneratingAi(false);
    }
  };

  if(loading) return <AppShell><div className="max-w-3xl mx-auto space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded"/><div className="h-48 rounded-xl bg-muted"/></div></AppShell>;
  if(!item) return <AppShell><div className="p-6 text-destructive">Não encontrado.</div></AppShell>;

  const editingActivity = editingId ? activities.find((a: any) => a.id === editingId) : null;

  return(
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/content-library"><ArrowLeft className="h-5 w-5"/></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusVariant[item.status]||'secondary'}>{statusLabel[item.status]}</Badge>
              {item.estimatedTime&&<span className="text-sm text-muted-foreground"><Clock className="inline h-3 w-3 mr-1"/>{item.estimatedTime} min</span>}
              {item.createdBy&&<span className="text-xs text-muted-foreground">por {item.createdBy.firstName}</span>}
            </div>
          </div>
          <Button size="sm" variant="outline" asChild><Link to={`/app/content-library/${id}/edit`}><Edit3 className="mr-1 h-3 w-3"/>Editar</Link></Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/app/content-library/${id}/print`} className="gap-1">
              <Printer className="mr-1 h-3 w-3" /> Imprimir
            </Link>
          </Button>
        </div>

        {/* Status actions */}
        <div className="flex flex-wrap gap-2">
          {item.status==='DRAFT'&&<Button size="sm" variant="outline" onClick={()=>changeStatus('IN_REVIEW')}><Send className="mr-1 h-3 w-3"/>Enviar p/ revisão</Button>}
          {item.status==='IN_REVIEW'&&<><Button size="sm" onClick={()=>changeStatus('APPROVED')}><CheckCircle className="mr-1 h-3 w-3"/>Aprovar</Button><Button size="sm" variant="outline" onClick={()=>changeStatus('DRAFT')}>Voltar p/ rascunho</Button></>}
          {item.status==='APPROVED'&&<Button size="sm" onClick={()=>changeStatus('PUBLISHED')}><Eye className="mr-1 h-3 w-3"/>Publicar</Button>}
          {item.status==='PUBLISHED'&&<Button size="sm" variant="outline" onClick={()=>changeStatus('ARCHIVED')}><Archive className="mr-1 h-3 w-3"/>Arquivar</Button>}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button onClick={() => setTab('meeting')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'meeting' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <FileText className="h-4 w-4" /> Roteiro
          </button>
          <button onClick={() => setTab('activities')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Puzzle className="h-4 w-4" /> Atividades ({activities.length})
          </button>
        </div>

        {/* Tab: Roteiro */}
        {tab === 'meeting' && (
          <div className="space-y-5">
            {item.theme&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Tema</h3><p className="text-sm">{item.theme}</p></div>}
            {item.pastoralObjective&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1"><Target className="inline h-4 w-4 mr-1"/>Objetivo Pastoral</h3><p className="text-sm">{item.pastoralObjective}</p></div>}
            {item.openingPrayer&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Oração Inicial</h3><p className="text-sm italic">{item.openingPrayer}</p></div>}
            {item.closingPrayer&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Oração Final</h3><p className="text-sm italic">{item.closingPrayer}</p></div>}

            {/* Biblical reference text */}
            {item.biblicalRef&&<div className="rounded-xl border bg-primary/5 border-primary/20 p-4"><h3 className="text-xs font-medium text-primary uppercase mb-1 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />Referência Bíblica</h3><p className="text-sm whitespace-pre-line">{item.biblicalRef}</p></div>}

            {(item.bibleRefs?.length > 0 || item.catechismRefs?.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">Referências</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {item.bibleRefs?.map((ref: any) => (
                    <div key={ref.id} className="rounded-lg border bg-primary/5 p-3 text-sm">
                      <p className="font-medium text-primary text-xs mb-1">{ref.verse?.chapter?.book?.name||''} {ref.verse?.chapter?.number}:{ref.verse?.number}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{ref.verse?.text}</p>
                    </div>
                  ))}
                  {item.catechismRefs?.map((ref: any) => (
                    <div key={ref.id} className="rounded-lg border bg-secondary/5 p-3 text-sm">
                      <p className="font-medium text-secondary text-xs mb-1 flex items-center gap-1"><BookMarked className="h-3 w-3" />Catecismo §{ref.entry?.number}</p>
                      <p className="font-medium text-xs mb-1">{ref.entry?.question}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{ref.entry?.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.mainContent&&<div className="rounded-xl border bg-card p-6"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-3">Conteúdo Principal</h3><div className="whitespace-pre-wrap text-sm">{item.mainContent}</div></div>}
            {item.dynamic&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Dinâmica / Atividade</h3><p className="whitespace-pre-wrap text-sm">{item.dynamic}</p></div>}
            {item.activity&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Atividade</h3><p className="whitespace-pre-wrap text-sm">{item.activity}</p></div>}
            {item.familyTask&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Compromisso na Família</h3><p className="text-sm">{item.familyTask}</p></div>}
            {item.tags&&<div className="flex flex-wrap gap-1">{item.tags.split(',').map((t:string)=><span key={t} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"><Tag className="mr-1 h-3 w-3"/>{t.trim()}</span>)}</div>}

            {item.meetings?.length>0&&(
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Calendar className="h-4 w-4"/>Usado em {item.meetings.length} encontro(s)</h3>
                <div className="space-y-1">{item.meetings.map((m:any)=>(
                  <Link key={m.id} to={`/app/classes/${m.classId}/attendance`} className="flex justify-between text-sm hover:text-primary py-1">
                    <span>{m.title||'Encontro'}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                  </Link>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Atividades */}
        {tab === 'activities' && (
          <div className="space-y-4">
            {/* Add / Edit form */}
            {(showForm || editingId) ? (
              <ActivityForm
                initialType={editingActivity?.type as ActivityType || 'QUIZ'}
                initialTitle={editingActivity?.title || ''}
                initialDescription={editingActivity?.description || ''}
                initialPoints={editingActivity?.points || 10}
                initialData={editingActivity ? parseData(editingActivity.data) : undefined}
                onSubmit={editingId ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditingId(null); }}
                submitLabel={editingId ? 'Atualizar' : 'Criar atividade'}
              />
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nova atividade
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateAiActivity}
                  disabled={generatingAi}
                  className="gap-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                >
                  {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generatingAi ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
            )}

            {/* Activities list */}
            {activities.length === 0 && !showForm ? (
              <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4"><Puzzle className="h-8 w-8 text-primary"/></div>
                <h3 className="text-lg font-semibold">Nenhuma atividade</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Adicione quizzes, perguntas ou dinâmicas para os catequizandos responderem.
                </p>
                <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-1 h-4 w-4"/>Criar atividade
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((a: any) => {
                  const data = parseData(a.data);
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type}
                          </Badge>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {activityPreview(a.type, data)}
                          {a.points > 0 && ` · ${a.points} pts`}
                          {a.submissions?.length > 0 && ` · ${a.submissions.length} resposta(s)`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(a.id)}><Edit3 className="h-3 w-3"/></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3"/></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
