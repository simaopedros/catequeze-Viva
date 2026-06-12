import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Download, X } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listLiturgicalEvents, listClasses, listMeetingsForClasses, createLiturgicalEvent, deleteLiturgicalEvent } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';

export default function CalendarPage() {
  const { t } = useTranslation('calendar');
  const { t: tc } = useTranslation('common');
  const months = useMemo(() => t('months', { returnObjects: true }) as string[], [t]);
  const weekdays = useMemo(() => t('weekdays_short', { returnObjects: true }) as string[], [t]);

  const { activeParishId } = useActiveParish();
  const { data: liturgicalEvents = [], isLoading: loadingLiturgical } = useQuery(listLiturgicalEvents);
  const { data: classes = [], isLoading: loadingClasses } = useQuery(listClasses);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month'|'agenda'>('month');

  useEffect(() => {
    const check = () => setViewMode(window.innerWidth < 768 ? 'agenda' : 'month');
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const parishFilteredEvents = activeParishId
    ? liturgicalEvents.filter((e:any) => e.parishId === activeParishId)
    : liturgicalEvents;
  const filteredClasses = useMemo(() => activeParishId
    ? classes.filter((c:any) => c.parishId === activeParishId)
    : classes, [classes, activeParishId]);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [eventDate, setEventDate] = useState(''); const [color, setColor] = useState('#6366f1');
  const [eventType, setEventType] = useState('liturgical');

  useEffect(() => {
    if (!filteredClasses.length) { setMeetings([]); return; }
    setLoadingMeetings(true);
    (async () => {
      try {
        const classIds = filteredClasses.map((c: any) => c.id);
        const mts = await listMeetingsForClasses({ classIds }) || [];
        const enriched = mts.map((m: any) => ({
          ...m,
          name: m.title || t('meeting_default'),
          type: 'class',
          color: '#10b981',
          className: filteredClasses.find((c: any) => c.id === m.classId)?.name || '',
          classId: m.classId,
        }));
        setMeetings(enriched);
      } catch (e) { console.error('Erro ao carregar encontros:', e); }
      setLoadingMeetings(false);
    })();
  }, [classes, activeParishId, filteredClasses, t]);

  const loading = loadingLiturgical || loadingClasses || loadingMeetings;
  const events = [...parishFilteredEvents, ...meetings];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay = (new Date(year,month,1).getDay() + 6) % 7;

  const filteredEvents = typeFilter==='all'?events:events.filter(e=>e.type===typeFilter);
  const monthCount = filteredEvents.filter(e=>{const d=typeof e.date==='string'?e.date:new Date(e.date).toISOString();return new Date(d).getMonth()===month;}).length;

  const getEventsForDay = (day:number)=>{
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return filteredEvents.filter(e=>{const d=typeof e.date==='string'?e.date:new Date(e.date).toISOString().slice(0,10);return d.startsWith(ds);});
  };

  const handleCreate = async ()=>{
    if(!name||!eventDate)return;
    await createLiturgicalEvent({name,date:eventDate,description:desc,color,type:eventType});
    setName('');setDesc('');setEventDate('');setShowForm(false);
  };
  const handleDelete = async (id:string)=>{
    await deleteLiturgicalEvent({id});
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setShowForm(false);
    setMobilePanelOpen(true);
  };

  const dayEvents = selectedDay?getEventsForDay(selectedDay):[];

  const filterOptions = [
    { v: 'all', l: t('filters.all') },
    { v: 'liturgical', l: t('filters.liturgical') },
    { v: 'parish', l: t('filters.parish') },
    { v: 'class', l: t('filters.class') },
    { v: 'sacramental', l: t('filters.sacramental') },
  ];

  const eventTypeLabels: Record<string, string> = {
    liturgical: t('event_types.liturgical'),
    parish: t('event_types.parish'),
    class: t('event_types.class'),
  };

  if(loading)return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded"/><div className="h-80 rounded-xl bg-muted"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground text-sm">{t('month_events', { month: months[month], year, count: monthCount })}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentDate(new Date(year,month-1,1))}><ChevronLeft className="h-4 w-4"/></Button>
            <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={()=>setCurrentDate(new Date())}>{t('today')}</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentDate(new Date(year,month+1,1))}><ChevronRight className="h-4 w-4"/></Button>
            <Button size="sm" className="h-8 text-xs px-3" onClick={()=>{setShowForm(true);setEventDate(`${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay||1).padStart(2,'0')}`);}}><Plus className="mr-1 h-3.5 w-3.5"/>{t('add_event')}</Button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {filterOptions.map(f=>(
            <button key={f.v} onClick={()=>setTypeFilter(f.v)} className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${typeFilter===f.v?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f.l}</button>
          ))}
        </div>

        {viewMode === 'agenda' ? (
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredEvents
              .filter(e => {
                const d = typeof e.date === 'string' ? e.date : new Date(e.date).toISOString();
                return new Date(d).getMonth() === month && new Date(d).getFullYear() === year;
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(e => {
                const eventDate = new Date(typeof e.date === 'string' ? e.date : e.date);
                const day = eventDate.getDate();
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedDay(day); setMobilePanelOpen(true); }}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-3"
                  >
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-muted flex-shrink-0">
                      <span className="text-xs font-bold">{day}</span>
                      <span className="text-[9px] text-muted-foreground">{months[month].slice(0,3)}</span>
                    </div>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: e.color || '#6366f1' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {e.name}
                        {e.className && <span className="text-[10px] text-muted-foreground ml-1">({e.className})</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{eventTypeLabels[e.type] || e.type}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            {filteredEvents.filter(e => {
              const d = typeof e.date === 'string' ? e.date : new Date(e.date).toISOString();
              return new Date(d).getMonth() === month && new Date(d).getFullYear() === year;
            }).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{t('no_events_month')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/30">
              {weekdays.map((d,i)=>(
                <div key={d} className={`p-1.5 sm:p-2 text-center text-[10px] sm:text-xs font-medium uppercase ${i>=5?'text-red-400':'text-muted-foreground'}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] border-t border-l bg-muted/10"/>)}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const day=i+1;
                const dow=(firstDay+day-1)%7;
                const isWeekend=dow>=5;
                const isToday=day===new Date().getDate()&&month===new Date().getMonth()&&year===new Date().getFullYear();
                const de=getEventsForDay(day);
                const isSelected=selectedDay===day;
                return(
                  <button key={day} onClick={()=>handleDayClick(day)} className={`p-1 sm:p-2 border-t border-l text-left transition-colors flex flex-col ${isSelected?'bg-primary/10 ring-1 ring-inset ring-primary':isWeekend?'bg-muted/20 hover:bg-muted/40':'hover:bg-muted/30'}`}>
                    <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${isToday?'bg-primary text-primary-foreground':''}`}>{day}</span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5 sm:mt-1">
                      {de.slice(0,3).map(e=><div key={e.id} className="h-1.5 w-1.5 sm:hidden rounded-full flex-shrink-0" style={{background:e.color||'#6366f1'}} title={e.name}/>)}
                      {de.slice(0,2).map(e=><div key={`lbl-${e.id}`} className="hidden sm:block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white w-full" style={{background:e.color||'#6366f1'}}>{e.name}</div>)}
                      {de.length>2 && <div className="text-[10px] text-muted-foreground hidden sm:block">+{de.length-2}</div>}
                      {de.length>3 && <div className="text-[9px] text-muted-foreground sm:hidden">+{de.length-3}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block space-y-4">
            <SidePanelContent
              selectedDay={selectedDay}
              month={month}
              year={year}
              months={months}
              dayEvents={dayEvents}
              showForm={showForm}
              name={name} desc={desc} eventDate={eventDate} color={color} eventType={eventType}
              setName={setName} setDesc={setDesc} setEventDate={setEventDate} setColor={setColor} setEventType={setEventType}
              setShowForm={setShowForm}
              handleCreate={handleCreate}
              handleDelete={handleDelete}
              eventTypeLabels={eventTypeLabels}
              t={t}
              tc={tc}
            />
          </div>
        </div>
        )}

        {mobilePanelOpen && selectedDay && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setMobilePanelOpen(false)} />
            <div className="relative z-10 w-full max-h-[70vh] overflow-y-auto rounded-t-2xl border-t bg-card shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur rounded-t-2xl">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Calendar className="h-4 w-4"/>{t('day_title', { day: selectedDay, month: months[month] })}</h3>
                <button onClick={()=>setMobilePanelOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4"/></button>
              </div>
              <div className="p-4 space-y-4">
                <SidePanelContent
                  selectedDay={selectedDay}
                  month={month}
                  year={year}
                  months={months}
                  dayEvents={dayEvents}
                  showForm={showForm}
                  name={name} desc={desc} eventDate={eventDate} color={color} eventType={eventType}
                  setName={setName} setDesc={setDesc} setEventDate={setEventDate} setColor={setColor} setEventType={setEventType}
                  setShowForm={setShowForm}
                  handleCreate={handleCreate}
                  handleDelete={handleDelete}
                  eventTypeLabels={eventTypeLabels}
                  t={t}
                  tc={tc}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

interface SidePanelProps {
  selectedDay: number | null;
  month: number;
  year: number;
  months: string[];
  dayEvents: any[];
  showForm: boolean;
  name: string; desc: string; eventDate: string; color: string; eventType: string;
  setName: (v:string)=>void; setDesc: (v:string)=>void; setEventDate: (v:string)=>void; setColor: (v:string)=>void; setEventType: (v:string)=>void;
  setShowForm: (v:boolean)=>void;
  handleCreate: ()=>void;
  handleDelete: (id:string)=>void;
  eventTypeLabels: Record<string, string>;
  t: any;
  tc: (key: string) => string;
}

function SidePanelContent({
  selectedDay, month, year, months, dayEvents, showForm,
  name, desc, eventDate, color, eventType,
  setName, setDesc, setEventDate, setColor, setEventType,
  setShowForm, handleCreate, handleDelete, eventTypeLabels, t, tc,
}: SidePanelProps) {
  const formatDay = (day: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const openNewEventForm = () => {
    if (selectedDay) setEventDate(formatDay(selectedDay));
    setShowForm(true);
  };

  return (
    <>
      {selectedDay && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm"><Calendar className="h-4 w-4"/>{t('day_title', { day: selectedDay, month: months[month] })}</h3>
          {dayEvents.length===0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">{t('no_events')}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={openNewEventForm}><Plus className="mr-1 h-3 w-3"/>{t('add')}</Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {dayEvents.map(e=>(
                <div key={e.id} className="flex items-start justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-2 h-6 rounded-full mt-0.5 flex-shrink-0" style={{background:e.color||'#6366f1'}}/>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.name}
                        {e.className && <span className="text-[10px] text-muted-foreground ml-1">({e.className})</span>}
                      </p>
                      {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                      <Badge variant="outline" className="mt-1 text-[10px]">{eventTypeLabels[e.type] || e.type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button onClick={()=>exportICS(e)} className="text-muted-foreground hover:text-primary p-1"><Download className="h-3.5 w-3.5"/></button>
                    {e.type!=='class' && <button onClick={()=>handleDelete(e.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5"/></button>}
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={openNewEventForm}><Plus className="mr-1 h-3 w-3"/>{t('new_event')}</Button>
            </div>
          )}
        </div>
      )}

      {!selectedDay && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2"/>
          <p className="text-sm text-muted-foreground">{t('select_day')}</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm"><Plus className="inline h-4 w-4 mr-1"/>{t('new_event')}</h3>
            <button onClick={()=>setShowForm(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4"/></button>
          </div>
          <input placeholder={t('event_name')} value={name} onChange={e=>setName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"/>
          <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"/>
          <input placeholder={t('description_optional')} value={desc} onChange={e=>setDesc(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"/>
          <div className="flex gap-2">
            <select value={eventType} onChange={e=>setEventType(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1">
              <option value="liturgical">{t('filters.liturgical')}</option>
              <option value="parish">{t('filters.parish')}</option>
              <option value="class">{t('filters.class')}</option>
              <option value="sacramental">{t('filters.sacramental')}</option>
            </select>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer"/>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!name||!eventDate}>{t('create_event')}</Button>
            <Button size="sm" variant="outline" onClick={()=>setShowForm(false)}>{tc('cancel')}</Button>
          </div>
        </div>
      )}
    </>
  );
}

function exportICS(event: any) {
  const start = new Date(event.date).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const end = event.endDate ? new Date(event.endDate).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z' : start;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${event.name}\nDESCRIPTION:${event.description||''}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics],{type:'text/calendar'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${event.name}.ics`; a.click();
}
