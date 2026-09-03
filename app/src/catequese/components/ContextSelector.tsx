import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Church,
  ChevronDown,
  User,
  Building2,
  Shield,
  Check,
  Mail,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { cn } from "../../client/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useActiveMembership } from "../../client/hooks/useActiveMembership";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useRoleLabels } from "../../i18n/useLabels";
import { useAuth } from "wasp/client/auth";
import {
  WorkspaceKindBadge,
  WorkspacePlanLabel,
  workspaceKindOf,
} from "./WorkspaceIdentityChip";

export function ContextSelector() {
  const { t } = useTranslation("topbar");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const roleLabels = useRoleLabels();
  const { data: authUser } = useAuth();
  const {
    workspace,
    workspaceName,
    workspaceType,
    availableWorkspaces,
    switchWorkspace,
  } = useActiveWorkspace();
  const { activeMembership, availableMemberships, switchMembership } =
    useActiveMembership();
  const { activeParishName, switchParish } = useActiveParish();
  const { allMemberships } = useUserContext();
  const pendingCount = (allMemberships || []).filter(
    (m) => m.status === "INVITED",
  ).length;

  const hasWorkspaces = availableWorkspaces.length > 0;
  const hasMultipleRoles = availableMemberships.length > 1;
  const hasLegacyParishes = !hasWorkspaces && !!activeParishName;
  const personalPlan = authUser?.subscriptionPlan || null;

  const currentRoleLabel = activeMembership
    ? roleLabels[activeMembership.role as keyof typeof roleLabels] ||
      activeMembership.role
    : workspace?.role
      ? roleLabels[workspace.role as keyof typeof roleLabels] || workspace.role
      : "";

  const wsIcon = (type: string) => {
    if (type === "PERSONAL")
      return <User className="h-4 w-4 shrink-0 text-brand-ink" />;
    if (type === "DIOCESE")
      return <Building2 className="h-4 w-4 shrink-0 text-brand-ink" />;
    if (type === "COMMUNITY")
      return <Building2 className="h-4 w-4 shrink-0 text-brand-ink" />;
    return <Church className="h-4 w-4 shrink-0 text-brand-ink" />;
  };

  const needsPaidPlanRole = (role: string) =>
    [
      "SUPER_ADMIN",
      "DIOCESE_ADMIN",
      "PARISH_COORDINATOR",
      "COMMUNITY_COORDINATOR",
    ].includes(role) && role !== "PERSONAL_OWNER";

  if (hasWorkspaces) {
    const MAX_PER_GROUP = 5;
    const activeKind = workspaceKindOf(workspaceType);

    const groups = [
      {
        key: "personal",
        label: t("workspaceGroups.personal"),
        items: availableWorkspaces.filter((w) => w.isPersonal),
      },
      {
        key: "parish",
        label: t("workspaceGroups.parish"),
        items: availableWorkspaces.filter(
          (w) => !w.isPersonal && w.type === "PARISH",
        ),
      },
      {
        key: "diocese",
        label: t("workspaceGroups.diocese"),
        items: availableWorkspaces.filter(
          (w) => !w.isPersonal && w.type === "DIOCESE",
        ),
      },
      {
        key: "community",
        label: t("workspaceGroups.community"),
        items: availableWorkspaces.filter(
          (w) => !w.isPersonal && w.type === "COMMUNITY",
        ),
      },
    ].filter((g) => g.items.length > 0);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            data-testid="workspace-context-trigger"
            className="relative flex h-auto min-h-11 min-w-0 max-w-[11.5rem] items-center gap-1.5 rounded-sm border border-transparent px-1.5 py-1 text-muted-foreground hover:bg-accent/50 hover:text-brand-ink min-[360px]:max-w-[14rem] sm:max-w-[18rem] sm:gap-2 sm:border-input sm:px-3 xl:max-w-[22rem]"
            aria-label={
              pendingCount > 0
                ? tc("pending_invite.banner_many", { count: pendingCount })
                : t("context")
            }
          >
            <span className="hidden sm:inline-flex">
              {wsIcon(workspaceType || "PERSONAL")}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="flex min-w-0 items-center gap-1.5">
                <WorkspaceKindBadge
                  kind={activeKind}
                  className="hidden shrink-0 sm:inline-flex"
                />
                <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-brand-ink">
                  {workspaceName}
                </span>
              </span>
              <span className="mt-0.5 hidden min-w-0 items-center gap-1.5 sm:flex">
                {currentRoleLabel && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {currentRoleLabel}
                  </span>
                )}
                {currentRoleLabel && (
                  <span className="shrink-0 text-border">·</span>
                )}
                <WorkspacePlanLabel
                  parishType={workspaceType}
                  parishPlan={workspace?.plan}
                  planInherited={workspace?.planInherited}
                  dioceseName={workspace?.dioceseName}
                  personalPlan={personalPlan}
                  className="text-[11px]"
                />
              </span>
            </span>
            {pendingCount > 0 && (
              <span
                data-testid="workspace-pending-invite-badge"
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-gold px-1.5 text-[11px] font-bold leading-none text-brand-ink"
                title={tc("pending_invite.view_cta")}
              >
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-[min(24rem,calc(100vw-1rem))] p-2 max-h-[70vh] overflow-y-auto"
        >
          {groups.map((g) => (
            <div key={g.key}>
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {g.label} ({g.items.length})
              </div>
              {g.items.slice(0, MAX_PER_GROUP).map((ws) => {
                const isActive = ws.id === workspace?.id;
                const kind = workspaceKindOf(ws.isPersonal ? "PERSONAL" : ws.type);
                const rowRole =
                  roleLabels[ws.role as keyof typeof roleLabels] || ws.role;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => switchWorkspace(ws.id)}
                    className={cn(
                      "w-full flex items-center gap-3 text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors cursor-pointer",
                      isActive && "bg-accent/70",
                    )}
                  >
                    {wsIcon(ws.isPersonal ? "PERSONAL" : ws.type)}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <WorkspaceKindBadge kind={kind} />
                        <span className="truncate text-sm font-semibold tracking-tight text-brand-ink">
                          {ws.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-overline text-muted-foreground">
                        <span className="truncate">
                          {ws.isPersonal
                            ? ws.subtitle || t("personalSpace")
                            : rowRole}
                        </span>
                        <span aria-hidden>·</span>
                        <WorkspacePlanLabel
                          parishType={ws.isPersonal ? "PERSONAL" : ws.type}
                          parishPlan={ws.plan}
                          planInherited={ws.planInherited}
                          dioceseName={ws.dioceseName}
                          personalPlan={personalPlan}
                        />
                      </div>
                    </div>
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-brand-ink" />
                    )}
                  </button>
                );
              })}
              {g.items.length > MAX_PER_GROUP && (
                <button
                  type="button"
                  onClick={() => navigate("/app/select-workspace")}
                  className="w-full px-2 py-1 text-left text-caption font-medium text-brand-ink underline-offset-2 hover:underline"
                >
                  {t("viewAll", { count: g.items.length })}
                </button>
              )}
            </div>
          ))}
          {hasMultipleRoles && (
            <div className="border-t mt-2 pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("profiles", { count: availableMemberships.length })}
              </div>
              {availableMemberships.map((m: any) => {
                const isActive = m.id === activeMembership?.id;
                const needsPaid = needsPaidPlanRole(m.role);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      switchMembership(m.id);
                      if (m.parishId) switchParish(m.parishId);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors cursor-pointer",
                      isActive && "bg-accent/70",
                    )}
                  >
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <span className="block truncate text-sm font-semibold tracking-tight text-brand-ink">
                        {roleLabels[m.role as keyof typeof roleLabels] ||
                          m.role}
                      </span>
                      <span className="text-overline text-muted-foreground truncate block">
                        {m.parishName || t("noParish")}
                      </span>
                    </div>
                    {needsPaid && (
                      <Badge
                        variant="outline"
                        className="text-overline text-warning border-warning/40 shrink-0"
                      >
                        PRO
                      </Badge>
                    )}
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-brand-ink" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t mt-2 pt-2 space-y-0.5">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("/app/select-workspace")}
                className="w-full flex items-center gap-2 text-xs font-semibold text-brand-ink px-2 py-2 rounded-sm bg-brand-gold/12 hover:bg-brand-gold/20 border border-brand-gold/35 transition-colors text-left"
                data-testid="context-pending-invites"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 min-w-0">
                  {pendingCount === 1
                    ? tc("pending_invite.view_cta")
                    : tc("pending_invite.banner_many", { count: pendingCount })}
                </span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-gold px-1.5 text-[11px] font-bold text-brand-ink">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/app/select-workspace")}
              className="w-full text-xs text-muted-foreground hover:text-brand-ink px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left"
            >
              {t("viewAllWorkspaces")}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (hasLegacyParishes) {
    const yearLabel = new Date().getFullYear().toString();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex h-11 min-w-0 max-w-[150px] items-center gap-1.5 rounded-sm border border-transparent px-1.5 text-muted-foreground hover:bg-accent/50 hover:text-brand-ink min-[360px]:max-w-[180px] sm:max-w-[240px] sm:gap-2 sm:border-input sm:px-3 xl:max-w-[280px]"
          >
            <span className="hidden sm:inline-flex">
              <Church className="h-4 w-4 shrink-0 text-brand-ink" />
            </span>
            <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-brand-ink">
              {activeParishName}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ·
            </span>
            <span className="hidden text-xs font-semibold tracking-tight text-brand-ink sm:inline">
              {yearLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-[min(22rem,calc(100vw-1rem))] p-2"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1">
            {t("workspaceGroups.parish")}
          </div>
          <button
            type="button"
            onClick={() => {}}
            className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-sm hover:bg-accent transition-colors cursor-pointer"
          >
            <Church className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-left">
              {activeParishName}
            </span>
            <Check className="h-4 w-4 shrink-0 text-brand-ink" />
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
