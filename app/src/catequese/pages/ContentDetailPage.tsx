import { useParams, Link, useSearchParams } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { EmptyState } from '../../client/components/EmptyState';
import { ArrowLeft, Clock, Tag, Target, Send, CheckCircle, Archive, Eye, Plus, Puzzle, Edit3, Calendar, FileText, Trash2, Sparkles, Printer, BookOpen, BookMarked, MessageCircle } from 'lucide-react';
import { useQuery, getContentItem, listActivitiesByContent, updateContentStatus, createActivity, updateActivity, deleteActivity } from 'wasp/client/operations';
import { ActivityForm, type ActivityType } from '../components/ActivityForm';
import { useContentStatusMap, useActivityTypes } from '../../i18n/useLabels';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';
import { toast } from '../../client/hooks/use-toast';

function parseData(data: string | null): any {
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}

function activityPreview(type: string, data: any, t: any): string {
  switch (type) {
    case 'QUIZ': return t('preview.quiz_questions', { count: data?.questions?.length || 0 });
    case 'OPEN_QUESTION': return data?.question ? t('preview.open_question') : t('preview.no_question');
    case 'PARTICIPATION_CHECKLIST': return t('preview.checklist_items', { count: data?.items?.length || 0 });
    case 'GUIDED_REFLECTION': return t('preview.reflection_prompts', { count: data?.prompts?.length || 0 });
    case 'GROUP_DYNAMIC': return t('preview.dynamic_steps', { count: data?.steps?.length || 0 });
    case 'FAMILY_ACTIVITY': return data?.task ? t('preview.family_described') : t('preview.no_description');
    case 'BIBLE_READING': return data?.reference || t('preview.bible_reading');
    case 'MATCHING': return t('preview.matching_pairs', { count: data?.pairs?.length || 0 });
    case 'TASK_WITH_ATTACHMENT': return data?.requiresUpload ? t('preview.requires_upload') : t('preview.no_upload');
    case 'RITE_CELEBRATION': return data?.rite ? t('preview.rite_described') : t('preview.no_description');
    default: return '';
  }
}

export default function ContentDetailPage(){
  const { t } = useTranslation('content');
  const { t: ta } = useTranslation('activities');
  const { t: tai } = useTranslation('ai');
  const { t: tc } = useTranslation('common');
  const STATUS_MAP = useContentStatusMap();
  const activityTypes = useActivityTypes();
  const { currentLocale } = useLocale();
  const {id}=useParams<{id:string}>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: item, isLoading: loading } = useQuery(getContentItem, { id: id! });
  const { data: activities = [] } = useQuery(listActivitiesByContent, { contentId: id! });
  const initialTab = searchParams.get('tab') === 'activities' ? 'activities' : 'meeting';
  const [tab, setTab] = useState<'meeting'|'activities'>(initialTab);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!confirm(t('detail.confirm_remove_activity'))) return;
    await deleteActivity({ id: activityId });
  };

  if(loading) return <AppShell><div className="max-w-3xl mx-auto space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded"/><div className="h-48 rounded-xl bg-muted"/></div></AppShell>;
  if(!item) return <AppShell><div className="p-6 text-destructive">{t('not_found')}</div></AppShell>;

  const editingActivity = editingId ? activities.find((a: any) => a.id === editingId) : null;
  const handleTabChange = (nextTab: 'meeting' | 'activities') => {
    setTab(nextTab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (nextTab === 'activities') {
        next.set('tab', 'activities');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  return(
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/content-library"><ArrowLeft className="h-5 w-5"/></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_MAP[item.status as keyof typeof STATUS_MAP]?.variant||'secondary'}>{STATUS_MAP[item.status as keyof typeof STATUS_MAP]?.label}</Badge>
              {item.estimatedTime&&<span className="text-sm text-muted-foreground"><Clock className="inline h-3 w-3 mr-1"/>{t('library.minutes', { count: item.estimatedTime })}</span>}
              {item.createdBy&&<span className="text-xs text-muted-foreground">{t('detail.by_author', { name: item.createdBy.firstName })}</span>}
            </div>
          </div>
          <Button size="sm" variant="outline" asChild><Link to={`/app/content-library/${id}/edit`}><Edit3 className="mr-1 h-3 w-3"/>{tc('edit')}</Link></Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/app/content-library/${id}/print`} className="gap-1">
              <Printer className="mr-1 h-3 w-3" /> {t('print')}
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.status==='DRAFT'&&<Button size="sm" variant="outline" onClick={()=>changeStatus('IN_REVIEW')}><Send className="mr-1 h-3 w-3"/>{t('submit_review')}</Button>}
          {item.status==='IN_REVIEW'&&<><Button size="sm" onClick={()=>changeStatus('APPROVED')}><CheckCircle className="mr-1 h-3 w-3"/>{t('approve')}</Button><Button size="sm" variant="outline" onClick={()=>changeStatus('DRAFT')}>{t('back_to_draft')}</Button></>}
          {item.status==='APPROVED'&&<Button size="sm" onClick={()=>changeStatus('PUBLISHED')}><Eye className="mr-1 h-3 w-3"/>{t('publish')}</Button>}
          {item.status==='PUBLISHED'&&<Button size="sm" variant="outline" onClick={()=>changeStatus('ARCHIVED')}><Archive className="mr-1 h-3 w-3"/>{t('archive')}</Button>}
          <Button
            size="sm"
            variant="outline"
            asChild
            className="gap-1 border-dashed"
          >
            <Link to={`/app/ai-hub?mode=generate-whatsapp&contentId=${id}&contentTitle=${encodeURIComponent(item.title || '')}&contentTheme=${encodeURIComponent(item.theme || '')}`}>
              <MessageCircle className="h-3 w-3" />
              {tai('hub.existing_whatsapp')}
            </Link>
          </Button>
        </div>

        <div className="flex border-b">
          <button onClick={() => handleTabChange('meeting')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'meeting' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <FileText className="h-4 w-4" /> {t('script')}
          </button>
          <button onClick={() => handleTabChange('activities')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Puzzle className="h-4 w-4" /> {t('activities_tab')} ({activities.length})
          </button>
        </div>

        {tab === 'meeting' && (
          <div className="space-y-5">
            {item.theme&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('theme')}</h3><p className="text-sm">{item.theme}</p></div>}
            {item.pastoralObjective&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1"><Target className="inline h-4 w-4 mr-1"/>{t('pastoral_objective')}</h3><p className="text-sm">{item.pastoralObjective}</p></div>}
            {item.openingPrayer&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('opening_prayer')}</h3><p className="text-sm italic">{item.openingPrayer}</p></div>}
            {item.closingPrayer&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('closing_prayer')}</h3><p className="text-sm italic">{item.closingPrayer}</p></div>}

            {item.biblicalRef&&<div className="rounded-xl border bg-primary/5 border-primary/20 p-4"><h3 className="text-xs font-medium text-primary uppercase mb-1 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{t('biblical_ref')}</h3><p className="text-sm whitespace-pre-line">{item.biblicalRef}</p></div>}

            {(item.bibleRefs?.length > 0 || item.catechismRefs?.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">{t('references')}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {item.bibleRefs?.map((ref: any) => (
                    <div key={ref.id} className="rounded-lg border bg-primary/5 p-3 text-sm">
                      <p className="font-medium text-primary text-xs mb-1">{ref.verse?.chapter?.book?.name||''} {ref.verse?.chapter?.number}:{ref.verse?.number}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{ref.verse?.text}</p>
                    </div>
                  ))}
                  {item.catechismRefs?.map((ref: any) => (
                    <div key={ref.id} className="rounded-lg border bg-secondary/5 p-3 text-sm">
                      <p className="font-medium text-secondary text-xs mb-1 flex items-center gap-1"><BookMarked className="h-3 w-3" />{t('catechism_ref')} §{ref.entry?.number}</p>
                      <p className="font-medium text-xs mb-1">{ref.entry?.question}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{ref.entry?.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.mainContent&&<div className="rounded-xl border bg-card p-6"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-3">{t('main_content')}</h3><div className="whitespace-pre-wrap text-sm">{item.mainContent}</div></div>}
            {item.dynamic&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('dynamic_activity')}</h3><p className="whitespace-pre-wrap text-sm">{item.dynamic}</p></div>}
            {item.activity&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('activity')}</h3><p className="whitespace-pre-wrap text-sm">{item.activity}</p></div>}
            {item.familyTask&&<div className="rounded-xl border bg-card p-4"><h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('family_commitment')}</h3><p className="text-sm">{item.familyTask}</p></div>}
            {item.tags&&<div className="flex flex-wrap gap-1">{item.tags.split(',').map((tag:string)=><span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"><Tag className="mr-1 h-3 w-3"/>{tag.trim()}</span>)}</div>}

            {item.meetings?.length>0&&(
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Calendar className="h-4 w-4"/>{t('used_in_meetings', { count: item.meetings.length })}</h3>
                <div className="space-y-1">{item.meetings.map((m:any)=>(
                  <Link key={m.id} to={`/app/classes/${m.classId}/attendance`} className="flex justify-between text-sm hover:text-primary py-1">
                    <span>{m.title||t('meeting_default')}</span><span className="text-xs text-muted-foreground">{formatDate(m.date, currentLocale)}</span>
                  </Link>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'activities' && (
          <div className="space-y-4">
            {(showForm || editingId) ? (
              <ActivityForm
                initialType={editingActivity?.type as ActivityType || 'QUIZ'}
                initialTitle={editingActivity?.title || ''}
                initialDescription={editingActivity?.description || ''}
                initialPoints={editingActivity?.points || 10}
                initialData={editingActivity ? parseData(editingActivity.data) : undefined}
                onSubmit={editingId ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditingId(null); }}
                submitLabel={editingId ? t('detail.update_activity') : t('detail.create_activity')}
              />
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> {t('detail.new_activity')}
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="gap-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                >
                  <Link to={`/app/ai-hub?mode=generate-activity&contentId=${id}&contentTitle=${encodeURIComponent(item.title || '')}&contentTheme=${encodeURIComponent(item.theme || '')}`}>
                    <Sparkles className="h-4 w-4" />
                    {t('detail.open_copilot') ? t('detail.open_copilot') : t('detail.generate_ai')}
                  </Link>
                </Button>
              </div>
            )}

            {activities.length === 0 && !showForm ? (
              <EmptyState icon={Puzzle} title={t('detail.no_activities')} description={t('detail.no_activities_desc')}>
                <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-1 h-4 w-4"/>{t('detail.create_activity')}
                </Button>
              </EmptyState>
            ) : (
              <div className="space-y-2">
                {activities.map((a: any) => {
                  const data = parseData(a.data);
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge variant="outline" className="text-overline">
                            {activityTypes.find(at => at.value === a.type)?.label || a.type}
                          </Badge>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                        <p className="text-caption text-muted-foreground mt-1">
                          {activityPreview(a.type, data, ta)}
                          {a.points > 0 && ` · ${t('detail.points', { count: a.points })}`}
                          {a.submissions?.length > 0 && ` · ${t('detail.responses', { count: a.submissions.length })}`}
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
  );
}
