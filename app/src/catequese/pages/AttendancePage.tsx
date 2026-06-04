import { useParams, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '../../client/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../client/components/ui/dropdown-menu';
import { ArrowLeft, Plus, Calendar, Check, X, Clock, AlertCircle, Minus } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listMeetings, getClassDetails, getMeetingAttendance, saveAttendance, createMeeting as createMeetingAction } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';

const PRESENCA_P = { key: 'PRESENT', label: 'P', icon: <Check className="h-3 w-3" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950' };
const PRESENCA_F = { key: 'ABSENT', label: 'F', icon: <X className="h-3 w-3" />, color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950' };
const PRESENCA_A = { key: 'JUSTIFIED', label: 'A', icon: <Clock className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950' };
const STATUS_MAP: Record<string, any> = { PRESENT: PRESENCA_P, ABSENT: PRESENCA_F, JUSTIFIED: PRESENCA_A };
const STATUS_OPTIONS = [PRESENCA_P, PRESENCA_F, PRESENCA_A];

export default function AttendancePage() {
  const { id: classId } = useParams<{ id: string }>();
  const { data: meetings = [] } = useQuery(listMeetings, { classId: classId! });
  const { data: cls } = useQuery(getClassDetails, { id: classId! });
  const catechumens = cls?.enrollments?.map((e: any) => e.catechumenProfile).filter(Boolean) || [];
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, {total: number; presentes: number; abonados: number; faltas: number}>>({});

  // Load attendance for each meeting
  useEffect(() => {
    if (!meetings.length || !catechumens.length) return;
    (async () => {
      const mat: Record<string, Record<string, string>> = {};
      const st: Record<string, {total: number; presentes: number; abonados: number; faltas: number}> = {};
      for (const m of meetings) {
        const records = await getMeetingAttendance({ meetingId: m.id }) || [];
        mat[m.id] = {};
        st[m.id] = { total: catechumens.length, presentes: 0, abonados: 0, faltas: 0 };  
        for (const r of records) {
          mat[m.id][r.catechumenProfileId] = r.status;
          if (r.status === 'PRESENT') st[m.id].presentes++;
          else if (r.status === 'JUSTIFIED') st[m.id].abonados++;
          else if (r.status === 'ABSENT') st[m.id].faltas++;
        }
      }
      setMatrix(mat);
      setStats(st);
    })();
  }, [meetings, catechumens]);

  const mark = async (meetingId: string, catechumenId: string, status: string) => {
    const key = `${meetingId}-${catechumenId}`;
    setSaving(key);
    try {
      await saveAttendance({ meetingId, catechumenProfileId: catechumenId, status });
      setMatrix(prev => ({ ...prev, [meetingId]: { ...prev[meetingId], [catechumenId]: status } }));
    } catch (e: any) {
      toast({ title: 'Erro ao marcar presença: ' + (e.message || 'Sem permissão.') });
    }
    setSaving(null);
  };

  const handleCreateMeeting = async () => {
    if (!newTitle) return;
    try {
      await createMeetingAction({ classId: classId!, title: newTitle, date: newDate });
      setNewTitle(''); setShowNew(false);
    } catch (e: any) {
      toast({ title: 'Erro ao criar encontro: ' + (e.message || 'Sem permissão.') });
    }
  };

  const getPct = (meetingId: string) => {
    const s = stats[meetingId];
    if (!s || s.total === 0) return 0;
    return Math.round(((s.presentes + s.abonados) / s.total) * 100);
  };

  const getOverallPct = () => {
    if (meetings.length === 0 || catechumens.length === 0) return 0;
    const totalPossible = meetings.length * catechumens.length;
    const totalPresent = Object.values(stats).reduce((sum, s) => sum + s.presentes + s.abonados, 0);
    return totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild><Link to={`/app/classes/${classId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div><h1 className="text-2xl font-bold">Matriz de Presença</h1><p className="text-sm text-muted-foreground">{catechumens.length} catequizandos · {meetings.length} encontros</p></div>
          </div>
          <Button onClick={() => setShowNew(!showNew)}><Plus className="mr-2 h-4 w-4" />Novo encontro</Button>
        </div>

        {showNew && (
          <div className="rounded-xl border bg-card p-4 flex gap-3">
            <input placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" autoFocus />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm" />
            <Button size="sm" onClick={handleCreateMeeting} disabled={!newTitle}>Criar</Button>
          </div>
        )}

        <div className="flex gap-4 text-xs">
          {STATUS_OPTIONS.map(s => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center w-7 h-6 rounded border text-xs font-bold ${s.color}`}>{s.label}</span>
              {s.key === 'PRESENT' ? 'Presente' : s.key === 'ABSENT' ? 'Faltou' : 'Abonado'}
            </span>
          ))}
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Crie um encontro para começar.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 p-2 text-left font-medium min-w-[140px] z-10 border-r">Catequizando</th>
                  {meetings.map((m: any) => (
                    <th key={m.id} className="p-2 text-center font-medium min-w-[90px]">
                      <div>{new Date(m.date).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'})}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{m.title || '-'}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium bg-muted/30 min-w-[50px]">%</th>
                </tr>
              </thead>
              <tbody>
                {catechumens.map((cat: any) => (
                  <tr key={cat.id} className="border-t hover:bg-muted/30">      
                    <td className="sticky left-0 bg-card p-2 font-medium border-r z-10">{cat.firstName} {cat.lastName}</td>
                    {meetings.map((m: any) => {
                      const status = matrix[m.id]?.[cat.id];
                      const st = STATUS_MAP[status];
                      const isSaving = saving === `${m.id}-${cat.id}`;
                      return (
                        <td key={m.id} className="p-1 text-center">
                          {isSaving ? (
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded border text-xs bg-muted">...</span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`inline-flex items-center justify-center w-8 h-7 rounded border text-xs font-bold transition-all cursor-pointer ${
                                    st
                                      ? st.color
                                      : 'bg-muted text-muted-foreground border-border hover:border-foreground/30'
                                  }`}
                                  title={st ? (st.key === 'PRESENT' ? 'Presente' : st.key === 'ABSENT' ? 'Faltou' : 'Abonado') : 'Não preenchido'}
                                >
                                  {st ? st.label : <Minus className="h-3 w-3" />}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-28">
                                {STATUS_OPTIONS.map(opt => (
                                  <DropdownMenuItem
                                    key={opt.key}
                                    onClick={() => mark(m.id, cat.id, opt.key)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold ${opt.color}`}>{opt.label}</span>
                                    <span className="text-xs">{opt.key === 'PRESENT' ? 'Presente' : opt.key === 'ABSENT' ? 'Faltou' : 'Abonado'}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center bg-muted/20">
                      <span className="font-bold text-sm">{meetings.length > 0 ? Math.round((Object.values(matrix).filter(m => m[cat.id] === 'PRESENT' || m[cat.id] === 'JUSTIFIED').length / meetings.length) * 100) : 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-medium">
                  <td className="sticky left-0 bg-muted/30 p-2 border-r z-10">Totais</td>
                  {meetings.map((m: any) => (
                    <td key={m.id} className="p-2 text-center text-[10px]">     
                      <span className="text-emerald-600 dark:text-emerald-400">{stats[m.id]?.presentes || 0}P</span>{' '}
                      <span className="text-red-600 dark:text-red-400">{stats[m.id]?.faltas || 0}F</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{stats[m.id]?.abonados || 0}A</span>
                    </td>
                  ))}
                  <td className="p-2 text-center bg-muted/30 font-bold">{getOverallPct()}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
