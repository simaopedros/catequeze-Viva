import { useParams, Link } from 'react-router';
import { useState, useCallback } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, User, Phone, MapPin, Edit3, Shield, GraduationCap, TrendingUp, Building2, Save, X, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import {
  useQuery,
  listHouseholds,
  saveConsent,
  updateHousehold,
  addGuardianToHousehold,
  removeGuardianFromHousehold,
  updateGuardianProfile,
} from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import { useViaCep } from '../../client/hooks/useViaCep';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../client/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../client/components/ui/select';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border dark:border-blue-900/50',
  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border dark:border-green-900/50',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border dark:border-amber-900/50',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 dark:border dark:border-purple-900/50',
];

const RELATIONSHIP_OPTIONS = [
  { value: 'Pai', label: 'Pai' },
  { value: 'Mãe', label: 'Mãe' },
  { value: 'Avô/Avó', label: 'Avô/Avó' },
  { value: 'Tio/Tia', label: 'Tio/Tia' },
  { value: 'Padrinho/Madrinha', label: 'Padrinho/Madrinha' },
  { value: 'Responsável Legal', label: 'Responsável Legal' },
  { value: 'Outro', label: 'Outro' },
];

function getGuardianDisplayName(g: any): string {
  if (!g) return '';
  if (g.user) return `${g.user.firstName || ''} ${g.user.lastName || ''}`.trim();
  return `${g.firstName || ''} ${g.lastName || ''}`.trim();
}

function getGuardianAvatarLetter(g: any): string {
  if (!g) return '?';
  const name = g.user ? g.user.firstName : g.firstName;
  return name?.[0] || '?';
}

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: allHouseholds = [], isLoading: loading } = useQuery(listHouseholds);
  const household = allHouseholds?.find((h: any) => h.id === id);
  const [savingConsent, setSavingConsent] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: cepData, loading: cepLoading } = useViaCep(editCep);

  // ── Guardian management state ──
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [guardianFirstName, setGuardianFirstName] = useState('');
  const [guardianLastName, setGuardianLastName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [savingGuardian, setSavingGuardian] = useState(false);

  // Edit guardian state
  const [editGuardianDialogOpen, setEditGuardianDialogOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<any>(null);
  const [editGuardianFirstName, setEditGuardianFirstName] = useState('');
  const [editGuardianLastName, setEditGuardianLastName] = useState('');
  const [editGuardianRelationship, setEditGuardianRelationship] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [savingEditGuardian, setSavingEditGuardian] = useState(false);

  // Remove guardian state
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [removingGuardian, setRemovingGuardian] = useState<any>(null);
  const [removingGuardianLoading, setRemovingGuardianLoading] = useState(false);

  // Start editing: copy current values into edit fields
  const startEditing = useCallback(() => {
    if (!household) return;
    setEditName(household.name || '');
    setEditAddress(household.address || '');
    setEditPhone(household.phone || '');
    setEditCep('');
    setEditing(true);
  }, [household]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditCep('');
  }, []);

  // Auto-populate address from ViaCEP (only when editing)
  const cepRaw = editCep.replace(/\D/g, '');
  const showCepFill = editing && cepData && cepRaw.length === 8 && editAddress !== (
    [cepData.street, cepData.neighborhood && `- ${cepData.neighborhood}`, cepData.city && `- ${cepData.city}/${cepData.state}`]
      .filter(Boolean).join(' ')
  );

  const fillAddressFromCep = useCallback(() => {
    if (!cepData) return;
    const parts = [
      cepData.street,
      cepData.neighborhood && `- ${cepData.neighborhood}`,
      cepData.city && `- ${cepData.city}/${cepData.state}`,
    ].filter(Boolean);
    setEditAddress(parts.join(' '));
  }, [cepData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateHousehold({
        id,
        name: editName.trim() || undefined,
        address: editAddress.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      setEditing(false);
      toast({ title: 'Família atualizada com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha ao salvar.') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConsent = async (consentType: string, granted: boolean) => {
    setSavingConsent(consentType);
    try {
      await saveConsent({ type: consentType, granted });
      toast({ title: granted ? 'Consentimento autorizado.' : 'Consentimento revogado.' });
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha ao salvar.') });
    } finally {
      setSavingConsent(null);
    }
  };

  // ── Guardian handlers ──

  const openAddGuardianDialog = () => {
    setGuardianFirstName('');
    setGuardianLastName('');
    setGuardianRelationship('');
    setGuardianPhone('');
    setGuardianDialogOpen(true);
  };

  const handleAddGuardian = async () => {
    if (!id) return;
    const firstName = guardianFirstName.trim();
    if (!firstName) return;

    setSavingGuardian(true);
    try {
      await addGuardianToHousehold({
        householdId: id,
        firstName: firstName || undefined,
        lastName: guardianLastName.trim() || undefined,
        relationship: guardianRelationship || undefined,
        phone: guardianPhone || undefined,
      });

      toast({ title: 'Responsável adicionado com sucesso.' });
      setGuardianDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha ao adicionar responsável.') });
    } finally {
      setSavingGuardian(false);
    }
  };

  const openEditGuardianDialog = (guardian: any) => {
    setEditingGuardian(guardian);
    setEditGuardianFirstName(guardian.firstName || '');
    setEditGuardianLastName(guardian.lastName || '');
    setEditGuardianRelationship(guardian.relationship || '');
    setEditGuardianPhone(guardian.phone || '');
    setEditGuardianDialogOpen(true);
  };

  const handleUpdateGuardian = async () => {
    if (!editingGuardian) return;
    setSavingEditGuardian(true);
    try {
      const data: any = { guardianProfileId: editingGuardian.id };
      // Only send name fields for guardians without a linked user
      if (!editingGuardian.userId) {
        data.firstName = editGuardianFirstName.trim() || undefined;
        data.lastName = editGuardianLastName.trim() || undefined;
      }
      data.relationship = editGuardianRelationship || undefined;
      data.phone = editGuardianPhone || undefined;

      await updateGuardianProfile(data);
      toast({ title: 'Responsável atualizado com sucesso.' });
      setEditGuardianDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha ao atualizar responsável.') });
    } finally {
      setSavingEditGuardian(false);
    }
  };

  const openRemoveGuardianConfirm = (guardian: any) => {
    setRemovingGuardian(guardian);
    setConfirmRemoveOpen(true);
  };

  const handleRemoveGuardian = async () => {
    if (!removingGuardian) return;
    setRemovingGuardianLoading(true);
    try {
      await removeGuardianFromHousehold({ guardianProfileId: removingGuardian.id });
      toast({ title: 'Responsável removido da família.' });
      setConfirmRemoveOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro: ' + (e.message || 'Falha ao remover responsável.') });
    } finally {
      setRemovingGuardianLoading(false);
    }
  };

  if (loading)
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  if (!household)
    return (
      <AppShell>
        <div className="p-6 text-destructive">Família não encontrada.</div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/families">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b border-input outline-none w-full"
                autoFocus
              />
            ) : (
              <>
                <h1 className="text-2xl font-bold">{household.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {household._count?.catechumens || 0} catequizandos · {household.guardians?.length || 0} responsáveis
                </p>
              </>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditing}>
                <X className="mr-1 h-3 w-3" />
                Cancelar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Edit3 className="mr-1 h-3 w-3" />
              Editar
            </Button>
          )}
        </div>

        {/* Contact info */}
        {editing ? (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase">Editar Endereço e Telefone</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">CEP</label>
              <div className="flex items-center gap-2">
                <input
                  value={editCep}
                  onChange={(e) => setEditCep(e.target.value)}
                  className="flex h-9 w-40 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="00000-000"
                />
                {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {showCepFill && (
                  <Button size="sm" variant="outline" onClick={fillAddressFromCep} className="text-xs h-8">
                    Preencher endereço
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Endereço</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefone</label>
              <PhoneMaskInput
                value={editPhone}
                onChange={setEditPhone}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {household.address && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  Endereço
                </h3>
                <p className="text-sm">{household.address}</p>
              </div>
            )}
            {household.phone && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3" />
                  Telefone
                </h3>
                <p className="text-sm">{household.phone}</p>
              </div>
            )}
            {household.community && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1">
                  <Building2 className="h-3 w-3" />
                  Comunidade
                </h3>
                <Link to={`/app/communities/${household.community.id}`} className="text-sm text-primary hover:underline">
                  {household.community.name}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Guardians */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-1">
              <User className="h-4 w-4" />
              Responsáveis
            </h3>
            <Button size="sm" variant="outline" onClick={openAddGuardianDialog}>
              <Plus className="mr-1 h-3 w-3" />
              Adicionar
            </Button>
          </div>
          {household.guardians?.length > 0 ? (
            <div className="space-y-2">
              {household.guardians.map((g: any) => {
                const displayName = getGuardianDisplayName(g);
                const avatarLetter = getGuardianAvatarLetter(g);
                const emailOrPlaceholder = g.user?.email;
                return (
                  <div key={g.id} className="flex items-center gap-3 group">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        AVATAR_COLORS[Math.abs(avatarLetter.charCodeAt(0) || 0) % AVATAR_COLORS.length]
                      }`}
                    >
                      {avatarLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emailOrPlaceholder}
                        {emailOrPlaceholder && (g.relationship || g.phone) ? ' · ' : ''}
                        {g.relationship}
                        {g.relationship && g.phone ? ' · ' : ''}
                        {g.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEditGuardianDialog(g)}
                        title="Editar responsável"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => openRemoveGuardianConfirm(g)}
                        title="Remover responsável"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>
          )}
        </div>

        {/* Catechumens */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Catequizandos
          </h3>
          {household.catechumens?.length > 0 ? (
            <div className="space-y-2">
              {household.catechumens.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/app/catechumens/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
                    }`}
                  >
                    {c.firstName?.[0]}
                    {c.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.birthDate && new Date(c.birthDate).toLocaleDateString()}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum catequizando.</p>
          )}
        </div>

        {/* Consents */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Consentimentos (LGPD)
          </h3>
          {household.consents?.length > 0 ? (
            <div className="space-y-3">
              {household.consents.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-1 text-sm">
                  <span>
                    {c.type === 'IMAGE_USAGE'
                      ? 'Uso de imagem'
                      : c.type === 'COMMUNICATION'
                      ? 'Comunicação'
                      : c.type === 'DOCUMENTS'
                      ? 'Documentos'
                      : c.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.granted ? 'default' : 'secondary'} className="text-[10px]">
                      {c.granted ? 'Autorizado' : 'Negado'}
                    </Badge>
                    <Button
                      size="sm"
                      variant={c.granted ? 'outline' : 'default'}
                      className="text-[10px] h-7"
                      onClick={() => handleToggleConsent(c.type, !c.granted)}
                      disabled={savingConsent === c.type}
                    >
                      {savingConsent === c.type ? '...' : c.granted ? 'Revogar' : 'Autorizar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
          )}
        </div>
      </div>

      {/* ── Add Guardian Dialog ── */}
      <Dialog open={guardianDialogOpen} onOpenChange={setGuardianDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Adicionar Responsável</DialogTitle>
            <DialogDescription>
              Preencha os dados de contato do responsável. Não é necessário que ele tenha cadastro na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* First name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <input
                value={guardianFirstName}
                onChange={(e) => setGuardianFirstName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Nome"
                autoFocus
              />
            </div>

            {/* Last name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sobrenome</label>
              <input
                value={guardianLastName}
                onChange={(e) => setGuardianLastName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Sobrenome"
              />
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Relação</label>
              <Select value={guardianRelationship} onValueChange={setGuardianRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a relação..." />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <PhoneMaskInput
                value={guardianPhone}
                onChange={setGuardianPhone}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardianDialogOpen(false)} disabled={savingGuardian}>
              Cancelar
            </Button>
            <Button onClick={handleAddGuardian} disabled={!guardianFirstName.trim() || savingGuardian}>
              {savingGuardian && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Guardian Dialog ── */}
      <Dialog open={editGuardianDialogOpen} onOpenChange={setEditGuardianDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Editar Responsável</DialogTitle>
            <DialogDescription>
              {getGuardianDisplayName(editingGuardian)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name fields — only for guardians without a linked user */}
            {!editingGuardian?.userId && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <input
                    value={editGuardianFirstName}
                    onChange={(e) => setEditGuardianFirstName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sobrenome</label>
                  <input
                    value={editGuardianLastName}
                    onChange={(e) => setEditGuardianLastName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Sobrenome"
                  />
                </div>
              </>
            )}

            {/* Relationship */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Relação</label>
              <Select value={editGuardianRelationship} onValueChange={setEditGuardianRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a relação..." />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <PhoneMaskInput
                value={editGuardianPhone}
                onChange={setEditGuardianPhone}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGuardianDialogOpen(false)} disabled={savingEditGuardian}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGuardian} disabled={savingEditGuardian}>
              {savingEditGuardian && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Remove Guardian ── */}
      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Remover Responsável"
        description="Tem certeza que deseja desvincular este responsável da família? O perfil não será excluído, apenas removido desta família."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleRemoveGuardian}
        loading={removingGuardianLoading}
      />
    </AppShell>
  );
}
