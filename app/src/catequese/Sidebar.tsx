import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { cn } from "../client/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Heart,
  Library,
  Puzzle,
  Calendar,
  Cross,
  MessageSquareText,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Church,
  Building2,
  FileText,
  BookMarked,
  ScrollText,
  FolderOpen,
  FileCheck,
  CalendarRange,
  Shield,
  BookOpen,
  ClipboardList,
  Mail,
} from "lucide-react";
import { useUserContext } from "../client/hooks/useUserContext";
import {
  getVisibleNavigation,
  type NavItemConfig,
  type VisibleNavGroup,
} from "../shared/navigation";
import { useQuery, getUnreadMessagesCount } from "wasp/client/operations";
import { useActiveWorkspace } from "../client/hooks/useActiveWorkspace";
import { usePageVisibility } from "../client/hooks/usePageVisibility";
import { BrandLockup, BrandMark } from "../client/components/brand/Brand";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../client/components/ui/tooltip";

// ---- Icon Map (iconKey → Lucide component) ----
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  parishes: Church,
  communities: Building2,
  classes: Users,
  catechumens: GraduationCap,
  families: Heart,
  team: Users,
  family_portal_invites: Mail,
  content_library: Library,
  ai_hub: BookOpen,
  activities: Puzzle,
  calendar: Calendar,
  bible: BookMarked,
  directory: FolderOpen,
  catechism: ScrollText,
  messages: MessageSquareText,
  sacraments: Cross,
  journey_templates: ClipboardList,
  documents: FileText,
  reports: BarChart3,
  settings: Settings,
  billing: CreditCard,
  consents: FileCheck,
  catechetical_years: CalendarRange,
  admin: Shield,
};

interface NavItemProps {
  item: NavItemConfig;
  collapsed: boolean;
}

function NavItemLink({
  item,
  collapsed,
  badge,
}: NavItemProps & { badge?: number }) {
  const { t } = useTranslation("navigation");
  const Icon = ICON_MAP[item.iconKey];

  const tourMap: Record<string, string> = {
    classes: "sidebar-classes",
    ai_hub: "sidebar-ai",
    messages: "sidebar-messages",
  };

  const link = (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/app"}
      prefetch="intent"
      data-tour={tourMap[item.iconKey] || undefined}
      className={({ isActive }) =>
        cn(
          "relative flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-brand-ink/[0.06] text-brand-ink border-l-2 border-brand-gold"
            : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-brand-ink",
          collapsed && "justify-center px-2",
          "motion-reduce:transition-none",
        )
      }
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
        {!collapsed && <span>{t(item.labelKey)}</span>}
      </div>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="h-4.5 min-w-[18px] flex items-center justify-center rounded-sm bg-brand-ink text-white text-overline font-semibold px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-sm bg-brand-gold ring-2 ring-background" />
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">
            <span>{t(item.labelKey)}</span>
            {badge !== undefined && badge > 0 && (
              <span className="ml-1.5 opacity-70">
                ({badge > 99 ? "99+" : badge})
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return link;
}

function NavGroupBlock({
  group,
  collapsed,
  expanded,
  onToggle,
  unreadMessagesCount,
}: {
  group: VisibleNavGroup;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  unreadMessagesCount: number;
}) {
  const { t } = useTranslation("navigation");
  const showHeader = group.collapsible && !collapsed;
  const showItems = !group.collapsible || collapsed || expanded;

  return (
    <div className="mt-2 first:mt-0 px-2.5">
      {showHeader && (
        <button
          type="button"
          onClick={onToggle}
          className="mb-0.5 flex min-h-9 w-full items-center justify-between rounded-sm px-2.5 py-1 transition-colors hover:bg-accent/50"
        >
          <p className="select-none text-[11px] font-medium tracking-wide text-muted-foreground">
            {t(group.labelKey)}
          </p>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 motion-reduce:transition-none",
              !expanded && "-rotate-90",
            )}
          />
        </button>
      )}
      {!group.collapsible && !collapsed && (
        <p className="mb-1 select-none px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground">
          {t(group.labelKey)}
        </p>
      )}

      {showItems && (
        <div
          className={cn(
            "space-y-0.5 overflow-hidden transition-all duration-200 motion-reduce:transition-none",
            group.collapsible &&
              !collapsed &&
              !expanded &&
              "max-h-0 opacity-0",
            group.collapsible &&
              !collapsed &&
              expanded &&
              "max-h-[32rem] opacity-100",
          )}
        >
          {group.items.map((item) => (
            <NavItemLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              badge={
                item.iconKey === "messages" ? unreadMessagesCount : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { t: tc } = useTranslation("common");
  const [collapsed, setCollapsed] = useState(false);
  // Secondary groups start collapsed to reduce cognitive load; operation stays open.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["people"]),
  );
  const { userRole, isAdmin } = useUserContext();
  const { workspaceType, workspaceId } = useActiveWorkspace();
  const isVisible = usePageVisibility();

  const { data: unreadMessages } = useQuery(
    getUnreadMessagesCount,
    workspaceId ? ({ workspaceId } as any) : undefined,
    {
      enabled: (!!userRole || isAdmin) && !!workspaceId && isVisible,
      refetchInterval: isVisible ? 120000 : false,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    },
  );

  const unreadMessagesCount = unreadMessages?.count || 0;

  const { groups } = getVisibleNavigation({
    role: userRole,
    isAdmin,
    workspaceType,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-brand-ink/10 bg-surface-elevated transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-14 items-center border-b border-brand-ink/08 px-3">
        {!collapsed && <BrandLockup compact hideBadge className="max-w-full" />}
        {collapsed && <BrandMark className="mx-auto h-8 w-8" />}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto py-3">
        {groups.map((group) => (
          <NavGroupBlock
            key={group.id}
            group={group}
            collapsed={collapsed}
            expanded={
              !group.collapsible || expandedSections.has(group.id)
            }
            onToggle={() => toggleSection(group.id)}
            unreadMessagesCount={unreadMessagesCount}
          />
        ))}
      </nav>

      <div className="border-t p-2 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          aria-label={collapsed ? tc("expand_menu") : tc("collapse_menu")}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>{tc("collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
