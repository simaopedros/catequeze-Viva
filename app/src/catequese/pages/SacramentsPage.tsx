import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../client/components/ui/select';
import { Cross, Plus, User, CheckCircle, Clock, Search, Undo2, AlertTriangle, XCircle, Users, FileText, Calendar, Pencil } from 'lucide-react';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { EmptyState } from '../../client/components/EmptyState';
import { useQuery, listCatechumens, listSacramentalJourneys, createSacramentalJourney, listJourneyTemplates, updateMilestoneStatus, updateJourney } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

type FilterKey = 'all' | 'mine' | 'overdue' | 'waiting_doc' | 'waiting_approval' | 'ready' | 'no_journey';

const FILTER_KEYS: { key: FilterKey; icon: typeof Clock }[] = [
  { key: 'all', icon: Users },
  { key: 'mine', icon: User },
  { key: 'overdue', icon: AlertTriangle },
  { key: 'waiting_doc', icon: FileText },
  { key: 'waiting_approval', icon: Clock },
  { key: 'ready', icon: CheckCircle },
  { key: 'no_journey', icon: XCircle },
];

export default function SacramentsPage() {
  const { t } = useTranslation('sacraments');
  const { t: tc } = useTranslation('common');
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const canManage = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(userRole);
  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isCatechist = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(userRole);

  const { data: catechumens = [] } = useQuery(listCatechumens, { take: 200 });
  const { data: journeys = [], isLoading: loading } = useQuery(listSacramentalJourneys);
  const [showForm, setShowForm] = useState(false);
  const [selectedCatechumenId, setSelectedCatechumenId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [editingTargetDate, setEditingTargetDate] = useState<Record<string, string>>({});

  // Filter journeys client-side
  const filtered = useMemo(() => {
    let result = [...journeys];

    // Parish scope (server already filters, but double-check)
    if (activeParishId) {
      result = result.filter((j: any) => {
        const enrollmentParishes = j.catechumenProfile?.enrollments?.map((e: any) => e.class?.parishId) || [];
        return enrollmentParishes.includes(activeParishId) || j.catechumenProfile?.parishId === activeParishId;
      });
    }

    // Apply filters
    if (activeFilter === 'overdue') {
      const now = new Date();
      result = result.filter((j: any) =>
        j.milestones?.some((m: any) => {
          if (m.status === 'COMPLETED' || m.status === 'APPROVED') return false;
          const daysBefore = m.templateMilestone?.daysBeforeSacrament;
          if (!daysBefore || !j.targetDate) return false;
          const targetDate = new Date(j.targetDate);
          const deadline = new Date(targetDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
          return deadline < now;
        })
      );
    } else if (activeFilter === 'waiting_doc') {
      result = result.filter((j: any) =>
        j.milestones?.some((m: any) =>
          m.templateMilestone?.evidenceRequired && (m.status === 'PENDING' || m.status === 'IN_PROGRESS')
        )
      );
    } else if (activeFilter === 'waiting_approval') {
      result = result.filter((j: any) =>
        j.milestones?.some((m: any) => m.status === 'WAITING_APPROVAL')
      );
    } else if (activeFilter === 'ready') {
      result = result.filter((j: any) => {
        const milestones = j.milestones || [];
        const all = milestones.length;
        const done = milestones.filter((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED').length;
        return all > 0 && done === all;
      });
    } else if (activeFilter === 'no_journey') {
      // This is informational - show catechumens without journeys
      // For now, return empty as journeys list can't show non-journeys
      result = [];
    }

    // Search
    if (search) {
      result = result.filter((j: any) =>
        `${j.catechumenProfile?.firstName} ${j.catechumenProfile?.lastName}`.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [journeys, search, activeParishId, activeFilter]);

  // Catechumens available for new journeys
  const filteredCatechumens = useMemo(() => {
    if (!activeParishId) return catechumens;
    return catechumens.filter((c: any) =>
      c.enrollments?.some((e: any) => e.class?.parishId === activeParishId)
      || c.parishId === activeParishId
    );
  }, [catechumens, activeParishId]);

  const handleCreateJourney = async () => {
    if (!selectedCatechumenId || !templateName) return;
    setSaving(true);
    try {
      const templateId = templates?.find((t: any) => t.name === templateName)?.id;
      if (!templateId) throw new Error(t('page.template_not_found'));
      await createSacramentalJourney({ catechumenProfileId: selectedCatechumenId, templateId });
      setShowForm(false);
      toast({ title: t('page.journey_created') });
    } catch (e: any) {
      const msg = e?.message || tc('error_generic');
      toast({ title: tc('error'), description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const loadTemplates = async () => {
    const data = await listJourneyTemplates();
    setTemplates(data || []);
    if (data?.length && !templateName) setTemplateName(data[0].name);
  };

  const openForm = () => { setShowForm(true); loadTemplates(); };

  const handleUpdate = async (milestoneId: string) => {
    try {
      await updateMilestoneStatus({ milestoneId, status: 'COMPLETED' });
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleUndo = async (milestoneId: string) => {
    try {
      await updateMilestoneStatus({ milestoneId, status: 'PENDING' });
    } catch (e: any) {
      toast({ title: tc('error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveTargetDate = async (journeyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const date = editingTargetDate[journeyId];
    try {
      await updateJourney({ id: journeyId, targetDate: date || null });
      toast({ title: t('page.date_updated') });
      setEditingTargetDate(prev => { const next = { ...prev }; delete next[journeyId]; return next; });
    } catch (err: any) {
      toast({ title: tc('error'), description: err.message, variant: 'destructive' });
    }
  };

  // Compute status summary for stats banner
  const statusCounts = useMemo(() => {
    let all = [...journeys];
    if (activeParishId) {
      all = all.filter((j: any) => {
        const enrollmentParishes = j.catechumenProfile?.enrollments?.map((e: any) => e.class?.parishId) || [];
        return enrollmentParishes.includes(activeParishId) || j.catechumenProfile?.parishId === activeParishId;
      });
    }
    return {
      total: all.length,
      ready: all.filter((j: any) => {
        const ms = j.milestones || [];
        return ms.length > 0 && ms.every((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED');
      }).length,
      blocked: all.filter((j: any) => j.milestones?.some((m: any) => m.status === 'REJECTED')).length,
      waitingApproval: all.filter((j: any) => j.milestones?.some((m: any) => m.status === 'WAITING_APPROVAL')).length,
    };
  }, [journeys, activeParishId]);

  if (loading) return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-56 bg-muted rounded"/><div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => <div key={i} className="h-48 rounded-xl bg-muted"/>)}</div></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={t('page.title')}
          subtitle={isCatechist ? t('page.subtitle_catechist', { count: filtered.length }) : t('page.subtitle_default', { count: filtered.length })}
        >
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder={tc('search')} value={search} onChange={e => setSearch(e.target.value)} className="flex h-9 w-40 rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
            </div>
            {canManage && <Button onClick={openForm}><Plus className="mr-1 h-4 w-4" />{t('page.new_journey')}</Button>}
          </div>
        </PageHeader>

        <div className="grid gap-3 grid-cols-4">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{statusCounts.total}</p>
            <p className="text-overline text-muted-foreground">{t('page.total')}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{statusCounts.ready}</p>
            <p className="text-overline text-muted-foreground">{t('page.ready')}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{statusCounts.waitingApproval}</p>
            <p className="text-overline text-muted-foreground">{t('page.waiting')}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{statusCounts.blocked}</p>
            <p className="text-overline text-muted-foreground">{t('page.blocked')}</p>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTER_KEYS.map(f => {
            const FIcon = f.icon;
            return (
              <Button
                key={f.key}
                size="sm"
                variant={activeFilter === f.key ? 'default' : 'outline'}
                className="h-7 text-xs gap-1"
                onClick={() => setActiveFilter(f.key)}
              >
                <FIcon className="h-3 w-3" />
                {t(`page.filters.${f.key}`)}
              </Button>
            );
          })}
        </div>

        {showForm && (
          <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-3">
            <Select value={selectedCatechumenId || 'none'} onValueChange={(v) => setSelectedCatechumenId(v === 'none' ? '' : v)}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder={t('page.select_catechumen')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('page.select_catechumen')}</SelectItem>
                {filteredCatechumens.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={templateName} onValueChange={setTemplateName}>
              <SelectTrigger className="h-9 min-w-[200px]">
                <SelectValue placeholder={t('page.select_template')} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tm: any) => <SelectItem key={tm.id} value={tm.name}>{tm.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleCreateJourney} disabled={!selectedCatechumenId || saving}>{saving ? t('page.creating') : t('page.start')}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{tc('cancel')}</Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Cross}
            title={search || activeFilter !== 'all' ? t('page.empty_no_results') : t('page.empty_no_journey')}
            description={search ? t('page.empty_try_terms') : t('page.empty_start_desc')}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((j: any) => {
              const milestones = j.milestones || [];
              const total = milestones.length;
              const done = milestones.filter((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED').length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const hasBlocked = milestones.some((m: any) => m.status === 'REJECTED');
              const hasWaiting = milestones.some((m: any) => m.status === 'WAITING_APPROVAL');
              const templateLabel = j.template?.name || t('page.journey_default');
              const sacramentName = j.template?.sacrament?.name;

              return (
                <div key={j.id} className="block rounded-xl border bg-card p-5 shadow-elevation-sm hover:shadow-elevation-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/sacramental-journeys/${j.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      to={`/app/sacramental-journeys/${j.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{j.catechumenProfile?.firstName} {j.catechumenProfile?.lastName}</span>
                    </Link>
                    <Badge variant={pct === 100 ? 'default' : 'outline'}>
                      {sacramentName || templateLabel}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-overline text-muted-foreground mb-1">
                      <span>{t('page.milestones_count', { done, total })}</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Target date — inline editable */}
                  <div className="mb-2 text-xs" onClick={e => e.stopPropagation()}>
                    {editingTargetDate[j.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editingTargetDate[j.id] || ''}
                          onChange={e => setEditingTargetDate(prev => ({ ...prev, [j.id]: e.target.value }))}
                          className="flex h-7 rounded-md border border-input bg-background px-2 text-xs flex-1"
                        />
                        <Button size="sm" className="h-6 text-overline" onClick={(e) => handleSaveTargetDate(j.id, e)}>✓</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {j.targetDate
                          ? formatDate(j.targetDate, currentLocale)
                          : t('page.no_date')}
                        {canManage && (
                          <button onClick={e => { e.stopPropagation(); setEditingTargetDate(prev => ({ ...prev, [j.id]: j.targetDate ? new Date(j.targetDate).toISOString().slice(0,10) : '' })); }}>
                            <Pencil className="h-3 w-3 hover:text-primary" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick status indicators */}
                  <div className="flex gap-2">
                    {hasBlocked && (
                      <span className="text-overline text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />{t('page.status_blocked')}
                      </span>
                    )}
                    {hasWaiting && (
                      <span className="text-overline text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{t('page.status_waiting')}
                      </span>
                    )}
                    {!hasBlocked && !hasWaiting && pct === 100 && (
                      <span className="text-overline text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />{t('page.status_ready')}
                      </span>
                    )}
                  </div>


                  {/* Inline milestone actions (stop propagation) */}
                  <div className="mt-3 space-y-1 border-t pt-2" onClick={e => e.stopPropagation()}>
                    {milestones.slice(0, 3).map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.status === 'COMPLETED' || m.status === 'APPROVED' ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          ) : m.status === 'REJECTED' ? (
                            <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                          ) : m.status === 'WAITING_APPROVAL' ? (
                            <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          ) : (
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={`text-xs truncate ${m.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                            {m.templateMilestone?.name}
                          </span>
                          {m.templateMilestone?.evidenceRequired && (
                            <FileText className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {(isCoordinator && m.status !== 'COMPLETED' && m.status !== 'APPROVED' && m.status !== 'WAITING_APPROVAL') && (
                          <Button size="sm" variant="ghost" className="h-5 text-overline text-green-600 px-1 flex-shrink-0" onClick={() => handleUpdate(m.id)}>
                            ✓
                          </Button>
                        )}
                        {(isCatechist && m.status !== 'COMPLETED' && m.status !== 'APPROVED' && m.status !== 'WAITING_APPROVAL') && (
                          <Button size="sm" variant="ghost" className="h-5 text-overline text-green-600 px-1 flex-shrink-0" onClick={() => handleUpdate(m.id)}>
                            ✓
                          </Button>
                        )}
                        {isCoordinator && m.status === 'WAITING_APPROVAL' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-5 text-overline text-green-600 px-1 flex-shrink-0" onClick={() => handleUpdate(m.id)}>
                              ✓
                            </Button>
                          </>
                        )}
                        {(isCoordinator && (m.status === 'COMPLETED' || m.status === 'APPROVED')) && (
                          <Button size="sm" variant="ghost" className="h-5 text-overline text-muted-foreground hover:text-destructive px-1 flex-shrink-0" onClick={() => handleUndo(m.id)}>
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                        {(isCatechist && m.status === 'COMPLETED') && (
                          <Button size="sm" variant="ghost" className="h-5 text-overline text-muted-foreground hover:text-destructive px-1 flex-shrink-0" onClick={() => handleUndo(m.id)}>
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {milestones.length > 3 && (
                      <p className="text-overline text-muted-foreground text-center pt-1">
                        +{t('page.more_milestones', { count: milestones.length - 3 })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
