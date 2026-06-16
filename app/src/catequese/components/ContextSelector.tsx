import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Church, ChevronDown, User, Building2, Shield, Check } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../client/components/ui/dropdown-menu';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { useActiveMembership } from '../../client/hooks/useActiveMembership';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useRoleLabels } from '../../i18n/useLabels';

export function ContextSelector() {
  const { t } = useTranslation('topbar');
  const navigate = useNavigate();
  const roleLabels = useRoleLabels();
  const { workspace, workspaceName, workspaceType, availableWorkspaces, switchWorkspace } = useActiveWorkspace();
  const { activeMembership, availableMemberships, switchMembership } = useActiveMembership();
  const { activeParishName, switchParish } = useActiveParish();

  const hasWorkspaces = availableWorkspaces.length > 0;
  const hasMultipleRoles = availableMemberships.length > 1;
  const hasLegacyParishes = !hasWorkspaces && !!activeParishName;

  // Current display: workspace name + role, or parish name
  const currentRoleLabel = activeMembership
    ? roleLabels[activeMembership.role as keyof typeof roleLabels] || activeMembership.role
    : '';

  const wsIcon = (type: string) => {
    if (type === 'PERSONAL') return <User className="h-4 w-4 text-primary shrink-0" />;
    if (type === 'DIOCESE') return <Building2 className="h-4 w-4 text-warning shrink-0" />;
    if (type === 'COMMUNITY') return <Building2 className="h-4 w-4 text-success shrink-0" />;
    return <Church className="h-4 w-4 text-primary shrink-0" />;
  };

  const needsPaidPlanRole = (role: string) =>
    ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(role) &&
    role !== 'PERSONAL_OWNER';

  // ---- Workspace-driven selector (new unified) ----
  if (hasWorkspaces) {
    const MAX_PER_GROUP = 5;

    const groups = [
      { key: 'personal', label: t('workspaceGroups.personal'), items: availableWorkspaces.filter((w: any) => w.isPersonal) },
      { key: 'parish', label: t('workspaceGroups.parish'), items: availableWorkspaces.filter((w: any) => !w.isPersonal && w.type === 'PARISH') },
      { key: 'diocese', label: t('workspaceGroups.diocese'), items: availableWorkspaces.filter((w: any) => !w.isPersonal && w.type === 'DIOCESE') },
      { key: 'community', label: t('workspaceGroups.community'), items: availableWorkspaces.filter((w: any) => !w.isPersonal && w.type === 'COMMUNITY') },
    ].filter(g => g.items.length > 0);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex gap-2 items-center hover:bg-accent/50 text-muted-foreground hover:text-foreground border border-input rounded-xl px-3 py-1.5 h-9 max-w-[240px]">
            {wsIcon(workspaceType || 'PERSONAL')}
            <span className="truncate font-medium text-sm">{workspaceName}</span>
            {currentRoleLabel && (
              <>
                <span className="text-border">·</span>
                <span className="text-xs text-muted-foreground truncate">{currentRoleLabel}</span>
              </>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2 max-h-[70vh] overflow-y-auto">
          {groups.map(g => (
            <div key={g.key}>
              <div className="px-2 pt-2 pb-1 text-overline font-bold uppercase text-muted-foreground tracking-wider">
                {g.label} ({g.items.length})
              </div>
              {g.items.slice(0, MAX_PER_GROUP).map((ws: any) => {
                const isActive = ws.id === workspace?.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws.id)}
                    className="w-full flex items-center gap-3 text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors cursor-pointer"
                  >
                    {wsIcon(ws.isPersonal ? 'PERSONAL' : ws.type)}
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm truncate">{ws.name}</div>
                      <div className="text-overline text-muted-foreground truncate">
                        {ws.isPersonal ? (ws.subtitle || t('personalSpace')) : (roleLabels[ws.role as keyof typeof roleLabels] || ws.role)}
                      </div>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </button>
                );
              })}
              {g.items.length > MAX_PER_GROUP && (
                <button
                  onClick={() => navigate('/app/select-workspace')}
                  className="w-full text-caption text-primary hover:underline px-2 py-1 text-left"
                >
                  {t('viewAll', { count: g.items.length })}
                </button>
              )}
            </div>
          ))}
          {/* Role switch within current workspace */}
          {hasMultipleRoles && (
            <div className="border-t mt-2 pt-2">
              <div className="px-2 py-1 text-overline font-bold uppercase text-muted-foreground tracking-wider">
                {t('profiles', { count: availableMemberships.length })}
              </div>
              {availableMemberships.map((m: any) => {
                const isActive = m.id === activeMembership?.id;
                const needsPaid = needsPaidPlanRole(m.role);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      switchMembership(m.id);
                      if (m.parishId) switchParish(m.parishId);
                    }}
                    className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                      </span>
                      <span className="text-overline text-muted-foreground truncate block">
                        {m.parishName || t('noParish')}
                      </span>
                    </div>
                    {needsPaid && (
                      <Badge variant="outline" className="text-overline text-warning border-warning/40 shrink-0">
                        PRO
                      </Badge>
                    )}
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t mt-2 pt-2">
            <button
              onClick={() => navigate('/app/select-workspace')}
              className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left"
            >
              {t('viewAllWorkspaces')}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ---- Legacy parish selector (backward compat, no workspaces yet) ----
  if (hasLegacyParishes) {
    const yearLabel = new Date().getFullYear().toString();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex gap-2 items-center hover:bg-accent/50 text-muted-foreground hover:text-foreground border border-input rounded-xl px-3 py-1.5 h-9 max-w-[240px]">
            <Church className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate font-medium text-sm">{activeParishName}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
            <span className="font-semibold text-primary text-xs hidden sm:inline">{yearLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1">
            {t('workspaceGroups.parish')}
          </div>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded-sm hover:bg-accent transition-colors cursor-pointer"
          >
            <Church className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-left">{activeParishName}</span>
            <Check className="h-4 w-4 text-primary shrink-0" />
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
