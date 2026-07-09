import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useQuery, useAction } from 'wasp/client/operations';
import { listWorkspaces, getInstitutionalManageContext, acceptInvitation } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { Button } from '../../client/components/ui/button';
import { User, Church, Building2, Plus, ArrowRight, Sparkles, Mail, Check, ShieldCheck, Users2, Settings, History } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  subtitle?: string;
  type: 'PERSONAL' | 'PARISH' | 'DIOCESE' | 'COMMUNITY';
  role: string;
  plan: string;
  isPersonal: boolean;
  membershipStatus?: 'ACTIVE' | 'INVITED';
  membershipId?: string;
  dioceseId?: string | null;
  dioceseName?: string | null;
  planInherited?: boolean;
  isManager?: boolean;
}

interface ManageDiocese {
  id: string;
  name: string;
  licensed: boolean;
}

function planLabel(plan: string | undefined, t: any) {
  if (!plan) return '';
  const key = plan.toLowerCase();
  return t(`workspace.plans.${key}`, { defaultValue: plan });
}

function roleLabel(role: string | undefined, t: any) {
  if (!role) return '';
  return t(`workspace.roles.${role}`, { defaultValue: role });
}

function workspaceIcon(type: Workspace['type']) {
  if (type === 'DIOCESE') return <Building2 className="h-6 w-6 text-secondary" />;
  if (type === 'COMMUNITY') return <Building2 className="h-6 w-6 text-success" />;
  return <Church className="h-6 w-6 text-accent" />;
}

export default function WorkspaceSelectorPage() {
  const { t } = useTranslation('public');
  const { data: workspaces = [], isLoading: loadingWorkspaces, refetch } = useQuery(listWorkspaces);
  const { data: manageContext, isLoading: loadingContext } = useQuery(getInstitutionalManageContext);
  const acceptAction = useAction(acceptInvitation);
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const [accepting, setAccepting] = useState<string | null>(null);

  // GUARDIAN and CATECHUMEN don't need workspace selection — redirect to dashboard
  useEffect(() => {
    if (userRole === 'GUARDIAN' || userRole === 'CATECHUMEN') {
      navigate('/app');
    }
  }, [userRole, navigate]);

  // Auto-skip: if user has only 1 workspace, go directly to /app
  useEffect(() => {
    if (loadingWorkspaces) return;
    if (workspaces.length === 1) {
      const ws = workspaces[0];
      localStorage.setItem('catequese-viva-active-workspace', ws.id);
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: ws.id }));
      navigate('/app');
    }
  }, [workspaces, loadingWorkspaces, navigate]);

  // Last-used workspace from localStorage
  const lastUsedId = localStorage.getItem('catequese-viva-active-workspace');
  const lastUsed = lastUsedId ? workspaces.find((w: Workspace) => w.id === lastUsedId) : null;

  const personal = workspaces.find((w: Workspace) => w.isPersonal);
  const pendingInvitations = workspaces.filter(
    (w: Workspace) => !w.isPersonal && w.membershipStatus === 'INVITED',
  );
  const institutional = workspaces.filter(
    (w: Workspace) => !w.isPersonal && w.membershipStatus !== 'INVITED',
  );
  const managed = institutional.filter((w: Workspace) => w.isManager);
  const participating = institutional.filter((w: Workspace) => !w.isManager);

  const manageDioceses: ManageDiocese[] = manageContext?.dioceses ?? [];
  const canCreateUnderOwnerPlan: boolean = manageContext?.canCreateUnderOwnerPlan ?? false;
  const ownerPlan: string | null = manageContext?.ownerPlan ?? null;

  // Group the managed workspaces by diocese (independent ones grouped separately).
  const dioceseGroups = new Map<string, { name: string; items: Workspace[] }>();
  const independentManaged: Workspace[] = [];
  for (const ws of managed) {
    if (ws.dioceseId) {
      const group = dioceseGroups.get(ws.dioceseId) || { name: ws.dioceseName || 'Diocese', items: [] as Workspace[] };
      group.items.push(ws);
      dioceseGroups.set(ws.dioceseId, group);
    } else {
      independentManaged.push(ws);
    }
  }

  const handleEnter = (workspaceId: string) => {
    localStorage.setItem('catequese-viva-active-workspace', workspaceId);
    localStorage.removeItem('catequese-viva-active-membership');
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: workspaceId }));
    navigate('/app');
  };

  const handleAccept = async (membershipId: string) => {
    setAccepting(membershipId);
    try {
      await acceptAction({ membershipId });
      await refetch();
    } catch (e: any) {
      // ignore — error is shown by the wasp framework
    } finally {
      setAccepting(null);
    }
  };

  const createInDiocese = (dioceseId: string) =>
    navigate(`/app/parishes?new=true&dioceseId=${dioceseId}`);

  // Open the settings scoped to a workspace: personal -> account settings;
  // institutional -> that parish/diocese management page. Sets the active
  // workspace first so the settings operate in the right context.
  const handleManage = (ws: Workspace) => {
    localStorage.setItem('catequese-viva-active-workspace', ws.id);
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: ws.id }));
    navigate(ws.isPersonal ? '/app/settings' : `/app/parishes/${ws.id}`);
  };

  const renderWorkspaceCard = (ws: Workspace, opts?: { showRole?: boolean; covered?: string; canManage?: boolean }) => (
    <div
      key={ws.id}
      role="button"
      tabIndex={0}
      data-testid={`workspace-card-${ws.id}`}
      onClick={() => handleEnter(ws.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEnter(ws.id); } }}
      className="w-full rounded-sm border-2 border-muted bg-card hover:border-primary/50 hover:shadow-sm transition-all p-5 text-left group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div
          className={`rounded-xl p-3 group-hover:bg-opacity-80 transition-colors ${
            ws.type === 'DIOCESE' ? 'bg-secondary/10' : ws.type === 'COMMUNITY' ? 'bg-success/10' : 'bg-accent/10'
          }`}
        >
          {workspaceIcon(ws.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{ws.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                ws.type === 'DIOCESE' ? 'bg-secondary/10 text-secondary' : ws.type === 'COMMUNITY' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
              }`}
            >
              {planLabel(ws.plan, t)}
            </span>
            {opts?.showRole && <span className="text-xs text-muted-foreground">{roleLabel(ws.role, t)}</span>}
            {opts?.covered && (
              <span className="inline-flex items-center gap-1 text-overline text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {opts.covered}
              </span>
            )}
          </div>
        </div>
        {opts?.canManage && (
          <button
            onClick={(e) => { e.stopPropagation(); handleManage(ws); }}
            title={t('workspace.settings_workspace')}
            aria-label={t('workspace.settings_workspace')}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform mt-2" />
      </div>
    </div>
  );

  const coverageLabel = (ws: Workspace): string | undefined => {
    if (!ws.planInherited) return undefined;
    if (ws.dioceseName) return t('workspace.covered_by_diocese', { name: ws.dioceseName });
    if (ws.plan === 'parish' || ws.plan === 'diocese') return t('workspace.covered_by_license');
    return undefined;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Loading state */}
        {(loadingWorkspaces || loadingContext) ? (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            {t('workspace.app_name')}
          </div>
          <h1 className="text-2xl font-bold">{t('workspace.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('workspace.subtitle')}</p>
        </div>

        {/* Continue where you left off — shown when user has been here before */}
        {lastUsed && workspaces.length > 1 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              {t('workspace.continue_title')}
            </h3>
            <div
              role="button"
              tabIndex={0}
              data-testid="workspace-card-last-used"
              onClick={() => handleEnter(lastUsed.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEnter(lastUsed.id); } }}
              className="w-full rounded-sm border-2 border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all p-5 text-left group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  {lastUsed.isPersonal ? (
                    <User className="h-6 w-6 text-primary" />
                  ) : (
                    workspaceIcon(lastUsed.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{lastUsed.name}</h2>
                    <span className="text-overline text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t('workspace.last_used')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lastUsed.isPersonal ? lastUsed.subtitle : roleLabel(lastUsed.role, t)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary/60 group-hover:translate-x-1 transition-transform mt-2" />
              </div>
            </div>
            <div className="border-t pt-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 mb-2">
                {t('workspace.switch_workspace')}
              </h3>
            </div>
          </div>
        )}

        {/* Personal Workspace */}
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 mb-2">
            {t('workspace.personal_section')}
          </h3>
          {personal ? (
            <div
              role="button"
              tabIndex={0}
              data-testid="workspace-card-personal"
              onClick={() => handleEnter(personal.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEnter(personal.id); } }}
              className="w-full rounded-sm border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all p-5 text-left group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg">{personal.name}</h2>
                  <p className="text-sm text-muted-foreground">{personal.subtitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {planLabel(personal.plan, t)}
                    </span>
                    <span className="text-xs text-muted-foreground">{t('workspace.personal_plan_hint')}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleManage(personal); }}
                  title={t('workspace.settings_account')}
                  aria-label={t('workspace.settings_account')}
                  className="rounded-lg p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors mt-1"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <ArrowRight className="h-5 w-5 text-primary/60 group-hover:translate-x-1 transition-transform mt-2" />
              </div>
            </div>
          ) : (
            <div className="rounded-sm border-2 border-dashed border-muted-foreground/30 p-6 text-center text-muted-foreground">
              <p className="text-sm">{t('workspace.personal_pending')}</p>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t('workspace.pending_invites')}
            </h3>
            {pendingInvitations.map((ws: Workspace) => (
              <div key={ws.id} className="rounded-sm border-2 border-warning/30 bg-warning/5 p-5 flex items-center gap-4">
                <div className="rounded-xl bg-warning/10 p-3">
                  <Church className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg">{ws.name}</h2>
                  <p className="text-sm text-muted-foreground">{t('workspace.invited_as', { role: roleLabel(ws.role, t) })}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAccept(ws.membershipId!)}
                  disabled={accepting === ws.membershipId}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {accepting === ws.membershipId ? t('workspace.accepting') : t('workspace.accept')}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Managed institutional workspaces */}
        {(managed.length > 0 || manageDioceses.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('workspace.managed_section')}
            </h3>

            {/* Diocese groups */}
            {[...dioceseGroups.entries()].map(([dioceseId, group]) => {
              const licensed = manageDioceses.find((d) => d.id === dioceseId)?.licensed;
              return (
                <div key={dioceseId} className="space-y-2 rounded-sm border border-secondary/30 bg-secondary/5 p-3">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
                      <Building2 className="h-4 w-4" />
                      {group.name}
                    </div>
                    <span
                      className={`text-overline px-2 py-0.5 rounded-full font-medium ${
                        licensed ? 'bg-secondary/15 text-secondary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {licensed ? t('workspace.diocese_license_active') : t('workspace.diocese_license_inactive')}
                    </span>
                  </div>
                  {group.items.map((ws) => renderWorkspaceCard(ws, { covered: coverageLabel(ws), canManage: true }))}
                  <button
                    onClick={() => createInDiocese(dioceseId)}
                    className="w-full rounded-xl border-2 border-dashed border-secondary/40 hover:bg-secondary/10 transition-all p-3 text-center text-secondary flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('workspace.create_parish_in_diocese')}</span>
                  </button>
                </div>
              );
            })}

            {/* Dioceses the user manages but has no parish in yet */}
            {manageDioceses
              .filter((d) => !dioceseGroups.has(d.id))
              .map((d) => (
                <div key={d.id} className="space-y-2 rounded-sm border border-secondary/30 bg-secondary/5 p-3">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
                      <Building2 className="h-4 w-4" />
                      {d.name}
                    </div>
                    <span
                      className={`text-overline px-2 py-0.5 rounded-full font-medium ${
                        d.licensed ? 'bg-secondary/15 text-secondary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {d.licensed ? t('workspace.diocese_license_active') : t('workspace.diocese_license_inactive')}
                    </span>
                  </div>
                  <button
                    onClick={() => createInDiocese(d.id)}
                    className="w-full rounded-xl border-2 border-dashed border-secondary/40 hover:bg-secondary/10 transition-all p-3 text-center text-secondary flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('workspace.create_parish_in_diocese')}</span>
                  </button>
                </div>
              ))}

            {/* Independent managed parishes (no diocese) */}
            {independentManaged.map((ws) =>
              renderWorkspaceCard(ws, { covered: coverageLabel(ws), canManage: true }),
            )}

            {/* Create under the user's own institutional (Parish) license */}
            {canCreateUnderOwnerPlan && (
              <button
                onClick={() => navigate('/app/parishes?new=true')}
                className="w-full rounded-sm border-2 border-dashed border-primary/30 hover:bg-primary/5 transition-all p-4 text-center text-primary flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('workspace.create_under_license', { plan: planLabel(ownerPlan || 'parish', t) })}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Participating institutional workspaces */}
        {participating.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5" />
              {t('workspace.participating_section')}
            </h3>
            {participating.map((ws: Workspace) => renderWorkspaceCard(ws, { showRole: true }))}
          </div>
        )}

        {/* Empty state: no workspaces at all */}
        {!personal && pendingInvitations.length === 0 && institutional.length === 0 && manageDioceses.length === 0 && (
          <div className="rounded-sm border-2 border-dashed border-warning/50 bg-warning/5 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('workspace.empty_desc')}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/app/onboarding')}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium"
              >
                {t('workspace.go_onboarding')}
              </button>
              <button
                onClick={() => navigate('/app/parishes?new=true')}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-4 text-sm font-medium"
              >
                {t('workspace.create_parish')}
              </button>
            </div>
          </div>
        )}

        {/* Create an independent parish (new institutional workspace) */}
        <button
          onClick={() => navigate('/app/parishes?new=true')}
          className="w-full rounded-sm border-2 border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-accent/50 transition-all p-4 text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">{t('workspace.create_independent')}</span>
        </button>
          </>
        )}
      </div>
    </div>
  );
}
