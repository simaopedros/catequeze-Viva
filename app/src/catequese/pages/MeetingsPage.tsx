import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Badge } from '../../client/components/ui/badge';
import { Plus, Calendar, BookOpen, Sparkles, MessageCircle, Trash2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { SkeletonPage } from '../../client/components/Skeletons';
import { EmptyState } from '../../client/components/EmptyState';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { useQuery, listMeetings, createMeeting, updateMeeting, deleteMeeting, listContentItems } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

export default function MeetingsPage() {
  const { t } = useTranslation('meetings');
  const { t: tc } = useTranslation('common');
  const { t: tcl } = useTranslation('classes');
  const { currentLocale } = useLocale();
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const canManageMeetings = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'].includes(userRole);
  const { data: meetings = [], isLoading: loading, refetch: refetchMeetings } = useQuery(listMeetings, { classId: classId! });
  const { data: contentItems = [] } = useQuery(listContentItems);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedContentId, setSelectedContentId] = useState('');

  const handleCreate = async () => {
    if (!title) return;
    try {
      await createMeeting({
        classId: classId!,
        title,
        date,
        contentId: selectedContentId || undefined,
      });
      setTitle('');
      setSelectedContentId('');
      setShowForm(false);
      refetchMeetings();
    } catch (e: any) {
      toast({ title: t('create_error', { message: e.message || t('no_permission') }) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting({ id: deleteTarget });
      toast({ title: t('delete_success') });
      refetchMeetings();
    } catch (e: any) {
      toast({ title: t('delete_error', { message: e.message || tc('try_again') }), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const handleLinkContent = async (meetingId: string, contentId: string | null) => {
    try {
      await updateMeeting({ id: meetingId, contentId });
    } catch (e: any) {
      toast({ title: t('update_error', { message: e.message || t('server_error') }) });
    }
  };

  if (loading) return <AppShell><div className="p-6"><SkeletonPage /></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          backTo={`/app/classes/${classId}`}
        >
          {canManageMeetings && <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />{t('new')}</Button>}
        </PageHeader>

        {showForm && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5"><Label htmlFor="meetingTitle">{t('meeting_title')}</Label><Input id="meetingTitle" placeholder={t('meeting_title')} value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="meetingDate">{t('date')}</Label><Input id="meetingDate" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex-1 space-y-1.5">
                <Input
                  placeholder={t('search_content')}
                  value={contentSearch}
                  onChange={e => setContentSearch(e.target.value)}
                  className="h-9"
                />
                <select
                  value={selectedContentId}
                  onChange={e => setSelectedContentId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">{t('no_content')}</option>
                  {contentItems
                    .filter((c: any) => !contentSearch || c.title?.toLowerCase().includes(contentSearch.toLowerCase()) || c.theme?.toLowerCase().includes(contentSearch.toLowerCase()))
                    .slice(0, 20)
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}{c.theme ? ` — ${c.theme}` : ''}</option>
                    ))
                  }
                </select>
              </div>
              <Button onClick={handleCreate} disabled={!title && !selectedContentId}>{t('create')}</Button>
            </div>
          </div>
        )}

        {meetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t('empty_title')}
            description={t('empty_desc')}
            compact
          />
        ) : (
          <div className="space-y-3">
            {meetings.map((m: any) => (
              <div key={m.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.title || t('no_title')}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(m.date, currentLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-overline">{t('attendance_count', { count: m._count?.attendance || 0 })}</Badge>
                    <Link to={`/app/classes/${classId}/attendance`} className="text-xs text-primary hover:underline">{tcl('attendance')}</Link>
                  </div>
                </div>

                {m.content ? (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-md p-2 text-xs">
                    <BookOpen className="h-3 w-3 text-primary" />
                    <Link to={`/app/content-library/${m.content.id}`} className="text-primary hover:underline font-medium">{m.content.title}</Link>
                    <button
                      onClick={() => handleLinkContent(m.id, null)}
                      className="ml-auto text-muted-foreground hover:text-destructive text-overline"
                    >
                      {t('unlink')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      onChange={e => { if (e.target.value) handleLinkContent(m.id, e.target.value); }}
                      className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                      defaultValue=""
                    >
                      <option value="">{t('link_content')}</option>
                      {contentItems.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => navigate(`/app/ai-hub?mode=generate-activity&meetingId=${m.id}&meetingTitle=${encodeURIComponent(m.title || '')}${m.content ? `&contentId=${m.content.id}&contentTitle=${encodeURIComponent(m.content.title || '')}&contentTheme=${encodeURIComponent(m.content.theme || '')}` : ''}`)}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {t('generate_ai_activity')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => navigate(`/app/ai-hub?mode=generate-whatsapp&meetingId=${m.id}&meetingTitle=${encodeURIComponent(m.title || '')}${m.content ? `&contentId=${m.content.id}&contentTitle=${encodeURIComponent(m.content.title || '')}&contentTheme=${encodeURIComponent(m.content.theme || '')}` : ''}`)}
                  >
                    <MessageCircle className="mr-1 h-3 w-3" />
                    {t('generate_whatsapp')}
                  </Button>
                  {canManageMeetings && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(m.id)}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      {tc('delete')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          onConfirm={handleDelete}
          title={t('delete_confirm_title')}
          description={t('delete_confirm_desc')}
        />
      </div>
    </AppShell>
  );
}
