import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Plus, Pencil, Trash2, Copy, Send, ClipboardList, ChevronRight, GripVertical, Save, X } from 'lucide-react';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { useQuery, listJourneyTemplates, createTemplate, updateTemplate, updateMilestoneTemplate, deleteMilestoneTemplate } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { toast } from '../../client/hooks/use-toast';

export default function JourneyTemplatesPage() {
  const { userRole } = useUserContext();
  const isCoordinator = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(userRole);
  const isDioceseAdmin = ['SUPER_ADMIN', 'DIOCESE_ADMIN'].includes(userRole);
  const canManage = isCoordinator;

  const { data: templates = [], isLoading } = useQuery(listJourneyTemplates);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Milestone editing
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneEdit, setMilestoneEdit] = useState<{ name: string; description: string; required: boolean; evidenceRequired: boolean; daysBeforeSacrament: string }>({ name: '', description: '', required: true, evidenceRequired: false, daysBeforeSacrament: '' });

  // Copy/publish loading
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createTemplate({ name: newName.trim(), description: newDescription.trim() || undefined });
      toast({ title: 'Modelo criado!' });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
    } catch (e: any) {
      toast({ title: 'Erro ao criar modelo', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateTemplate({ id, name: editName.trim(), description: editDescription.trim() || undefined });
      toast({ title: 'Modelo atualizado.' });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Remover este marco?')) return;
    try {
      await deleteMilestoneTemplate({ id: milestoneId });
      toast({ title: 'Marco removido.' });
    } catch (e: any) {
      toast({ title: 'Erro ao remover marco', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Marco atualizado.' });
      setEditingMilestoneId(null);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar marco', description: e.message, variant: 'destructive' });
    }
  };

  const handleCopy = async (templateId: string) => {
    setCopyingId(templateId);
    try {
      // copyTemplate will be available after Wasp SDK regeneration
      const { copyTemplate } = await import('wasp/client/operations');
      await copyTemplate({ templateId });
      toast({ title: 'Modelo copiado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao copiar modelo', description: e.message || 'Reinicie o servidor Wasp.', variant: 'destructive' });
    } finally {
      setCopyingId(null);
    }
  };

  const handlePublish = async (templateId: string) => {
    setPublishingId(templateId);
    try {
      const { publishTemplate } = await import('wasp/client/operations');
      await publishTemplate({ templateId });
      toast({ title: 'Modelo publicado para a diocese!' });
    } catch (e: any) {
      toast({ title: 'Erro ao publicar', description: e.message || 'Reinicie o servidor Wasp.', variant: 'destructive' });
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) {
    return <AppShell><div className="space-y-4 animate-pulse"><div className="h-8 w-56 bg-muted rounded"/>{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted"/>)}</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Modelos de Jornada" subtitle={`${templates.length} modelos disponíveis`}>
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" />Novo modelo
            </Button>
          )}
        </PageHeader>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Criar novo modelo</h3>
            <input
              placeholder="Nome do modelo"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder="Descrição (opcional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving}>
                {saving ? 'Criando...' : 'Criar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Templates list */}
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum modelo</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie modelos de jornada sacramental para reutilizar com seus catequizandos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t: any) => {
              const milestones = t.milestones || [];
              const isExpanded = expandedTemplateId === t.id;
              const isEditing = editingId === t.id;
              const scopeLabel = !t.parishId
                ? 'Diocese / Global'
                : t.parish?.type === 'PERSONAL'
                  ? 'Pessoal'
                  : `Paróquia: ${t.parish?.name || '—'}`;

              return (
                <div key={t.id} className="rounded-xl border bg-card overflow-hidden">
                  {/* Template header */}
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
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => handleUpdate(t.id)}><Save className="mr-1 h-3 w-3" />Guardar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{t.name}</h3>
                            <Badge variant="outline" className="text-[10px]">{scopeLabel}</Badge>
                            {t.sacrament?.name && <Badge className="text-[10px]">{t.sacrament.name}</Badge>}
                          </div>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{milestones.length} marcos</p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px]"
                              onClick={() => {
                                setEditingId(t.id);
                                setEditName(t.name);
                                setEditDescription(t.description || '');
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px]"
                              onClick={() => handleCopy(t.id)}
                              disabled={copyingId === t.id}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {isDioceseAdmin && t.parishId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-primary"
                                onClick={() => handlePublish(t.id)}
                                disabled={publishingId === t.id}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px]"
                          onClick={() => setExpandedTemplateId(isExpanded ? null : t.id)}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Milestones — expandable */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marcos</h4>
                      {milestones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum marco definido.</p>
                      ) : (
                        milestones.map((m: any, idx: number) => {
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
                                      placeholder="Nome do marco"
                                    />
                                    <textarea
                                      value={milestoneEdit.description}
                                      onChange={e => setMilestoneEdit(prev => ({ ...prev, description: e.target.value }))}
                                      className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs min-h-[32px]"
                                      rows={1}
                                      placeholder="Descrição"
                                    />
                                    <div className="flex items-center gap-3 text-xs flex-wrap">
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={milestoneEdit.required} onChange={e => setMilestoneEdit(prev => ({ ...prev, required: e.target.checked }))} />
                                        Obrigatório
                                      </label>
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={milestoneEdit.evidenceRequired} onChange={e => setMilestoneEdit(prev => ({ ...prev, evidenceRequired: e.target.checked }))} />
                                        Evidência
                                      </label>
                                      <label className="flex items-center gap-1">
                                        Dias antes:
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
                                      <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveMilestone}><Save className="mr-1 h-2.5 w-2.5" />Guardar</Button>
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingMilestoneId(null)}><X className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                                        {m.name}
                                        {m.required && <Badge variant="outline" className="text-[9px]">Obrigatório</Badge>}
                                        {m.evidenceRequired && <Badge variant="outline" className="text-[9px]">Evidência</Badge>}
                                        {m.daysBeforeSacrament != null && <Badge variant="outline" className="text-[9px]">{m.daysBeforeSacrament}d antes</Badge>}
                                      </p>
                                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                                    </div>
                                    {canManage && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px]"
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
                                          className="h-6 text-[10px] text-destructive hover:text-destructive"
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
    </AppShell>
  );
}
