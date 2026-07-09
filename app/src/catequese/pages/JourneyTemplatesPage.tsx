import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Plus, Pencil, Trash2, Copy, Send, ClipboardList, ChevronRight, GripVertical, Save, X } from 'lucide-react';
import { AppPageHeader, AppPanel } from '../../client/components/brand/AppChrome';
import { useQuery, listJourneyTemplates, createTemplate, updateTemplate, updateMilestoneTemplate, deleteMilestoneTemplate } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';

export default function JourneyTemplatesPage() {
  const { t } = useTranslation('sacraments');
  const { t: tc } = useTranslation('common');
  const { userRole } = useUserContext();
  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isDioceseAdmin = ['SUPER_ADMIN', 'DIOCESE_ADMIN'].includes(userRole);
  const canManage = isCoordinator;

  const { data: templates = [], isLoading } = useQuery(listJourneyTemplates);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneEdit, setMilestoneEdit] = useState<{ name: string; description: string; required: boolean; evidenceRequired: boolean; daysBeforeSacrament: string }>({ name: '', description: '', required: true, evidenceRequired: false, daysBeforeSacrament: '' });

  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createTemplate({ name: newName.trim(), description: newDescription.trim() || undefined });
      toast({ title: t('templates.template_created') });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
    } catch (e: any) {
      toast({ title: t('templates.error_create'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateTemplate({ id, name: editName.trim(), description: editDescription.trim() || undefined });
      toast({ title: t('templates.template_updated') });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: t('templates.error_update'), description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm(t('templates.confirm_remove_milestone'))) return;
    try {
      await deleteMilestoneTemplate({ id: milestoneId });
      toast({ title: t('templates.milestone_removed') });
    } catch (e: any) {
      toast({ title: t('templates.error_remove_milestone'), description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveMilestone = async () => {
    if (!editingMilestoneId || !milestoneEdit.name.trim()) return;
    try {
      await updateMilestoneTemplate({
        id: editingMilestoneId,
        name: milestoneEdit.name.trim(),
        description: milestoneEdit.description.trim() || undefined,
        required: milestoneEdit.required,
        evidenceRequired: milestoneEdit.evidenceRequired,
        daysBeforeSacrament: milestoneEdit.daysBeforeSacrament ? parseInt(milestoneEdit.daysBeforeSacrament, 10) : null,
      });
      toast({ title: t('templates.milestone_updated') });
      setEditingMilestoneId(null);
    } catch (e: any) {
      toast({ title: t('templates.error_update_milestone'), description: e.message, variant: 'destructive' });
    }
  };

  const handleCopy = async (templateId: string) => {
    setCopyingId(templateId);
    try {
      const { copyTemplate } = await import('wasp/client/operations');
      await copyTemplate({ templateId });
      toast({ title: t('templates.template_copied') });
    } catch (e: any) {
      toast({ title: t('templates.error_copy'), description: e.message || t('templates.error_restart'), variant: 'destructive' });
    } finally {
      setCopyingId(null);
    }
  };

  const handlePublish = async (templateId: string) => {
    setPublishingId(templateId);
    try {
      const { publishTemplate } = await import('wasp/client/operations');
      await publishTemplate({ templateId });
      toast({ title: t('templates.template_published') });
    } catch (e: any) {
      toast({ title: t('templates.error_publish'), description: e.message || t('templates.error_restart'), variant: 'destructive' });
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) {
    return <AppShell><div className="space-y-4 animate-pulse"><div className="h-8 w-56 bg-muted rounded"/>{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted"/>)}</div></AppShell>;
  }

  return (
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t('templates.title')}
          title={t('templates.title')}
          subtitle={t('templates.subtitle', { count: templates.length })}
          actions={
            canManage ? (
              <Button className="h-10 rounded-sm shadow-none" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-4 w-4" />
                {t('templates.new_template')}
              </Button>
            ) : undefined
          }
        />

        {showCreate && (
          <AppPanel className="space-y-3">
            <h3 className="font-semibold text-sm">{t('templates.create_new')}</h3>
            <input
              placeholder={t('templates.name_placeholder')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder={t('templates.description_placeholder')}
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving}>
                {saving ? t('templates.creating') : tc('create')}
              </Button>
              <Button size="sm" variant="outline" className="rounded-sm" onClick={() => setShowCreate(false)}>{tc('cancel')}</Button>
            </div>
          </AppPanel>
        )}

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t('templates.empty_title')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('templates.empty_desc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tmpl: any) => {
              const milestones = tmpl.milestones || [];
              const isExpanded = expandedTemplateId === tmpl.id;
              const isEditing = editingId === tmpl.id;
              const scopeLabel = !tmpl.parishId
                ? t('templates.scope_diocese')
                : tmpl.parish?.type === 'PERSONAL'
                  ? t('templates.scope_personal')
                  : t('templates.scope_parish', { name: tmpl.parish?.name || '—' });

              return (
                <div key={tmpl.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-medium"
                          />
                          <textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs min-h-[40px]"
                            rows={2}
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-overline" onClick={() => handleUpdate(tmpl.id)}><Save className="mr-1 h-3 w-3" />{tc('save')}</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-overline" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{tmpl.name}</h3>
                            <Badge variant="outline" className="text-overline">{scopeLabel}</Badge>
                            {tmpl.sacrament?.name && <Badge className="text-overline">{tmpl.sacrament.name}</Badge>}
                          </div>
                          {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>}
                          <p className="text-overline text-muted-foreground mt-1">{t('templates.milestones_count', { count: milestones.length })}</p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-overline"
                              onClick={() => {
                                setEditingId(tmpl.id);
                                setEditName(tmpl.name);
                                setEditDescription(tmpl.description || '');
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-overline"
                              onClick={() => handleCopy(tmpl.id)}
                              disabled={copyingId === tmpl.id}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {isDioceseAdmin && tmpl.parishId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-overline text-primary"
                                onClick={() => handlePublish(tmpl.id)}
                                disabled={publishingId === tmpl.id}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-overline"
                          onClick={() => setExpandedTemplateId(isExpanded ? null : tmpl.id)}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('milestones')}</h4>
                      {milestones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('templates.no_milestones')}</p>
                      ) : (
                        milestones.map((m: any) => {
                          const isEditingMilestone = editingMilestoneId === m.id;
                          return (
                            <div key={m.id} className="flex items-start gap-3 rounded-md border bg-card p-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                {isEditingMilestone ? (
                                  <div className="space-y-2">
                                    <input
                                      value={milestoneEdit.name}
                                      onChange={e => setMilestoneEdit(prev => ({ ...prev, name: e.target.value }))}
                                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
                                      placeholder={t('templates.milestone_name')}
                                    />
                                    <textarea
                                      value={milestoneEdit.description}
                                      onChange={e => setMilestoneEdit(prev => ({ ...prev, description: e.target.value }))}
                                      className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs min-h-[32px]"
                                      rows={1}
                                      placeholder={t('templates.description')}
                                    />
                                    <div className="flex items-center gap-3 text-xs flex-wrap">
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={milestoneEdit.required} onChange={e => setMilestoneEdit(prev => ({ ...prev, required: e.target.checked }))} />
                                        {t('required')}
                                      </label>
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={milestoneEdit.evidenceRequired} onChange={e => setMilestoneEdit(prev => ({ ...prev, evidenceRequired: e.target.checked }))} />
                                        {t('evidence')}
                                      </label>
                                      <label className="flex items-center gap-1">
                                        {t('templates.days_before')}
                                        <input
                                          type="number"
                                          value={milestoneEdit.daysBeforeSacrament}
                                          onChange={e => setMilestoneEdit(prev => ({ ...prev, daysBeforeSacrament: e.target.value }))}
                                          className="w-16 h-6 rounded-md border border-input bg-background px-1 text-xs"
                                          min="0"
                                        />
                                      </label>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-6 text-overline" onClick={handleSaveMilestone}><Save className="mr-1 h-2.5 w-2.5" />{tc('save')}</Button>
                                      <Button size="sm" variant="ghost" className="h-6 text-overline" onClick={() => setEditingMilestoneId(null)}><X className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                                        {m.name}
                                        {m.required && <Badge variant="outline" className="text-overline">{t('required')}</Badge>}
                                        {m.evidenceRequired && <Badge variant="outline" className="text-overline">{t('evidence')}</Badge>}
                                        {m.daysBeforeSacrament != null && <Badge variant="outline" className="text-overline">{t('templates.days_before_badge', { count: m.daysBeforeSacrament })}</Badge>}
                                      </p>
                                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                                    </div>
                                    {canManage && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-overline"
                                          onClick={() => {
                                            setEditingMilestoneId(m.id);
                                            setMilestoneEdit({
                                              name: m.name,
                                              description: m.description || '',
                                              required: m.required,
                                              evidenceRequired: m.evidenceRequired,
                                              daysBeforeSacrament: m.daysBeforeSacrament?.toString() || '',
                                            });
                                          }}
                                        >
                                          <Pencil className="h-2.5 w-2.5" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-overline text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteMilestone(m.id)}
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
