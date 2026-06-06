import { useState, useMemo } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Cross, Plus, User, CheckCircle, Clock, Search, Undo2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listCatechumens, listSacramentalJourneys, createSacramentalJourney, listJourneyTemplates, updateMilestoneStatus } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';

export default function SacramentsPage() {
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canManage = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(userRole);
  const { data: catechumens = [] } = useQuery(listCatechumens);
  const { data: journeys = [], isLoading: loading } = useQuery(listSacramentalJourneys);
  const [showForm, setShowForm] = useState(false);
  const [selectedCatechumenId, setSelectedCatechumenId] = useState('');
  const [templateName, setTemplateName] = useState('Primeira Eucaristia');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(()=>{
    let result = [...journeys];
    if (activeParishId) result = result.filter((j:any) =>
      j.catechumenProfile?.enrollments?.some((e:any) => e.class?.parishId === activeParishId)
    );
    if (!search) return result;
    return result.filter((j:any)=>`${j.catechumenProfile?.firstName} ${j.catechumenProfile?.lastName}`.toLowerCase().includes(search.toLowerCase()));
  },[journeys,search,activeParishId]);

  const filteredCatechumens = useMemo(() => {
    if (!activeParishId) return catechumens;
    return catechumens.filter((c:any) =>
      c.enrollments?.some((e:any) => e.class?.parishId === activeParishId)
    );
  }, [catechumens, activeParishId]);

  const handleCreateJourney = async () => {
    if(!selectedCatechumenId)return;
    setSaving(true);
    try{
      const templates = await listJourneyTemplates();
      const templateId = templates?.find((t:any)=>t.name===templateName)?.id;
      if (!templateId) throw new Error('Modelo de jornada não encontrado.');
      await createSacramentalJourney({catechumenProfileId:selectedCatechumenId,templateId});
      setShowForm(false);
    }catch(e:any){toast({ title: 'Erro', description: 'Erro: ' + (e.message||'Tente novamente.'), variant: 'destructive' });}
    finally{setSaving(false);}
  };

  const handleUpdate = async(milestoneId:string,status:string)=>{
    await updateMilestoneStatus({milestoneId,status});
  };

  const handleUndo = async(milestoneId:string)=>{
    await updateMilestoneStatus({milestoneId, status:'PENDING'});
  };

  if(loading)return<AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-56 bg-muted rounded"/><div className="grid gap-4 md:grid-cols-2">{[1,2].map(i=><div key={i} className="h-48 rounded-xl bg-muted"/>)}</div></div></AppShell>;

  return(
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Jornadas Sacramentais</span>
            </div>
            <h1 className="text-2xl font-bold">Acompanhamento Sacramental</h1><p className="text-muted-foreground text-sm">{filtered.length} jornadas ativas</p></div>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="flex h-9 w-40 rounded-md border border-input bg-background pl-9 pr-3 text-sm"/></div>        
            {canManage && <Button onClick={()=>setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4"/>Nova jornada</Button>}
          </div>
        </div>

        {showForm&&(
          <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-3">
            <select value={selectedCatechumenId} onChange={e=>setSelectedCatechumenId(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm flex-1"><option value="">Selecione o catequizando</option>{filteredCatechumens.map((c:any)=><option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
            <select value={templateName} onChange={e=>setTemplateName(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"><option>Primeira Eucaristia</option><option>Crisma</option><option>Batismo</option><option>Reconciliação</option></select>
            <Button size="sm" onClick={handleCreateJourney} disabled={!selectedCatechumenId||saving}>{saving?'Criando...':'Iniciar'}</Button>
            <Button size="sm" variant="outline" onClick={()=>setShowForm(false)}>Cancelar</Button>
          </div>
        )}

        {filtered.length===0?(
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><Cross className="h-8 w-8 text-primary"/></div>
            <h3 className="text-lg font-semibold">{search?'Nenhum resultado':'Nenhuma jornada'}</h3>
            <p className="text-sm text-muted-foreground mt-1">Inicie uma jornada sacramental para acompanhar os marcos.</p>
          </div>
        ):(
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((j:any)=>{
              const total=j.milestones?.length||0;
              const done=j.milestones?.filter((m:any)=>m.status==='COMPLETED'||m.status==='APPROVED').length||0;
              const pct=total>0?Math.round((done/total)*100):0;
              return(
                <div key={j.id} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">      
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary"/><span className="font-semibold">{j.catechumenProfile?.firstName} {j.catechumenProfile?.lastName}</span></div>
                    <Badge variant={pct===100?'default':'outline'}>{j.template?.name||'Jornada'}</Badge>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>{done}/{total} marcos</span><span className="font-bold">{pct}%</span></div>
                    <div className="w-full bg-muted rounded-full h-2"><div className={`h-2 rounded-full transition-all ${pct===100?'bg-green-500':pct>=50?'bg-amber-500':'bg-blue-500'}`} style={{width:`${pct}%`}}/></div>
                  </div>
                  {j.milestones?.map((m:any)=>(
                    <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {m.status==='COMPLETED'||m.status==='APPROVED'?<CheckCircle className="h-4 w-4 text-green-500"/>:<Clock className="h-4 w-4 text-muted-foreground"/>}
                        <span className={`text-sm ${m.status==='COMPLETED'?'line-through text-muted-foreground':''}`}>{m.templateMilestone?.name}</span>        
                      </div>
                      {canManage && m.status!=='COMPLETED'&&m.status!=='APPROVED'?(
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600" onClick={()=>handleUpdate(m.id,'COMPLETED')}>✓ Concluir</Button>
                      ): canManage && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-destructive" onClick={()=>handleUndo(m.id)}><Undo2 className="h-3 w-3 mr-1"/>Desfazer</Button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
