import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '../../client/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../client/components/ui/dropdown-menu';
import { ArrowLeft, Plus, Check, X, Clock, Minus, ClipboardList } from 'lucide-react';
import { AppShell } from '../AppShell';
import { EmptyState } from '../../client/components/EmptyState';
import { useQuery, listMeetings, getClassDetails, getMeetingAttendance, saveAttendance, createMeeting as createMeetingAction } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

const STATUS_KEYS = ['PRESENT', 'ABSENT', 'JUSTIFIED'] as const;
const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950',
  ABSENT: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950',
  JUSTIFIED: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950',
};
const STATUS_ICONS: Record<string, ReactNode> = {
  PRESENT: <Check className="h-3 w-3" />,
  ABSENT: <X className="h-3 w-3" />,
  JUSTIFIED: <Clock className="h-3 w-3" />,
};

export default function AttendancePage() {
  const { t } = useTranslation('attendance');
  const { t: tc } = useTranslation('common');
  const { t: tcl } = useTranslation('classes');
  const { currentLocale } = useLocale();
  const { id: classId } = useParams<{ id: string }>();
  const { data: meetings = [], refetch: refetchMeetings } = useQuery(listMeetings, { classId: classId! });
  const { data: cls } = useQuery(getClassDetails, { id: classId! });
  const catechumens = cls?.enrollments?.map((e: any) => e.catechumenProfile).filter(Boolean) || [];
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, {total: number; presentes: number; abonados: number; faltas: number}>>({});

  const statusLabel = (key: string) => {
    if (key === 'PRESENT') return t('present');
    if (key === 'ABSENT') return t('matrix.absent_label');
    return t('matrix.justified_label');
  };

  const statusLetter = (key: string) => {
    if (key === 'PRESENT') return t('matrix.present_letter');
    if (key === 'ABSENT') return t('matrix.absent_letter');
    return t('matrix.justified_letter');
  };

  const statusOptions = useMemo(
    () => STATUS_KEYS.map(key => ({
      key,
      label: statusLetter(key),
      icon: STATUS_ICONS[key],
      color: STATUS_COLORS[key],
      fullLabel: statusLabel(key),
    })),
    [t],
  );

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
      toast({ title: t('matrix.mark_error', { message: e.message || t('matrix.no_permission') }) });
    }
    setSaving(null);
  };

  const handleCreateMeeting = async () => {
    if (!newTitle) return;
    try {
      await createMeetingAction({ classId: classId!, title: newTitle, date: newDate });
      setNewTitle(''); setShowNew(false);
      refetchMeetings();
    } catch (e: any) {
      toast({ title: t('matrix.create_meeting_error', { message: e.message || t('matrix.no_permission') }) });
    }
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
            <div>
              <h1 className="text-2xl font-bold">{t('matrix.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('matrix.subtitle', {
                  catechumens: tcl('catechumens_count', { count: catechumens.length }),
                  meetings: t('matrix.meetings_count', { count: meetings.length }),
                })}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNew(!showNew)}><Plus className="mr-2 h-4 w-4" />{t('matrix.new_meeting')}</Button>
        </div>

        {showNew && (
          <div className="rounded-xl border bg-card p-4 flex gap-3">
            <input placeholder={t('matrix.title_placeholder')} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" autoFocus />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm" />
            <Button size="sm" onClick={handleCreateMeeting} disabled={!newTitle}>{tc('create')}</Button>
          </div>
        )}

        <div className="flex gap-4 text-xs">
          {statusOptions.map(s => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center w-7 h-6 rounded border text-xs font-bold ${s.color}`}>{s.label}</span>
              {s.fullLabel}
            </span>
          ))}
        </div>

        {meetings.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('matrix.empty')} description={t('matrix.empty_desc')} compact />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 p-2 text-left font-medium min-w-[140px] z-10 border-r">{t('matrix.catechumen_column')}</th>
                  {meetings.map((m: any) => (
                    <th key={m.id} className="p-2 text-center font-medium min-w-[90px]">
                      <div>{formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' })}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{m.title || t('matrix.no_title')}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium bg-muted/30 min-w-[50px]">{t('matrix.percent_column')}</th>
                </tr>
              </thead>
              <tbody>
                {catechumens.map((cat: any) => (
                  <tr key={cat.id} className="border-t hover:bg-muted/30">
                    <td className="sticky left-0 bg-card p-2 font-medium border-r z-10">{cat.firstName} {cat.lastName}</td>
                    {meetings.map((m: any) => {
                      const status = matrix[m.id]?.[cat.id];
                      const st = status ? statusOptions.find(o => o.key === status) : null;
                      const isSaving = saving === `${m.id}-${cat.id}`;
                      return (
                        <td key={m.id} className="p-1 text-center">
                          {isSaving ? (
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded border text-xs bg-muted">{tc('loading')}</span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`inline-flex items-center justify-center w-8 h-7 rounded border text-xs font-bold transition-all cursor-pointer ${
                                    st
                                      ? st.color
                                      : 'bg-muted text-muted-foreground border-border hover:border-foreground/30'
                                  }`}
                                  title={st ? st.fullLabel : t('matrix.not_filled')}
                                >
                                  {st ? st.label : <Minus className="h-3 w-3" />}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-28">
                                {statusOptions.map(opt => (
                                  <DropdownMenuItem
                                    key={opt.key}
                                    onClick={() => mark(m.id, cat.id, opt.key)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold ${opt.color}`}>{opt.label}</span>
                                    <span className="text-xs">{opt.fullLabel}</span>
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
                  <td className="sticky left-0 bg-muted/30 p-2 border-r z-10">{t('matrix.totals')}</td>
                  {meetings.map((m: any) => (
                    <td key={m.id} className="p-2 text-center text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400">{stats[m.id]?.presentes || 0}{t('matrix.present_letter')}</span>{' '}
                      <span className="text-red-600 dark:text-red-400">{stats[m.id]?.faltas || 0}{t('matrix.absent_letter')}</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{stats[m.id]?.abonados || 0}{t('matrix.justified_letter')}</span>
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
