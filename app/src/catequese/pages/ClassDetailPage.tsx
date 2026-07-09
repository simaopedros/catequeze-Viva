import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, UserPlus, Users, MapPin, Clock, ClipboardList, TrendingUp, XCircle, Calendar, MessageCircle, BookOpen, Building2, Pencil, Check, X, Trash2, Cross, BarChart3 } from 'lucide-react';
import { useQuery, getClassDetails, listCatechumens, enrollCatechumen, updateClass, getOrCreateClassChat, cancelEnrollment, addAssistantCatechist, removeCatechistFromClass, listParishCatechists, getMonthlyPlan } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { getPlanLimits, getEffectiveBillingPlan, getPersonalPlanId, isBillingActive } from '../../shared/planLimits';
import { PlanLimitBanner } from '../components/PlanLimitBanner';
import { handlePlanLimitError } from '../lib/planLimitToast';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';
import SendAnnouncementButton from '../components/SendAnnouncementButton';
import { DetailTabs } from '../../client/components/DetailTabs';
import { EmptyState } from '../../client/components/EmptyState';
import { useClassStatusMap } from '../../i18n/useLabels';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

export default function ClassDetailPage() {
  const { t } = useTranslation('classes');
  const { t: tc } = useTranslation('common');
  const classStatusMap = useClassStatusMap();
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cls, isLoading: loading, error: classError, refetch: refetchClass } = useQuery(getClassDetails, { id: id! });
  const { data: user } = useAuth();
  const { userRole, parishId } = useUserContext();
  const [tab,setTab]=useState<'inscritos'|'encontros'|'catequistas'|'planejamento'>('inscritos');

  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isLeadCatechist = !!(cls?.catechists || []).find((cc: any) => cc.userId === user?.id && cc.role === 'LEAD');
  const isClassCatechist = !!(cls?.catechists || []).find((cc: any) => cc.userId === user?.id);
  const canEnroll = isCoordinator || isClassCatechist;

  const { data: allCatechumens = [] } = useQuery(listCatechumens, { take: 200 }, { enabled: tab === 'inscritos' && canEnroll });
  const { availableParishes, isPersonal } = useActiveParish();
  const { data: parishCatechists = [] } = useQuery(listParishCatechists, { parishId: cls?.parish?.id || '' }, { enabled: !!cls?.parish?.id && tab === 'catequistas' });
  const [monthlyPlan, setMonthlyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [unenrollConfirm, setUnenrollConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [removeCatechistTarget, setRemoveCatechistTarget] = useState<string | null>(null);
  const [showAddCatechist, setShowAddCatechist] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addingCatechist, setAddingCatechist] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDay, setEditDay] = useState('6');
  const [editStart, setEditStart] = useState('09:00');
  const [editEnd, setEditEnd] = useState('10:30');
  const [editLocation, setEditLocation] = useState('');
  const [editCapacity, setEditCapacity] = useState(30);
  const [savingEdit, setSavingEdit] = useState(false);

  const statusOpts = useMemo(() => [
    { status: 'ACTIVE', label: t('detail.activate'), variant: 'default' as const },
    { status: 'PAUSED', label: t('detail.pause'), variant: 'outline' as const },
    { status: 'CONCLUDED', label: t('detail.conclude'), variant: 'outline' as const },
  ], [t]);

  const dayOptions = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map(i => ({ value: String(i), label: t(`days_long.${i}`) })),
    [t],
  );

  const parishBilling = availableParishes.find((p: any) => p.id === cls?.parish?.id)?.billing;
  // Personal workspaces: use the user's personal subscription plan.
  // Institutional workspaces: use parish/umbrella TenantBilling.
  const effectivePlan = isPersonal
    ? getPersonalPlanId(user)
    : getEffectiveBillingPlan(parishBilling);
  const limits = getPlanLimits(effectivePlan);
  const isParishManaged = !isPersonal && !user?.subscriptionPlan && isBillingActive(parishBilling);

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
      toast({ title: t('updated_success') });
      setEditing(false);
    } catch (e: any) {
      toast({ title: t('update_error'), description: e.message || tc('try_again'), variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEnroll=async(cid:string)=>{
    try{await enrollCatechumen({classId:id!,catechumenProfileId:cid});toast({title:t('detail.enrolled_success')});refetchClass();}catch(e:any){
      if (handlePlanLimitError(e.message || e, { currentPlan: effectivePlan, isPersonalWorkspace: isPersonal })) return;
      toast({title:t('detail.enroll_error'), description: (e as any).message || tc('try_again'), variant:'destructive'});
    }
  };
  const handleUnenroll=(enrollmentId: string)=>{
    setUnenrollConfirm(enrollmentId);
  };
  const confirmUnenroll=async()=>{
    if(!unenrollConfirm||!id)return;
    const enrollmentId = unenrollConfirm;
    setUnenrollConfirm(null);
    try{await cancelEnrollment({enrollmentId});toast({title:t('detail.unenrolled_success')});refetchClass();}catch(e:any){
      if(handlePlanLimitError(e.message||e, { currentPlan: effectivePlan, isPersonalWorkspace: isPersonal }))return;
      toast({title:t('detail.unenroll_error'),description:(e as any).message||tc('try_again'),variant:'destructive'});
    }
  };
  const handleStatus=async(status:string)=>{
    if (status==='CONCLUDED') {
      setStatusConfirm(status);
    } else {
      await updateClass({id,status});
      toast({title: status==='ACTIVE' ? t('detail.activated_success') : t('detail.paused_success')});
      refetchClass();
    }
  };
  const confirmStatus=async()=>{
    if(!statusConfirm)return;
    const status = statusConfirm;
    setStatusConfirm(null);
    await updateClass({id,status});
    toast({title:t('detail.concluded_success')});
  };
  const handleOpenChat=async()=>{
    setChatting(true);
    try {
      const { conversationId } = await getOrCreateClassChat({ classId: id! });
      navigate(`/app/messages?c=${conversationId}`);
    } catch (e: any) {
      toast({title:t('detail.open_chat_error'),description:tc('try_again'),variant:'destructive'});
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
      toast({ title: t('detail.load_planning_error'), description: e.message, variant: 'destructive' });
    }
    setLoadingPlan(false);
  };

  const handleAddCatechist = async () => {
    if (!addUserId) return;
    setAddingCatechist(true);
    try {
      await addAssistantCatechist({ classId: id!, userId: addUserId });
      toast({ title: t('detail.catechist_added') });
      setAddUserId('');
      setShowAddCatechist(false);
      refetchClass();
    } catch (e: any) {
      toast({ title: t('detail.error'), description: e.message || t('detail.add_error'), variant: 'destructive' });
    } finally {
      setAddingCatechist(false);
    }
  };

  const handleRemoveCatechist = async () => {
    if (!removeCatechistTarget) return;
    try {
      await removeCatechistFromClass({ classId: id!, userId: removeCatechistTarget });
      toast({ title: t('detail.catechist_removed') });
      setRemoveCatechistTarget(null);
      refetchClass();
    } catch (e: any) {
      toast({ title: t('detail.error'), description: e.message || t('detail.remove_error'), variant: 'destructive' });
    }
  };

  const canManageClass = isCoordinator || isLeadCatechist;
  const canManageCatechists = isCoordinator || isLeadCatechist;

  const classCatechistUserIds = new Set((cls?.catechists || []).map((cc: any) => cc.userId));
  const availableCatechists = parishCatechists.filter((m: any) => !classCatechistUserIds.has(m.userId));

  const catechistRoleLabel = (role: string) => {
    if (role === 'LEAD_CATECHIST') return t('detail.role_lead_catechist');
    if (role === 'ASSISTANT_CATECHIST') return t('detail.role_assistant');
    return t('detail.role_coordinator');
  };

  if(loading)return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded"/><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-20 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  if(!cls) {
    const errMsg = classError ? (classError as any)?.message || String(classError) : t('not_found');
    return <AppShell><div className="p-6 text-destructive">{errMsg}</div></AppShell>;
  }

  const enrolled=cls.enrollments||[];
  const enrolledIds=enrolled.map((e:any)=>e.catechumenProfile?.id);
  const available=allCatechumens.filter((c:any)=>!enrolledIds.includes(c.id));

  const isCatechumenLimitReached = limits.maxCatechumens !== null && enrolled.length >= limits.maxCatechumens;

  let attendanceRate=0;
  if(cls.meetings?.length){
    const total=cls.meetings.reduce((s:number,m:any)=>s+(m.attendance?.length||0),0);
    const present=cls.meetings.reduce((s:number,m:any)=>s+(m.attendance?.filter((a:any)=>a.status==='PRESENT')?.length||0),0);
    if(total>0)attendanceRate=Math.round((present/total)*100);
  }

  const statusBadge = classStatusMap[cls.status as keyof typeof classStatusMap];

  return(
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/classes"><ArrowLeft className="h-5 w-5"/></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusBadge?.variant || 'secondary'}>{statusBadge?.label || cls.status}</Badge>
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
            {canManageClass && statusOpts.filter(s=>s.status!==cls.status).map(s=>(
              <Button key={s.status} size="sm" variant={s.variant} onClick={()=>handleStatus(s.status)}>{s.label}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={handleOpenChat} disabled={chatting}>
              <MessageCircle className="mr-1 h-3 w-3"/>{chatting ? tc('loading') : t('detail.chat')}
            </Button>
            <Button asChild variant="outline" size="sm"><Link to={`/app/classes/${id}/attendance`}><ClipboardList className="mr-1 h-3 w-3"/>{t('attendance')}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/app/classes/${id}/meetings`}><Calendar className="mr-1 h-3 w-3"/>{t('detail.tabs.meetings')}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/app/classes/${id}/reports`}><BarChart3 className="mr-1 h-3 w-3"/>{t('indicators')}</Link></Button>
            {canManageClass && <SendAnnouncementButton classId={id!} className={cls.name} />}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>{t('location')}</div><p className="font-medium text-sm">{cls.location||'—'}</p></div>
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>{t('schedule')}</div><p className="font-medium text-sm">{t(`days_long.${cls.dayOfWeek}`) || cls.dayOfWeek} {cls.startTime}{cls.endTime&&`-${cls.endTime}`}</p></div>
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/>{t('enrolled')}</div><p className="font-medium text-sm">{enrolledIds.length}/{cls.maxCapacity}</p></div>
          <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3"/>{t('attendance')}</div><p className="font-medium text-sm">{attendanceRate}%</p></div>
        </div>

        {editing ? (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Pencil className="h-4 w-4"/>{t('detail.edit_class')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">{t('name')}</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">{t('detail.day_of_week')}</label>
                <select value={editDay} onChange={e => setEditDay(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                  {dayOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{t('detail.slots')}</label>
                <input type="number" min={1} max={200} value={editCapacity} onChange={e => setEditCapacity(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">{t('start')}</label>
                <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">{t('detail.end_time')}</label>
                <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">{t('location')}</label>
                <input value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" placeholder={cls.location || t('location_placeholder')} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="mr-1 h-3 w-3"/>{t('detail.cancel')}</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
                <Check className="mr-1 h-3 w-3"/>{savingEdit ? tc('saving') : t('detail.save')}
              </Button>
            </div>
          </div>
        ) : (
          canManageClass && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3"/>{t('detail.edit_class_btn')}
            </Button>
          </div>
          )
        )}

        <DetailTabs
          tabs={[
            { id: 'inscritos', label: t('detail.tab_enrolled', { count: enrolledIds.length }) },
            { id: 'encontros', label: t('detail.tab_meetings', { count: cls.meetings?.length || 0 }) },
            { id: 'catequistas', label: t('detail.tab_catechists', { count: cls.catechists?.length || 0 }) },
            { id: 'planejamento', label: t('detail.tabs.planning') },
          ]}
          value={tab}
          onChange={(tabId) => {
            setTab(tabId as typeof tab);
            if (tabId === 'planejamento' && !monthlyPlan) handleLoadMonthlyPlan();
          }}
        />

        {tab==='inscritos'&&(
          <div>
            {enrolled.length===0?(
              <EmptyState
                compact
                icon={Users}
                title={t('detail.no_enrolled')}
                description={t('detail.no_enrolled_next_desc')}
              >
                {canEnroll ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button size="sm" asChild>
                      <Link to="/app/catechumens/new">
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {t('detail.empty_cta_create_person')}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/classes/${id}/attendance`}>
                        <ClipboardList className="mr-1 h-3.5 w-3.5" />
                        {t('detail.empty_cta_attendance')}
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </EmptyState>
            ) :
              <div className="grid gap-2 overflow-x-auto">{enrolled.map((e:any)=>{
                const journeys = e.catechumenProfile?.sacramentalJourneys || [];
                const relevantJourney = cls.sacrament?.id
                  ? journeys.find((j: any) => j.template?.sacramentId === cls.sacrament?.id) || journeys[0]
                  : journeys[0];
                const total = relevantJourney?.milestones?.length || 0;
                const done = relevantJourney?.milestones?.filter((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED')?.length || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const journeyBadge = relevantJourney ? (
                  <Badge variant={pct === 100 ? 'default' : 'outline'} className="text-overline gap-1">
                    <Cross className="h-3 w-3" />
                    {done}/{total}
                  </Badge>
                ) : cls.sacrament ? (
                  <span className="text-overline text-muted-foreground flex items-center gap-1">
                    <Cross className="h-3 w-3 opacity-50" />
                    {t('detail.no_journey')}
                  </span>
                ) : null;

                return(
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/app/catechumens/${e.catechumenProfile?.id}`} className="flex items-center gap-3 hover:text-primary min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold flex-shrink-0">{e.catechumenProfile?.firstName?.[0]}{e.catechumenProfile?.lastName?.[0]}</div>
                      <span className="text-sm font-medium truncate">{e.catechumenProfile?.firstName} {e.catechumenProfile?.lastName}</span>
                    </Link>
                    {relevantJourney ? (
                      <Link to={`/app/sacramental-journeys/${relevantJourney.id}`} className="flex-shrink-0">
                        {journeyBadge}
                      </Link>
                    ) : (
                      journeyBadge && <span className="flex-shrink-0">{journeyBadge}</span>
                    )}
                  </div>
                  {canEnroll && <button onClick={()=>handleUnenroll(e.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"><XCircle className="h-4 w-4"/></button>}
                </div>
              )})}</div>}
            {isCatechumenLimitReached ? (
              <div className="mt-6">
                <PlanLimitBanner type="catechumen_limit" currentCount={enrolled.length} userPlan={effectivePlan} isParishManaged={isParishManaged} isPersonalWorkspace={isPersonal} />
              </div>
            ) : available.length > 0 && canEnroll && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm mb-2">{t('detail.available_to_enroll', { count: available.length })}</h3>
                <div className="grid gap-2">{available.map((c:any)=>(
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">{c.firstName?.[0]}{c.lastName?.[0]}</div><span className="text-sm">{c.firstName} {c.lastName}</span></div>
                    <Button size="sm" variant="outline" onClick={()=>handleEnroll(c.id)}><UserPlus className="mr-1 h-3 w-3"/>{t('detail.enroll_btn')}</Button>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {tab==='encontros'&&(
          <div>
            {!cls.meetings?.length?(
              <EmptyState
                compact
                icon={Calendar}
                title={t('detail.no_meetings_registered')}
                description={t('detail.schedule_meetings_next_desc')}
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" asChild>
                    <Link to="/app/ai-hub">
                      <BookOpen className="mr-1 h-3.5 w-3.5" />
                      {t('detail.empty_cta_prepare_meeting')}
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/classes/${id}/attendance`}>
                      <ClipboardList className="mr-1 h-3.5 w-3.5" />
                      {t('detail.empty_cta_attendance')}
                    </Link>
                  </Button>
                </div>
              </EmptyState>
            ) :
              <div className="grid gap-2">{cls.meetings.map((m:any)=>(
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{m.title||t('detail.no_title')}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>{formatDate(m.date, currentLocale)}</p>
                      {m.content && (
                        <Link to={`/app/content-library/${m.content.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <BookOpen className="h-3 w-3"/>{m.content.title}
                        </Link>
                      )}
                      {!m.content && (
                        <span className="text-xs text-muted-foreground italic">{t('detail.no_material')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-overline">{t('detail.attendance_records', { count: m._count?.attendance||0 })}</Badge>
                    <Link to={`/app/classes/${id}/attendance`} className="text-xs text-primary hover:underline">{t('attendance')}</Link>
                  </div>
                </div>
              ))}</div>}
            {canManageClass && <Button className="mt-4" size="sm" asChild variant="outline"><Link to={`/app/classes/${id}/meetings`}><Calendar className="mr-1 h-3 w-3"/>{t('detail.manage_meetings')}</Link></Button>}
          </div>
        )}

        {tab==='catequistas'&&(
          <div className="space-y-4">
            {canManageCatechists && (
              <div>
                {!showAddCatechist ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAddCatechist(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('detail.add_catechist')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <select
                      value={addUserId}
                      onChange={e => setAddUserId(e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">{t('detail.select_catechist')}</option>
                      {availableCatechists.map((m: any) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user?.firstName} {m.user?.lastName} — {catechistRoleLabel(m.role)}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleAddCatechist} disabled={!addUserId || addingCatechist}>
                      {addingCatechist ? tc('loading') : t('detail.add')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddCatechist(false); setAddUserId(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {availableCatechists.length === 0 && showAddCatechist && (
                  <p className="text-xs text-muted-foreground mt-1">{t('detail.all_catechists_linked')}</p>
                )}
              </div>
            )}

            {!cls.catechists?.length ? (
              <EmptyState compact icon={Users} title={t('detail.no_catechists_linked')} description={t('detail.no_catechists_desc')} />
            ) : (
              <div className="grid gap-2 overflow-x-auto">
                {cls.catechists.map((cc: any) => {
                  const canRemove = isCoordinator || (isLeadCatechist && cc.role === 'ASSISTANT') || (cc.userId === user?.id && cc.role === 'ASSISTANT');
                  return (
                    <div key={cc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold flex-shrink-0">
                          {cc.user?.firstName?.[0]}{cc.user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{cc.user?.firstName} {cc.user?.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{cc.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cc.role==='LEAD'?'default':'secondary'}>
                          {cc.role==='LEAD'?t('detail.role_lead'):t('detail.role_assistant')}
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

        {tab === 'planejamento' && (
          <div>
            {loadingPlan ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Clock className="h-4 w-4 animate-spin"/>{t('detail.loading_planning')}
              </div>
            ) : monthlyPlan ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Calendar className="h-5 w-5"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {formatDate(new Date(monthlyPlan.year, monthlyPlan.month), currentLocale, { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-muted-foreground">{t('detail.meetings_this_month', { count: monthlyPlan.totalMeetings })}</p>
                  </div>
                </div>

                {monthlyPlan.weeks?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{t('detail.no_meetings_this_month')}</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyPlan.weeks?.map((week: any, wi: number) => (
                      <div key={wi} className="rounded-lg border bg-card p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {t('detail.week_of', { date: formatDate(week.weekStart, currentLocale, { day: 'numeric', month: 'short' }) })}
                        </p>
                        <div className="space-y-1">
                          {week.meetings.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-overline">
                                  {formatDate(m.date, currentLocale, { weekday: 'short', day: 'numeric' })}
                                </Badge>
                                <span className="font-medium">{m.title || t('detail.no_title')}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{t('detail.attendance_records', { count: m.attendanceCount })}</span>
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
                      <BookOpen className="h-3 w-3"/>{t('detail.available_content')}
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
              <p className="text-sm text-muted-foreground py-4">{t('detail.planning_load_failed')}</p>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!unenrollConfirm}
        onOpenChange={(open) => { if (!open) setUnenrollConfirm(null); }}
        title={t('detail.confirm_unenroll_title')}
        description={t('detail.confirm_unenroll_desc')}
        confirmLabel={t('detail.unenroll')}
        variant="destructive"
        onConfirm={confirmUnenroll}
      />
      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => { if (!open) setStatusConfirm(null); }}
        title={t('detail.confirm_conclude_title')}
        description={t('detail.confirm_conclude_desc')}
        confirmLabel={t('detail.confirm_conclude_btn')}
        variant="destructive"
        onConfirm={confirmStatus}
      />
      <ConfirmDialog
        open={!!removeCatechistTarget}
        onOpenChange={(open) => { if (!open) setRemoveCatechistTarget(null); }}
        title={t('detail.confirm_remove_catechist_title')}
        description={t('detail.confirm_remove_catechist_desc')}
        confirmLabel={t('detail.remove_catechist')}
        variant="destructive"
        onConfirm={handleRemoveCatechist}
      />
    </>
  );
}
