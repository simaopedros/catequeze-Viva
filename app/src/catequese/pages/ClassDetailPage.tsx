import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, UserPlus, Users, MapPin, Clock, ClipboardList, TrendingUp, XCircle, Calendar, MessageCircle, BookOpen, Building2, Pencil, Check, X, Trash2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getClassDetails, listCatechumens, enrollCatechumen, updateClass, getOrCreateClassChat, cancelEnrollment, addAssistantCatechist, removeCatechistFromClass, listParishCatechists, getMonthlyPlan } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { getPlanLimits, getEffectiveBillingPlan, isBillingActive } from '../../shared/planLimits';
import { PlanLimitBanner } from '../components/PlanLimitBanner';
import { handlePlanLimitError } from '../lib/planLimitToast';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';
import SendAnnouncementButton from '../components/SendAnnouncementButton';

const STATUS_OPTS = [
  { status:'ACTIVE', label:'Ativar', variant:'default' as const },
  { status:'PAUSED', label:'Pausar', variant:'outline' as const },
  { status:'CONCLUDED', label:'Concluir', variant:'outline' as const },
];

const CLASS_STATUS_MAP: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  CONCLUDED: 'Concluída',
  DRAFT: 'Rascunho',
};

const DAY_NAMES: Record<string, string> = {
  '0': 'Domingo',
  '1': 'Segunda-feira',
  '2': 'Terça-feira',
  '3': 'Quarta-feira',
  '4': 'Quinta-feira',
  '5': 'Sexta-feira',
  '6': 'Sábado',
};

const DAY_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cls, isLoading: loading } = useQuery(getClassDetails, { id: id! });
  const { data: allCatechumens = [] } = useQuery(listCatechumens);
  const { data: user } = useAuth();
  const { userRole, parishId } = useUserContext();
  const { availableParishes } = useActiveParish();
  const { data: parishCatechists = [] } = useQuery(listParishCatechists, { parishId: cls?.parish?.id || '' }, { enabled: !!cls?.parish?.id });
  const [tab,setTab]=useState<'inscritos'|'encontros'|'catequistas'|'planejamento'>('inscritos');
  const [monthlyPlan, setMonthlyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [unenrollConfirm, setUnenrollConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [removeCatechistTarget, setRemoveCatechistTarget] = useState<string | null>(null);
  const [showAddCatechist, setShowAddCatechist] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addingCatechist, setAddingCatechist] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDay, setEditDay] = useState('6');
  const [editStart, setEditStart] = useState('09:00');
  const [editEnd, setEditEnd] = useState('10:30');
  const [editLocation, setEditLocation] = useState('');
  const [editCapacity, setEditCapacity] = useState(30);
  const [savingEdit, setSavingEdit] = useState(false);

  const parishBilling = availableParishes.find((p: any) => p.id === cls?.parish?.id)?.billing;
  const effectivePlan = getEffectiveBillingPlan(parishBilling);
  const limits = getPlanLimits(effectivePlan);
  const isParishManaged = !user?.subscriptionPlan && isBillingActive(parishBilling);

  // Sync edit fields when class data loads
  useEffect(() => {
    if (cls) {
      setEditName(cls.name || '');
      setEditDay(cls.dayOfWeek || '6');
      setEditStart(cls.startTime || '09:00');
      setEditEnd(cls.endTime || '10:30');
      setEditLocation(cls.location || '');
      setEditCapacity(cls.maxCapacity || 30);
    }
  }, [cls]);

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateClass({
        id,
        name: editName.trim(),
        dayOfWeek: editDay,
        startTime: editStart,
        endTime: editEnd,
        location: editLocation || undefined,
        maxCapacity: editCapacity,
      });
      toast({ title: 'Turma atualizada.' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEnroll=async(cid:string)=>{
    try{await enrollCatechumen({classId:id!,catechumenProfileId:cid}); toast({title:'Catequizando inscrito.'});}catch(e:any){
      if (handlePlanLimitError(e.message || e)) return;
      toast({title:'Erro ao inscrever', description: (e as any).message || 'Tente novamente.', variant:'destructive'});
    }
  };
  const handleUnenroll=(enrollmentId: string)=>{
    setUnenrollConfirm(enrollmentId);
  };
  const confirmUnenroll=async()=>{
    if(!unenrollConfirm||!id)return;
    const enrollmentId = unenrollConfirm;
    setUnenrollConfirm(null);
    try{await cancelEnrollment({enrollmentId});toast({title:'Catequizando removido.'});}catch(e:any){
      if(handlePlanLimitError(e.message||e))return;
      toast({title:'Erro ao remover',description:(e as any).message||'Tente novamente.',variant:'destructive'});
    }
  };
  const handleStatus=(status:string)=>{
    if (status==='CONCLUDED') {
      setStatusConfirm(status);
    } else {
      updateClass({id,status});
    }
  };
  const confirmStatus=async()=>{
    if(!statusConfirm)return;
    const status = statusConfirm;
    setStatusConfirm(null);
    await updateClass({id,status});
    toast({title:'Turma concluída.'});
  };
  const handleOpenChat=async()=>{
    setChatting(true);
    try {
      const { conversationId } = await getOrCreateClassChat({ classId: id! });
      navigate(`/app/messages?c=${conversationId}`);
    } catch (e: any) {
      toast({title:'Erro ao abrir chat',description:'Tente novamente.',variant:'destructive'});
    } finally {
      setChatting(false);
    }
  };

  const handleLoadMonthlyPlan = async () => {
    if (monthlyPlan || loadingPlan) return;
    setLoadingPlan(true);
    try {
      const plan = await getMonthlyPlan({ classId: id! });
      setMonthlyPlan(plan);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar planejamento', description: e.message, variant: 'destructive' });
    }
    setLoadingPlan(false);
  };

  const handleAddCatechist = async () => {
    if (!addUserId) return;
    setAddingCatechist(true);
    try {
      await addAssistantCatechist({ classId: id!, userId: addUserId });
      toast({ title: 'Catequista adicionado!' });
      setAddUserId('');
      setShowAddCatechist(false);
      // Refetch class details
      window.location.reload();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Não foi possível adicionar.', variant: 'destructive' });
    } finally {
      setAddingCatechist(false);
    }
  };

  const handleRemoveCatechist = async () => {
    if (!removeCatechistTarget) return;
    try {
      await removeCatechistFromClass({ classId: id!, userId: removeCatechistTarget });
      toast({ title: 'Catequista removido!' });
      setRemoveCatechistTarget(null);
      window.location.reload();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Não foi possível remover.', variant: 'destructive' });
    }
  };

  // Check if current user can manage catechists
  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(userRole);
  const isLeadCatechist = !!(cls?.catechists || []).find((cc: any) => cc.userId === user?.id && cc.role === 'LEAD');
  const isClassCatechist = !!(cls?.catechists || []).find((cc: any) => cc.userId === user?.id);
  const canManageClass = isCoordinator || isLeadCatechist;
  const canManageCatechists = isCoordinator || isLeadCatechist;
  const canEnroll = isCoordinator || isClassCatechist;

  // Filter parish catechists not already in the class
  const classCatechistUserIds = new Set((cls?.catechists || []).map((cc: any) => cc.userId));
  const availableCatechists = parishCatechists.filter((m: any) => !classCatechistUserIds.has(m.userId));

  if(loading)return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded"/><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-20 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  if(!cls)return <AppShell><div className="p-6 text-destructive">Turma não encontrada.</div></AppShell>;

  const enrolled=cls.enrollments||[];
  const enrolledIds=enrolled.map((e:any)=>e.catechumenProfile?.id);
  const available=allCatechumens.filter((c:any)=>!enrolledIds.includes(c.id));

  const isCatechumenLimitReached = limits.maxCatechumens !== null && enrolled.length >= limits.maxCatechumens;  

  // Calculate attendance rate from meetings
  let attendanceRate=0;
  if(cls.meetings?.length){
    const total=cls.meetings.reduce((s:number,m:any)=>s+(m.attendance?.length||0),0);
    const present=cls.meetings.reduce((s:number,m:any)=>s+(m.attendance?.filter((a:any)=>a.status==='PRESENT').length||0),0);
    if(total>0)attendanceRate=Math.round((present/total)*100);
  }

  return(
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/classes"><ArrowLeft className="h-5 w-5"/></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_OPTS.find(s=>s.status===cls.status)?.variant||'secondary'}>{CLASS_STATUS_MAP[cls.status] || cls.status}</Badge>
              {cls.stage&&<span className="text-sm text-muted-foreground">{cls.stage.name}</span>}
              {cls.community && (
                <Link to={`/app/communities/${cls.community.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  <Building2 className="h-3 w-3" />
                  {cls.community.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canManageClass && STATUS_OPTS.filter(s=>s.status!==cls.status).map(s=>(
              <Button key={s.status} size="sm" variant={s.variant} onClick={()=>handleStatus(s.status)}>{s.label}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={handleOpenChat} disabled={chatting}>
              <MessageCircle className="mr-1 h-3 w-3"/>{chatting ? '...' : 'Chat'}
            </Button>
            <Button asChild variant="outline" size="sm"><Link to={`/app/classes/${id}/attendance`}><ClipboardList className="mr-1 h-3 w-3"/>Presença</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/app/classes/${id}/meetings`}><Calendar className="mr-1 h-3 w-3"/>Encontros</Link></Button>
            {canManageClass && <SendAnnouncementButton classId={id!} className={cls.name} />}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4"><div className="text-xs
 text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>Local</div><p className="font-medium text-sm">{cls.location||'—'}</p></div>        
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>Horário</div><p className="font-medium text-sm">{DAY_NAMES[cls.dayOfWeek] || cls.dayOfWeek} {cls.startTime}{cls.endTime&&`-${cls.endTime}`}</p></div>
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/>Inscritos</div><p className="font-medium text-sm">{enrolledIds.length}/{cls.maxCapacity}</p></div>
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3"/>Presença</div><p className="font-medium text-sm">{attendanceRate}%</p></div>
        </div>

        {/* Edit section */}
        {editing ? (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Pencil className="h-4 w-4"/>Editar Turma</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Nome</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Dia da semana</label>
                <select value={editDay} onChange={e => setEditDay(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                  {DAY_OPTIONS.map((d: any) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Vagas</label>
                <input type="number" min={1} max={200} value={editCapacity} onChange={e => setEditCapacity(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Início</label>
                <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Término</label>
                <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Local</label>
                <input value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" placeholder={cls.location || 'Ex: Salão paroquial'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="mr-1 h-3 w-3"/>Cancelar</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
                <Check className="mr-1 h-3 w-3"/>{savingEdit ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        ) : (
          canManageClass && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3"/>Editar turma
            </Button>
          </div>
          )
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-2">
          {[{id:'inscritos',l:`Inscritos (${enrolledIds.length})`},{id:'encontros',l:`Encontros (${cls.meetings?.length||0})`},{id:'catequistas',l:`Catequistas (${cls.catechists?.length||0})`},{id:'planejamento',l:'Planejamento'}].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id as any); if(t.id === 'planejamento' && !monthlyPlan) handleLoadMonthlyPlan();}} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab===t.id?'border-b-2 border-primary text-primary':'text-muted-foreground hover:text-foreground'}`}>{t.l}</button>
          ))}
        </div>

        {/* Tab: Inscritos */}
        {tab==='inscritos'&&(
          <div>
            {enrolled.length===0?<p className="text-sm text-muted-foreground py-4">Nenhum catequizando inscrito.</p>:
              <div className="grid gap-2">{enrolled.map((e:any)=>(
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <Link to={`/app/catechumens/${e.catechumenProfile?.id}`} className="flex items-center gap-3 hover:text-primary">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">{e.catechumenProfile?.firstName?.[0]}{e.catechumenProfile?.lastName?.[0]}</div>
                    <span className="text-sm font-medium">{e.catechumenProfile?.firstName} {e.catechumenProfile?.lastName}</span>
                  </Link>
                  {canEnroll && <button onClick={()=>handleUnenroll(e.id)} className="text-muted-foreground hover:text-destructive p-1"><XCircle className="h-4 w-4"/></button>}
                </div>
              ))}</div>}
            {isCatechumenLimitReached ? (
              <div className="mt-6">
                <PlanLimitBanner type="catechumen_limit" currentCount={enrolled.length} userPlan={effectivePlan} isParishManaged={isParishManaged} />
              </div>
            ) : available.length > 0 && canEnroll && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm mb-2">Disponíveis para matricular ({available.length})</h3>
                <div className="grid gap-2">{available.map((c:any)=>(
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">{c.firstName?.[0]}{c.lastName?.[0]}</div><span className="text-sm">{c.firstName} {c.lastName}</span></div>
                    <Button size="sm" variant="outline" onClick={()=>handleEnroll(c.id)}><UserPlus className="mr-1 h-3 w-3"/>Matricular</Button>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Encontros */}
        {tab==='encontros'&&(
          <div>
            {!cls.meetings?.length?<p className="text-sm text-muted-foreground py-4">Nenhum encontro registrado.</p>:
              <div className="grid gap-2">{cls.meetings.map((m:any)=>(
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{m.title||'Sem título'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>{new Date(m.date).toLocaleDateString()}</p>
                      {m.content && (
                        <Link to={`/app/content-library/${m.content.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <BookOpen className="h-3 w-3"/>{m.content.title}
                        </Link>
                      )}
                      {!m.content && (
                        <span className="text-xs text-muted-foreground italic">Nenhum material associado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m._count?.attendance||0} registros</Badge>
                    <Link to={`/app/classes/${id}/attendance`} className="text-xs text-primary hover:underline">Presença</Link>
                  </div>
                </div>
              ))}</div>}
            {canManageClass && <Button className="mt-4" size="sm" asChild variant="outline"><Link to={`/app/classes/${id}/meetings`}><Calendar className="mr-1 h-3 w-3"/>Gerenciar encontros</Link></Button>}
          </div>
        )}

        {/* Tab: Catequistas */}
        {tab==='catequistas'&&(
          <div className="space-y-4">
            {/* Add catechist section */}
            {canManageCatechists && (
              <div>
                {!showAddCatechist ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAddCatechist(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar catequista
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <select
                      value={addUserId}
                      onChange={e => setAddUserId(e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecionar catequista...</option>
                      {availableCatechists.map((m: any) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user?.firstName} {m.user?.lastName} — {m.role === 'LEAD_CATECHIST' ? 'Catequista Resp.' : m.role === 'ASSISTANT_CATECHIST' ? 'Auxiliar' : 'Coordenador'}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleAddCatechist} disabled={!addUserId || addingCatechist}>
                      {addingCatechist ? '...' : 'Adicionar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddCatechist(false); setAddUserId(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {availableCatechists.length === 0 && showAddCatechist && (
                  <p className="text-xs text-muted-foreground mt-1">Todos os catequistas da paróquia já estão vinculados.</p>
                )}
              </div>
            )}

            {!cls.catechists?.length ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum catequista vinculado.</p>
            ) : (
              <div className="grid gap-2">
                {cls.catechists.map((cc: any) => {
                  const canRemove = isCoordinator || (isLeadCatechist && cc.role === 'ASSISTANT') || (cc.userId === user?.id && cc.role === 'ASSISTANT');
                  return (
                    <div key={cc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {cc.user?.firstName?.[0]}{cc.user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cc.user?.firstName} {cc.user?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{cc.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cc.role==='LEAD'?'default':'secondary'}>
                          {cc.role==='LEAD'?'Responsável':'Auxiliar'}
                        </Badge>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveCatechistTarget(cc.userId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Planejamento */}
        {tab === 'planejamento' && (
          <div>
            {loadingPlan ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Clock className="h-4 w-4 animate-spin"/>Carregando planejamento...
              </div>
            ) : monthlyPlan ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Calendar className="h-5 w-5"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {new Date(monthlyPlan.year, monthlyPlan.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-muted-foreground">{monthlyPlan.totalMeetings} encontros este mês</p>
                  </div>
                </div>

                {monthlyPlan.weeks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum encontro agendado para este mês.</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyPlan.weeks.map((week: any, wi: number) => (
                      <div key={wi} className="rounded-lg border bg-card p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Semana de {new Date(week.weekStart).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        </p>
                        <div className="space-y-1">
                          {week.meetings.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {new Date(m.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                                </Badge>
                                <span className="font-medium">{m.title || 'Sem título'}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{m.attendanceCount} registros</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {monthlyPlan.availableContent?.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <BookOpen className="h-3 w-3"/>Conteúdos disponíveis
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {monthlyPlan.availableContent.slice(0, 8).map((c: any) => (
                        <Link key={c.id} to={`/app/content-library/${c.id}`} className="text-xs bg-muted px-2 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                          {c.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Não foi possível carregar o planejamento.</p>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!unenrollConfirm}
        onOpenChange={(open) => { if (!open) setUnenrollConfirm(null); }}
        title="Remover catequizando"
        description="Tens a certeza que queres remover este catequizando da turma? Os históricos de presença serão arquivados."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmUnenroll}
      />
      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => { if (!open) setStatusConfirm(null); }}
        title="Concluir turma"
        description="Tens a certeza que queres concluir esta turma? A turma será arquivada e não aceitará novas inscrições."
        confirmLabel="Concluir turma"
        variant="destructive"
        onConfirm={confirmStatus}
      />
      <ConfirmDialog
        open={!!removeCatechistTarget}
        onOpenChange={(open) => { if (!open) setRemoveCatechistTarget(null); }}
        title="Remover catequista"
        description="Tens a certeza que queres remover este catequista da turma?"
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleRemoveCatechist}
      />
    </AppShell>
  );
}
