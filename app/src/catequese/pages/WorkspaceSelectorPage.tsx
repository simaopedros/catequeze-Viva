import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery, useAction } from "wasp/client/operations";
import {
  listWorkspaces,
  getInstitutionalManageContext,
  acceptInvitation,
} from "wasp/client/operations";
import { useUserContext } from "../../client/hooks/useUserContext";
import { Button } from "../../client/components/ui/button";
import {
  User,
  Church,
  Building2,
  Plus,
  ArrowRight,
  Loader2,
  Mail,
  Check,
  ShieldCheck,
  Users2,
  Settings,
  History,
} from "lucide-react";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

interface Workspace {
  id: string;
  name: string;
  subtitle?: string;
  type: "PERSONAL" | "PARISH" | "DIOCESE" | "COMMUNITY";
  role: string;
  plan: string;
  isPersonal: boolean;
  membershipStatus?: "ACTIVE" | "INVITED";
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
  if (!plan) return "";
  const key = plan.toLowerCase();
  return t(`workspace.plans.${key}`, { defaultValue: plan });
}

function roleLabel(role: string | undefined, t: any) {
  if (!role) return "";
  return t(`workspace.roles.${role}`, { defaultValue: role });
}

function workspaceIcon(type: Workspace["type"]) {
  if (type === "DIOCESE")
    return <Building2 className="h-6 w-6 text-[#071A2D]" />;
  if (type === "COMMUNITY")
    return <Building2 className="h-6 w-6 text-[#071A2D]" />;
  return <Church className="h-6 w-6 text-[#071A2D]" />;
}

export default function WorkspaceSelectorPage() {
  const { t } = useTranslation("public");
  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    refetch,
  } = useQuery(listWorkspaces);
  const { data: manageContext, isLoading: loadingContext } = useQuery(
    getInstitutionalManageContext,
  );
  const acceptAction = useAction(acceptInvitation);
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const [accepting, setAccepting] = useState<string | null>(null);

  // GUARDIAN and CATECHUMEN don't need workspace selection — redirect to dashboard
  useEffect(() => {
    if (userRole === "GUARDIAN" || userRole === "CATECHUMEN") {
      navigate("/app");
    }
  }, [userRole, navigate]);

  // Auto-skip: if user has only 1 workspace, go directly to /app
  useEffect(() => {
    if (loadingWorkspaces) return;
    if (workspaces.length === 1) {
      const ws = workspaces[0];
      localStorage.setItem("catequese-viva-active-workspace", ws.id);
      window.dispatchEvent(
        new CustomEvent("workspace-changed", { detail: ws.id }),
      );
      navigate("/app");
    }
  }, [workspaces, loadingWorkspaces, navigate]);

  // Last-used workspace from localStorage
  const lastUsedId = localStorage.getItem("catequese-viva-active-workspace");
  const lastUsed = lastUsedId
    ? workspaces.find((w: Workspace) => w.id === lastUsedId)
    : null;

  const personal = workspaces.find((w: Workspace) => w.isPersonal);
  const pendingInvitations = workspaces.filter(
    (w: Workspace) => !w.isPersonal && w.membershipStatus === "INVITED",
  );
  const institutional = workspaces.filter(
    (w: Workspace) => !w.isPersonal && w.membershipStatus !== "INVITED",
  );
  const managed = institutional.filter((w: Workspace) => w.isManager);
  const participating = institutional.filter((w: Workspace) => !w.isManager);

  const manageDioceses: ManageDiocese[] = manageContext?.dioceses ?? [];
  const canCreateUnderOwnerPlan: boolean =
    manageContext?.canCreateUnderOwnerPlan ?? false;
  const ownerPlan: string | null = manageContext?.ownerPlan ?? null;

  // Group the managed workspaces by diocese (independent ones grouped separately).
  const dioceseGroups = new Map<string, { name: string; items: Workspace[] }>();
  const independentManaged: Workspace[] = [];
  for (const ws of managed) {
    if (ws.dioceseId) {
      const group = dioceseGroups.get(ws.dioceseId) || {
        name: ws.dioceseName || "Diocese",
        items: [] as Workspace[],
      };
      group.items.push(ws);
      dioceseGroups.set(ws.dioceseId, group);
    } else {
      independentManaged.push(ws);
    }
  }

  const handleEnter = (workspaceId: string) => {
    localStorage.setItem("catequese-viva-active-workspace", workspaceId);
    localStorage.removeItem("catequese-viva-active-membership");
    window.dispatchEvent(
      new CustomEvent("workspace-changed", { detail: workspaceId }),
    );
    navigate("/app");
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
    localStorage.setItem("catequese-viva-active-workspace", ws.id);
    window.dispatchEvent(
      new CustomEvent("workspace-changed", { detail: ws.id }),
    );
    navigate(ws.isPersonal ? "/app/settings" : `/app/parishes/${ws.id}`);
  };

  const renderWorkspaceCard = (
    ws: Workspace,
    opts?: { showRole?: boolean; covered?: string; canManage?: boolean },
  ) => (
    <div
      key={ws.id}
      role="button"
      tabIndex={0}
      data-testid={`workspace-card-${ws.id}`}
      onClick={() => handleEnter(ws.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleEnter(ws.id);
        }
      }}
      className="group w-full cursor-pointer rounded-sm border border-border/70 bg-white p-5 text-left transition-colors hover:border-[#071A2D]/30"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-sm border border-border/70 bg-muted/30 p-3 text-[#071A2D] transition-colors">
          {workspaceIcon(ws.type)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-lg font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {ws.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-[#071A2D]/08 px-2 py-0.5 text-xs font-medium text-[#071A2D]">
              {planLabel(ws.plan, t)}
            </span>
            {opts?.showRole && (
              <span className="text-xs text-muted-foreground">
                {roleLabel(ws.role, t)}
              </span>
            )}
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
            onClick={(e) => {
              e.stopPropagation();
              handleManage(ws);
            }}
            title={t("workspace.settings_workspace")}
            aria-label={t("workspace.settings_workspace")}
            className="rounded-sm p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
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
    if (ws.dioceseName)
      return t("workspace.covered_by_diocese", { name: ws.dioceseName });
    if (ws.plan === "parish" || ws.plan === "diocese")
      return t("workspace.covered_by_license");
    return undefined;
  };

  return (
    <div className="min-h-screen flex items-center justify-center border border-border/70 bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Loading state */}
        {loadingWorkspaces || loadingContext ? (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex rounded-sm border border-border/70 border border-border/70 bg-muted/30 p-4">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-2.5 text-center">
              <AppEyebrow className="text-center">
                {t("workspace.app_name")}
              </AppEyebrow>
              <AppDisplayTitle className="text-center">
                {t("workspace.title")}
              </AppDisplayTitle>
              <AppGoldRule className="mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("workspace.subtitle")}
              </p>
            </div>

            {/* Continue where you left off — shown when user has been here before */}
            {lastUsed && workspaces.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  {t("workspace.continue_title")}
                </h3>
                <div
                  role="button"
                  tabIndex={0}
                  data-testid="workspace-card-last-used"
                  onClick={() => handleEnter(lastUsed.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEnter(lastUsed.id);
                    }
                  }}
                  className="group w-full cursor-pointer rounded-sm border border-[#071A2D]/30 bg-white p-5 text-left transition-colors hover:border-[#071A2D]/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-3 text-[#071A2D]">
                      {lastUsed.isPersonal ? (
                        <User className="h-6 w-6 text-[#071A2D]" />
                      ) : (
                        workspaceIcon(lastUsed.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-lg font-semibold tracking-tight text-[#071A2D]"
                          style={{ fontFamily: "var(--font-brand-display)" }}
                        >
                          {lastUsed.name}
                        </p>
                        <span className="text-overline text-muted-foreground rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
                          {t("workspace.last_used")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lastUsed.isPersonal
                          ? lastUsed.subtitle
                          : roleLabel(lastUsed.role, t)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 mt-2 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 mb-2">
                    {t("workspace.switch_workspace")}
                  </h3>
                </div>
              </div>
            )}

            {/* Personal Workspace */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 mb-2">
                {t("workspace.personal_section")}
              </h3>
              {personal ? (
                <div
                  role="button"
                  tabIndex={0}
                  data-testid="workspace-card-personal"
                  onClick={() => handleEnter(personal.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEnter(personal.id);
                    }
                  }}
                  className="group w-full cursor-pointer rounded-sm border border-border/70 bg-white p-5 text-left transition-colors hover:border-[#071A2D]/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-3 text-[#071A2D]">
                      <User className="h-6 w-6 text-[#071A2D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-lg font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {personal.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {personal.subtitle}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-semibold tracking-tight text-[#071A2D]">
                          {planLabel(personal.plan, t)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("workspace.personal_plan_hint")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManage(personal);
                      }}
                      title={t("workspace.settings_account")}
                      aria-label={t("workspace.settings_account")}
                      className="mt-1 rounded-sm p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                    <ArrowRight className="h-5 w-5 mt-2 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border-2 border-dashed border-border/70 bg-white p-6 text-center">
                  <p
                    className="text-sm font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {t("workspace.personal_pending")}
                  </p>
                </div>
              )}
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {t("workspace.pending_invites")}
                </h3>
                {pendingInvitations.map((ws: Workspace) => (
                  <div
                    key={ws.id}
                    className="rounded-sm border-2 border-warning/30 bg-warning/5 p-5 flex items-center gap-4"
                  >
                    <div className="rounded-sm bg-warning/10 p-3">
                      <Church className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-lg font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {ws.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("workspace.invited_as", {
                          role: roleLabel(ws.role, t),
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(ws.membershipId!)}
                      disabled={accepting === ws.membershipId}
                      className="gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      {accepting === ws.membershipId
                        ? t("workspace.accepting")
                        : t("workspace.accept")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Managed institutional workspaces */}
            {(managed.length > 0 || manageDioceses.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("workspace.managed_section")}
                </h3>

                {/* Diocese groups */}
                {[...dioceseGroups.entries()].map(([dioceseId, group]) => {
                  const licensed = manageDioceses.find(
                    (d) => d.id === dioceseId,
                  )?.licensed;
                  return (
                    <div
                      key={dioceseId}
                      className="space-y-2 rounded-sm border border-[#071A2D]/25 bg-[#071A2D]/05 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#071A2D]">
                          <Building2 className="h-4 w-4" />
                          {group.name}
                        </div>
                        <span
                          className={`text-overline px-2 py-0.5 rounded-sm font-medium ${
                            licensed
                              ? "bg-[#071A2D]/10 text-[#071A2D]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {licensed
                            ? t("workspace.diocese_license_active")
                            : t("workspace.diocese_license_inactive")}
                        </span>
                      </div>
                      {group.items.map((ws) =>
                        renderWorkspaceCard(ws, {
                          covered: coverageLabel(ws),
                          canManage: true,
                        }),
                      )}
                      <button
                        onClick={() => createInDiocese(dioceseId)}
                        className="w-full rounded-sm border border-dashed border-border/70 hover:bg-muted/20 transition-colors p-3 text-center text-muted-foreground flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-semibold tracking-tight text-[#071A2D]">
                          {t("workspace.create_parish_in_diocese")}
                        </span>
                      </button>
                    </div>
                  );
                })}

                {/* Dioceses the user manages but has no parish in yet */}
                {manageDioceses
                  .filter((d) => !dioceseGroups.has(d.id))
                  .map((d) => (
                    <div
                      key={d.id}
                      className="space-y-2 rounded-sm border border-[#071A2D]/25 bg-[#071A2D]/05 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#071A2D]">
                          <Building2 className="h-4 w-4" />
                          {d.name}
                        </div>
                        <span
                          className={`text-overline px-2 py-0.5 rounded-sm font-medium ${
                            d.licensed
                              ? "bg-[#071A2D]/10 text-[#071A2D]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {d.licensed
                            ? t("workspace.diocese_license_active")
                            : t("workspace.diocese_license_inactive")}
                        </span>
                      </div>
                      <button
                        onClick={() => createInDiocese(d.id)}
                        className="w-full rounded-sm border border-dashed border-border/70 hover:bg-muted/20 transition-colors p-3 text-center text-muted-foreground flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-semibold tracking-tight text-[#071A2D]">
                          {t("workspace.create_parish_in_diocese")}
                        </span>
                      </button>
                    </div>
                  ))}

                {/* Independent managed parishes (no diocese) */}
                {independentManaged.map((ws) =>
                  renderWorkspaceCard(ws, {
                    covered: coverageLabel(ws),
                    canManage: true,
                  }),
                )}

                {/* Create under the user's own institutional (Parish) license */}
                {canCreateUnderOwnerPlan && (
                  <button
                    onClick={() => navigate("/app/parishes?new=true")}
                    className="w-full rounded-sm border border-dashed border-border/70 hover:border-[#071A2D]/30 hover:bg-muted/20 transition-colors p-4 text-center text-muted-foreground flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold tracking-tight text-[#071A2D]">
                      {t("workspace.create_under_license", {
                        plan: planLabel(ownerPlan || "parish", t),
                      })}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Participating institutional workspaces */}
            {participating.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" />
                  {t("workspace.participating_section")}
                </h3>
                {participating.map((ws: Workspace) =>
                  renderWorkspaceCard(ws, { showRole: true }),
                )}
              </div>
            )}

            {/* Empty state: no workspaces at all */}
            {!personal &&
              pendingInvitations.length === 0 &&
              institutional.length === 0 &&
              manageDioceses.length === 0 && (
                <div className="rounded-sm border-2 border-dashed border-warning/50 bg-warning/5 p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("workspace.empty_desc")}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => navigate("/app/onboarding")}
                      className="inline-flex items-center justify-center h-9 rounded-sm bg-[#071A2D] px-4 text-sm font-medium text-white"
                    >
                      {t("workspace.go_onboarding")}
                    </button>
                    <button
                      onClick={() => navigate("/app/parishes?new=true")}
                      className="inline-flex items-center justify-center rounded-sm border border-input bg-background h-9 px-4 text-sm font-medium"
                    >
                      {t("workspace.create_parish")}
                    </button>
                  </div>
                </div>
              )}

            {/* Create an independent parish (new institutional workspace) */}
            <button
              onClick={() => navigate("/app/parishes?new=true")}
              className="w-full rounded-sm border border-dashed border-border/70 hover:border-[#071A2D]/30 hover:bg-muted/20 transition-colors p-4 text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-tight text-[#071A2D]">
                {t("workspace.create_independent")}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
