import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router';
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button } from '../../client/components/ui/button';
import { cn } from '../../client/utils';
import { ArrowLeft, Plus, Check, X, Clock, Minus, ClipboardList, Loader2 } from 'lucide-react';
import { EmptyState } from '../../client/components/EmptyState';
import { useQuery, getClassDetails, getClassAttendanceMatrix, saveAttendance, createMeeting as createMeetingAction } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';

const STATUS_KEYS = ['PRESENT', 'LATE', 'ABSENT', 'JUSTIFIED'] as const;
const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950',
  LATE: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950',
  ABSENT: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950',
  JUSTIFIED: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950',
};
const STATUS_ICONS: Record<string, ReactNode> = {
  PRESENT: <Check className="h-3 w-3" />,
  LATE: <Clock className="h-3 w-3" />,
  ABSENT: <X className="h-3 w-3" />,
  JUSTIFIED: <Clock className="h-3 w-3" />,
};

function StatusCell({
  status,
  statusOptions,
  onMark,
  isSaving,
  notFilledLabel,
}: {
  status: string | undefined;
  statusOptions: { key: string; label: string; icon: ReactNode; color: string; fullLabel: string }[];
  onMark: (status: string) => void;
  isSaving: boolean;
  notFilledLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const st = status ? statusOptions.find(o => o.key === status) : null;

  if (isSaving) {
    return (
      <span className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-8 rounded border text-xs bg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`min-w-[44px] min-h-[44px] w-10 h-8 rounded border text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
          st ? st.color : 'bg-muted text-muted-foreground border-border hover:border-foreground/30'
        }`}
        title={st ? st.fullLabel : notFilledLabel}
        aria-label={notFilledLabel}
      >
        {st ? st.label : <Minus className="h-3 w-3" />}
      </button>
      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 bg-popover border rounded-md shadow-lg p-1 flex flex-col gap-0.5 min-w-[100px]">
          {statusOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onMark(opt.key); setOpen(false); }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors hover:brightness-95 ${opt.color}`}
            >
              <span className="flex items-center justify-center w-4 h-4">{opt.icon}</span>
              <span className="tabular-nums">{opt.fullLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation('attendance');
  const { t: tc } = useTranslation('common');
  const { t: tcl } = useTranslation('classes');
  const { currentLocale } = useLocale();
  const { id: classId } = useParams<{ id: string }>();
  const { data: meetings = [], refetch: refetchMeetings } = useQuery(getClassAttendanceMatrix, { classId: classId! });
  const { data: cls } = useQuery(getClassDetails, { id: classId! });
  const catechumens = cls?.enrollments?.map((e: any) => ({
    ...e.catechumenProfile,
    enrollmentId: e.id,
    enrollmentStatus: e.status,
  })).filter((e: any) => e.id) || [];
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const lastProcessedRef = useRef('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all');

  const filteredCatechumens = useMemo(() => {
    let result = catechumens;
    if (enrollmentStatusFilter !== 'all') {
      result = result.filter((cat: any) => cat.enrollmentStatus === enrollmentStatusFilter.toUpperCase());
    }
    if (studentFilter.trim()) {
      const q = studentFilter.toLowerCase();
      result = result.filter((cat: any) =>
        `${cat.firstName} ${cat.lastName}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [catechumens, studentFilter, enrollmentStatusFilter]);

  const statusLabel = (key: string) => {
    if (key === 'PRESENT') return t('present');
    if (key === 'LATE') return t('matrix.late_label');
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
    const key = JSON.stringify(meetings.map((m: any) => [m.id, (m.attendance || []).map((r: any) => r.catechumenProfileId + ':' + r.status).join(',')].join('|')));
    if (key === lastProcessedRef.current) return;
    lastProcessedRef.current = key;
    const mat: Record<string, Record<string, string>> = {};
    for (const m of meetings) {
      const records = m.attendance || [];
      mat[m.id] = {};
      for (const r of records) {
        mat[m.id][r.catechumenProfileId] = r.status;
      }
    }
    setMatrix(mat);
  }, [meetings, catechumens]);

  // Derived: recompute stats whenever matrix, meetings, or catechumens change
  const stats = useMemo(() => {
    const st: Record<string, {total: number; presentes: number; abonados: number; faltas: number}> = {};
    for (const m of meetings) {
      st[m.id] = { total: catechumens.length, presentes: 0, abonados: 0, faltas: 0 };
      const records = matrix[m.id] || {};
      Object.values(records).forEach((status) => {
        if (status === 'PRESENT') st[m.id].presentes++;
        else if (status === 'JUSTIFIED') st[m.id].abonados++;
        else if (status === 'ABSENT') st[m.id].faltas++;
      });
    }
    return st;
  }, [matrix, meetings, catechumens]);

  const mark = async (meetingId: string, catechumenId: string, status: string) => {
    const key = `${meetingId}-${catechumenId}`;
    setSaving(key);
    try {
      await saveAttendance({ meetingId, catechumenProfileId: catechumenId, status });
      setMatrix(prev => ({ ...prev, [meetingId]: { ...(prev[meetingId] || {}), [catechumenId]: status } }));
    } catch (e: any) {
      toast({ title: t('matrix.mark_error', { message: e.message || t('matrix.no_permission') }) });
    }
    setSaving(null);
  };

  // Bulk state & handlers
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<{ meetingId: string; meetingTitle: string; status: 'PRESENT' | 'ABSENT' } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const triggerBulkAction = (meetingId: string, meetingTitle: string, status: 'PRESENT' | 'ABSENT') => {
    setBulkTarget({ meetingId, meetingTitle, status });
    setConfirmBulkOpen(true);
  };

  const handleBulkAction = async () => {
    if (!bulkTarget) return;
    setBulkSaving(true);
    const { meetingId, status } = bulkTarget;
    try {
      const results = await Promise.allSettled(
        catechumens.map((cat: { id: string }) => saveAttendance({ meetingId, catechumenProfileId: cat.id, status }))
      );

      const failedCount = results.filter(r => r.status === 'rejected').length;

      // Update local state for those that succeeded
      setMatrix(prev => {
        const updated = { ...(prev[meetingId] || {}) };
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            const cat = catechumens[idx];
            updated[cat.id] = status;
          }
        });
        return { ...prev, [meetingId]: updated };
      });

      if (failedCount > 0) {
        toast({
          title: tc('error'),
          description: t('matrix.bulk_partial_error', { failedCount, total: catechumens.length }),
          variant: 'destructive',
        });
      } else {
        toast({ title: t('matrix.bulk_success') || 'Presenças atualizadas com sucesso!' });
      }
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message || tc('error_generic'), variant: 'destructive' });
    } finally {
      setBulkSaving(false);
      setConfirmBulkOpen(false);
      setBulkTarget(null);
    }
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
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-6">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="rounded-sm" asChild><Link to={`/app/classes/${classId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('matrix.eyebrow', { defaultValue: 'Presença' })}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]" style={{ fontFamily: 'var(--font-brand-display)' }}>{t('matrix.title')}</h1>
              <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {t('matrix.subtitle', {
                  catechumens: tcl('catechumens_count', { count: catechumens.length }),
                  meetings: t('matrix.meetings_count', { count: meetings.length }),
                })}
              </p>
            </div>
          </div>
          <Button className="h-10 rounded-sm shadow-none" onClick={() => setShowNew(!showNew)}><Plus className="mr-2 h-4 w-4" />{t('matrix.new_meeting')}</Button>
        </div>

        {showNew && (
          <div className="flex flex-col gap-3 rounded-sm border border-border/70 bg-white p-4 sm:flex-row">
            <input placeholder={t('matrix.title_placeholder')} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="flex h-10 flex-1 rounded-sm border border-input bg-background px-3 py-1 text-sm" autoFocus />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm sm:w-36" />
            <Button size="sm" className="rounded-sm" onClick={handleCreateMeeting} disabled={!newTitle}>{tc('create')}</Button>
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

        {/* Student filter */}
        <div className="flex gap-2 flex-wrap">
          {catechumens.length > 10 && (
            <input
              type="text"
              placeholder={t('matrix.filter_students') || 'Filtrar alunos...'}
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              className="flex h-8 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-1 text-xs"
            />
          )}
          <select
            value={enrollmentStatusFilter}
            onChange={e => setEnrollmentStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="all">{t('matrix.all_statuses') || 'Todos os status'}</option>
            <option value="enrolled">{t('matrix.active') || 'Ativos'}</option>
            <option value="dropped">{t('matrix.dropped') || 'Desistentes'}</option>
            <option value="transferred">{t('matrix.transferred') || 'Transferidos'}</option>
          </select>
        </div>

        {meetings.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('matrix.empty')} description={t('matrix.empty_desc')} compact />
        ) : (
          <>
            {/* Bulk actions */}
            <div className="flex gap-2 flex-wrap">
              {meetings.map((m: any) => (
                <div key={m.id} className="flex items-center gap-1 text-xs bg-muted/30 rounded-lg px-2 py-1">
                  <span className="text-muted-foreground truncate max-w-[120px]">{formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' })}</span>
                  <button
                    onClick={() => triggerBulkAction(m.id, m.title || formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' }), 'PRESENT')}
                    className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    title={t('matrix.mark_all_present')}
                  >✓{t('matrix.present_letter')}</button>
                  <button
                    onClick={() => triggerBulkAction(m.id, m.title || formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' }), 'ABSENT')}
                    className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                    title={t('matrix.mark_all_absent')}
                  >✗{t('matrix.absent_letter')}</button>
                </div>
              ))}
            </div>

          <div className="overflow-x-auto rounded-xl border bg-card hidden md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 p-2 text-left font-medium min-w-[140px] z-10 border-r">{t('matrix.catechumen_column')}</th>
                  {meetings.map((m: any) => (
                    <th key={m.id} className="p-2 text-center font-medium min-w-[90px]">
                      <div>{formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' })}</div>
                      <div className="text-overline text-muted-foreground truncate max-w-[80px]">{m.title || t('matrix.no_title')}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium bg-muted/30 min-w-[50px]">{t('matrix.percent_column')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatechumens.map((cat: any) => (
                  <tr key={cat.id} className="border-t hover:bg-muted/30">
                    <td className="sticky left-0 bg-card p-2 font-medium border-r z-10">{cat.firstName} {cat.lastName}</td>
                    {meetings.map((m: any) => {
                      const status = matrix[m.id]?.[cat.id];
                      const isSaving = saving === `${m.id}-${cat.id}`;
                      return (
                        <td key={m.id} className="p-1 text-center">
                          <StatusCell
                            status={status}
                            statusOptions={statusOptions}
                            onMark={(val) => mark(m.id, cat.id, val)}
                            isSaving={isSaving}
                            notFilledLabel={t('matrix.not_filled')}
                          />
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
                    <td key={m.id} className="p-2 text-center text-overline">
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

          {/* Mobile: stacked card view per catechumen */}
          <div className="md:hidden space-y-4">
            {filteredCatechumens.map((cat: any) => {
              const pct = meetings.length > 0
                ? Math.round((Object.values(matrix).filter(m => m[cat.id] === 'PRESENT' || m[cat.id] === 'JUSTIFIED').length / meetings.length) * 100)
                : 0;
              return (
                <div key={cat.id} className="rounded-xl border bg-card p-4 shadow-elevation-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{cat.firstName} {cat.lastName}</span>
                    <span className={cn(
                      'text-sm font-bold px-2 py-0.5 rounded-full',
                      pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    )}>{pct}%</span>
                  </div>
                  <div className="space-y-2">
                    {meetings.map((m: any) => {
                      const status = matrix[m.id]?.[cat.id];
                      const isSaving = saving === `${m.id}-${cat.id}`;
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium block truncate">{formatDate(m.date, currentLocale, { day: '2-digit', month: '2-digit' })}</span>
                            <span className="text-overline text-muted-foreground truncate block">{m.title || t('matrix.no_title')}</span>
                          </div>
                          <StatusCell
                            status={status}
                            statusOptions={statusOptions}
                            onMark={(val) => mark(m.id, cat.id, val)}
                            isSaving={isSaving}
                            notFilledLabel={t('matrix.not_filled')}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={bulkTarget?.status === 'PRESENT' ? t('matrix.mark_all_present_confirm_title') || 'Marcar todos como Presente' : t('matrix.mark_all_absent_confirm_title') || 'Marcar todos como Falta'}
        description={bulkTarget?.status === 'PRESENT'
          ? t('matrix.mark_all_present_confirm_desc', { count: catechumens.length, meetingTitle: bulkTarget?.meetingTitle })
          : t('matrix.mark_all_absent_confirm_desc', { count: catechumens.length, meetingTitle: bulkTarget?.meetingTitle })}
        confirmLabel={t('confirm') || 'Confirmar'}
        variant={bulkTarget?.status === 'ABSENT' ? 'destructive' : 'default'}
        onConfirm={handleBulkAction}
        loading={bulkSaving}
      />
    </>
  );
}
